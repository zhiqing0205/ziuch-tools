/**
 * 会议布局算法
 * 计算会议标记的最佳显示位置，避免重叠
 */

import { CalendarConference } from '../types';

/**
 * 布局槽位配置
 */
export interface LayoutSlot {
  /** 会议数据 */
  conference: CalendarConference;
  /** 水平偏移 */
  dx: number;
  /** 垂直偏移 */
  dy: number;
  /** 是否在上方 */
  isTop: boolean;
  /** 层级 */
  layer: number;
}

/**
 * 布局配置参数
 */
export interface LayoutConfig {
  /** 基础垂直偏移 */
  baseOffset?: number;
  /** 水平微调范围 */
  horizontalJitter?: number;
  /** 每侧最大层数 */
  maxLayersPerSide?: number;
}

/**
 * 计算单个月份的会议布局
 * @param conferences - 该月的所有会议
 * @param config - 布局配置
 * @returns 布局槽位数组
 */
export const computeMonthLayout = (
  conferences: CalendarConference[],
  config: LayoutConfig = {}
): LayoutSlot[] => {
  const {
    baseOffset = 48,
    horizontalJitter = 12,
    maxLayersPerSide = 5,
  } = config;

  if (!conferences || conferences.length === 0) {
    return [];
  }

  // 按截止日期排序，确保布局可预测
  const sorted = [...conferences].sort((a, b) => {
    const dateA = new Date(a.ddl || 0).getTime();
    const dateB = new Date(b.ddl || 0).getTime();
    return dateA - dateB;
  });

  return sorted.map((conference, index) => {
    // 交替上下放置
    const isTop = index % 2 === 0;

    // 计算层级（每两个会议增加一层）
    const layer = Math.floor(index / 2);

    // 垂直偏移：基础偏移 + 层级递增
    const dy = (baseOffset + layer * 24) * (isTop ? -1 : 1);

    // 水平微调：避免完全垂直对齐，使用三列循环
    const horizontalPattern = index % 3; // 0, 1, 2
    const dx = (horizontalPattern - 1) * horizontalJitter; // -12, 0, 12

    return {
      conference,
      dx,
      dy,
      isTop,
      layer,
    };
  });
};

/**
 * 生成贝塞尔曲线路径
 * @param start - 起点坐标
 * @param end - 终点坐标
 * @returns SVG path 数据
 */
export const generateCurvePath = (
  start: { x: number; y: number },
  end: { x: number; y: number }
): string => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // 计算控制点
  let c1x, c1y, c2x, c2y;

  if (Math.abs(dx) < 5) {
    // 几乎垂直的情况
    c1x = start.x;
    c1y = start.y + dy * 0.33;
    c2x = end.x;
    c2y = end.y - dy * 0.33;
  } else {
    // 有水平偏移的情况
    c1x = start.x + dx * 0.4;
    c1y = start.y;
    c2x = start.x + dx * 0.7;
    c2y = start.y + dy * 0.6;
  }

  return `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`;
};
