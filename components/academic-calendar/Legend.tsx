/**
 * 图例说明组件
 * 解释时间线和会议标记的含义
 */

'use client';

export const Legend = () => {
  return (
    <div
      className="mt-6 flex flex-wrap gap-6 text-xs text-muted-foreground"
      role="region"
      aria-label="图例说明"
    >
      {/* 当前时间指示 */}
      <div className="flex items-center gap-2">
        <svg width="24" height="16" viewBox="0 0 24 16" aria-hidden="true">
          <circle cx="12" cy="8" r="6" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" />
          <circle cx="12" cy="8" r="2" fill="hsl(var(--primary))" />
        </svg>
        <span>当前时间位置</span>
      </div>

      {/* 已过去的时间线 */}
      <div className="flex items-center gap-2">
        <svg width="32" height="16" viewBox="0 0 32 16" aria-hidden="true">
          <line
            x1="2"
            y1="8"
            x2="30"
            y2="8"
            stroke="hsl(var(--primary))"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
        <span>当前时间前的时间线</span>
      </div>

      {/* 已选中的会议（未过去） */}
      <div className="flex items-center gap-2">
        <svg width="48" height="20" viewBox="0 0 48 20" aria-hidden="true">
          <rect x="4" y="4" width="40" height="12" rx="4" fill="hsl(var(--primary))" />
        </svg>
        <span>已选中的会议</span>
      </div>

      {/* 已过去的会议 */}
      <div className="flex items-center gap-2">
        <svg width="48" height="20" viewBox="0 0 48 20" aria-hidden="true">
          <rect x="4" y="4" width="40" height="12" rx="4" fill="hsl(var(--muted))" opacity="0.5" />
        </svg>
        <span>已过去的会议</span>
      </div>
    </div>
  );
};
