'use client';

import { Card, CardContent } from "@/components/ui/card";

interface RankCardProps {
    title: string;
    value: string;
}

export function RankCard({ title, value }: RankCardProps) {
    // 根据文本长度动态设置字体大小
    const getFontSize = (text: string) => {
        const length = text.length;
        if (length > 20) return 'text-sm';
        if (length > 10) return 'text-lg';
        return 'text-2xl';
    };

    return (
        <Card className="hover:bg-accent transition-colors">
            <CardContent className="p-4">
                <div className="text-sm font-medium text-muted-foreground mb-1">
                    {title}
                </div>
                <div className={`font-bold ${getFontSize(value)} break-words`}>
                    {value}
                </div>
            </CardContent>
        </Card>
    );
}
