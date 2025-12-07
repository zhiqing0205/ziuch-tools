/**
 * 年份选择对话框组件
 * 当会议有多个年份时，让用户选择具体年份
 */

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CalendarConference } from './types';
import { format } from 'date-fns';

interface YearSelectionDialogProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 会议名称 */
  conferenceName: string;
  /** 可选的年份列表（已按年份降序排序） */
  options: CalendarConference[];
  /** 确认选择回调 */
  onConfirm: (id: string) => void;
}

export const YearSelectionDialog = ({
  open,
  onClose,
  conferenceName,
  options,
  onConfirm,
}: YearSelectionDialogProps) => {
  const [selectedId, setSelectedId] = useState<string>(options[0]?.id ?? '');

  const handleConfirm = () => {
    if (selectedId) {
      onConfirm(selectedId);
      onClose();
    }
  };

  const formatDeadline = (ddl?: string) => {
    if (!ddl) return '暂无日期';
    try {
      const date = new Date(ddl);
      if (isNaN(date.getTime())) return '无效日期';
      return format(date, 'M月d日');
    } catch {
      return '解析失败';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>选择年份 - {conferenceName}</DialogTitle>
          <DialogDescription>该会议有多个年份的数据，请选择您想要的年份</DialogDescription>
        </DialogHeader>

        <RadioGroup value={selectedId} onValueChange={setSelectedId} className="space-y-3">
          {options.map((option) => (
            <div key={option.id} className="flex items-center space-x-3 rounded-md border p-3 hover:bg-accent/5">
              <RadioGroupItem value={option.id} id={option.id} />
              <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {option.year ?? '未知年份'}
                      {option.category && (
                        <span className="ml-2 text-xs text-muted-foreground">({option.category})</span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">截止日期: {formatDeadline(option.ddl)}</span>
                  </div>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedId}>
            确认选择
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
