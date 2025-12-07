/**
 * 操作控制面板组件
 * 提供会议选择、显示控制和导出功能
 */

'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Download } from 'lucide-react';
import { CalendarConference, CutoffMode } from './types';
import { ConferenceCombobox } from './ConferenceCombobox';

interface ControlsProps {
  /** 所有会议列表 */
  conferences: CalendarConference[];
  /** 已选中的会议ID列表 */
  selectedIds: string[];
  /** 切换会议选中状态的回调 */
  onToggleSelection: (id: string) => void;
  /** 是否显示已过去时间的样式 */
  showPast: boolean;
  /** 切换显示已过去时间样式的回调 */
  onToggleShowPast: (value: boolean) => void;
  /** 时间分界模式 */
  cutoffMode: CutoffMode;
  /** 时间分界模式变更回调 */
  onCutoffModeChange: (mode: CutoffMode) => void;
  /** 是否显示人物形象指示器 */
  showAvatarIndicator: boolean;
  /** 切换人物形象指示器的回调 */
  onToggleAvatarIndicator: (value: boolean) => void;
  /** 是否高亮当前月份 */
  showMonthHighlight: boolean;
  /** 切换月份高亮的回调 */
  onToggleMonthHighlight: (value: boolean) => void;
  /** 下载按钮点击回调 */
  onDownload: () => void;
  /** 是否正在导出 */
  exporting: boolean;
}

export const Controls = ({
  conferences,
  selectedIds,
  onToggleSelection,
  showPast,
  onToggleShowPast,
  cutoffMode,
  onCutoffModeChange,
  showAvatarIndicator,
  onToggleAvatarIndicator,
  showMonthHighlight,
  onToggleMonthHighlight,
  onDownload,
  exporting,
}: ControlsProps) => {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm">
      {/* 使用说明 */}
      <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
        💡 <strong>使用提示：</strong>
        从下方选择会议，已选会议将显示在时间线上对应的月份位置。
      </div>

      {/* 主要控制区域 */}
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        {/* 会议选择 - 使用 Combobox */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">选择会议</Label>
          <ConferenceCombobox
            conferences={conferences}
            selectedIds={selectedIds}
            onToggle={onToggleSelection}
          />
        </div>

        {/* 导出按钮 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">导出日历</Label>
          <Button className="w-full md:w-auto md:px-8" onClick={onDownload} disabled={exporting}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? '导出中...' : '下载图片'}
          </Button>
        </div>
      </div>

      {/* 开关控制区域 */}
      <div className="flex flex-col gap-3">
        {/* 第一行：显示控制 */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="text-sm font-medium text-muted-foreground">显示控制:</div>

          {/* 区分已过去时间 */}
          <div className="flex items-center gap-2">
            <Switch id="show-past" checked={showPast} onCheckedChange={onToggleShowPast} />
            <Label htmlFor="show-past" className="text-sm cursor-pointer">
              区分已过去时间
            </Label>
          </div>

          {/* 时间分界模式 */}
          <div className="flex items-center gap-2">
            <Label htmlFor="cutoff-mode" className="text-sm text-muted-foreground">
              时间分界:
            </Label>
            <Select value={cutoffMode} onValueChange={(v) => onCutoffModeChange(v as CutoffMode)}>
              <SelectTrigger id="cutoff-mode" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ddl">截止日期</SelectItem>
                <SelectItem value="start">开始日期</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 第二行：当前时间指示 */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="text-sm font-medium text-muted-foreground">当前时间指示:</div>

          {/* 显示人物形象 */}
          <div className="flex items-center gap-2">
            <Switch
              id="show-avatar-indicator"
              checked={showAvatarIndicator}
              onCheckedChange={onToggleAvatarIndicator}
            />
            <Label htmlFor="show-avatar-indicator" className="text-sm cursor-pointer">
              显示人物形象
            </Label>
          </div>

          {/* 高亮当前月份 */}
          <div className="flex items-center gap-2">
            <Switch
              id="show-month-highlight"
              checked={showMonthHighlight}
              onCheckedChange={onToggleMonthHighlight}
            />
            <Label htmlFor="show-month-highlight" className="text-sm cursor-pointer">
              高亮当前月份
            </Label>
          </div>
        </div>
      </div>

      {/* 已选会议标签 */}
      {selectedIds.length > 0 ? (
        <div className="flex flex-col gap-2 pt-2 border-t">
          <div className="text-sm font-medium text-muted-foreground">
            已选会议 ({selectedIds.length} 个) - 点击标签可移除
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedIds.map((id) => {
              const conference = conferences.find((c) => c.id === id);
              const label = conference
                ? `${conference.name}${conference.year ? ` ${conference.year}` : ''}`
                : id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onToggleSelection(id)}
                  className="inline-flex items-center gap-2 rounded-full bg-primary/10 hover:bg-primary/20 px-3 py-1 text-xs font-medium transition-colors"
                  aria-label={`移除 ${label}`}
                >
                  {label}
                  <span aria-hidden="true" className="text-base font-bold">
                    ×
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="pt-2 border-t text-sm text-muted-foreground text-center">
          暂未选择会议，请点击上方按钮选择会议
        </div>
      )}
    </div>
  );
};
