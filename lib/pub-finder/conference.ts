import { Conference, ConferenceAcceptance, DeadlineInfo, AcceptanceRate, AcceptanceRateItem } from './types';
import { getCacheManager } from './cache-manager';

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
    
    // 获取缓存管理器
    const cacheManager = getCacheManager();
    
    if (cacheManager) {
        console.log('Frontend: 使用IndexedDB缓存系统');
        
        try {
            // 尝试从IndexedDB获取缓存
            const [cachedConferences, cachedAcceptances] = await Promise.all([
                cacheManager.getCache('conferences'),
                cacheManager.getCache('acceptances')
            ]);
            
            // 获取缓存统计信息
            const cacheStats = await cacheManager.getCacheStats();
            console.log('Frontend: IndexedDB缓存状态', cacheStats);
            
            // 如果两个缓存都存在且有效，直接返回
            if (cachedConferences && cachedAcceptances) {
                console.log('Frontend: 使用有效的IndexedDB缓存数据', {
                    conferencesCount: cachedConferences.length,
                    acceptancesCount: cachedAcceptances.length
                });
                return {
                    conferences: cachedConferences as Conference[],
                    acceptances: cachedAcceptances as AcceptanceRate[]
                };
            }
            
            console.log('Frontend: IndexedDB缓存过期或不完整，需要获取新数据');
        } catch (error) {
            console.error('Frontend: IndexedDB缓存操作失败，降级到localStorage', error);
        }
    } else {
        console.log('Frontend: IndexedDB不可用，使用localStorage备用方案');
        
        // localStorage备用方案
        const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        const cachedConf = localStorage.getItem(CONF_CACHE_KEY);
        const cachedAcc = localStorage.getItem(ACC_CACHE_KEY);
        
        console.log('Frontend: localStorage缓存状态检查', {
            hasTimestamp: !!cachedTimestamp,
            hasConf: !!cachedConf,
            hasAcc: !!cachedAcc,
            timestamp: cachedTimestamp,
            now: Date.now(),
            cacheAge: cachedTimestamp ? (Date.now() - parseInt(cachedTimestamp)) / (1000 * 60 * 60) : null, // hours
            storageInfo: getLocalStorageInfo()
        });
        
        // 如果localStorage缓存有效
        if (cachedTimestamp && cachedConf && cachedAcc) {
            const timestamp = parseInt(cachedTimestamp);
            const now = Date.now();
            const cacheAge = now - timestamp;
            
            if (cacheAge < CACHE_DURATION) {
                console.log('Frontend: 使用localStorage缓存数据');
                try {
                    return {
                        conferences: JSON.parse(cachedConf),
                        acceptances: JSON.parse(cachedAcc)
                    };
                } catch (parseError) {
                    console.error('Frontend: localStorage缓存解析失败', parseError);
                }
            }
        }
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

        // 存储到缓存系统
        console.log('Frontend: 开始存储数据到缓存...');
        
        if (cacheManager) {
            // 优先存储到IndexedDB
            try {
                console.log('Frontend: 存储数据到IndexedDB...');
                const [confResult, accResult] = await Promise.all([
                    cacheManager.setCache('conferences', conferences),
                    cacheManager.setCache('acceptances', acceptances)
                ]);
                
                console.log('Frontend: IndexedDB存储结果', {
                    conferencesStored: confResult,
                    acceptancesStored: accResult
                });
                
                if (confResult && accResult) {
                    console.log('Frontend: 数据已成功存储到IndexedDB');
                    // 获取更新后的缓存统计
                    const updatedStats = await cacheManager.getCacheStats();
                    console.log('Frontend: 更新后的IndexedDB状态', updatedStats);
                } else {
                    console.warn('Frontend: IndexedDB存储部分失败，降级到localStorage');
                    throw new Error('IndexedDB存储失败');
                }
                
            } catch (idbError) {
                console.error('Frontend: IndexedDB存储失败，降级到localStorage', idbError);
                // 降级到localStorage存储
                await fallbackToLocalStorage(conferences, acceptances);
            }
        } else {
            // 直接使用localStorage
            await fallbackToLocalStorage(conferences, acceptances);
        }
        
        async function fallbackToLocalStorage(conferences: Conference[], acceptances: AcceptanceRate[]) {
            console.log('Frontend: 使用localStorage备用存储...');
            
            const storageInfo = getLocalStorageInfo();
            const storageTest = testLocalStorage();
            
            console.log('Frontend: localStorage环境检查', {
                storageInfo,
                storageTest
            });
            
            if (!storageTest.writeSuccess) {
                console.error('Frontend: localStorage不可用，跳过缓存');
                return;
            }
            
            try {
                const timestamp = Date.now().toString();
                
                // 只存储较小的时间戳信息
                localStorage.setItem(CACHE_TIMESTAMP_KEY, timestamp);
                console.log('Frontend: 时间戳已存储到localStorage备用');
                
                // 尝试存储较小的数据子集或压缩数据
                const confSample = conferences.slice(0, Math.min(100, conferences.length));
                const accSample = acceptances.slice(0, Math.min(50, acceptances.length));
                
                localStorage.setItem(CONF_CACHE_KEY + '-sample', JSON.stringify(confSample));
                localStorage.setItem(ACC_CACHE_KEY + '-sample', JSON.stringify(accSample));
                
                console.log('Frontend: 数据样本已存储到localStorage', {
                    originalConf: conferences.length,
                    sampleConf: confSample.length,
                    originalAcc: acceptances.length,
                    sampleAcc: accSample.length
                });
                
            } catch (lsError) {
                console.error('Frontend: localStorage备用存储也失败', lsError);
            }
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
 * @param {string} timezone - 时区，格式："UTC±n" 或 "AoE" 或 "UTC"
 * @returns {Date} 转换后的东八区 Date 对象，如果输入无效则返回null
 */
export function convertToEast8(dateStr: string | Date, timezone?: string): Date | null {
    // 如果输入已经是 Date 对象，直接使用
    let inputDate: Date;
    if (dateStr instanceof Date) {
        inputDate = dateStr;
    } else {
        // 检查是否为TBD或其他无效日期字符串
        if (typeof dateStr === 'string' && (dateStr.toUpperCase() === 'TBD' || dateStr.trim() === '')) {
            console.warn('Date marked as TBD or empty:', dateStr);
            return null; // 返回null表示无效日期
        }

        // 尝试解析字符串为日期
        inputDate = new Date(dateStr);
        // 检查日期是否有效
        if (isNaN(inputDate.getTime())) {
            console.error('Invalid date string:', dateStr);
            return null; // 返回null表示无效日期
        }
    }

    // 如果没有提供时区或者是 AoE，直接返回原始时间
    if (!timezone || timezone.toUpperCase() === 'AOE') {
        return inputDate;
    }

    try {
        let timezoneOffset = 0;

        // 处理纯UTC格式
        if (timezone.toUpperCase() === 'UTC') {
            timezoneOffset = 0;
        } else {
            // 解析UTC±n格式的时区偏移量
            const offsetStr = timezone.replace(/UTC/i, '');
            timezoneOffset = parseInt(offsetStr);

            // 如果时区偏移量无效，直接返回原始时间
            if (isNaN(timezoneOffset)) {
                console.warn('Invalid timezone format:', timezone);
                return inputDate;
            }
        }

        // 将输入时间转换为UTC时间
        const utcTime = new Date(inputDate.getTime() - (timezoneOffset * 60 * 60 * 1000));

        // 转换为东八区时间 (UTC+8)
        const targetTimezone = 8;
        const east8Time = new Date(utcTime.getTime() + (targetTimezone * 60 * 60 * 1000));

        return east8Time;
    } catch (error) {
        console.error('Error converting timezone:', error);
        return inputDate; // 出错时返回原始时间
    }
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

                try {
                    // 处理时区转换，现在可能返回null
                    const deadline = instance.timezone ?
                        convertToEast8(time.deadline, instance.timezone) :
                        convertToEast8(time.deadline);

                    // 如果转换失败（TBD或无效日期），跳过这个条目
                    if (!deadline) {
                        console.log(`Skipping invalid deadline for ${conf.title}: ${time.deadline}`);
                        return;
                    }

                    // 只添加未来的截止日期
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
                            timezone: instance.timezone
                        });
                    }
                } catch (error) {
                    console.error(`Error processing deadline for ${conf.title}:`, error);
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

                try {
                    // 处理时区转换，现在可能返回null
                    const deadline = instance.timezone ?
                        convertToEast8(time.deadline, instance.timezone) :
                        convertToEast8(time.deadline);

                    // 如果转换失败（TBD或无效日期），跳过这个条目
                    if (!deadline) {
                        console.log(`Skipping invalid deadline for ${conf.title}: ${time.deadline}`);
                        return;
                    }

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
                } catch (error) {
                    console.error(`Error processing search deadline for ${conf.title}:`, error);
                }
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
