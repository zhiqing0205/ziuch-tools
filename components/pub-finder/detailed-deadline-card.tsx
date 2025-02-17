'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeadlineInfo, CONFERENCE_CATEGORIES, AcceptanceRate } from "@/lib/pub-finder/types";
import { formatTimeLeft } from "@/lib/pub-finder/conference";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface DetailedDeadlineCardProps {
    deadline: DeadlineInfo;
    acceptanceRate?: AcceptanceRate | null;
}

function getRankVariant(rank?: string) {
    if (!rank) return undefined;
    switch (rank) {
        case 'A':
            return 'destructive';
        case 'B':
            return 'default';
        case 'C':
            return 'secondary';
        case 'N':
            return 'outline';
        default:
            return undefined;
    }
}

function parseTimeLeft(timeLeft: string) {
    const parts = timeLeft.split(/天|小时|分|秒/).filter(Boolean);
    return {
        days: parts[0] || '0',
        hours: parts[1] || '0',
        minutes: parts[2] || '0',
        seconds: parts[3] || '0'
    };
}

export function DetailedDeadlineCard({ deadline, acceptanceRate }: DetailedDeadlineCardProps) {
    const [timeLeft, setTimeLeft] = useState(formatTimeLeft(deadline.deadline));
    const { days, hours, minutes, seconds } = parseTimeLeft(timeLeft);
    const isExpired = timeLeft.includes('已截止');

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(formatTimeLeft(deadline.deadline));
        }, 1000);

        return () => clearInterval(timer);
    }, [deadline]);

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                        <a href={deadline.link} target="_blank" rel="noopener noreferrer">
                            <CardContent className="p-4">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="space-y-1">
                                            <div className="font-semibold text-base">
                                                {deadline.title} {deadline.year}
                                            </div>
                                            {deadline.sub && (
                                                <div className="text-xs text-muted-foreground">
                                                    {CONFERENCE_CATEGORIES[deadline.sub]}
                                                </div>
                                            )}
                                            {deadline.comment && (
                                                <div className="text-xs text-muted-foreground">
                                                    {deadline.comment}
                                                </div>
                                            )}
                                        </div>
                                        {deadline.rank && (
                                            <Badge variant={getRankVariant(deadline.rank)}>
                                                {deadline.rank === 'N' ? '非CCF' : `CCF ${deadline.rank}`}
                                            </Badge>
                                        )}
                                    </div>

                                    {isExpired ? (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <div className="flex flex-col gap-1">
                                                <div className="font-medium">已截止</div>
                                                <div className="text-xs">
                                                    截止时间：{format(new Date(deadline.deadline), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                                                </div>
                                            </div>
                                        </Alert>
                                    ) : (
                                        <div className="flex justify-center items-center gap-1">
                                            <div className="flex items-center">
                                                <div className="bg-primary/10 rounded px-2 py-1 text-lg font-mono tabular-nums">
                                                    {days.padStart(2, '0')}
                                                </div>
                                                <span className="text-base mx-1">天</span>
                                            </div>
                                            <div className="flex items-center">
                                                <div className="bg-primary/10 rounded px-2 py-1 text-lg font-mono tabular-nums">
                                                    {hours.padStart(2, '0')}
                                                </div>
                                                <span className="text-base mx-1">时</span>
                                            </div>
                                            <div className="flex items-center">
                                                <div className="bg-primary/10 rounded px-2 py-1 text-lg font-mono tabular-nums">
                                                    {minutes.padStart(2, '0')}
                                                </div>
                                                <span className="text-base mx-1">分</span>
                                            </div>
                                            <div className="flex items-center">
                                                <div className="bg-primary/10 rounded px-2 py-1 text-lg font-mono tabular-nums">
                                                    {seconds.padStart(2, '0')}
                                                </div>
                                                <span className="text-base mx-1">秒</span>
                                            </div>
                                        </div>
                                    )}

                                    {acceptanceRate && (
                                        <div className="text-sm">
                                            <div className="font-medium">最近接受率数据（{acceptanceRate.year}）：</div>
                                            <div className="grid grid-cols-2 gap-2 mt-1 text-xs text-muted-foreground">
                                                <div>投稿数：{acceptanceRate.submit}</div>
                                                <div>接受数：{acceptanceRate.accept}</div>
                                                <div>接受率：{((acceptanceRate.accept / acceptanceRate.submit) * 100).toFixed(1)}%</div>
                                                {acceptanceRate.note && (
                                                    <div>备注：{acceptanceRate.note}</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </a>
                    </Card>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{deadline.description}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
