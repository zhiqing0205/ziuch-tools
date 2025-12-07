/**
 * 学术日历页面
 * 展示基于CCF会议数据的蛇形时间线日历
 */

'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { getDaysInMonth } from 'date-fns';
import { ConferenceMarkers } from '@/components/academic-calendar/ConferenceMarkers';
import { Controls } from '@/components/academic-calendar/Controls';
import { Legend } from '@/components/academic-calendar/Legend';
import { MonthMarkers } from '@/components/academic-calendar/MonthMarkers';
import { Timeline } from '@/components/academic-calendar/Timeline';
import { useExportImage } from '@/components/academic-calendar/hooks/useExportImage';
import { useSinePath } from '@/components/academic-calendar/hooks/useSinePath';
import { useCalendarSettings, useInitialSettings } from '@/components/academic-calendar/hooks/useCalendarSettings';
import { CalendarConference, CutoffMode, CalendarSettings } from '@/components/academic-calendar/types';
import { groupConferencesByMonth, pickLatestConferences } from '@/components/academic-calendar/utils';
import { fetchConferenceData } from '@/lib/pub-finder/conference';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const AcademicCalendarPage = () => {
  // 从 localStorage 加载初始设置
  const initialSettings = useInitialSettings();

  // 状态管理
  const [conferences, setConferences] = useState<CalendarConference[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSettings.selectedIds);
  const [showPast, setShowPast] = useState(initialSettings.showPast);
  const [cutoffMode, setCutoffMode] = useState<CutoffMode>(initialSettings.cutoffMode);
  const [showAvatarIndicator, setShowAvatarIndicator] = useState(initialSettings.showAvatarIndicator);
  const [showMonthHighlight, setShowMonthHighlight] = useState(initialSettings.showMonthHighlight);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // 构建当前设置对象
  const currentSettings: CalendarSettings = useMemo(
    () => ({
      version: 1,
      selectedIds,
      showPast,
      cutoffMode,
      showAvatarIndicator,
      showMonthHighlight,
    }),
    [selectedIds, showPast, cutoffMode, showAvatarIndicator, showMonthHighlight]
  );

  // 自动保存设置到 localStorage
  useCalendarSettings(currentSettings);

  // 计算当前时间在年度中的比例（实时更新）
  const [now, setNow] = useState(new Date());

  const { currentRatio, currentMonth } = useMemo(() => {
    const daysInCurrentMonth = getDaysInMonth(now);
    const monthProgress = (now.getDate() - 1) / Math.max(1, daysInCurrentMonth);
    const ratio = (now.getMonth() + monthProgress) / 11; // 11个月间隔 (0-11月)
    const month = now.getMonth();
    return { currentRatio: ratio, currentMonth: month };
  }, [now]);

  // 每小时更新一次当前时间
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60 * 60 * 1000); // 每小时更新

    return () => clearInterval(interval);
  }, []);

  // 生成蛇形路径
  const { pathD, viewBox, monthAnchors } = useSinePath({ months: 12 });

  // 图片导出
  const { exportAsImage, exporting, error: exportError } = useExportImage();

  // 加载会议数据
  useEffect(() => {
    let isActive = true;

    const loadConferences = async () => {
      try {
        setLoading(true);
        setError(null);

        // 使用与pub-finder相同的数据获取方式
        const data = await fetchConferenceData();

        if (!isActive) return;

        // 提取会议数据
        const rawConferences = data.conferences || [];

        if (rawConferences.length === 0) {
          console.warn('会议数据为空');
        }

        const latestConferences = pickLatestConferences(rawConferences);
        setConferences(latestConferences);

        // 验证持久化的会议ID，移除不存在的ID
        if (initialSettings.selectedIds.length > 0) {
          const validIds = new Set(latestConferences.map((c) => c.id));
          const filteredIds = initialSettings.selectedIds.filter((id) => validIds.has(id));
          if (filteredIds.length !== initialSettings.selectedIds.length) {
            console.log('移除了无效的会议ID');
            setSelectedIds(filteredIds);
          }
        }
      } catch (err) {
        if (!isActive) return;
        const errorMessage = err instanceof Error ? err.message : '未知错误';
        setError(errorMessage);
        console.error('加载会议数据失败:', err);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadConferences();

    return () => {
      isActive = false;
    };
  }, []);

  // 按月份分组会议
  const monthMap = useMemo(() => groupConferencesByMonth(conferences), [conferences]);

  // 处理会议选择切换
  const handleToggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((existingId) => existingId !== id);
      }
      return [...prev, id];
    });
  }, []);

  // 处理下载
  const handleDownload = useCallback(async () => {
    if (!containerRef.current) return;
    await exportAsImage(containerRef.current, 'academic-calendar');
  }, [exportAsImage]);

  return (
    <div className="container max-w-[1600px] mx-auto px-4 lg:px-8 py-8">
      {/* 页面标题 */}
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">学术日历</h1>
        <p className="mt-2 text-muted-foreground">
          基于 CCF 推荐会议数据的可视化时间线，帮助您规划学术投稿计划
        </p>
      </header>

      {/* 操作控制面板 */}
      <Controls
        conferences={conferences}
        selectedIds={selectedIds}
        onToggleSelection={handleToggleSelection}
        showPast={showPast}
        onToggleShowPast={setShowPast}
        cutoffMode={cutoffMode}
        onCutoffModeChange={setCutoffMode}
        showAvatarIndicator={showAvatarIndicator}
        onToggleAvatarIndicator={setShowAvatarIndicator}
        showMonthHighlight={showMonthHighlight}
        onToggleMonthHighlight={setShowMonthHighlight}
        onDownload={handleDownload}
        exporting={exporting}
      />

      {/* 加载状态 */}
      {loading && (
        <div className="mt-6 rounded-lg border bg-card p-8">
          <Skeleton className="h-[400px] w-full" />
        </div>
      )}

      {/* 错误状态 */}
      {error && !loading && (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 导出错误 */}
      {exportError && (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>导出失败</AlertTitle>
          <AlertDescription>{exportError}</AlertDescription>
        </Alert>
      )}

      {/* 时间线视图 */}
      {!loading && !error && (
        <div ref={containerRef} className="mt-6 overflow-x-auto rounded-lg border bg-card p-6 shadow-sm">
          <svg
            className="mx-auto w-full max-w-6xl"
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="学术日历蛇形时间线"
          >
            {/* 时间线曲线 */}
            <Timeline
              pathD={pathD}
              viewBox={viewBox}
              currentRatio={currentRatio}
              monthAnchors={monthAnchors}
              showPast={showPast}
              showAvatarIndicator={showAvatarIndicator}
            />

            {/* 会议标记 */}
            <ConferenceMarkers
              monthAnchors={monthAnchors}
              monthMap={monthMap}
              selectedConferenceIds={new Set(selectedIds)}
              cutoffMode={cutoffMode}
              showPast={showPast}
              now={now}
            />

            {/* 月份标记 - 最后渲染，确保不被遮挡 */}
            <MonthMarkers monthAnchors={monthAnchors} currentMonth={currentMonth} showHighlight={showMonthHighlight} />
          </svg>

          {/* 图例说明 */}
          <Legend />
        </div>
      )}

      {/* 空状态提示 */}
      {!loading && !error && conferences.length === 0 && (
        <div className="mt-6 rounded-lg border bg-card p-8 text-center text-muted-foreground">
          暂无会议数据
        </div>
      )}
    </div>
  );
};

export default AcademicCalendarPage;
