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

    // 生成公式图片 - 捕获父容器并给足够空间
    const generateFormulaImage = async (download = false) => {
        if (!formulaRef.current || !formula.trim()) return;

        setIsGeneratingImage(true);
        
        try {
            // 等待KaTeX完全渲染
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 捕获整个父容器而不是单独的KaTeX元素
            const containerElement = formulaRef.current;
            const katexElement = containerElement.querySelector('.katex');
            
            if (!katexElement) {
                throw new Error('未找到KaTeX元素');
            }

            // 获取KaTeX元素的边界框，包括可能的溢出部分
            const katexRect = katexElement.getBoundingClientRect();
            const containerRect = containerElement.getBoundingClientRect();
            
            console.log('KaTeX元素尺寸:', katexRect);
            console.log('容器元素尺寸:', containerRect);

            // 计算更大的捕获区域，确保包含所有可能的上标、下标
            const extraHeight = 40; // 额外的高度空间
            const extraWidth = 20;  // 额外的宽度空间

            const canvas = await html2canvas(containerElement, {
                backgroundColor: null,
                scale: 3,
                useCORS: true,
                allowTaint: false,
                logging: true,
                width: containerRect.width + extraWidth,
                height: containerRect.height + extraHeight,
                // 调整捕获区域，给更多垂直空间
                x: 0,
                y: 0,
                scrollX: 0,
                scrollY: 0,
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight,
                onclone: (clonedDoc, element) => {
                    // 完整的KaTeX样式
                    const katexCSS = `
                        * {
                            box-sizing: border-box !important;
                        }
                        .katex {
                            font-family: KaTeX_Main, "Times New Roman", serif !important;
                            font-size: 1.21em !important;
                            line-height: 1.8 !important;
                            color: #000000 !important;
                            display: inline-block !important;
                            vertical-align: baseline !important;
                            position: relative !important;
                            margin: 10px 0 !important;
                            padding: 10px 0 !important;
                        }
                        .katex .base {
                            display: inline-block !important;
                            vertical-align: baseline !important;
                            position: relative !important;
                        }
                        .katex .strut {
                            display: inline-block !important;
                            min-height: 2em !important;
                        }
                        .katex .mord, .katex .mop, .katex .mrel, .katex .mbin, 
                        .katex .mopen, .katex .mclose, .katex .mpunct {
                            color: #000000 !important;
                            position: relative !important;
                        }
                        .katex .vlist-t {
                            display: inline-table !important;
                            position: relative !important;
                        }
                        .katex .vlist-r {
                            display: table-row !important;
                        }
                        .katex .vlist {
                            display: table-cell !important;
                            vertical-align: bottom !important;
                            position: relative !important;
                        }
                        .katex .vlist > span {
                            position: relative !important;
                        }
                        .katex .msupsub {
                            position: relative !important;
                        }
                        .katex .mfrac {
                            position: relative !important;
                            vertical-align: middle !important;
                        }
                        .katex .frac-line {
                            position: relative !important;
                        }
                        /* 确保上标下标可见 */
                        .katex .msupsub > .vlist-t > .vlist-r > .vlist > span {
                            position: relative !important;
                        }
                    `;
                    
                    const style = clonedDoc.createElement('style');
                    style.textContent = katexCSS;
                    clonedDoc.head.appendChild(style);
                    
                    // 确保容器有足够的空间
                    const clonedContainer = element;
                    clonedContainer.style.minHeight = `${containerRect.height + extraHeight}px`;
                    clonedContainer.style.minWidth = `${containerRect.width + extraWidth}px`;
                    clonedContainer.style.padding = '20px';
                    clonedContainer.style.overflow = 'visible';
                    
                    // 确保所有元素都可见
                    const allElements = clonedDoc.querySelectorAll('*');
                    allElements.forEach(el => {
                        el.style.visibility = 'visible';
                        el.style.opacity = '1';
                        el.style.overflow = 'visible';
                        if (el.style.maxHeight) el.style.maxHeight = 'none';
                        if (el.style.maxWidth) el.style.maxWidth = 'none';
                    });
                    
                    // 特别处理KaTeX元素
                    const clonedKatex = element.querySelector('.katex');
                    if (clonedKatex) {
                        clonedKatex.style.position = 'relative';
                        clonedKatex.style.margin = '20px';
                        clonedKatex.style.padding = '10px';
                        clonedKatex.style.minHeight = '60px';
                        clonedKatex.style.display = 'inline-block';
                        clonedKatex.style.verticalAlign = 'baseline';
                        clonedKatex.style.overflow = 'visible';
                    }
                }
            });

            console.log('生成的canvas尺寸:', canvas.width, canvas.height);

            // 裁剪canvas，移除多余的空白，但保留公式内容
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            tempCtx.drawImage(canvas, 0, 0);
            
            // 检测实际内容边界
            const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
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
            
            if (!hasContent) {
                throw new Error('生成的图片为空');
            }
            
            // 添加一些边距到实际内容
            const contentPadding = 30;
            const contentWidth = maxX - minX + contentPadding * 2;
            const contentHeight = maxY - minY + contentPadding * 2;
            
            console.log('内容边界:', { minX, minY, maxX, maxY, contentWidth, contentHeight });

            // 创建最终的canvas
            const finalCanvas = document.createElement('canvas');
            const finalCtx = finalCanvas.getContext('2d');
            const padding = 60;
            
            finalCanvas.width = contentWidth + padding;
            finalCanvas.height = contentHeight + padding;
            
            // 设置背景
            if (imageWithBackground) {
                finalCtx.fillStyle = '#ffffff';
                finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
            }
            
            // 绘制裁剪后的内容到最终canvas的中心
            finalCtx.drawImage(
                canvas,
                minX - contentPadding, minY - contentPadding, contentWidth, contentHeight,
                padding / 2, padding / 2, contentWidth, contentHeight
            );

            if (download) {
                // 下载图片
                const link = document.createElement('a');
                link.download = `formula_${Date.now()}.png`;
                link.href = finalCanvas.toDataURL('image/png');
                link.click();
                
                toast({
                    title: "下载成功",
                    description: "公式图片已下载",
                    duration: 2000,
                });
            } else {
                // 复制到剪贴板
                finalCanvas.toBlob((blob) => {
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
