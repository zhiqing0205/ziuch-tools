/**
 * 学术日历相关类型定义
 */

/**
 * 时间分界模式
 * - ddl: 以截止日期为分界
 * - start: 以开始日期为分界
 */
export type CutoffMode = 'ddl' | 'start';

/**
 * 日历会议信息
 */
export interface CalendarConference {
  /** 唯一标识符 */
  id: string;
  /** 会议完整名称 */
  name: string;
  /** 会议缩写 */
  abbr?: string;
  /** 年份 */
  year?: number;
  /** 分类/领域 */
  category?: string;
  /** 截止日期 (ISO 8601) */
  ddl?: string;
  /** 开始日期 (ISO 8601) */
  start?: string;
  /** 结束日期 (ISO 8601) */
  end?: string;
  /** 月份索引 (0-11) */
  month?: number;
  /** 地点 */
  location?: string;
  /** 链接 */
  link?: string;
}

/**
 * 月份会议映射表
 */
export type MonthMap = Record<number, CalendarConference[]>;

/**
 * 时间线锚点
 */
export interface TimelineAnchor {
  /** 月份索引 (0-11) */
  month: number;
  /** X坐标 */
  x: number;
  /** Y坐标 */
  y: number;
  /** 在路径上的比例位置 (0-1) */
  ratio: number;
}

/**
 * 蛇形路径配置
 */
export interface SinePathConfig {
  /** 月份数量，默认12 */
  months?: number;
  /** 振幅，默认140 */
  amplitude?: number;
  /** 视图框宽度，默认1200 */
  viewBoxWidth?: number;
  /** 视图框高度，默认600 */
  viewBoxHeight?: number;
}

/**
 * 学术日历设置（用于持久化）
 */
export interface CalendarSettings {
  /** 版本号，用于兼容性检查 */
  version: number;
  /** 选中的会议ID列表 */
  selectedIds: string[];
  /** 是否显示已过去时间的样式 */
  showPast: boolean;
  /** 时间分界模式 */
  cutoffMode: CutoffMode;
  /** 是否显示人物形象指示器 */
  showAvatarIndicator: boolean;
  /** 是否高亮当前月份 */
  showMonthHighlight: boolean;
}

/**
 * 默认设置
 */
export const DEFAULT_SETTINGS: CalendarSettings = {
  version: 1,
  selectedIds: [],
  showPast: true,
  cutoffMode: 'ddl',
  showAvatarIndicator: true,
  showMonthHighlight: true,
};
