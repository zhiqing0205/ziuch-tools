import { parse } from 'yaml';
import { Conference, ConferenceAcceptance, DeadlineInfo, AcceptanceRate, AcceptanceRateItem } from './types';

const CONF_CACHE_KEY = 'conference-data';
const ACC_CACHE_KEY = 'conference-acceptance-data';
const CACHE_TIMESTAMP_KEY = 'conference-data-timestamp';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 一周的毫秒数

// export async function fetchConferenceData() {
//     try {
//         const [confResponse, accResponse] = await Promise.all([
//             fetch('https://ccfddl.com/conference/allconf.yml'),
//             fetch('https://ccfddl.com/conference/allacc.yml')
//         ]);

//         const [confYaml, accYaml] = await Promise.all([
//             confResponse.text(),
//             accResponse.text()
//         ]);

//         const conferences = parse(confYaml) as Conference[];
//         const acceptances = parse(accYaml) as AcceptanceRate[];

//         // 更新缓存
//         localStorage.setItem(CONF_CACHE_KEY, JSON.stringify(conferences));
//         localStorage.setItem(ACC_CACHE_KEY, JSON.stringify(acceptances));
//         localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());

//         return { conferences, acceptances };
//     } catch (error) {
//         console.error('Error fetching conference data:', error);
//         // 如果有缓存数据，在请求失败时返回缓存数据
//         const cachedConf = localStorage.getItem(CONF_CACHE_KEY);
//         const cachedAcc = localStorage.getItem(ACC_CACHE_KEY);
//         if (cachedConf && cachedAcc) {
//             return {
//                 conferences: JSON.parse(cachedConf),
//                 acceptances: JSON.parse(cachedAcc)
//             };
//         }
//         return { conferences: [], acceptances: [] };
//     }
// }

export async function fetchConferenceData() {
    // 首先检查缓存
    const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    const cachedConf = localStorage.getItem(CONF_CACHE_KEY);
    const cachedAcc = localStorage.getItem(ACC_CACHE_KEY);
    
    // 如果所有缓存都存在，检查是否过期
    if (cachedTimestamp && cachedConf && cachedAcc) {
        const timestamp = parseInt(cachedTimestamp);
        const now = Date.now();
        
        // 如果缓存未过期，直接返回缓存数据
        if (now - timestamp < CACHE_DURATION) {
            return {
                conferences: JSON.parse(cachedConf),
                acceptances: JSON.parse(cachedAcc)
            };
        }
    }

    // 如果没有缓存或缓存已过期，从远程获取数据
    try {
        const [confResponse, accResponse] = await Promise.all([
            fetch('https://ccfddl.com/conference/allconf.yml'),
            fetch('https://ccfddl.com/conference/allacc.yml')
        ]);

        const [confYaml, accYaml] = await Promise.all([
            confResponse.text(),
            accResponse.text()
        ]);

        const conferences = parse(confYaml) as Conference[];
        const acceptances = parse(accYaml) as AcceptanceRate[];

        // 更新缓存
        localStorage.setItem(CONF_CACHE_KEY, JSON.stringify(conferences));
        localStorage.setItem(ACC_CACHE_KEY, JSON.stringify(acceptances));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());

        return { conferences, acceptances };
    } catch (error) {
        console.error('Error fetching conference data:', error);
        
        // 如果远程获取失败且有缓存数据，返回缓存数据（即使已过期）
        if (cachedConf && cachedAcc) {
            return {
                conferences: JSON.parse(cachedConf),
                acceptances: JSON.parse(cachedAcc)
            };
        }
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
function convertToEast8(dateStr: string, timezone: string): Date {
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
                    diff: deadline.getTime() - now.getTime()
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
