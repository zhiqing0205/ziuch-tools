/**
 * 学术日历工具函数
 */

import { isAfter, parseISO } from 'date-fns';
import { CalendarConference, CutoffMode, MonthMap } from './types';
import { Conference } from '@/lib/pub-finder/types';
import { convertToEast8 } from '@/lib/pub-finder/conference';

/**
 * 安全地解析日期字符串（带时区支持）
 * @param deadline - 截止日期字符串
 * @param timezone - 时区
 * @returns 解析后的 Date 对象，解析失败返回 null
 */
const parseDeadline = (deadline?: string, timezone?: string): Date | null => {
  if (!deadline || typeof deadline !== 'string') return null;

  // 跳过 TBD 或空字符串
  if (deadline.toUpperCase() === 'TBD' || deadline.trim() === '') {
    return null;
  }

  try {
    // 使用与 pub-finder 相同的时区转换逻辑
    const date = timezone ? convertToEast8(deadline, timezone) : convertToEast8(deadline);

    // 验证日期是否有效
    if (!date || isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch {
    return null;
  }
};

/**
 * 安全地解析日期字符串（简单版本）
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
 * 从CCF会议数据中提取所有年份的会议（不再只保留最新一届）
 * @param conferences - Conference 类型的会议数组
 * @returns 适用于日历展示的会议列表（包含所有有效年份）
 */
export const pickLatestConferences = (conferences: Conference[]): CalendarConference[] => {
  if (!Array.isArray(conferences)) {
    console.warn('pickLatestConferences: 输入不是数组');
    return [];
  }

  const result: CalendarConference[] = [];

  for (const conf of conferences) {
    // 验证基本字段
    if (!conf.title || !Array.isArray(conf.confs)) {
      continue;
    }

    // 遍历所有年份的实例（不再只保留最新一届）
    for (const instance of conf.confs) {
      if (!Array.isArray(instance.timeline) || instance.timeline.length === 0) {
        continue;
      }

      // 提取所有有效的截止日期
      const validDeadlines = instance.timeline
        .map((t, idx) => ({
          index: idx,
          date: parseDeadline(t.deadline, instance.timezone),
          comment: t.comment,
          deadline: t.deadline,
        }))
        .filter((t) => t.date !== null);

      if (validDeadlines.length === 0) {
        continue;
      }

      // 选择该实例中最晚的截止日期作为展示
      const chosen = validDeadlines.sort((a, b) => b.date!.getTime() - a.date!.getTime())[0];

      const calendarConference: CalendarConference = {
        id: `${conf.title}-${instance.year ?? 'unknown'}`, // 使用 title-year 作为唯一ID
        name: conf.title,
        abbr: conf.title,
        year: instance.year,
        category: conf.sub || conf.rank?.ccf,
        ddl: chosen.date!.toISOString(),
        month: chosen.date!.getMonth(),
        location: instance.place,
        link: instance.link || conf.dblp,
      };

      result.push(calendarConference);
    }
  }

  // 按年份降序排序
  return result.sort((a, b) => {
    const yearA = a.year ?? 0;
    const yearB = b.year ?? 0;
    return yearB - yearA;
  });
};

/**
 * 按会议名称分组
 * @param conferences - 会议列表
 * @returns 会议名称到会议列表的映射
 */
export const groupConferencesByTitle = (
  conferences: CalendarConference[]
): Record<string, CalendarConference[]> => {
  return conferences.reduce<Record<string, CalendarConference[]>>((acc, conf) => {
    const title = conf.name;
    if (!acc[title]) {
      acc[title] = [];
    }
    acc[title].push(conf);
    return acc;
  }, {});
};
