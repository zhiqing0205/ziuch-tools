'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { InlineMath } from 'react-katex';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ProgressWithColor } from "@/components/ui/progress-with-color";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import html2canvas from 'html2canvas';

interface FormulaDisplayProps {
    formula: string;
    confidence: number;
    onFormulaChange: (formula: string) => void;
    onCopy: (type: 'plain' | 'math' | 'image') => void;
}

// 预设的前后缀选项
const PREFIX_SUFFIX_OPTIONS = [
    { id: 'none', label: '无前后缀', prefix: '', suffix: '' },
    { id: 'dollar', label: '$$公式$$', prefix: '$$', suffix: '$$' },
    { id: 'math', label: '\\[公式\\]', prefix: '\\[', suffix: '\\]' },
    { id: 'inline', label: '$公式$', prefix: '$', suffix: '$' },
];

export function FormulaDisplay({ formula, confidence, onFormulaChange, onCopy }: FormulaDisplayProps) {
    const [selectedPrefixSuffix, setSelectedPrefixSuffix] = useState('none');
    const [autoCopyEnabled, setAutoCopyEnabled] = useState(false);
    const [imageWithBackground, setImageWithBackground] = useState(true);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const formulaRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    // 从localStorage加载设置
    useEffect(() => {
        const savedPrefixSuffix = localStorage.getItem('latex-ocr-prefix-suffix');
        const savedAutoCopy = localStorage.getItem('latex-ocr-auto-copy');
        const savedImageBackground = localStorage.getItem('latex-ocr-image-background');
        
        if (savedPrefixSuffix) {
            setSelectedPrefixSuffix(savedPrefixSuffix);
        }
        if (savedAutoCopy) {
            setAutoCopyEnabled(JSON.parse(savedAutoCopy));
        }
        if (savedImageBackground) {
            setImageWithBackground(JSON.parse(savedImageBackground));
        }
    }, []);

    // 保存设置到localStorage
    useEffect(() => {
        localStorage.setItem('latex-ocr-prefix-suffix', selectedPrefixSuffix);
    }, [selectedPrefixSuffix]);

    useEffect(() => {
        localStorage.setItem('latex-ocr-auto-copy', JSON.stringify(autoCopyEnabled));
    }, [autoCopyEnabled]);

    useEffect(() => {
        localStorage.setItem('latex-ocr-image-background', JSON.stringify(imageWithBackground));
    }, [imageWithBackground]);

    const getConfidenceColor = (value: number) => {
        if (value >= 80) return "bg-green-500";
        if (value >= 50) return "bg-yellow-500";
        return "bg-red-500";
    };

    const getCurrentOption = useCallback(() => {
        return PREFIX_SUFFIX_OPTIONS.find(opt => opt.id === selectedPrefixSuffix) || PREFIX_SUFFIX_OPTIONS[0];
    }, [selectedPrefixSuffix]);

    const handleCopyFormula = useCallback(() => {
        const option = getCurrentOption();
        const formattedFormula = `${option.prefix}${formula}${option.suffix}`;
        
        navigator.clipboard.writeText(formattedFormula).then(() => {
            toast({
                title: "复制成功",
                description: "公式已复制到剪贴板",
                duration: 2000,
            });
        }).catch(err => {
            console.error('复制失败:', err);
            toast({
                title: "复制失败",
                description: "请手动复制公式",
                variant: "destructive",
                duration: 3000,
            });
        });
    }, [formula, getCurrentOption, toast]);

    // 自动复制功能
    useEffect(() => {
        if (autoCopyEnabled && formula.trim()) {
            handleCopyFormula();
        }
    }, [autoCopyEnabled, formula, handleCopyFormula]);

    // 生成公式图片 - 根据内容自动调整尺寸
    const generateFormulaImage = async (download = false) => {
        if (!formulaRef.current || !formula.trim()) return;

        setIsGeneratingImage(true);
        
        try {
            // 等待KaTeX完全渲染
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // 尝试找到KaTeX生成的SVG元素
            const svgElement = formulaRef.current.querySelector('svg');
            if (svgElement) {
                // 如果有SVG，直接使用SVG生成图片
                return generateImageFromSVG(svgElement, download);
            }
            
            // 如果没有SVG，使用html2canvas捕获整个容器
            const canvas = await html2canvas(formulaRef.current, {
                backgroundColor: null, // 始终设为null，稍后手动处理背景
                scale: 2,
                useCORS: true,
                allowTaint: false,
                logging: false,
                onclone: (clonedDoc) => {
                    // 简化的样式处理
                    const style = clonedDoc.createElement('style');
                    style.textContent = `
                        .katex { 
                            color: #000000 !important; 
                            font-size: 18px !important;
                        }
                        .katex * { 
                            color: #000000 !important; 
                        }
                    `;
                    clonedDoc.head.appendChild(style);
                }
            });

            // 检测实际内容边界
            const contentBounds = detectContentBounds(canvas);
            if (!contentBounds) {
                throw new Error('未检测到公式内容');
            }

            // 根据内容创建合适尺寸的最终canvas
            const padding = 20; // 统一20px边距
            const finalCanvas = document.createElement('canvas');
            const finalCtx = finalCanvas.getContext('2d');
            
            finalCanvas.width = contentBounds.width + padding * 2;
            finalCanvas.height = contentBounds.height + padding * 2;
            
            // 处理背景
            if (imageWithBackground) {
                finalCtx.fillStyle = '#ffffff';
                finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
            }
            
            // 将内容绘制到最终canvas的中心
            finalCtx.drawImage(
                canvas,
                contentBounds.x, contentBounds.y, contentBounds.width, contentBounds.height,
                padding, padding, contentBounds.width, contentBounds.height
            );

            if (download) {
                downloadCanvas(finalCanvas);
            } else {
                copyCanvasToClipboard(finalCanvas);
            }

        } catch (error) {
            console.error('生成图片失败:', error);
            toast({
                title: "生成失败",
                description: "无法生成公式图片，请重试",
                variant: "destructive",
                duration: 3000,
            });
        } finally {
            setIsGeneratingImage(false);
        }
    };

    // 检测canvas中实际内容的边界
    const detectContentBounds = (canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        
        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
        let hasContent = false;
        
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const idx = (y * canvas.width + x) * 4;
                const alpha = pixels[idx + 3];
                if (alpha > 0) {
                    hasContent = true;
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        
        if (!hasContent) return null;
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1
        };
    };

    // 从SVG生成图片
    const generateImageFromSVG = async (svgElement: SVGElement, download: boolean) => {
        try {
            // 获取SVG的viewBox或实际尺寸
            const viewBox = svgElement.getAttribute('viewBox');
            let svgWidth, svgHeight;
            
            if (viewBox) {
                const [, , width, height] = viewBox.split(' ').map(Number);
                svgWidth = width;
                svgHeight = height;
            } else {
                // 如果没有viewBox，使用getBBox获取实际内容尺寸
                const bbox = svgElement.getBBox();
                svgWidth = bbox.width;
                svgHeight = bbox.height;
            }
            
            const svgData = new XMLSerializer().serializeToString(svgElement);
            
            // 创建一个干净的SVG，确保透明背景
            const cleanSvgData = svgData.replace(/fill="white"/g, 'fill="none"')
                                        .replace(/background-color:\s*white/g, 'background-color: transparent');
            
            const svgBlob = new Blob([cleanSvgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            
            return new Promise<void>((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const padding = 20; // 统一20px边距
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // 根据SVG内容尺寸设置canvas尺寸
                    canvas.width = svgWidth + padding * 2;
                    canvas.height = svgHeight + padding * 2;
                    
                    // 只有在需要白色背景时才填充背景
                    if (imageWithBackground) {
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                    
                    // 将SVG内容绘制到canvas中心
                    ctx.drawImage(img, padding, padding, svgWidth, svgHeight);
                    
                    URL.revokeObjectURL(url);
                    
                    if (download) {
                        downloadCanvas(canvas);
                    } else {
                        copyCanvasToClipboard(canvas);
                    }
                    resolve();
                };
                img.onerror = reject;
                img.src = url;
            });
        } catch (error) {
            console.error('SVG处理失败:', error);
            throw error;
        }
    };

    // 下载canvas
    const downloadCanvas = (canvas: HTMLCanvasElement) => {
        const link = document.createElement('a');
        link.download = `formula_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        toast({
            title: "下载成功",
            description: "公式图片已下载",
            duration: 2000,
        });
    };

    // 复制canvas到剪贴板
    const copyCanvasToClipboard = (canvas: HTMLCanvasElement) => {
        canvas.toBlob((blob) => {
            if (blob) {
                navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]).then(() => {
                    toast({
                        title: "复制成功",
                        description: "公式图片已复制到剪贴板",
                        duration: 2000,
                    });
                }).catch(err => {
                    console.error('复制图片失败:', err);
                    toast({
                        title: "复制失败",
                        description: "无法复制图片到剪贴板",
                        variant: "destructive",
                        duration: 3000,
                    });
                });
            }
        }, 'image/png');
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-lg border p-8">
                <div 
                    ref={formulaRef}
                    className="flex items-center justify-center min-h-[80px]"
                    style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '80px',
                        padding: '20px',
                        fontSize: '18px',
                        lineHeight: '1.5',
                        color: '#000000',
                        backgroundColor: '#ffffff'
                    }}
                >
                    <div style={{ display: 'inline-block' }}>
                        <InlineMath math={formula} />
                    </div>
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

            {/* 复制设置面板 */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">复制设置</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* 前后缀选择 */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">前后缀格式</Label>
                        <RadioGroup
                            value={selectedPrefixSuffix}
                            onValueChange={setSelectedPrefixSuffix}
                            className="grid grid-cols-2 gap-2"
                        >
                            {PREFIX_SUFFIX_OPTIONS.map((option) => (
                                <div key={option.id} className="flex items-center space-x-2">
                                    <RadioGroupItem value={option.id} id={option.id} />
                                    <Label 
                                        htmlFor={option.id} 
                                        className="text-sm cursor-pointer flex-1"
                                    >
                                        {option.label}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    {/* 预览格式化后的公式 */}
                    {selectedPrefixSuffix !== 'none' && formula && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">预览格式</Label>
                            <div className="p-3 bg-gray-50 rounded-md border">
                                <code className="text-xs break-all">
                                    {`${getCurrentOption().prefix}${formula}${getCurrentOption().suffix}`}
                                </code>
                            </div>
                        </div>
                    )}

                    {/* 自动复制选项 */}
                    <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="auto-copy"
                                checked={autoCopyEnabled}
                                onCheckedChange={setAutoCopyEnabled}
                            />
                            <Label htmlFor="auto-copy" className="text-sm cursor-pointer">
                                识别完成后自动复制到剪贴板
                            </Label>
                        </div>

                        {/* 图片背景选项 */}
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="image-background"
                                checked={imageWithBackground}
                                onCheckedChange={setImageWithBackground}
                            />
                            <Label htmlFor="image-background" className="text-sm cursor-pointer">
                                图片包含白色背景
                            </Label>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 操作按钮 */}
            <div className="grid grid-cols-3 gap-2">
                <Button 
                    onClick={handleCopyFormula} 
                    className="w-full" 
                    variant="secondary"
                    disabled={!formula.trim()}
                >
                    复制公式 {selectedPrefixSuffix !== 'none' ? `(${getCurrentOption().label})` : ''}
                </Button>
                
                <Button 
                    onClick={() => generateFormulaImage(false)} 
                    className="w-full" 
                    variant="secondary"
                    disabled={!formula.trim() || isGeneratingImage}
                >
                    {isGeneratingImage ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            复制中...
                        </>
                    ) : (
                        '复制图片'
                    )}
                </Button>
                
                <Button 
                    onClick={() => generateFormulaImage(true)} 
                    className="w-full" 
                    variant="outline"
                    disabled={!formula.trim() || isGeneratingImage}
                >
                    {isGeneratingImage ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            下载中...
                        </>
                    ) : (
                        <>
                            <Download className="h-4 w-4 mr-2" />
                            下载PNG
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
