import { Conference, ConferenceAcceptance, DeadlineInfo, AcceptanceRate, AcceptanceRateItem } from './types';

// 使用更unique的键名避免冲突
const CONF_CACHE_KEY = 'ccf-conference-data-v2';
const ACC_CACHE_KEY = 'ccf-acceptance-data-v2';
const CACHE_TIMESTAMP_KEY = 'ccf-cache-timestamp-v2';
const CACHE_DURATION = 1 * 24 * 60 * 60 * 1000; // 一天的毫秒数

// 获取localStorage使用情况
function getLocalStorageInfo() {
    try {
        let totalSize = 0;
        let ccfSize = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                const size = (localStorage[key].length + key.length) * 2; // approximate size in bytes
                totalSize += size;
                if (key.startsWith('ccf-')) {
                    ccfSize += size;
                }
            }
        }
        return {
            totalSize: totalSize,
            ccfSize: ccfSize,
            itemCount: localStorage.length,
            ccfKeys: Object.keys(localStorage).filter(key => key.startsWith('ccf-'))
        };
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
}

// 测试localStorage是否正常工作
function testLocalStorage() {
    try {
        const testKey = 'ccf-storage-test-' + Date.now();
        const testData = { test: 'data', timestamp: Date.now() };
        const testString = JSON.stringify(testData);
        
        // 测试写入
        localStorage.setItem(testKey, testString);
        
        // 测试读取
        const retrieved = localStorage.getItem(testKey);
        const parsed = retrieved ? JSON.parse(retrieved) : null;
        
        // 清理测试数据
        localStorage.removeItem(testKey);
        
        return {
            writeSuccess: true,
            readSuccess: !!retrieved,
            parseSuccess: parsed && parsed.test === 'data',
            dataIntegrity: JSON.stringify(parsed) === testString
        };
    } catch (e) {
        return {
            writeSuccess: false,
            error: e instanceof Error ? e.message : 'Unknown error'
        };
    }
}

