/**
 * 会议标记组件
 * 在时间线上显示选中的会议，使用智能布局算法
 */

'use client';

import { CalendarConference, CutoffMode, MonthMap, TimelineAnchor } from './types';
import { isPastConference } from './utils';
import { computeMonthLayout, generateCurvePath, LayoutSlot } from './layout';

interface ConferenceMarkersProps {
  /** 月份锚点数组 */
  monthAnchors: TimelineAnchor[];
  /** 月份会议映射表 */
  monthMap: MonthMap;
  /** 已选中的会议ID集合 */
  selectedConferenceIds: Set<string>;
  /** 时间分界模式 */
  cutoffMode: CutoffMode;
  /** 是否显示已过去时间的样式 */
  showPast: boolean;
  /** 当前时间 */
  now: Date;
}

/**
 * 渲染单个会议标记（使用布局槽位）
 */
const renderConferenceMarker = (
  slot: LayoutSlot,
  anchor: TimelineAnchor,
  isPast: boolean,
  showPast: boolean
) => {
  const { conference, dx, dy, isTop } = slot;

  // 显示缩写或名称，确保有兜底值
  const displayName = conference.abbr || conference.name || conference.id || '会议';
  const truncatedName = displayName.length > 12 ? `${displayName.slice(0, 10)}...` : displayName;

  // 根据是否过去选择颜色
  const fillColor = isPast && showPast ? 'hsl(var(--muted))' : 'hsl(var(--primary))';
  const opacity = isPast && showPast ? 0.5 : 1;
  const strokeColor = isPast && showPast ? 'hsl(var(--muted))' : 'hsl(var(--primary))';

  // 计算卡片目标位置（连线终点在卡片边缘）
  const cardPadding = isTop ? -16 : 16; // 卡片边缘到连接点的距离
  const targetX = anchor.x + dx;
  const targetY = anchor.y + dy + cardPadding;

  // 生成平滑的贝塞尔曲线连线
  const pathD = generateCurvePath({ x: anchor.x, y: anchor.y }, { x: targetX, y: targetY });

  return (
    <g
      key={conference.id}
      aria-label={`${conference.name}${conference.year ? ` ${conference.year}` : ''}`}
      className="conference-marker"
    >
      {/* 贝塞尔曲线连线 */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        opacity={opacity * 0.7}
        aria-hidden="true"
        className="transition-all duration-300"
      />

      {/* 会议卡片 */}
      <g transform={`translate(${targetX}, ${anchor.y + dy})`}>
        <rect
          x={-42}
          y={-14}
          width={84}
          height={28}
          rx={6}
          fill={fillColor}
          opacity={opacity}
          aria-hidden="true"
          className="transition-all duration-300 hover:opacity-100 cursor-pointer"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
        />
        <text
          x={0}
          y={4}
          textAnchor="middle"
          className="fill-[hsl(var(--primary-foreground))] text-[10px] font-semibold pointer-events-none"
          style={{ userSelect: 'none' }}
        >
          {truncatedName}
        </text>

        {/* Tooltip 信息（可选，hover时显示） */}
        <title>
          {conference.name}
          {conference.year && ` (${conference.year})`}
          {conference.category && ` - ${conference.category}`}
          {conference.location && `\n地点: ${conference.location}`}
        </title>
      </g>
    </g>
  );
};

export const ConferenceMarkers = ({
  monthAnchors,
  monthMap,
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
    const allConferences = monthMap[month] ?? [];

    if (!anchor || allConferences.length === 0) return null;

    // 只处理已选中的会议
    const selectedConferences = allConferences.filter((conf) => selectedConferenceIds.has(conf.id));

    if (selectedConferences.length === 0) return null;

    // 使用智能布局算法计算位置
    const layout = computeMonthLayout(selectedConferences);

    return (
      <g key={month}>
        {layout.map((slot) => {
          const isPast = isPastConference(slot.conference, cutoffMode, now);
          return renderConferenceMarker(slot, anchor, isPast, showPast);
        })}
      </g>
    );
  };

  return <g aria-label="会议标记">{monthAnchors.map((anchor) => renderMonthConferences(anchor.month))}</g>;
};
