'use client';

import React from 'react';
import { InlineMath } from 'react-katex';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ProgressWithColor } from "@/components/ui/progress-with-color";

interface FormulaDisplayProps {
    formula: string;
    confidence: number;
    onFormulaChange: (formula: string) => void;
    onCopy: (type: 'plain' | 'math' | 'image') => void;
}

export function FormulaDisplay({ formula, confidence, onFormulaChange, onCopy }: FormulaDisplayProps) {
    const getConfidenceColor = (value: number) => {
        if (value >= 80) return "bg-green-500";
        if (value >= 50) return "bg-yellow-500";
        return "bg-red-500";
    };

    return (
        <div className="space-y-4">
            <div className="bg-card border rounded-lg">
                <div className="flex items-center justify-center min-h-[50px] p-2">
                    <InlineMath math={formula} />
                </div>
            </div>

            <div className="space-y-1">
                <div className="text-sm text-muted-foreground">识别置信度</div>
                <ProgressWithColor
                    value={confidence}
                    indicatorColor={getConfidenceColor(confidence)}
                    className="w-full"
                />
                <div className="text-sm text-right text-muted-foreground">{confidence.toFixed(1)}%</div>
            </div>

            <div className="space-y-2">
                <div className="text-sm text-muted-foreground">LaTeX 公式：</div>
                <Textarea
                    value={formula}
                    onChange={(e) => onFormulaChange(e.target.value)}
                    className="font-mono min-h-[100px]"
                />
            </div>

            <div className="flex gap-2">
                <Button onClick={() => onCopy('plain')} className="flex-1" variant="secondary">
                    复制公式
                </Button>
                <Button onClick={() => onCopy('math')} className="flex-1" variant="secondary">
                    复制公式(前后带$$)
                </Button>
                <Button onClick={() => onCopy('image')} className="flex-1" variant="secondary">
                    复制图片
                </Button>
            </div>
        </div>
    );
}
