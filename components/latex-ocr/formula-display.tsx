'use client';

// KaTeX全局类型声明
declare global {
    interface Window {
        katex?: {
            render: (math: string, element: HTMLElement, options?: any) => void;
        };
    }
}

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

    // 生成公式图片 - "所见即所得"方案
    const generateFormulaImage = async (download = false) => {
        if (!formula.trim()) return;

        setIsGeneratingImage(true);
        
        try {
            // 创建专用的隐藏导出容器
            const exportContainer = createExportContainer();
            
            // 等待KaTeX完全渲染
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 尝试优先使用SVG方案
            const svgElement = exportContainer.querySelector('svg');
            if (svgElement) {
                const result = await generateImageFromSVG(svgElement, download);
                document.body.removeChild(exportContainer);
                return result;
            }
            
            // 备用方案：使用html2canvas
            const canvas = await html2canvas(exportContainer, {
                backgroundColor: null,
                scale: 3, // 更高的缩放比例确保清晰度
                useCORS: true,
                allowTaint: false,
                logging: false,
                width: exportContainer.offsetWidth,
                height: exportContainer.offsetHeight,
                onclone: (clonedDoc) => {
                    // 确保样式一致性
                    const style = clonedDoc.createElement('style');
                    style.textContent = `
                        .formula-export-container { 
                            padding: 20px !important;
                            background: ${imageWithBackground ? '#ffffff' : 'transparent'} !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                        }
                        .katex { 
                            color: #000000 !important; 
                            font-size: 18px !important;
                            line-height: 1.5 !important;
                        }
                        .katex * { 
                            color: #000000 !important; 
                        }
                    `;
                    clonedDoc.head.appendChild(style);
                }
            });

            // 移除临时容器
            document.body.removeChild(exportContainer);

            if (download) {
                downloadCanvas(canvas);
            } else {
                copyCanvasToClipboard(canvas);
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

    // 创建专用的导出容器
    const createExportContainer = () => {
        const container = document.createElement('div');
        container.className = 'formula-export-container';
        
        // 设置容器样式 - 这就是最终图片的"相框"
        Object.assign(container.style, {
            position: 'absolute',
            left: '-9999px', // 隐藏在视口外
            top: '-9999px',
            padding: '20px', // 固定的20px边距
            background: imageWithBackground ? '#ffffff' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            lineHeight: '1.5',
            color: '#000000',
            fontFamily: 'KaTeX_Main, "Times New Roman", serif', // 确保字体一致
            minWidth: 'auto',
            minHeight: 'auto',
            width: 'auto',
            height: 'auto'
        });

        // 创建公式内容容器
        const formulaWrapper = document.createElement('div');
        formulaWrapper.style.display = 'inline-block';
        
        // 渲染KaTeX公式
        if (typeof window !== 'undefined' && window.katex) {
            try {
                window.katex.render(formula, formulaWrapper, {
                    displayMode: false,
                    throwOnError: false,
                    errorColor: '#cc0000',
                    strict: false
                });
            } catch (error) {
                // 如果KaTeX渲染失败，使用文本回退
                formulaWrapper.textContent = formula;
            }
        } else {
            // 如果KaTeX不可用，使用文本回退
            formulaWrapper.textContent = formula;
        }
        
        container.appendChild(formulaWrapper);
        document.body.appendChild(container);
        
        return container;
    };


    // 从SVG生成图片 - 优化的动态尺寸方案  
    const generateImageFromSVG = async (svgElement: SVGElement, download: boolean) => {
        try {
            // 获取SVG的精确尺寸
            const bbox = (svgElement as SVGSVGElement).getBBox();
            const svgWidth: number = bbox.width;
            const svgHeight: number = bbox.height;
            
            // 创建优化的SVG内容
            const svgData = new XMLSerializer().serializeToString(svgElement);
            
            // 清理SVG，确保透明背景
            const cleanSvgData = svgData
                .replace(/fill="white"/g, 'fill="none"')
                .replace(/background-color:\s*white/g, 'background-color: transparent')
                .replace(/fill:\s*white/g, 'fill: none');
            
            const svgBlob = new Blob([cleanSvgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            
            return new Promise<void>((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const padding = 20; // 固定20px边距
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // 根据SVG实际内容设置canvas尺寸（包含边距）
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
                img.onerror = (error) => {
                    URL.revokeObjectURL(url);
                    reject(error);
                };
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
                                onCheckedChange={(checked) => setAutoCopyEnabled(checked === true)}
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
                                onCheckedChange={(checked) => setImageWithBackground(checked === true)}
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
