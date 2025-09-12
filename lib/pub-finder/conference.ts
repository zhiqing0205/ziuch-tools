import { Conference, ConferenceAcceptance, DeadlineInfo, AcceptanceRate, AcceptanceRateItem } from './types';

const CONF_CACHE_KEY = 'conference-data';
const ACC_CACHE_KEY = 'conference-acceptance-data';
const CACHE_TIMESTAMP_KEY = 'conference-data-timestamp';
const CACHE_DURATION = 1 * 24 * 60 * 60 * 1000; // 一天的毫秒数

export async function fetchConferenceData() {
    console.log('Frontend: 开始获取会议数据...');
    
    // 首先检查缓存
    const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    const cachedConf = localStorage.getItem(CONF_CACHE_KEY);
    const cachedAcc = localStorage.getItem(ACC_CACHE_KEY);
    
    console.log('Frontend: 缓存状态检查', {
        hasTimestamp: !!cachedTimestamp,
        hasConf: !!cachedConf,
        hasAcc: !!cachedAcc,
        timestamp: cachedTimestamp,
        now: Date.now(),
        cacheAge: cachedTimestamp ? (Date.now() - parseInt(cachedTimestamp)) / (1000 * 60 * 60) : null // hours
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

        // 尝试更新缓存，添加详细的错误处理
        try {
            console.log('Frontend: 开始更新localStorage缓存...');
            
            const confData = JSON.stringify(conferences);
            const accData = JSON.stringify(acceptances);
            const timestampData = Date.now().toString();
            
            console.log('Frontend: 缓存数据准备完成', {
                confDataSize: confData.length,
                accDataSize: accData.length,
                timestamp: timestampData
            });
            
            localStorage.setItem(CONF_CACHE_KEY, confData);
            console.log('Frontend: 会议数据已存储到localStorage');
            
            localStorage.setItem(ACC_CACHE_KEY, accData);
            console.log('Frontend: 录用率数据已存储到localStorage');
            
            localStorage.setItem(CACHE_TIMESTAMP_KEY, timestampData);
            console.log('Frontend: 时间戳已存储到localStorage');
            
            // 验证存储是否成功
            const storedConf = localStorage.getItem(CONF_CACHE_KEY);
            const storedAcc = localStorage.getItem(ACC_CACHE_KEY);
            const storedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
            
            console.log('Frontend: localStorage存储验证', {
                confStored: !!storedConf && storedConf.length > 0,
                accStored: !!storedAcc && storedAcc.length > 0,
                timestampStored: !!storedTimestamp,
                storedTimestamp: storedTimestamp
            });
            
        } catch (storageError) {
            console.error('Frontend: localStorage存储失败', {
                error: storageError,
                message: storageError instanceof Error ? storageError.message : 'Unknown storage error',
                // 检查localStorage可用性
                storageAvailable: typeof Storage !== 'undefined',
                localStorageQuota: (() => {
                    try {
                        const test = 'test';
                        localStorage.setItem(test, test);
                        localStorage.removeItem(test);
                        return 'available';
                    } catch {
                        return 'unavailable';
                    }
                })()
            });
            // 即使存储失败也继续返回数据
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
