/**
 * 多选会议 Combobox 组件
 */

'use client';

import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarConference } from './types';
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

  // 格式化选项列表
  const options = useMemo(() => {
    return conferences.map((conf) => ({
      id: conf.id,
      label: conf.name,
      year: conf.year,
      category: conf.category,
      searchText: `${conf.name} ${conf.year || ''} ${conf.category || ''}`.toLowerCase(),
    }));
  }, [conferences]);

  // 过滤选项
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter((opt) => opt.searchText.includes(query));
  }, [options, searchQuery]);

  // 已选中的会议集合
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // 排序：已选的排在前面，然后按名称排序
  const sortedOptions = useMemo(() => {
    return [...filteredOptions].sort((a, b) => {
      const aSelected = selectedSet.has(a.id);
      const bSelected = selectedSet.has(b.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      // 相同选中状态时按名称排序
      return a.label.localeCompare(b.label);
    });
  }, [filteredOptions, selectedSet]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedIds.length > 0
            ? `已选择 ${selectedIds.length} 个会议`
            : '选择会议...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(400px,90vw)] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="搜索会议名称、年份或领域..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>无匹配会议</CommandEmpty>
            <CommandGroup>
              {sortedOptions.map((option) => {
                const isSelected = selectedSet.has(option.id);
                return (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    onSelect={() => {
                      onToggle(option.id);
                    }}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <div
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                        isSelected ? 'bg-primary text-primary-foreground' : 'opacity-50'
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <span className={cn(isSelected && 'font-medium')}>{option.label}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {option.year && <span>{option.year}</span>}
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
  );
};