export async function fetchConferenceData() {
    console.log('Frontend: 开始获取会议数据...');
    
    // 首先检查缓存
    const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    const cachedConf = localStorage.getItem(CONF_CACHE_KEY);
    const cachedAcc = localStorage.getItem(ACC_CACHE_KEY);
    
    console.log('Frontend: 详细缓存状态检查', {
        hasTimestamp: !!cachedTimestamp,
        hasConf: !!cachedConf,
        hasAcc: !!cachedAcc,
        timestamp: cachedTimestamp,
        now: Date.now(),
        cacheAge: cachedTimestamp ? (Date.now() - parseInt(cachedTimestamp)) / (1000 * 60 * 60) : null, // hours
        confSize: cachedConf ? cachedConf.length : 0,
        accSize: cachedAcc ? cachedAcc.length : 0,
        storageInfo: getLocalStorageInfo(),
        cacheKeys: [CONF_CACHE_KEY, ACC_CACHE_KEY, CACHE_TIMESTAMP_KEY]
    });
    
    // 如果所有缓存都存在，检查是否过期
    if (cachedTimestamp && cachedConf && cachedAcc) {
        const timestamp = parseInt(cachedTimestamp);
        const now = Date.now();
        const cacheAge = now - timestamp;
        
        console.log('Frontend: 缓存年龄检查', {
            cacheAgeHours: cacheAge / (1000 * 60 * 60),
            maxAgeHours: CACHE_DURATION / (1000 * 60 * 60),
            isExpired: cacheAge >= CACHE_DURATION
        });
        
        // 如果缓存未过期，直接返回缓存数据
        if (cacheAge < CACHE_DURATION) {
            console.log('Frontend: 使用有效缓存数据');
            try {
                return {
                    conferences: JSON.parse(cachedConf),
                    acceptances: JSON.parse(cachedAcc)
                };
            } catch (parseError) {
                console.error('Frontend: 缓存数据解析失败，清除缓存', parseError);
                localStorage.removeItem(CONF_CACHE_KEY);
                localStorage.removeItem(ACC_CACHE_KEY);
                localStorage.removeItem(CACHE_TIMESTAMP_KEY);
            }
        } else {
            console.log('Frontend: 缓存已过期，需要获取新数据');
        }
    } else {
        console.log('Frontend: 缓存不完整，需要获取新数据');
    }

    // 缓存过期或不存在，通过API获取数据
    try {
        console.log('Frontend: 通过API获取数据...');
        const response = await fetch('/api/ccf-data', {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache',
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Frontend: API请求失败', {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            });
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success || !result.data) {
            console.error('Frontend: API返回错误数据', result);
            throw new Error('API returned invalid data');
        }

        const { conferences, acceptances } = result.data;
        
        console.log('Frontend: API数据获取成功', {
            conferencesCount: conferences?.length || 0,
            acceptancesCount: acceptances?.length || 0,
            serverTimestamp: result.timestamp,
            serverFetchTime: result.fetchTime
        });

        // 验证数据格式
        if (!Array.isArray(conferences) || !Array.isArray(acceptances)) {
            console.error('Frontend: 数据格式验证失败', {
                conferencesType: typeof conferences,
                conferencesIsArray: Array.isArray(conferences),
                acceptancesType: typeof acceptances,
                acceptancesIsArray: Array.isArray(acceptances)
            });
            throw new Error('Invalid data format from API');
        }

        // 全面的localStorage诊断和存储
        console.log('Frontend: localStorage环境检查');
        const storageInfo = getLocalStorageInfo();
        const storageTest = testLocalStorage();
        
        console.log('Frontend: localStorage状态', {
            storageInfo,
            storageTest,
            isSecureContext: typeof window !== 'undefined' && window.isSecureContext,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 100) : 'unknown'
        });
        
        // 如果localStorage基本功能都不正常，直接返回数据
        if (!storageTest.writeSuccess) {
            console.error('Frontend: localStorage基本功能异常，跳过缓存存储');
            return { conferences, acceptances };
        }
        
        try {
            console.log('Frontend: 开始更新localStorage缓存...');
            
            const confData = JSON.stringify(conferences);
            const accData = JSON.stringify(acceptances);
            const timestampData = Date.now().toString();
            
            console.log('Frontend: 缓存数据准备完成', {
                confDataSize: confData.length,
                accDataSize: accData.length,
                timestamp: timestampData,
                totalDataSize: (confData.length + accData.length + timestampData.length) * 2 // approximate bytes
            });
            
            // 先清理旧的缓存数据
            console.log('Frontend: 清理旧缓存数据...');
            localStorage.removeItem(CONF_CACHE_KEY);
            localStorage.removeItem(ACC_CACHE_KEY);
            localStorage.removeItem(CACHE_TIMESTAMP_KEY);
            
            // 分步存储并验证每一步
            console.log('Frontend: 存储会议数据...');
            localStorage.setItem(CONF_CACHE_KEY, confData);
            let storedConf = localStorage.getItem(CONF_CACHE_KEY);
            console.log('Frontend: 会议数据存储验证', {
                attempted: true,
                retrieved: !!storedConf,
                sizeMatch: storedConf ? storedConf.length === confData.length : false
            });
            
            console.log('Frontend: 存储录用率数据...');
            localStorage.setItem(ACC_CACHE_KEY, accData);
            let storedAcc = localStorage.getItem(ACC_CACHE_KEY);
            console.log('Frontend: 录用率数据存储验证', {
                attempted: true,
                retrieved: !!storedAcc,
                sizeMatch: storedAcc ? storedAcc.length === accData.length : false
            });
            
            console.log('Frontend: 存储时间戳...');
            localStorage.setItem(CACHE_TIMESTAMP_KEY, timestampData);
            let storedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
            console.log('Frontend: 时间戳存储验证', {
                attempted: true,
                retrieved: !!storedTimestamp,
                valueMatch: storedTimestamp === timestampData
            });
            
            // 最终存储状态检查
            const finalStorageInfo = getLocalStorageInfo();
            console.log('Frontend: 存储完成后状态', {
                finalStorageInfo,
                allDataStored: !!storedConf && !!storedAcc && !!storedTimestamp
            });
            
            // 立即测试缓存是否能正常工作
            console.log('Frontend: 立即验证缓存读取...');
            setTimeout(() => {
                const testTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
                const testConf = localStorage.getItem(CONF_CACHE_KEY);
                const testAcc = localStorage.getItem(ACC_CACHE_KEY);
                console.log('Frontend: 延迟验证缓存状态', {
                    timestampExists: !!testTimestamp,
                    confExists: !!testConf,
                    accExists: !!testAcc,
                    timestampValue: testTimestamp
                });
            }, 100);
            
        } catch (storageError) {
            console.error('Frontend: localStorage存储失败', {
                error: storageError,
                message: storageError instanceof Error ? storageError.message : 'Unknown storage error',
                stack: storageError instanceof Error ? storageError.stack : undefined,
                storageInfo: getLocalStorageInfo(),
                storageTest: testLocalStorage()
            });
        }

        return { conferences, acceptances };
        
    } catch (fetchError) {
        console.error('Frontend: 通过API获取数据失败', fetchError);
        
        // API获取失败，尝试使用缓存数据（即使已过期）
        if (cachedConf && cachedAcc) {
            console.log('Frontend: API获取失败，使用过期的缓存数据');
            try {
                return {
                    conferences: JSON.parse(cachedConf),
                    acceptances: JSON.parse(cachedAcc)
                };
            } catch (parseError) {
                console.error('Frontend: 过期缓存数据解析也失败', parseError);
            }
        }
        
        console.error('Frontend: 没有可用数据，返回空数据');
        return { conferences: [], acceptances: [] };
    }
}

