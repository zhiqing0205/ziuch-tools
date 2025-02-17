'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface SearchHistoryItem {
    term: string;
    timestamp: number;
}

interface SearchHistoryProps {
    onSelect: (term: string) => void;
    visible: boolean;
}

const ITEMS_PER_PAGE = 6;

export function SearchHistory({ onSelect, visible }: SearchHistoryProps) {
    const [history, setHistory] = useState<SearchHistoryItem[]>([]);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const savedHistory = localStorage.getItem('pub-finder-history');
        if (savedHistory) {
            setHistory(JSON.parse(savedHistory));
        }
    }, []);

    const totalPages = Math.ceil(history.length / ITEMS_PER_PAGE);
    const currentHistory = history.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // 自定义 locale，移除 "about" 的翻译
    const customZhCN: Locale = {
        ...zhCN,
        formatDistance: (token, count, options) => {
            const result = zhCN.formatDistance(token, count, options);
            return result.replace(/^大约/, ''); // 去掉大约
        }
    };

    const formatTime = (timestamp: number) => {
        return formatDistanceToNow(timestamp, {
            addSuffix: true,
            locale: customZhCN
        });
    };

    if (!visible || history.length === 0) return null;

    return (
        <div className="w-full max-w-2xl mx-auto mt-8">
            <div className="text-sm font-medium mb-4">搜索记录</div>
            <ScrollArea className="h-[240px]">
                {currentHistory.map((item, index) => (
                    <div
                        key={item.timestamp}
                        className="flex justify-between items-center py-2 hover:bg-accent/50 rounded px-2 cursor-pointer"
                        onClick={() => onSelect(item.term)}
                    >
                        <span className="text-sm">{item.term}</span>
                        <span className="text-xs text-muted-foreground">
                            {formatTime(item.timestamp)}
                        </span>
                    </div>
                ))}
            </ScrollArea>
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                    >
                        上一页
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                    >
                        下一页
                    </Button>
                </div>
            )}
        </div>
    );
}

export const addSearchHistory = (term: string) => {
    const savedHistory = localStorage.getItem('pub-finder-history');
    let history: SearchHistoryItem[] = savedHistory ? JSON.parse(savedHistory) : [];

    // 移除相同的搜索词
    history = history.filter(item => item.term !== term);

    // 添加新的搜索记录
    history.unshift({
        term,
        timestamp: Date.now()
    });

    // // 限制历史记录数量
    // if (history.length > 50) {
    //     history = history.slice(0, 50);
    // }

    localStorage.setItem('pub-finder-history', JSON.stringify(history));
};
