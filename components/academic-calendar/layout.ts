/**
 * 会议布局算法
 * 支持四个方向（上、下、左、右）的智能布局，避免重叠
 */

import { CalendarConference } from './types';

/**
 * 布局方向
 */
export type Direction = 'top' | 'bottom' | 'left' | 'right';

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
  /** 放置方向 */
  direction: Direction;
  /** 层级 */
  layer: number;
}

/**
 * 布局配置参数
 */
export interface LayoutConfig {
  /** 基础垂直偏移（上下方向） */
  baseOffset?: number;
  /** 基础水平偏移（左右方向） */
  sideOffset?: number;
  /** 垂直微调范围 */
  verticalJitter?: number;
  /** 水平微调范围 */
  horizontalJitter?: number;
  /** 卡片宽度 */
  cardWidth?: number;
  /** 卡片高度 */
  cardHeight?: number;
  /** 连线间隙 */
  gap?: number;
}

/**
 * 计算单个月份的会议布局（四方向分布）
 * @param conferences - 该月的所有会议
 * @param config - 布局配置
 * @returns 布局槽位数组
 */
export const computeMonthLayout = (
  conferences: CalendarConference[],
  config: LayoutConfig = {}
): LayoutSlot[] => {
  const {
    baseOffset = 52,
    sideOffset = 70,
    verticalJitter = 8,
    horizontalJitter = 10,
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

  const directions: Direction[] = ['top', 'bottom', 'left', 'right'];
  const directionCounts: Record<Direction, number> = {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  };

  return sorted.map((conference, index) => {
    // 选择当前数量最少的方向，实现均衡分布
    const direction = directions.reduce((minDir, dir) =>
      directionCounts[dir] < directionCounts[minDir] ? dir : minDir
    );

    directionCounts[direction]++;

    // 计算该方向的层级
    const layer = Math.floor((directionCounts[direction] - 1) / 2);

    // 微调符号（同向交替偏移）
    const jitterSign = directionCounts[direction] % 2 === 0 ? -1 : 1;

    let dx = 0;
    let dy = 0;

    switch (direction) {
      case 'top':
        dy = -(baseOffset + layer * 24);
        dx = jitterSign * horizontalJitter;
        break;
      case 'bottom':
        dy = baseOffset + layer * 24;
        dx = jitterSign * horizontalJitter;
        break;
      case 'left':
        dx = -(sideOffset + layer * 30);
        dy = jitterSign * verticalJitter;
        break;
      case 'right':
        dx = sideOffset + layer * 30;
        dy = jitterSign * verticalJitter;
        break;
    }

    return {
      conference,
      dx,
      dy,
      direction,
      layer,
    };
  });
};

/**
 * 生成贝塞尔曲线路径（根据方向优化）
 * @param start - 起点坐标（月份锚点）
 * @param end - 终点坐标（卡片连接点）
 * @param direction - 放置方向
 * @returns SVG path 数据
 */
export const generateCurvePath = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  direction?: Direction
): string => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  let c1x, c1y, c2x, c2y;

  if (direction === 'left' || direction === 'right') {
    // 左右方向：水平控制点
    c1x = start.x + dx * 0.6;
    c1y = start.y;
    c2x = start.x + dx * 0.8;
    c2y = start.y + dy * 0.4;
  } else {
    // 上下方向：垂直控制点
    if (Math.abs(dx) < 5) {
      // 几乎垂直
      c1x = start.x;
      c1y = start.y + dy * 0.33;
      c2x = end.x;
      c2y = end.y - dy * 0.33;
    } else {
      // 有水平偏移
      c1x = start.x + dx * 0.4;
      c1y = start.y;
      c2x = start.x + dx * 0.7;
      c2y = start.y + dy * 0.6;
    }
  }

  return `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`;
};

/**
 * 计算卡片连接点（确保连线连接到卡片边缘）
 * @param anchor - 月份锚点
 * @param slot - 布局槽位
 * @param config - 布局配置
 * @returns 连接点坐标
 */
export const calculateCardAnchor = (
  anchor: { x: number; y: number },
  slot: LayoutSlot,
  config: LayoutConfig = {}
): { x: number; y: number } => {
  const { cardWidth = 84, cardHeight = 28, gap = 2 } = config;

  const centerX = anchor.x + slot.dx;
  const centerY = anchor.y + slot.dy;

  switch (slot.direction) {
    case 'top':
      return { x: centerX, y: centerY + cardHeight / 2 + gap };
    case 'bottom':
      return { x: centerX, y: centerY - cardHeight / 2 - gap };
    case 'left':
      return { x: centerX + cardWidth / 2 + gap, y: centerY };
    case 'right':
      return { x: centerX - cardWidth / 2 - gap, y: centerY };
  }
};
