/**
 * 月份标记组件
 * 在时间线上显示1-12月的标记
 */

'use client';

import { TimelineAnchor } from './types';

interface MonthMarkersProps {
  /** 月份锚点数组 */
  monthAnchors: TimelineAnchor[];
  /** 当前月份索引 (0-11)，用于高亮 */
  currentMonth?: number;
  /** 是否显示当前月份高亮 */
  showHighlight?: boolean;
}

const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export const MonthMarkers = ({ monthAnchors, currentMonth, showHighlight = true }: MonthMarkersProps) => {
  return (
    <g aria-label="月份标记">
      {monthAnchors.map((anchor) => {
        const monthName = MONTH_NAMES[anchor.month] ?? `${anchor.month + 1}月`;
        const isCurrentMonth = showHighlight && currentMonth === anchor.month;

        return (
          <g key={anchor.month} transform={`translate(${anchor.x}, ${anchor.y})`}>
            {/* 外层光晕（仅当前月份） */}
            {isCurrentMonth && (
              <circle
                r={14}
                fill="hsl(var(--primary))"
                opacity={0.15}
                className="animate-pulse"
                aria-hidden="true"
              />
            )}

            {/* 月份圆点 */}
            <circle
              r={isCurrentMonth ? 12 : 10}
              fill="hsl(var(--background))"
              stroke={isCurrentMonth ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
              strokeWidth={isCurrentMonth ? 3 : 2}
              aria-hidden="true"
              className={isCurrentMonth ? 'transition-all duration-300' : ''}
            />

            {/* 月份文字 */}
            <text
              x={0}
              y={28}
              textAnchor="middle"
              className={`text-xs transition-all duration-300 ${
                isCurrentMonth ? 'fill-primary font-bold' : 'fill-current font-medium'
              }`}
              aria-label={monthName}
            >
              {monthName}
            </text>
          </g>
        );
      })}
    </g>
  );
};
