'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Undo, Redo, Eraser, PenTool, Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast"
import 'katex/dist/katex.min.css';
import { Loading } from "@/components/ui/loading";
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
import { recognizeLatex } from '@/app/api/latex-ocr';
import { FormulaDisplay } from '@/components/latex-ocr/formula-display';

// 定义笔迹数据结构
interface Stroke {
    id: string;
    points: Array<{ x: number; y: number }>;
    color: string;
    lineWidth: number;
    timestamp: number;
}

// 工具类型
type ToolType = 'pen' | 'eraser';

// 橡皮擦模式
type EraserMode = 'stroke' | 'pixel';

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
    const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
    
    // 新的状态管理
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
    const [history, setHistory] = useState<Stroke[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [isDrawing, setIsDrawing] = useState(false);
    const [showClearDialog, setShowClearDialog] = useState(false);
    
    // 工具相关状态
    const [currentTool, setCurrentTool] = useState<ToolType>('pen');
    const [eraserMode, setEraserMode] = useState<EraserMode>('stroke');
    const [eraserSize, setEraserSize] = useState(20);
    const [penSize, setPenSize] = useState(2);
    
    // 光标相关状态
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [showCursor, setShowCursor] = useState(false);
    const cursorRef = useRef<HTMLDivElement>(null);

    // 初始化画布
    const initCanvas = useCallback((canvas: HTMLCanvasElement) => {
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = penSize;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                setContext(ctx);
            }
        }
    }, [penSize]);

    // 重绘整个画布
    const redrawCanvas = useCallback((ctx?: CanvasRenderingContext2D) => {
        const canvas = canvasRef.current;
        const drawContext = ctx || context;
        if (!canvas || !drawContext) return;

        drawContext.clearRect(0, 0, canvas.width, canvas.height);
        
        strokes.forEach(stroke => {
            if (stroke.points.length < 2) return;
            
            drawContext.beginPath();
            drawContext.strokeStyle = stroke.color;
            drawContext.lineWidth = stroke.lineWidth;
            drawContext.moveTo(stroke.points[0].x, stroke.points[0].y);
            
            for (let i = 1; i < stroke.points.length; i++) {
                drawContext.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            drawContext.stroke();
        });
    }, [strokes, context]);

    // 保存历史状态
    const saveToHistory = () => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push([...strokes]);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    // 撤销操作
    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setStrokes([...history[historyIndex - 1]]);
        } else if (historyIndex === 0) {
            setHistoryIndex(-1);
            setStrokes([]);
        }
    };

    // 重做操作
    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setStrokes([...history[historyIndex + 1]]);
        }
    };

    // 检测点是否在笔迹附近
    const isPointNearStroke = (x: number, y: number, stroke: Stroke, threshold: number): boolean => {
        for (let i = 0; i < stroke.points.length - 1; i++) {
            const p1 = stroke.points[i];
            const p2 = stroke.points[i + 1];
            
            // 计算点到线段的距离
            const A = x - p1.x;
            const B = y - p1.y;
            const C = p2.x - p1.x;
            const D = p2.y - p1.y;
            
            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            
            if (lenSq === 0) {
                // 线段长度为0，计算到点的距离
                const distance = Math.sqrt(A * A + B * B);
                if (distance <= threshold) return true;
                continue;
            }
            
            const param = dot / lenSq;
            let xx, yy;
            
            if (param < 0) {
                xx = p1.x;
                yy = p1.y;
            } else if (param > 1) {
                xx = p2.x;
                yy = p2.y;
            } else {
                xx = p1.x + param * C;
                yy = p1.y + param * D;
            }
            
            const dx = x - xx;
            const dy = y - yy;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= threshold) return true;
        }
        return false;
    };

    // 按笔迹擦除
    const eraseByStroke = (x: number, y: number) => {
        const strokesToRemove: string[] = [];
        
        strokes.forEach(stroke => {
            if (isPointNearStroke(x, y, stroke, eraserSize / 2)) {
                strokesToRemove.push(stroke.id);
            }
        });
        
        if (strokesToRemove.length > 0) {
            const newStrokes = strokes.filter(stroke => !strokesToRemove.includes(stroke.id));
            setStrokes(newStrokes);
            return true;
        }
        return false;
    };

    // 按像素擦除
    const eraseByPixel = (x: number, y: number) => {
        const newStrokes: Stroke[] = [];
        let hasChanges = false;
        
        strokes.forEach(stroke => {
            let currentSegment: Array<{ x: number; y: number }> = [];
            
            stroke.points.forEach(point => {
                const distance = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
                
                if (distance > eraserSize / 2) {
                    currentSegment.push(point);
                } else {
                    hasChanges = true;
                    if (currentSegment.length > 1) {
                        // 创建新的笔迹段
                        newStrokes.push({
                            id: uuidv4(),
                            points: [...currentSegment],
                            color: stroke.color,
                            lineWidth: stroke.lineWidth,
                            timestamp: Date.now()
                        });
                    }
                    currentSegment = [];
                }
            });
            
            // 处理剩余的点
            if (currentSegment.length > 1) {
                newStrokes.push({
                    id: uuidv4(),
                    points: [...currentSegment],
                    color: stroke.color,
                    lineWidth: stroke.lineWidth,
                    timestamp: Date.now()
                });
            }
        });
        
        if (hasChanges) {
            setStrokes(newStrokes);
            return true;
        }
        return false;
    };

    // 处理窗口大小变化和重绘
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.width = 600;
            canvas.height = 300;
            initCanvas(canvas);
        }
    }, []);

    // 重绘画布当strokes变化时
    useEffect(() => {
        redrawCanvas();
    }, [redrawCanvas]);

    // 更新的绘画逻辑
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const { offsetX, offsetY } = e.nativeEvent;
        
        if (currentTool === 'pen') {
            const newStroke: Stroke = {
                id: uuidv4(),
                points: [{ x: offsetX, y: offsetY }],
                color: '#000000',
                lineWidth: penSize,
                timestamp: Date.now()
            };
            setCurrentStroke(newStroke);
            setIsDrawing(true);
        } else if (currentTool === 'eraser') {
            setIsDrawing(true);
            const hasErased = eraserMode === 'stroke' 
                ? eraseByStroke(offsetX, offsetY)
                : eraseByPixel(offsetX, offsetY);
            
            if (hasErased) {
                saveToHistory();
            }
        }
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = e.nativeEvent;
        
        if (currentTool === 'pen' && currentStroke) {
            const updatedStroke = {
                ...currentStroke,
                points: [...currentStroke.points, { x: offsetX, y: offsetY }]
            };
            setCurrentStroke(updatedStroke);
            
            // 实时绘制当前笔迹
            if (context) {
                context.strokeStyle = updatedStroke.color;
                context.lineWidth = updatedStroke.lineWidth;
                const points = updatedStroke.points;
                if (points.length >= 2) {
                    const lastPoint = points[points.length - 2];
                    const currentPoint = points[points.length - 1];
                    context.beginPath();
                    context.moveTo(lastPoint.x, lastPoint.y);
                    context.lineTo(currentPoint.x, currentPoint.y);
                    context.stroke();
                }
            }
        } else if (currentTool === 'eraser') {
            const hasErased = eraserMode === 'stroke' 
                ? eraseByStroke(offsetX, offsetY)
                : eraseByPixel(offsetX, offsetY);
            // Use the result to prevent unused expression warning
            if (hasErased) {
                // Erasing was successful
            }
        }
    };

    const stopDrawing = () => {
        if (isDrawing && currentTool === 'pen' && currentStroke) {
            if (currentStroke.points.length > 1) {
                setStrokes(prev => [...prev, currentStroke]);
                saveToHistory();
            }
            setCurrentStroke(null);
        }
        setIsDrawing(false);
    };

    // 鼠标移动处理
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        setMousePosition({ x, y });
        
        // 如果正在绘制，执行绘制逻辑
        if (isDrawing) {
            draw(e);
        }
    };

    // 鼠标进入画布
    const handleMouseEnter = () => {
        setShowCursor(true);
    };

    // 鼠标离开画布
    const handleMouseLeave = () => {
        setShowCursor(false);
        if (isDrawing) {
            stopDrawing();
        }
    };

    const clearCanvas = () => {
        setStrokes([]);
        setHistory([]);
        setHistoryIndex(-1);
        setShowClearDialog(false);
        if (context && canvasRef.current) {
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
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
            } catch {
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
                        } catch {
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

        try {
            const data = await recognizeLatex(file);
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

            const data = await recognizeLatex(blob);
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


    const copyFormula = async (type: 'plain' | 'math' | 'image') => {
        // 这个函数现在主要用于处理原始的图片复制
        // 新的FormulaDisplay组件会处理大部分复制逻辑
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
                    // 这是原始的图片复制，保留作为兼容
                    toast({
                        title: "提示",
                        description: "请使用新的图片复制功能",
                        duration: 2000,
                    });
                    return;
            }
            await navigator.clipboard.writeText(content);
            toast({
                title: "复制成功",
                description: "公式已复制到剪贴板",
                duration: 2000,
            });
        } catch {
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
                                        <FormulaDisplay
                                            formula={recognizedFormula}
                                            confidence={confidence}
                                            onFormulaChange={setRecognizedFormula}
                                            onCopy={copyFormula}
                                        />
                                    )}
                                </div>

                                <Accordion
                                    type="single"
                                    collapsible
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
                                                        {/* 工具栏 */}
                                                        <div className="bg-gray-50 border rounded-t-lg p-4 space-y-4">
                                                            {/* 工具选择 */}
                                                            <div className="flex items-center gap-4">
                                                                <Label className="text-sm font-medium">工具:</Label>
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        variant={currentTool === 'pen' ? 'default' : 'outline'}
                                                                        size="sm"
                                                                        onClick={() => setCurrentTool('pen')}
                                                                        className="flex items-center gap-2"
                                                                    >
                                                                        <PenTool className="h-4 w-4" />
                                                                        画笔
                                                                    </Button>
                                                                    <Button
                                                                        variant={currentTool === 'eraser' ? 'default' : 'outline'}
                                                                        size="sm"
                                                                        onClick={() => setCurrentTool('eraser')}
                                                                        className="flex items-center gap-2"
                                                                    >
                                                                        <Eraser className="h-4 w-4" />
                                                                        橡皮擦
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            {/* 画笔大小 */}
                                                            {currentTool === 'pen' && (
                                                                <div className="flex items-center gap-4">
                                                                    <Label className="text-sm font-medium">画笔大小:</Label>
                                                                    <div className="flex items-center gap-2 flex-1 max-w-xs">
                                                                        <Slider
                                                                            value={[penSize]}
                                                                            onValueChange={(value) => setPenSize(value[0])}
                                                                            max={10}
                                                                            min={1}
                                                                            step={1}
                                                                            className="flex-1"
                                                                        />
                                                                        <span className="text-sm w-8">{penSize}px</span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* 橡皮擦设置 */}
                                                            {currentTool === 'eraser' && (
                                                                <div className="space-y-3">
                                                                    <div className="flex items-center gap-4">
                                                                        <Label className="text-sm font-medium">擦除模式:</Label>
                                                                        <RadioGroup
                                                                            value={eraserMode}
                                                                            onValueChange={(value: EraserMode) => setEraserMode(value)}
                                                                            className="flex gap-4"
                                                                        >
                                                                            <div className="flex items-center space-x-2">
                                                                                <RadioGroupItem value="stroke" id="stroke" />
                                                                                <Label htmlFor="stroke" className="text-sm">按笔迹</Label>
                                                                            </div>
                                                                            <div className="flex items-center space-x-2">
                                                                                <RadioGroupItem value="pixel" id="pixel" />
                                                                                <Label htmlFor="pixel" className="text-sm">按像素</Label>
                                                                            </div>
                                                                        </RadioGroup>
                                                                    </div>
                                                                    <div className="flex items-center gap-4">
                                                                        <Label className="text-sm font-medium">擦除大小:</Label>
                                                                        <div className="flex items-center gap-2 flex-1 max-w-xs">
                                                                            <Slider
                                                                                value={[eraserSize]}
                                                                                onValueChange={(value) => setEraserSize(value[0])}
                                                                                max={50}
                                                                                min={5}
                                                                                step={5}
                                                                                className="flex-1"
                                                                            />
                                                                            <span className="text-sm w-8">{eraserSize}px</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* 画布容器 */}
                                                        <div className="border border-t-0 rounded-b-lg overflow-hidden relative" ref={containerRef}>
                                                            <canvas
                                                                ref={(canvas) => {
                                                                    canvasRef.current = canvas;
                                                                    if (canvas) initCanvas(canvas);
                                                                }}
                                                                width={800}
                                                                height={300}
                                                                className="w-full touch-none bg-white cursor-none"
                                                                onMouseDown={startDrawing}
                                                                onMouseMove={handleMouseMove}
                                                                onMouseUp={stopDrawing}
                                                                onMouseEnter={handleMouseEnter}
                                                                onMouseLeave={handleMouseLeave}
                                                                onTouchStart={handleTouchStart}
                                                                onTouchMove={handleTouchMove}
                                                                onTouchEnd={stopDrawing}
                                                            />
                                                            
                                                            {/* 自定义光标 */}
                                                            {showCursor && (
                                                                <div
                                                                    ref={cursorRef}
                                                                    className="absolute pointer-events-none z-10"
                                                                    style={{
                                                                        left: mousePosition.x,
                                                                        top: mousePosition.y,
                                                                        transform: 'translate(-50%, -50%)',
                                                                    }}
                                                                >
                                                                    {currentTool === 'eraser' ? (
                                                                        <div
                                                                            className="border-2 border-red-400 bg-white bg-opacity-50 rounded-full"
                                                                            style={{
                                                                                width: eraserSize,
                                                                                height: eraserSize,
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <div
                                                                            className="border-2 border-gray-600 bg-black bg-opacity-30 rounded-full"
                                                                            style={{
                                                                                width: penSize * 2 + 4,
                                                                                height: penSize * 2 + 4,
                                                                            }}
                                                                        />
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* 操作按钮 */}
                                                        <div className="flex gap-2 mt-4">
                                                            <Button
                                                                onClick={undo}
                                                                variant="outline"
                                                                disabled={historyIndex < 0}
                                                                className="flex items-center gap-2"
                                                            >
                                                                <Undo className="h-4 w-4" />
                                                                撤销
                                                            </Button>
                                                            <Button
                                                                onClick={redo}
                                                                variant="outline"
                                                                disabled={historyIndex >= history.length - 1}
                                                                className="flex items-center gap-2"
                                                            >
                                                                <Redo className="h-4 w-4" />
                                                                重做
                                                            </Button>
                                                            <Button
                                                                onClick={() => setShowClearDialog(true)}
                                                                variant="destructive"
                                                                className="flex items-center gap-2"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                清空
                                                            </Button>
                                                            <Button
                                                                onClick={submitDrawing}
                                                                className="flex-1"
                                                                disabled={loading || strokes.length === 0}
                                                            >
                                                                {loading ? <Loading className="mr-2" /> : null}
                                                                识别公式
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
            </div>
        </>
    );
};

export default LatexRecognition;