function padZero(num: number): string {
    return num.toString().padStart(2, '0');
}

function getChineseTime() {
    const now = new Date();
    return new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
}

/**
 * 将指定时区的时间转换为东八区(UTC+8)时间
 * @param {string} dateStr - 时间字符串，格式："YYYY-MM-DD HH:mm:ss"
 * @param {string} timezone - 时区，格式："UTC±n" 或 "AoE"
 * @returns {Date} 转换后的东八区 Date 对象
 */
export function convertToEast8(dateStr: string, timezone: string): Date {
    // 如果是 AoE，直接使用原始时间，不进行时区转换
    if (timezone.toUpperCase() === 'AOE') {
        return new Date(dateStr);
    }
    
    // 解析时区偏移量
    const timezoneOffset = parseInt(timezone.replace('UTC', ''));
    
    // 解析输入的时间
    const inputDate = new Date(dateStr);
    
    // 将输入时间转换为UTC时间
    const utcTime = new Date(inputDate.getTime() - (timezoneOffset * 60 * 60 * 1000));
    
    // 转换为东八区时间 (UTC+8)
    const targetTimezone = 8;
    const east8Time = new Date(utcTime.getTime() + (targetTimezone * 60 * 60 * 1000));
    
    return east8Time;
}

/**
 * 获取当前东八区时间
 * @returns {Date} 当前的东八区 Date 对象
 */
function getCurrentEast8Time(): Date {
    const now = new Date();
    const targetTimezone = 8;
    // 计算当前时区与UTC的偏移小时数
    const currentOffset = -now.getTimezoneOffset() / 60;
    // 调整到东八区
    return new Date(now.getTime() + ((targetTimezone - currentOffset) * 60 * 60 * 1000));
}

export function formatTimeLeft(deadline: Date): string {
    const now = getCurrentEast8Time();
    const diff = deadline.getTime() - now.getTime();
    
    if (diff <= 0) return '已截止';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${padZero(days)}天${padZero(hours)}小时${padZero(minutes)}分${padZero(seconds)}秒`;
}

export function getUpcomingDeadlines(conferences: Conference[]): DeadlineInfo[] {
    const now = getCurrentEast8Time();
    const deadlines: DeadlineInfo[] = [];

    conferences.forEach(conf => {
        if (conf.confs == null || conf.confs == undefined) return;
        conf.confs.forEach(instance => {
            instance.timeline.forEach(time => {
                if (!time.deadline) return;
                
                // 处理时区转换
                const deadline = instance.timezone ? 
                    convertToEast8(time.deadline, instance.timezone) : 
                    new Date(time.deadline);
                
                if (deadline.getTime() > now.getTime()) {
                    deadlines.push({
                        title: conf.title,
                        description: conf.description,
                        year: instance.year,
                        rank: conf.rank?.ccf,
                        sub: conf.sub,
                        deadline,
                        link: instance.link,
                        comment: time.comment,
                        diff: deadline.getTime() - now.getTime(),
                        timezone: instance.timezone // 可选：添加时区信息到 DeadlineInfo 接口
                    });
                }
            });
        });
    });

    return deadlines.sort((a, b) => a.diff - b.diff);
}

export function searchConferenceDeadlines(conferences: Conference[], searchTerm: string): DeadlineInfo[] {
    const term = searchTerm.toLowerCase();
    const now = getCurrentEast8Time();
    const deadlines: DeadlineInfo[] = [];

    conferences.forEach(conf => {
        if (conf.title.toLowerCase() != term) return;
        console.log("Searching for", term, "in", conf.title);
        console.log("Conf", conf);
        if (conf.confs == null || conf.confs == undefined) return;
        conf.confs.forEach(instance => {
            instance.timeline.forEach(time => {
                if (!time.deadline) return;

                const deadline = instance.timezone ? 
                    convertToEast8(time.deadline, instance.timezone) : 
                    new Date(time.deadline);

                deadlines.push({
                    title: conf.title,
                    description: conf.description,
                    year: instance.year,
                    rank: conf.rank?.ccf,
                    sub: conf.sub,
                    deadline,
                    link: instance.link,
                    comment: time.comment,
                    diff: deadline.getTime() - now.getTime(),
                    timezone: instance.timezone
                });
            });
        });
    });

    return deadlines.sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff));
}

export function findRecentAcceptanceRate(acceptances: AcceptanceRate[], conf: DeadlineInfo): AcceptanceRateItem | null {
    for (const acc of acceptances) {
        if (acc.title.toLowerCase() === conf.title.toLowerCase()) {
            // 使用 find 替代 forEach
            const rate = acc.accept_rates.find(rate => rate.year === conf.year);
            if (rate) {
                console.log("Found acceptance rate", rate);
                return rate;
            }
        }
    }

    console.log("No acceptance rate found for", conf.title, conf.year);
    return null;
}
