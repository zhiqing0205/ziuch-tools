/**
 * 时间线组件
 * 绘制蛇形曲线和当前时间指示器
 */

'use client';

import { useMemo } from 'react';
import { TimelineAnchor } from './types';

interface TimelineProps {
  /** SVG 路径数据 */
  pathD: string;
  /** 视图框配置 */
  viewBox: string;
  /** 当前时间在年度中的比例 (0-1) */
  currentRatio: number;
  /** 月份锚点数组 */
  monthAnchors: TimelineAnchor[];
  /** 是否显示已过去时间的样式 */
  showPast: boolean;
}

/**
 * 计算当前时间点在路径上的位置
 */
const calculateCurrentPoint = (
  currentRatio: number,
  monthAnchors: TimelineAnchor[]
): { x: number; y: number; ratio: number } | null => {
  if (!monthAnchors.length) return null;

  const clampedRatio = Math.max(0, Math.min(1, currentRatio));

  // 找到当前时间前后的锚点
  const beforeAnchor = [...monthAnchors].reverse().find((a) => a.ratio <= clampedRatio) ?? monthAnchors[0];
  const afterAnchor = monthAnchors.find((a) => a.ratio >= clampedRatio) ?? monthAnchors[monthAnchors.length - 1];

  if (beforeAnchor === afterAnchor) {
    return beforeAnchor;
  }

  // 在两个锚点之间进行线性插值
  const range = afterAnchor.ratio - beforeAnchor.ratio || 1;
  const t = (clampedRatio - beforeAnchor.ratio) / range;

  return {
    x: beforeAnchor.x + (afterAnchor.x - beforeAnchor.x) * t,
    y: beforeAnchor.y + (afterAnchor.y - beforeAnchor.y) * t,
    ratio: clampedRatio,
  };
};

export const Timeline = ({ pathD, viewBox, currentRatio, monthAnchors, showPast }: TimelineProps) => {
  const currentPoint = useMemo(
    () => calculateCurrentPoint(currentRatio, monthAnchors),
    [currentRatio, monthAnchors]
  );

  const viewBoxDimensions = useMemo(() => {
    const parts = viewBox.split(' ');
    return {
      width: parseFloat(parts[2] ?? '1200'),
      height: parseFloat(parts[3] ?? '600'),
    };
  }, [viewBox]);

  const clampedRatio = Math.max(0, Math.min(1, currentRatio));

  return (
    <g aria-label="学术日历时间线">
      {/* 背景路径（灰色） */}
      <path
        d={pathD}
        fill="none"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.35}
        pathLength={1}
      />

      {/* 已过去的路径（仅在开启时显示） */}
      {showPast && (
        <path
          d={pathD}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={`${clampedRatio} 1`}
          strokeDashoffset={0}
        />
      )}

      {/* 未过去的路径（当不显示已过去样式时显示完整路径） */}
      {!showPast && (
        <path
          d={pathD}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
        />
      )}

      {/* 当前时间指示器 - 只使用圆点样式 */}
      {currentPoint && (
        <g transform={`translate(${currentPoint.x}, ${currentPoint.y})`} aria-label="当前时间位置">
          {/* 外圈 */}
          <circle r={12} fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth={4} />
          {/* 内圈 */}
          <circle r={4} fill="hsl(var(--primary))" />
        </g>
      )}

      {/* 透明边界矩形，用于定义SVG的可交互区域 */}
      <rect
        x={0}
        y={0}
        width={viewBoxDimensions.width}
        height={viewBoxDimensions.height}
        fill="none"
        pointerEvents="none"
      />
    </g>
  );
};
