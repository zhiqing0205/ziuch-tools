/**
 * 会议标记组件
 * 在时间线上显示选中的会议
 */

'use client';

import { CalendarConference, CutoffMode, MonthMap, TimelineAnchor } from './types';
import { isPastConference } from './utils';

interface ConferenceMarkersProps {
  /** 月份锚点数组 */
  monthAnchors: TimelineAnchor[];
  /** 月份会议映射表 */
  monthMap: MonthMap;
  /** 可见的会议ID集合 */
  visibleConferenceIds: Set<string>;
  /** 已选中的会议ID集合（用于高亮） */
  selectedConferenceIds: Set<string>;
  /** 时间分界模式 */
  cutoffMode: CutoffMode;
  /** 是否显示已过去时间的样式 */
  showPast: boolean;
  /** 当前时间 */
  now: Date;
}

/**
 * 渲染单个会议标记
 */
const renderConferenceMarker = (
  conference: CalendarConference,
  anchor: TimelineAnchor,
  index: number,
  isPast: boolean,
  showPast: boolean,
  selectedConferenceIds: Set<string>
) => {
  // 计算偏移量，避免重叠
  const offsetY = (index % 2 === 0 ? -1 : 1) * (36 + Math.floor(index / 2) * 18);
  const offsetX = index % 3 === 0 ? -12 : index % 3 === 1 ? 12 : 0;

  // 显示缩写或名称，确保有兜底值
  const displayName = conference.abbr || conference.name || conference.id || '会议';
  const truncatedName = displayName.length > 12 ? `${displayName.slice(0, 10)}...` : displayName;

  // 根据是否过去和是否选中选择颜色
  const isSelected = selectedConferenceIds.has(conference.id);
  const fillColor = isPast && showPast
    ? 'hsl(var(--muted))'
    : isSelected
      ? 'hsl(var(--primary))'
      : 'hsl(var(--secondary))';
  const opacity = isPast && showPast ? 0.5 : isSelected ? 1 : 0.6;

  return (
    <g
      key={conference.id}
      transform={`translate(${anchor.x + offsetX}, ${anchor.y + offsetY})`}
      aria-label={`${conference.name}${conference.year ? ` ${conference.year}` : ''}`}
    >
      {/* 连接线 */}
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={offsetY > 0 ? -12 : 12}
        stroke="hsl(var(--border))"
        strokeWidth={1.5}
        aria-hidden="true"
      />

      {/* 会议卡片 */}
      <g transform={`translate(0, ${offsetY > 0 ? 12 : -12})`}>
        <rect
          x={-42}
          y={-14}
          width={84}
          height={28}
          rx={6}
          fill={fillColor}
          opacity={opacity}
          aria-hidden="true"
        />
        <text
          x={0}
          y={4}
          textAnchor="middle"
          className={`text-[10px] font-semibold ${
            isPast && showPast
              ? 'fill-[hsl(var(--muted-foreground))]'
              : isSelected
                ? 'fill-[hsl(var(--primary-foreground))]'
                : 'fill-[hsl(var(--secondary-foreground))]'
          }`}
          style={{ userSelect: 'none' }}
        >
          {truncatedName}
        </text>
      </g>
    </g>
  );
};

export const ConferenceMarkers = ({
  monthAnchors,
  monthMap,
  visibleConferenceIds,
  selectedConferenceIds,
  cutoffMode,
  showPast,
  now,
}: ConferenceMarkersProps) => {
  /**
   * 渲染指定月份的所有会议标记
   */
  const renderMonthConferences = (month: number) => {
    const anchor = monthAnchors.find((a) => a.month === month);
    const conferences = monthMap[month] ?? [];

    if (!anchor || conferences.length === 0) return null;

    return (
      <g key={month}>
        {conferences.map((conference, index) => {
          // 只渲染可见的会议
          if (!visibleConferenceIds.has(conference.id)) return null;

          const isPast = isPastConference(conference, cutoffMode, now);
          return renderConferenceMarker(conference, anchor, index, isPast, showPast, selectedConferenceIds);
        })}
      </g>
    );
  };

  return <g aria-label="会议标记">{monthAnchors.map((anchor) => renderMonthConferences(anchor.month))}</g>;
};
