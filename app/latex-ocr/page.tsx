'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Undo, Info } from 'lucide-react';
import { ProgressWithColor } from "@/components/ui/progress-with-color";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast"
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';
import { Loading } from "@/components/ui/loading";
import { Textarea } from "@/components/ui/textarea";
import html2canvas from 'html2canvas';
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
import { v4 as uuidv4 } from 'uuid';
import { saveFormulaRecord } from '@/lib/latex-ocr/store';
import Link from 'next/link';

const LatexRecognition = () => {
    const { toast } = useToast();
    const [recognizedFormula, setRecognizedFormula] = useState('');
    const [confidence, setConfidence] = useState(0);
    const [previewImage, setPreviewImage] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [drawError, setDrawError] = useState('');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
    const [strokes, setStrokes] = useState<Array<ImageData>>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [showClearDialog, setShowClearDialog] = useState(false);
    const [accordionKey, setAccordionKey] = useState(uuidv4());

    // 初始化画布
    const initCanvas = (canvas) => {
        if (canvas) {
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

    // 处理窗口大小变化
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.width = 600;
            canvas.height = 300;
            initCanvas(canvas);
        }
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
    const startDrawing = (e) => {
        setIsDrawing(true);
        const { offsetX, offsetY } = e.nativeEvent;
        if (context) {
            context.beginPath();
            context.moveTo(offsetX, offsetY);
        }
    };

    const draw = (e) => {
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

    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            setIsDrawing(true);
            if (context) {
                context.beginPath();
                context.moveTo(x, y);
            }
        }
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (!isDrawing) return;
        const touch = e.touches[0];
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect && context) {
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            context.lineTo(x, y);
            context.stroke();
        }
    };

    // 将文件转换为base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('Failed to convert file to base64'));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // 将 blob 转换为 base64
    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('Failed to convert blob to base64'));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    // 处理图片上传
    const handleImageUpload = async (event) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const base64Image = await fileToBase64(file);
                setPreviewImage(base64Image);

                const result = await sendImageToAPI(file);
                if (result) {
                    saveRecord(base64Image, result.latex, result.confidence);
                }
            } catch (err) {
                setUploadError('处理图片时出错');
                setLoading(false);
            }
        }
    };

    // 处理粘贴事件
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (item.type.indexOf('image') === 0) {
                    const file = item.getAsFile();
                    if (file) {
                        try {
                            const base64Image = await fileToBase64(file);
                            setPreviewImage(base64Image);

                            const result = await sendImageToAPI(file);
                            if (result) {
                                saveRecord(base64Image, result.latex, result.confidence);
                            }
                        } catch (err) {
                            setUploadError('处理图片时出错');
                            setLoading(false);
                        }
                    }
                    break;
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    // 发送API请求
    const sendImageToAPI = async (file) => {
        setLoading(true);
        setUploadError('');
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/latex-ocr', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('API请求失败');
            }

            const data = await response.json();
            if (data.status && data.res) {
                const latex = data.res.latex;
                const confidence = data.res.conf * 100;
                setRecognizedFormula(latex);
                setConfidence(confidence);
                return { latex, confidence };
            } else {
                throw new Error('API返回格式错误');
            }
        } catch (error) {
            setUploadError('识别失败，请重试');
            console.error(error);
            return null;
        } finally {
            setLoading(false);
        }
    };

    // 提交手写内容
    const submitDrawing = async () => {
        if (!canvasRef.current || !context) {
            setDrawError('画板初始化失败');
            return;
        }

        // 检查是否有内容
        const imageData = context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        const hasContent = Array.from(imageData.data).some(pixel => pixel !== 0);

        if (!hasContent) {
            setDrawError('请先绘制公式');
            return;
        }

        try {
            setLoading(true);
            setDrawError('');

            const blob = await new Promise<Blob>((resolve) => {
                canvasRef.current?.toBlob((blob) => {
                    resolve(blob as Blob);
                });
            });

            // 转换为base64并设置预览图片
            const base64Image = await blobToBase64(blob);
            setPreviewImage(base64Image);

            const formData = new FormData();
            formData.append('file', blob, 'formula.png');

            const response = await fetch('/api/latex-ocr', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('识别失败');
            }

            const data = await response.json();
            if (data.status && data.res) {
                const latex = data.res.latex;
                const confidence = data.res.conf * 100;
                setRecognizedFormula(latex);
                setConfidence(confidence);
                saveRecord(base64Image, latex, confidence);
            } else {
                throw new Error('API返回格式错误');
            }

        } catch (err) {
            setDrawError(err.message || '识别失败');
        } finally {
            setLoading(false);
        }
    };

    // 保存记录
    const saveRecord = (imageUrl: string, latex: string, confidence: number) => {
        const record = {
            id: uuidv4(),
            image: imageUrl,
            latex,
            confidence,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        saveFormulaRecord(record);
    };

    const getConfidenceColor = (value: number) => {
        if (value >= 80) return "bg-green-500";
        if (value >= 50) return "bg-yellow-500";
        return "bg-red-500";
    };

    const copyFormula = async (type: 'plain' | 'math' | 'image') => {
        try {
            let content = '';
            switch (type) {
                case 'plain':
                    content = recognizedFormula;
                    break;
                case 'math':
                    content = `$$${recognizedFormula}$$`;
                    break;
                case 'image':
                    if (!previewRef.current) return;
                    const canvas = await html2canvas(previewRef.current);
                    canvas.toBlob(async (blob) => {
                        if (blob) {
                            await navigator.clipboard.write([
                                new ClipboardItem({ 'image/png': blob })
                            ]);
                            toast({
                                title: "复制成功",
                                description: "公式图片已复制到剪贴板",
                                duration: 2000,
                            });
                        }
                    });
                    return;
            }
            await navigator.clipboard.writeText(content);
            toast({
                title: "复制成功",
                description: "公式已复制到剪贴板",
                duration: 2000,
            });
        } catch (err) {
            toast({
                title: "复制失败",
                description: "请手动复制公式",
                variant: "destructive",
                duration: 2000,
            });
        }
    };

    return (
        <>
            {loading && <Loading text="正在识别中..." />}
            <div className="container mx-auto py-6">
                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>LaTeX 公式识别</CardTitle>
                                <Button size="sm" asChild>
                                    <Link href="/latex-ocr/history">历史记录</Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <Alert>
                                    {/* <Info className="h-4 w-4" /> */}
                                    <AlertDescription>
                                        支持上传图片文件或直接粘贴截图，推荐使用清晰的公式图片以获得更好的识别效果。
                                    </AlertDescription>
                                </Alert>

                                <div className={`grid ${recognizedFormula ? 'grid-cols-2' : ''} gap-4`}>
                                    <div className="space-y-4">
                                        {previewImage && (
                                            <div>
                                                <img
                                                    src={previewImage}
                                                    alt="预览"
                                                    className="max-w-full h-auto border rounded-lg"
                                                />
                                            </div>
                                        )}

                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                                id="image-upload"
                                            />
                                            <label
                                                htmlFor="image-upload"
                                                className="flex flex-col items-center cursor-pointer"
                                            >
                                                <Upload className="h-16 w-16 text-gray-400" />
                                                <span className="mt-4 text-sm text-gray-500">
                                                    点击上传或拖拽图片到此处
                                                </span>
                                            </label>
                                        </div>

                                        {uploadError && (
                                            <Alert variant="destructive">
                                                <AlertDescription>{uploadError}</AlertDescription>
                                            </Alert>
                                        )}
                                    </div>

                                    {recognizedFormula && (
                                        <div className="space-y-4">
                                            <div className="bg-white rounded-lg border">
                                                <div ref={previewRef} className="flex items-center justify-center min-h-[120px] p-4">
                                                    <InlineMath math={recognizedFormula} />
                                                </div>
                                            </div>

                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <ProgressWithColor
                                                        value={confidence}
                                                        indicatorColor={getConfidenceColor(confidence)}
                                                        className="flex-1"
                                                    />
                                                    <div className="text-sm text-muted-foreground w-12 text-right">{confidence.toFixed(1)}%</div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                {/* <div className="text-sm text-muted-foreground">识别结果：</div> */}
                                                <Textarea
                                                    value={recognizedFormula}
                                                    onChange={(e) => setRecognizedFormula(e.target.value)}
                                                    className="font-mono min-h-[160px]"
                                                />
                                            </div>

                                            <div className="flex gap-2">
                                                <Button onClick={() => copyFormula('plain')} className="flex-1" variant="secondary">
                                                    复制公式
                                                </Button>
                                                <Button onClick={() => copyFormula('math')} className="flex-1" variant="secondary">
                                                    复制公式(前后带$$)
                                                </Button>
                                                <Button onClick={() => copyFormula('image')} className="flex-1" variant="secondary">
                                                    复制图片
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Accordion
                                    type="single"
                                    collapsible
                                    key={accordionKey}
                                >
                                    <AccordionItem value="draw">
                                        <AccordionTrigger>手写公式</AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-4">
                                                <Alert>
                                                    <AlertDescription>
                                                        在画板上手写公式，完成后点击识别。
                                                    </AlertDescription>
                                                </Alert>
                                                <div className="flex justify-center">
                                                    <div className="w-[800px]">
                                                        <div className="border rounded-lg overflow-hidden" ref={containerRef}>
                                                            <canvas
                                                                ref={(canvas) => {
                                                                    canvasRef.current = canvas;
                                                                    initCanvas(canvas);
                                                                }}
                                                                width={800}
                                                                height={300}
                                                                className="w-full touch-none cursor-crosshair bg-white"
                                                                onMouseDown={startDrawing}
                                                                onMouseMove={draw}
                                                                onMouseUp={stopDrawing}
                                                                onMouseOut={stopDrawing}
                                                                onTouchStart={handleTouchStart}
                                                                onTouchMove={handleTouchMove}
                                                                onTouchEnd={stopDrawing}
                                                            />
                                                        </div>
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
                                                                onClick={submitDrawing}
                                                                className="flex-1"
                                                            >
                                                                识别
                                                            </Button>
                                                        </div>
                                                        {drawError && (
                                                            <Alert variant="destructive" className="mt-4">
                                                                <AlertDescription>{drawError}</AlertDescription>
                                                            </Alert>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </div>
                        </CardContent>
                    </Card>
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

                <Toaster />
            </div>
        </>
    );
};

export default LatexRecognition;