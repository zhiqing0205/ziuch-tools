/**
 * 多选会议 Combobox 组件
 * 支持按会议名称搜索，多年份会议弹出对话框选择
 */

'use client';

import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarConference } from './types';
import { groupConferencesByTitle } from './utils';
import { YearSelectionDialog } from './YearSelectionDialog';
import { cn } from '@/lib/utils';

interface ConferenceComboboxProps {
  /** 所有会议列表 */
  conferences: CalendarConference[];
  /** 已选中的会议ID */
  selectedIds: string[];
  /** 选择/取消选择的回调 */
  onToggle: (id: string) => void;
}

export const ConferenceCombobox = ({ conferences, selectedIds, onToggle }: ConferenceComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingConferenceName, setPendingConferenceName] = useState('');
  const [pendingOptions, setPendingOptions] = useState<CalendarConference[]>([]);

  // 按会议名称分组
  const titleMap = useMemo(() => groupConferencesByTitle(conferences), [conferences]);

  // 格式化选项列表（去重，按名称）
  const options = useMemo(() => {
    const uniqueTitles = Object.keys(titleMap);
    return uniqueTitles.map((title) => {
      const confs = titleMap[title];
      const firstConf = confs[0];
      return {
        title,
        category: firstConf.category,
        yearCount: confs.length,
        searchText: `${title} ${firstConf.category || ''}`.toLowerCase(),
      };
    });
  }, [titleMap]);

  // 过滤选项
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter((opt) => opt.searchText.includes(query));
  }, [options, searchQuery]);

  // 检查某个会议名称是否有已选中的年份
  const hasSelectedYear = (title: string) => {
    const confs = titleMap[title] || [];
    return confs.some((conf) => selectedIds.includes(conf.id));
  };

  // 处理会议名称选择
  const handleTitleSelect = (title: string) => {
    const confs = titleMap[title] || [];

    if (confs.length === 0) return;

    if (confs.length === 1) {
      // 只有一个年份，直接选择
      onToggle(confs[0].id);
    } else {
      // 有多个年份，打开对话框
      setPendingConferenceName(title);
      setPendingOptions(confs);
      setDialogOpen(true);
      setOpen(false); // 关闭 Combobox
    }
  };

  // 处理年份选择确认
  const handleYearConfirm = (id: string) => {
    onToggle(id);
  };

  // 排序：有已选年份的排在前面
  const sortedOptions = useMemo(() => {
    return [...filteredOptions].sort((a, b) => {
      const aHasSelected = hasSelectedYear(a.title);
      const bHasSelected = hasSelectedYear(b.title);
      if (aHasSelected && !bHasSelected) return -1;
      if (!aHasSelected && bHasSelected) return 1;
      return a.title.localeCompare(b.title);
    });
  }, [filteredOptions, selectedIds, titleMap]);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-9">
            {selectedIds.length > 0 ? `已选择 ${selectedIds.length} 个会议` : '选择会议...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(320px,90vw)] p-0" align="start">
          <Command>
            <CommandInput placeholder="搜索会议名称或领域..." value={searchQuery} onValueChange={setSearchQuery} />
            <CommandList>
              <CommandEmpty>无匹配会议</CommandEmpty>
              <CommandGroup>
                {sortedOptions.map((option) => {
                  const hasSelected = hasSelectedYear(option.title);
                  return (
                    <CommandItem
                      key={option.title}
                      value={option.title}
                      onSelect={() => handleTitleSelect(option.title)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <div
                        className={cn(
                          'flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                          hasSelected ? 'bg-primary text-primary-foreground' : 'opacity-50'
                        )}
                      >
                        {hasSelected && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <span className={cn(hasSelected && 'font-medium')}>{option.title}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {option.yearCount > 1 && <span>({option.yearCount}个年份)</span>}
                          {option.category && <span className="text-[10px]">{option.category}</span>}
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* 年份选择对话框 */}
      <YearSelectionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        conferenceName={pendingConferenceName}
        options={pendingOptions}
        onConfirm={handleYearConfirm}
      />
    </>
  );
};
