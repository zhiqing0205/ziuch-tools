'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface SearchHistoryItem {
    term: string;
    timestamp: number;
}

const ITEMS_PER_PAGE = 10;

export default function HistoryPage() {
    const router = useRouter();
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

    const formatTime = (timestamp: number) => {
        return formatDistanceToNow(timestamp, { 
            addSuffix: true,
            locale: zhCN 
        });
    };

    const handleSearch = (term: string) => {
        router.push(`/pub-finder?query=${encodeURIComponent(term)}`);
    };

    return (
        <div className="container mx-auto px-6 py-6">
            <Card>
                <div className="max-w-4xl mx-auto space-y-8 p-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold">搜索历史</h1>
                        <Button variant="outline" onClick={() => router.push('/pub-finder')}>
                            返回
                        </Button>
                    </div>

                    <ScrollArea className="h-[600px]">
                        {currentHistory.map((item) => (
                            <div
                                key={item.timestamp}
                                className="flex justify-between items-center py-3 hover:bg-accent/50 rounded px-4 cursor-pointer border-b"
                                onClick={() => handleSearch(item.term)}
                            >
                                <span className="text-base">{item.term}</span>
                                <span className="text-sm text-muted-foreground">
                                    {formatTime(item.timestamp)}
                                </span>
                            </div>
                        ))}
                        {history.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                暂无搜索历史
                            </div>
                        )}
                    </ScrollArea>

                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                上一页
                            </Button>
                            <span className="flex items-center px-4">
                                {currentPage} / {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                下一页
                            </Button>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
