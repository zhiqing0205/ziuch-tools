/**
 * 操作控制面板组件 - 简约美观版本
 * 提供会议选择、显示控制和导出功能
 */

'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Download, Info } from 'lucide-react';
import { CalendarConference, CutoffMode } from './types';
import { ConferenceCombobox } from './ConferenceCombobox';

interface ControlsProps {
  conferences: CalendarConference[];
  selectedIds: string[];
  onToggleSelection: (id: string) => void;
  showPast: boolean;
  onToggleShowPast: (value: boolean) => void;
  cutoffMode: CutoffMode;
  onCutoffModeChange: (mode: CutoffMode) => void;
  showMonthHighlight: boolean;
  onToggleMonthHighlight: (value: boolean) => void;
  onDownload: () => void;
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
  showMonthHighlight,
  onToggleMonthHighlight,
  onDownload,
  exporting,
}: ControlsProps) => {
  return (
    <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-5 shadow-sm space-y-4">
      {/* 第一行：提示 + 导出 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4" />
          <span>选择会议后将在时间线上高亮显示</span>
        </div>
        <Button size="sm" onClick={onDownload} disabled={exporting} className="shrink-0">
          <Download className="mr-1.5 h-3.5 w-3.5" />
          {exporting ? '导出中' : '导出图片'}
        </Button>
      </div>

      {/* 第二行：会议选择 + 控制选项 */}
      <div className="flex flex-wrap items-end gap-3">
        {/* 会议选择 */}
        <div className="flex-1 min-w-[200px] max-w-[340px]">
          <ConferenceCombobox conferences={conferences} selectedIds={selectedIds} onToggle={onToggleSelection} />
        </div>

        {/* 时间分界 */}
        <div className="w-32">
          <Select value={cutoffMode} onValueChange={(v) => onCutoffModeChange(v as CutoffMode)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ddl">截止日期</SelectItem>
              <SelectItem value="start">开始日期</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 开关组 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-past"
              checked={showPast}
              onCheckedChange={onToggleShowPast}
              className="h-6 w-11 data-[state=checked]:bg-primary"
            />
            <Label htmlFor="show-past" className="text-sm cursor-pointer whitespace-nowrap">
              区分过去
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="show-month-highlight"
              checked={showMonthHighlight}
              onCheckedChange={onToggleMonthHighlight}
              className="h-6 w-11 data-[state=checked]:bg-primary"
            />
            <Label htmlFor="show-month-highlight" className="text-sm cursor-pointer whitespace-nowrap">
              高亮当月
            </Label>
          </div>
        </div>
      </div>

      {/* 第三行：已选会议 */}
      {selectedIds.length > 0 ? (
        <div className="space-y-2 pt-3 border-t">
          <div className="text-xs font-medium text-muted-foreground">已选 {selectedIds.length} 个会议</div>
          <div className="flex flex-wrap gap-1.5">
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
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 hover:bg-primary/20 pl-2.5 pr-2 py-1 text-xs font-medium transition-colors"
                  aria-label={`移除 ${label}`}
                >
                  <span className="truncate max-w-[200px]">{label}</span>
                  <span aria-hidden="true" className="text-sm font-bold opacity-60 hover:opacity-100">
                    ×
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="pt-3 border-t text-xs text-center text-muted-foreground">暂未选择会议</div>
      )}
    </div>
  );
};
