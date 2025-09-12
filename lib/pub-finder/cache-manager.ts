import { Conference, AcceptanceRate } from './types';

// 缓存配置
const DB_NAME = 'ccf-conference-cache';
const DB_VERSION = 1;
const STORE_NAME = 'conference-data';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

interface CacheRecord {
    id: string;
    data: Conference[] | AcceptanceRate[];
    timestamp: number;
    type: 'conferences' | 'acceptances';
    size: number;
}

class CCFCacheManager {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    constructor() {
        this.initPromise = this.initDB();
    }

    private async initDB(): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log('CacheManager: 初始化IndexedDB...');
            
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = () => {
                console.error('CacheManager: IndexedDB打开失败', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('CacheManager: IndexedDB初始化成功');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                console.log('CacheManager: 创建IndexedDB存储结构...');
                
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('type', 'type', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    console.log('CacheManager: 存储结构创建完成');
                }
            };
        });
    }

    private async ensureDB(): Promise<IDBDatabase> {
        if (this.initPromise) {
            await this.initPromise;
        }
        if (!this.db) {
            throw new Error('IndexedDB未正确初始化');
        }
        return this.db;
    }

    private getDataSize(data: any): number {
        return JSON.stringify(data).length * 2; // 估算字节数
    }

    async setCache(type: 'conferences' | 'acceptances', data: Conference[] | AcceptanceRate[]): Promise<boolean> {
        try {
            console.log(`CacheManager: 开始缓存${type}数据...`);
            const db = await this.ensureDB();
            
            const record: CacheRecord = {
                id: type,
                data,
                timestamp: Date.now(),
                type,
                size: this.getDataSize(data)
            };
            
            console.log(`CacheManager: ${type}数据准备完成`, {
                itemCount: data.length,
                sizeBytes: record.size,
                sizeMB: (record.size / 1024 / 1024).toFixed(2)
            });
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(record);
                
                request.onsuccess = () => {
                    console.log(`CacheManager: ${type}数据存储成功`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error(`CacheManager: ${type}数据存储失败`, request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error(`CacheManager: 缓存${type}数据时发生错误`, error);
            return false;
        }
    }

    async getCache(type: 'conferences' | 'acceptances'): Promise<Conference[] | AcceptanceRate[] | null> {
        try {
            console.log(`CacheManager: 获取${type}缓存数据...`);
            const db = await this.ensureDB();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(type);
                
                request.onsuccess = () => {
                    const record = request.result as CacheRecord | undefined;
                    
                    if (!record) {
                        console.log(`CacheManager: ${type}缓存不存在`);
                        resolve(null);
                        return;
                    }
                    
                    const age = Date.now() - record.timestamp;
                    const isExpired = age > CACHE_DURATION;
                    
                    console.log(`CacheManager: ${type}缓存状态`, {
                        found: true,
                        ageHours: (age / 1000 / 60 / 60).toFixed(2),
                        isExpired,
                        itemCount: record.data.length,
                        sizeBytes: record.size,
                        sizeMB: (record.size / 1024 / 1024).toFixed(2)
                    });
                    
                    if (isExpired) {
                        console.log(`CacheManager: ${type}缓存已过期`);
                        resolve(null);
                    } else {
                        console.log(`CacheManager: 返回有效的${type}缓存数据`);
                        resolve(record.data);
                    }
                };
                
                request.onerror = () => {
                    console.error(`CacheManager: 获取${type}缓存失败`, request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error(`CacheManager: 获取${type}缓存时发生错误`, error);
            return null;
        }
    }

    async clearCache(): Promise<void> {
        try {
            console.log('CacheManager: 清理所有缓存...');
            const db = await this.ensureDB();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.clear();
                
                request.onsuccess = () => {
                    console.log('CacheManager: 缓存清理完成');
                    resolve();
                };
                
                request.onerror = () => {
                    console.error('CacheManager: 缓存清理失败', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('CacheManager: 清理缓存时发生错误', error);
        }
    }

    async getCacheStats(): Promise<{ totalSize: number; recordCount: number; records: any[] }> {
        try {
            const db = await this.ensureDB();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();
                
                request.onsuccess = () => {
                    const records = request.result as CacheRecord[];
                    const totalSize = records.reduce((sum, record) => sum + record.size, 0);
                    
                    const stats = {
                        totalSize,
                        recordCount: records.length,
                        records: records.map(record => ({
                            type: record.type,
                            itemCount: record.data.length,
                            size: record.size,
                            age: Date.now() - record.timestamp,
                            isExpired: Date.now() - record.timestamp > CACHE_DURATION
                        }))
                    };
                    
                    console.log('CacheManager: 缓存统计', {
                        ...stats,
                        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
                    });
                    
                    resolve(stats);
                };
                
                request.onerror = () => {
                    console.error('CacheManager: 获取缓存统计失败', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('CacheManager: 获取缓存统计时发生错误', error);
            return { totalSize: 0, recordCount: 0, records: [] };
        }
    }

    // localStorage备用存储（仅存储元数据）
    private setLocalStorageBackup(type: string, timestamp: number): void {
        try {
            localStorage.setItem(`ccf-${type}-idb-timestamp`, timestamp.toString());
            console.log(`CacheManager: ${type}时间戳已备份到localStorage`);
        } catch (error) {
            console.warn(`CacheManager: localStorage备份失败`, error);
        }
    }

    private getLocalStorageBackup(type: string): number | null {
        try {
            const timestamp = localStorage.getItem(`ccf-${type}-idb-timestamp`);
            return timestamp ? parseInt(timestamp) : null;
        } catch (error) {
            console.warn(`CacheManager: localStorage读取失败`, error);
            return null;
        }
    }

    // 检查是否支持IndexedDB
    static isSupported(): boolean {
        return 'indexedDB' in window && typeof indexedDB !== 'undefined';
    }
}

// 单例模式
let cacheManager: CCFCacheManager | null = null;

export function getCacheManager(): CCFCacheManager | null {
    if (!CCFCacheManager.isSupported()) {
        console.warn('CacheManager: IndexedDB不被支持，缓存功能不可用');
        return null;
    }
    
    if (!cacheManager) {
        cacheManager = new CCFCacheManager();
    }
    
    return cacheManager;
}

export type { CacheRecord };