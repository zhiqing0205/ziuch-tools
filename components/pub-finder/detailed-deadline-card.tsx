'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeadlineInfo, CONFERENCE_CATEGORIES, AcceptanceRate, AcceptanceRateItem } from "@/lib/pub-finder/types";
import { formatTimeLeft, convertToEast8 } from "@/lib/pub-finder/conference";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, Timer } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DetailedDeadlineCardProps {
    deadline: DeadlineInfo;
    acceptanceRate?: AcceptanceRateItem | null;
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

    // console.log("Acceptance rate", acceptanceRate);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(formatTimeLeft(deadline.deadline));
        }, 1000);

        return () => clearInterval(timer);
    }, [deadline]);

    const formatAcceptanceRate = (rate: AcceptanceRateItem) => {
        const items = [
            {
                label: "投稿数",
                value: rate.submitted,
                className: "text-blue-500 dark:text-blue-400"
            },
            {
                label: "接收数",
                value: rate.accepted,
                className: "text-green-500 dark:text-green-400"
            },
            {
                label: "接收率",
                value: `${(rate.rate * 100).toFixed(1)}%`,
                className: "text-orange-500 dark:text-orange-400"
            }
        ];

        return (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm">
                        投稿数据
                    </div>
                    {rate.source && (
                        <a
                            href={rate.source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <span>查看来源</span>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="w-3 h-3"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
                                    clipRule="evenodd"
                                />
                                <path
                                    fillRule="evenodd"
                                    d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </a>
                    )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {items.map((item, index) => (
                        <div
                            key={index}
                            className="bg-background rounded-md p-2 text-center"
                        >
                            <div className={`text-base font-bold ${item.className}`}>
                                {item.value}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {item.label}
                            </div>
                        </div>
                    ))}
                </div>
                {/* {rate.str && (
                    <div className="text-xs text-muted-foreground mt-2 border-t border-border/50 pt-2">
                        {rate.str}
                    </div>
                )} */}
            </div>
        );
    };

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

                                    <Alert variant={isExpired ? "destructive" : "default"}>
                                        {isExpired ? (
                                            <AlertCircle className="h-4 w-4" />
                                        ) : (
                                            <Timer className="h-4 w-4" />
                                        )}
                                        <div className="flex flex-col gap-1">
                                            <div className="font-bold">
                                                {isExpired ? "已截止" : "进行中"}
                                            </div>
                                            <div className="text-xs space-y-1">
                                                <div>
                                                    截止时间：{format(new Date(deadline.deadline), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                                                    {deadline.timezone && (
                                                        <span className="ml-1">
                                                            ({deadline.timezone})
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    中国时间：{format(new Date(convertToEast8(deadline.deadline, deadline.timezone)), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                                                </div>
                                            </div>
                                        </div>
                                    </Alert>

                                    {!isExpired && (
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

                                    {acceptanceRate && formatAcceptanceRate(acceptanceRate)}
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
