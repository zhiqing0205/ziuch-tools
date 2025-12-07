/**
 * 学术日历工具函数
 */

import { isAfter, parseISO } from 'date-fns';
import { CalendarConference, CutoffMode, MonthMap } from './types';

/**
 * 安全地解析日期字符串
 * @param value - ISO 8601 日期字符串
 * @returns 解析后的 Date 对象，解析失败返回 null
 */
const safeParseDate = (value?: string): Date | null => {
  if (!value || typeof value !== 'string') return null;
  try {
    const date = parseISO(value);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

/**
 * 判断会议是否已过去
 * @param conference - 会议信息
 * @param cutoffMode - 时间分界模式
 * @param now - 当前时间
 * @returns 是否已过去
 */
export const isPastConference = (
  conference: CalendarConference,
  cutoffMode: CutoffMode,
  now: Date
): boolean => {
  // 根据分界模式选择参考日期
  const referenceDate =
    cutoffMode === 'ddl'
      ? safeParseDate(conference.ddl) ??
        safeParseDate(conference.start) ??
        safeParseDate(conference.end)
      : safeParseDate(conference.start) ??
        safeParseDate(conference.ddl) ??
        safeParseDate(conference.end);

  if (!referenceDate) return false;

  // 将参考日期和当前日期都归零到当天的0点进行比较
  // 这样截止日当天会被视为"未过去"
  const refDateOnly = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return isAfter(nowDateOnly, refDateOnly);
};

/**
 * 按月份分组会议并排序
 * @param conferences - 会议列表
 * @returns 月份会议映射表
 */
export const groupConferencesByMonth = (conferences: CalendarConference[]): MonthMap => {
  const grouped = conferences.reduce<MonthMap>((accumulator, conference) => {
    // 确定月份索引
    const monthIndex =
      typeof conference.month === 'number' && conference.month >= 0 && conference.month < 12
        ? conference.month
        : safeParseDate(conference.ddl)?.getMonth() ??
          safeParseDate(conference.start)?.getMonth() ??
          safeParseDate(conference.end)?.getMonth() ??
          0;

    if (!accumulator[monthIndex]) {
      accumulator[monthIndex] = [];
    }
    accumulator[monthIndex].push(conference);

    return accumulator;
  }, {});

  // 对每个月的会议按日期排序
  for (const monthIndex in grouped) {
    grouped[monthIndex].sort((a, b) => {
      const dateA = safeParseDate(a.ddl) ?? safeParseDate(a.start) ?? new Date(0);
      const dateB = safeParseDate(b.ddl) ?? safeParseDate(b.start) ?? new Date(0);
      return dateA.getTime() - dateB.getTime();
    });
  }

  return grouped;
};

/**
 * 生成会议的标准化ID
 * @param conference - 原始会议数据
 * @returns 标准化的ID
 */
const normalizeConferenceId = (conference: any): string => {
  const baseName = conference.id || conference.abbr || conference.name || 'conf';
  const year =
    conference.year ||
    safeParseDate(conference.ddl)?.getFullYear() ||
    safeParseDate(conference.start)?.getFullYear() ||
    'unknown';
  return `${baseName}-${year}`;
};

/**
 * 从原始数据中筛选最新届会议
 * @param rawData - 原始会议数据数组
 * @returns 最新届会议列表
 */
export const pickLatestConferences = (rawData: any[]): CalendarConference[] => {
  const latestConferenceMap = new Map<string, CalendarConference>();

  for (const row of rawData ?? []) {
    const conferenceId = normalizeConferenceId(row);

    const conference: CalendarConference = {
      id: conferenceId,
      name: row.name ?? row.fullName ?? 'Unknown Conference',
      abbr: row.abbr ?? row.shortName,
      year: row.year,
      category: row.category,
      ddl: row.ddl,
      start: row.start,
      end: row.end,
      month: row.month,
      location: row.location,
      link: row.link ?? row.url,
    };

    const conferenceName = conference.name;
    const existingConference = latestConferenceMap.get(conferenceName);

    if (!existingConference) {
      latestConferenceMap.set(conferenceName, conference);
      continue;
    }

    // 比较日期，保留最新的会议
    const existingDate = safeParseDate(existingConference.ddl) ?? safeParseDate(existingConference.start);
    const candidateDate = safeParseDate(conference.ddl) ?? safeParseDate(conference.start);

    if (existingDate && candidateDate && isAfter(candidateDate, existingDate)) {
      latestConferenceMap.set(conferenceName, conference);
    } else if (!existingDate && candidateDate) {
      latestConferenceMap.set(conferenceName, conference);
    }
  }

  return Array.from(latestConferenceMap.values());
};
