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
          <g key={anchor.month} transform={`translate(${anchor.x}, ${anchor.y})`} pointerEvents="none">
            {/* 外层光晕（仅当前月份） - 使用accent色 */}
            {isCurrentMonth && (
              <circle
                r={18}
                fill="hsl(var(--accent))"
                opacity={0.25}
                className="animate-pulse"
                aria-hidden="true"
              />
            )}

            {/* 月份圆点 - 使用accent色高亮 */}
            <circle
              r={isCurrentMonth ? 12 : 10}
              fill="hsl(var(--background))"
              stroke={isCurrentMonth ? 'hsl(var(--accent))' : 'hsl(var(--border))'}
              strokeWidth={isCurrentMonth ? 4 : 3}
              aria-hidden="true"
              className={isCurrentMonth ? 'transition-all duration-300' : ''}
              style={{
                filter: isCurrentMonth
                  ? 'drop-shadow(0 0 10px hsl(var(--accent) / 0.6))'
                  : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
              }}
            />

            {/* 月份文字背景 - 确保文字不被遮挡 */}
            <rect
              x={-18}
              y={18}
              width={36}
              height={20}
              rx={4}
              fill="hsl(var(--background))"
              opacity={0.9}
              aria-hidden="true"
            />

            {/* 月份文字 */}
            <text
              x={0}
              y={32}
              textAnchor="middle"
              className={`text-xs transition-all duration-300 font-bold ${
                isCurrentMonth ? 'fill-accent' : 'fill-current'
              }`}
              aria-label={monthName}
              style={{
                paintOrder: 'stroke fill',
                stroke: 'hsl(var(--background))',
                strokeWidth: '2.5px',
                strokeLinejoin: 'round',
              }}
            >
              {monthName}
            </text>
          </g>
        );
      })}
    </g>
  );
};
