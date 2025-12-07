/**
 * 会议标记组件
 * 在时间线上显示选中的会议，使用四方向智能布局算法
 */

'use client';

import { CalendarConference, CutoffMode, MonthMap, TimelineAnchor } from './types';
import { isPastConference } from './utils';
import { computeMonthLayout, generateCurvePath, calculateCardAnchor, LayoutSlot } from './layout';

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

const CARD_WIDTH = 84;
const CARD_HEIGHT = 28;

/**
 * 渲染单个会议标记（使用布局槽位）
 */
const renderConferenceMarker = (
  slot: LayoutSlot,
  anchor: TimelineAnchor,
  isPast: boolean,
  showPast: boolean
) => {
  const { conference, dx, dy } = slot;

  // 显示缩写或名称，确保有兜底值
  const displayName = conference.abbr || conference.name || conference.id || '会议';
  const truncatedName = displayName.length > 12 ? `${displayName.slice(0, 10)}...` : displayName;

  // 根据是否过去选择颜色 - 提高对比度
  const fillColor = isPast && showPast ? 'hsl(var(--muted))' : 'hsl(var(--primary))';
  const textColor = isPast && showPast ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary-foreground))';
  const opacity = isPast && showPast ? 0.75 : 1; // 提高已过去的可见度
  const strokeColor = isPast && showPast ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary))';

  // 计算卡片连接点（连线终点在卡片边缘）
  const connectionPoint = calculateCardAnchor(anchor, slot, {
    cardWidth: CARD_WIDTH,
    cardHeight: CARD_HEIGHT,
    gap: 2,
  });

  // 生成平滑的贝塞尔曲线连线
  const pathD = generateCurvePath(
    { x: anchor.x, y: anchor.y },
    connectionPoint,
    slot.direction
  );

  // 卡片中心位置
  const cardCenterX = anchor.x + dx;
  const cardCenterY = anchor.y + dy;

  return (
    <g
      key={conference.id}
      aria-label={`${conference.name}${conference.year ? ` ${conference.year}` : ''}`}
      className="conference-marker group"
    >
      {/* 贝塞尔曲线连线 */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeDasharray={isPast && showPast ? '4 2' : '0'}
        opacity={isPast && showPast ? 0.6 : 0.8}
        aria-hidden="true"
        className="transition-all duration-300"
      />

      {/* 会议卡片 */}
      <g transform={`translate(${cardCenterX}, ${cardCenterY})`}>
        <rect
          x={-CARD_WIDTH / 2}
          y={-CARD_HEIGHT / 2}
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
          rx={6}
          fill={fillColor}
          opacity={opacity}
          aria-hidden="true"
          className="transition-all duration-300 group-hover:opacity-100 cursor-pointer"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
        />
        <text
          x={0}
          y={4}
          textAnchor="middle"
          className="text-[10px] font-semibold pointer-events-none"
          fill={textColor}
          style={{ userSelect: 'none' }}
        >
          {truncatedName}
        </text>

        {/* Tooltip 信息 */}
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

    // 使用智能布局算法计算位置（四方向分布）
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
