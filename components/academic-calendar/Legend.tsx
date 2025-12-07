/**
 * 图例说明组件
 * 解释时间线和会议标记的含义
 */

'use client';

// 统一的指示器样式常量
const INDICATOR_OUTER_RADIUS = 10;
const INDICATOR_INNER_RADIUS = 3;
const INDICATOR_STROKE_WIDTH = 3;

export const Legend = () => {
  return (
    <div
      className="mt-6 flex flex-wrap gap-6 text-xs text-muted-foreground"
      role="region"
      aria-label="图例说明"
    >
      {/* 当前时间指示 */}
      <div className="flex items-center gap-2">
        <svg width="24" height="20" viewBox="0 0 24 20" aria-hidden="true">
          <circle
            cx="12"
            cy="10"
            r={INDICATOR_OUTER_RADIUS}
            fill="hsl(var(--card))"
            stroke="hsl(var(--primary))"
            strokeWidth={INDICATOR_STROKE_WIDTH}
          />
          <circle cx="12" cy="10" r={INDICATOR_INNER_RADIUS} fill="hsl(var(--primary))" />
        </svg>
        <span>当前时间</span>
      </div>

      {/* 未来的时间线 */}
      <div className="flex items-center gap-2">
        <svg width="32" height="16" viewBox="0 0 32 16" aria-hidden="true">
          <line
            x1="2"
            y1="8"
            x2="30"
            y2="8"
            stroke="hsl(var(--primary))"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
        <span>未来时间</span>
      </div>

      {/* 已过去的时间线 */}
      <div className="flex items-center gap-2">
        <svg width="32" height="16" viewBox="0 0 32 16" aria-hidden="true">
          <line
            x1="2"
            y1="8"
            x2="30"
            y2="8"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="6 4"
            opacity="0.5"
          />
        </svg>
        <span>已过去</span>
      </div>

      {/* 已选中的会议 */}
      <div className="flex items-center gap-2">
        <svg width="48" height="40" viewBox="0 0 48 40" aria-hidden="true">
          <rect x="6" y="10" width="36" height="20" rx="4" fill="hsl(var(--primary))" />
        </svg>
        <span>已选会议</span>
      </div>

      {/* 已过去的会议 */}
      <div className="flex items-center gap-2">
        <svg width="48" height="40" viewBox="0 0 48 40" aria-hidden="true">
          <rect x="6" y="10" width="36" height="20" rx="4" fill="hsl(var(--muted))" opacity="0.75" />
        </svg>
        <span>已过去的会议</span>
      </div>
    </div>
  );
};
