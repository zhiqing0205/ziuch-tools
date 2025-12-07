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
  const midY = viewBoxHeight / 2;

  const { pathD, monthAnchors } = useMemo(() => {
    // 确保至少有2个月份
    const validMonths = Math.max(2, months);
    const step = viewBoxWidth / (validMonths - 1);
    const anchors: TimelineAnchor[] = [];

    // 起点在中心线
    let pathData = `M 0 ${midY}`;

    // 生成月份锚点
    for (let i = 0; i < validMonths; i++) {
      const x = step * i;
      // 偶数月份向上，奇数月份向下，形成蛇形
      const y = midY + (i % 2 === 0 ? amplitude / 2 : -amplitude / 2);
      anchors.push({
        month: i,
        x,
        y,
        ratio: i / (validMonths - 1),
      });
    }

    // 使用贝塞尔曲线连接各个锚点
    for (let i = 1; i < anchors.length; i++) {
      const prev = anchors[i - 1];
      const curr = anchors[i];

      // 控制点偏移，使曲线平滑
      const controlOffset = amplitude * (i % 2 === 0 ? 1 : -1);
      const c1x = prev.x + step / 2;
      const c1y = prev.y + controlOffset;
      const c2x = curr.x - step / 2;
      const c2y = curr.y - controlOffset;

      pathData += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${curr.x} ${curr.y}`;
    }

    return { pathD: pathData, monthAnchors: anchors };
  }, [amplitude, midY, months, viewBoxWidth]);

  return { pathD, viewBox, monthAnchors };
};
