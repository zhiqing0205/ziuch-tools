/**
 * 蛇形路径生成 Hook
 * 用于生成学术日历的蛇形时间线路径和月份锚点
 */

'use client';

import { useMemo } from 'react';
import { SinePathConfig, TimelineAnchor } from '../types';

/**
 * 生成蛇形路径的 Hook
 * @param config - 路径配置参数
 * @returns 路径数据、视图框配置和月份锚点
 */
export const useSinePath = ({
  months = 12,
  amplitude = 140,
  viewBoxWidth = 1200,
  viewBoxHeight = 600,
}: SinePathConfig = {}) => {
  const viewBox = `0 0 ${viewBoxWidth} ${viewBoxHeight}`;

  const { pathD, monthAnchors } = useMemo(() => {
    // 确保至少有2个月份
    const validMonths = Math.max(2, months);
    const anchors: TimelineAnchor[] = [];

    // 蛇形布局配置
    const monthsPerRow = 3; // 每行3个月
    const rows = Math.ceil(validMonths / monthsPerRow);
    const horizontalSpacing = viewBoxWidth / (monthsPerRow + 1); // 水平间距
    const verticalSpacing = viewBoxHeight / (rows + 1); // 垂直间距

    // 生成月份锚点（蛇形排列）
    for (let i = 0; i < validMonths; i++) {
      const row = Math.floor(i / monthsPerRow);
      const col = i % monthsPerRow;

      // 偶数行从左到右，奇数行从右到左
      const actualCol = row % 2 === 0 ? col : (monthsPerRow - 1 - col);

      const x = horizontalSpacing * (actualCol + 1);
      const y = verticalSpacing * (row + 1);

      anchors.push({
        month: i,
        x,
        y,
        ratio: i / (validMonths - 1),
      });
    }

    // 生成平滑的路径
    let pathData = `M ${anchors[0].x} ${anchors[0].y}`;

    for (let i = 1; i < anchors.length; i++) {
      const prev = anchors[i - 1];
      const curr = anchors[i];

      // 计算控制点以创建平滑曲线
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 控制点距离为两点距离的1/3
      const controlDistance = distance * 0.4;

      // 第一个控制点：从前一点出发
      const c1x = prev.x + Math.sign(dx) * Math.min(Math.abs(dx) * 0.4, controlDistance);
      const c1y = prev.y;

      // 第二个控制点：到达当前点
      const c2x = curr.x - Math.sign(dx) * Math.min(Math.abs(dx) * 0.4, controlDistance);
      const c2y = curr.y;

      pathData += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${curr.x} ${curr.y}`;
    }

    return { pathD: pathData, monthAnchors: anchors };
  }, [amplitude, months, viewBoxWidth, viewBoxHeight]);

  return { pathD, viewBox, monthAnchors };
};
