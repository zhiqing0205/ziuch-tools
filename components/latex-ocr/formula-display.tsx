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

    // 生成公式图片
    const generateFormulaImage = async (download = false) => {
        if (!formulaRef.current || !formula.trim()) return;

        setIsGeneratingImage(true);
        
        try {
            // 等待KaTeX完全渲染
            await new Promise(resolve => setTimeout(resolve, 200));
            
            const canvas = await html2canvas(formulaRef.current, {
                backgroundColor: imageWithBackground ? '#ffffff' : null,
                scale: 2,
                useCORS: true,
                allowTaint: false,
                removeContainer: false,
                logging: false,
                width: formulaRef.current.offsetWidth,
                height: formulaRef.current.offsetHeight,
                onclone: (clonedDoc, element) => {
                    // 确保所有样式都正确应用
                    const style = clonedDoc.createElement('style');
                    style.textContent = `
                        .katex { font-size: 18px !important; }
                        .katex-display { margin: 0 !important; }
                        * { color: #000000 !important; }
                    `;
                    clonedDoc.head.appendChild(style);
                }
            });

            // 检查canvas内容
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const hasContent = imageData.data.some((pixel, index) => {
                // 检查非透明像素
                return index % 4 === 3 && pixel > 0;
            });

            if (!hasContent) {
                throw new Error('生成的图片为空');
            }

            if (download) {
                // 下载图片
                const link = document.createElement('a');
                link.download = `formula_${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                
                toast({
                    title: "下载成功",
                    description: "公式图片已下载",
                    duration: 2000,
                });
            } else {
                // 复制到剪贴板
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
