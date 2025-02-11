'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Undo } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DrawingCanvasProps {
    onSubmit: (blob: Blob) => Promise<void>;
}

export function DrawingCanvas({ onSubmit }: DrawingCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
    const [strokes, setStrokes] = useState<Array<ImageData>>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [showClearDialog, setShowClearDialog] = useState(false);
    const [error, setError] = useState('');

    // 初始化画布
    const initCanvas = (canvas: HTMLCanvasElement | null) => {
        if (canvas) {
            canvas.width = 600;
            canvas.height = 300;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                setContext(ctx);
            }
        }
    };

    useEffect(() => {
        initCanvas(canvasRef.current);
    }, []);

    // 保存当前画布状态
    const saveCanvasState = () => {
        if (context && canvasRef.current) {
            const imageData = context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
            setStrokes(prev => [...prev, imageData]);
        }
    };

    // 撤销上一步
    const undoLastStroke = () => {
        if (strokes.length === 0 || !context || !canvasRef.current) return;

        const newStrokes = strokes.slice(0, -1);
        setStrokes(newStrokes);

        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        if (newStrokes.length > 0) {
            context.putImageData(newStrokes[newStrokes.length - 1], 0, 0);
        }
    };

    // 画板相关函数
    const startDrawing = (e: React.MouseEvent) => {
        setIsDrawing(true);
        const { offsetX, offsetY } = e.nativeEvent;
        if (context) {
            context.beginPath();
            context.moveTo(offsetX, offsetY);
        }
    };

    const draw = (e: React.MouseEvent) => {
        if (!isDrawing || !context) return;
        const { offsetX, offsetY } = e.nativeEvent;
        context.lineTo(offsetX, offsetY);
        context.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing) {
            saveCanvasState();
        }
        setIsDrawing(false);
        if (context) {
            context.closePath();
        }
    };

    const clearCanvas = () => {
        if (canvasRef.current && context) {
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            setStrokes([]);
            setShowClearDialog(false);
        }
    };

    const handleSubmit = async () => {
        if (!canvasRef.current || !context) {
            setError('画板初始化失败');
            return;
        }

        // 检查是否有内容
        const imageData = context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        const hasContent = Array.from(imageData.data).some(pixel => pixel !== 0);

        if (!hasContent) {
            setError('请先绘制公式');
            return;
        }

        try {
            setError('');
            const blob = await new Promise<Blob>((resolve) => {
                canvasRef.current?.toBlob((blob) => {
                    resolve(blob as Blob);
                });
            });
            await onSubmit(blob);
        } catch (err) {
            setError(err instanceof Error ? err.message : '提交失败');
        }
    };

    return (
        <div className="space-y-4">
            <Alert>
                <AlertDescription>
                    在画板上手写公式，完成后点击识别。
                </AlertDescription>
            </Alert>
            <div className="flex justify-center">
                <div className="w-[600px]">
                    <canvas
                        ref={canvasRef}
                        className="border border-gray-300 rounded-lg bg-white touch-none"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseOut={stopDrawing}
                    />
                    <div className="flex gap-2 mt-4">
                        <Button
                            onClick={() => setShowClearDialog(true)}
                            variant="destructive"
                            className="flex-1"
                        >
                            清空
                        </Button>
                        <Button
                            onClick={undoLastStroke}
                            variant="outline"
                            className="flex-1"
                        >
                            <Undo className="h-4 w-4 mr-2" />
                            撤销
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            className="flex-1"
                        >
                            识别
                        </Button>
                    </div>
                    {error && (
                        <Alert variant="destructive" className="mt-4">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </div>
            </div>

            <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认清空画板？</AlertDialogTitle>
                        <AlertDialogDescription>
                            此操作将清空当前画板的所有内容，且不可恢复。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={clearCanvas}>确认</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
