import { Conference, ConferenceAcceptance, DeadlineInfo, AcceptanceRate, AcceptanceRateItem } from './types';

const CONF_CACHE_KEY = 'conference-data';
const ACC_CACHE_KEY = 'conference-acceptance-data';
const CONF_MD5_KEY = 'ccf-conf-md5';
const ACC_MD5_KEY = 'ccf-acc-md5';
const CACHE_TIMESTAMP_KEY = 'conference-data-timestamp';

async function shouldUpdateCache(): Promise<boolean> {
  try {
    // 获取本地缓存的MD5值
    const localConfMD5 = localStorage.getItem(CONF_MD5_KEY);
    const localAccMD5 = localStorage.getItem(ACC_MD5_KEY);
    
    if (!localConfMD5 || !localAccMD5) {
      return true; // 如果没有本地MD5，需要更新
    }
    
    // 从服务端获取最新的MD5值
    const response = await fetch('/api/ccf/metadata');
    if (!response.ok) {
      return false; // 服务端不可用，使用缓存
    }
    
    const { confMD5, accMD5 } = await response.json();
    
    // 比较MD5值
    return localConfMD5 !== confMD5 || localAccMD5 !== accMD5;
  } catch (error) {
    console.error('检查MD5失败，使用本地缓存:', error);
    return false;
  }
}

async function fetchDataFromServer(): Promise<{ conferences: Conference[], acceptances: AcceptanceRate[] } | null> {
  try {
    console.log('从服务端获取CCF数据...');
    const response = await fetch('/api/ccf/data');
    if (!response.ok) {
      const errorData = await response.json();
      console.error('服务端返回错误:', errorData);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const { conferences, acceptances, metadata } = await response.json();
    
    console.log('服务端数据获取成功，会议数量:', conferences?.length || 0, '录用率记录数量:', acceptances?.length || 0);
    
    // 更新缓存
    localStorage.setItem(CONF_CACHE_KEY, JSON.stringify(conferences));
    localStorage.setItem(ACC_CACHE_KEY, JSON.stringify(acceptances));
    localStorage.setItem(CONF_MD5_KEY, metadata.confMD5);
    localStorage.setItem(ACC_MD5_KEY, metadata.accMD5);
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    
    return { conferences, acceptances };
  } catch (error) {
    console.error('从服务端获取数据失败:', error);
    return null;
  }
}

async function fetchDataFromRemote(): Promise<{ conferences: Conference[], acceptances: AcceptanceRate[] } | null> {
  try {
    console.log('直接从远程获取CCF数据...');
    const [confResponse, accResponse] = await Promise.all([
      fetch('https://ccfddl.com/conference/allconf.yml'),
      fetch('https://ccfddl.com/conference/allacc.yml')
    ]);
    
    if (!confResponse.ok || !accResponse.ok) {
      throw new Error(`远程数据获取失败: ${confResponse.status}, ${accResponse.status}`);
    }
    
    const [confYaml, accYaml] = await Promise.all([
      confResponse.text(),
      accResponse.text()
    ]);
    
    const { parse } = await import('yaml');
    const conferences = parse(confYaml) as Conference[];
    const acceptances = parse(accYaml) as AcceptanceRate[];
    
    console.log('从远程获取成功，会议数量:', conferences?.length || 0, '录用率记录数量:', acceptances?.length || 0);
    
    // 缓存到localStorage
    localStorage.setItem(CONF_CACHE_KEY, JSON.stringify(conferences));
    localStorage.setItem(ACC_CACHE_KEY, JSON.stringify(acceptances));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    
    return {
      conferences,
      acceptances
    };
  } catch (error) {
    console.error('从远程获取数据失败:', error);
    return null;
  }
}

function getCachedData(): { conferences: Conference[], acceptances: AcceptanceRate[] } | null {
  try {
    const cachedConf = localStorage.getItem(CONF_CACHE_KEY);
    const cachedAcc = localStorage.getItem(ACC_CACHE_KEY);
    
    if (cachedConf && cachedAcc) {
      return {
        conferences: JSON.parse(cachedConf),
        acceptances: JSON.parse(cachedAcc)
      };
    }
    return null;
  } catch (error) {
    console.error('读取缓存数据失败:', error);
    return null;
  }
}

export async function fetchConferenceData(): Promise<{ conferences: Conference[], acceptances: AcceptanceRate[] }> {
  try {
    console.log('开始获取会议数据...');
    
    // 检查是否需要更新缓存（通过MD5验证）
    const needsUpdate = await shouldUpdateCache();
    console.log('是否需要更新:', needsUpdate);
    
    if (!needsUpdate) {
      // MD5一致，使用本地缓存
      const cachedData = getCachedData();
      if (cachedData) {
        console.log('使用本地缓存数据（MD5验证通过）');
        return cachedData;
      }
    }
    
    // 需要更新或没有缓存，从服务端获取
    let serverData = await fetchDataFromServer();
    
    if (serverData) {
      console.log('从服务端获取数据成功');
      return serverData;
    }
    
    // 服务端获取失败，尝试直接从远程获取
    console.log('服务端不可用，尝试直接从远程获取...');
    const remoteData = await fetchDataFromRemote();
    if (remoteData) {
      console.log('从远程获取数据成功');
      return remoteData;
    }
    
    // 远程获取也失败，尝试使用本地缓存
    const cachedData = getCachedData();
    if (cachedData) {
      console.log('所有远程数据源都不可用，使用本地缓存数据');
      return cachedData;
    }
    
    // 没有任何数据可用
    console.error('无可用数据源');
    return { conferences: [], acceptances: [] };
    
  } catch (error) {
    console.error('获取会议数据失败:', error);
    
    // 发生错误时尝试使用缓存
    const cachedData = getCachedData();
    if (cachedData) {
      console.log('发生错误，使用本地缓存数据');
      return cachedData;
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
