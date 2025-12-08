/**
 * 图片导出 Hook - 重构版本
 * 使用 html2canvas 直接截取，避免离屏容器导致的样式问题
 */

'use client';

import { useState, useCallback } from 'react';

// ==================== 调试开关 ====================
const DEBUG = true;

function log(...args: unknown[]) {
  if (DEBUG) {
    console.log('[Export]', ...args);
  }
}

// ==================== 导出配置常量 ====================

/** 默认缩放倍率 */
const DEFAULT_SCALE = 2;

/** 默认背景色 */
const DEFAULT_BACKGROUND = '#ffffff';

// ==================== 类型定义 ====================

interface ExportOptions {
  /** 自定义背景色 */
  backgroundColor?: string;
  /** 缩放比例，默认 2 */
  scale?: number;
}

// ==================== Hook 实现 ====================

/**
 * 图片导出 Hook
 *
 * 新方案：直接使用 html2canvas 截取原始元素
 * - 不使用离屏容器，避免 CSS 变量和样式丢失问题
 * - html2canvas 会自动处理计算样式
 */
export const useExportImage = () => {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportAsImage = useCallback(
    async (element: HTMLElement, filename: string, options: ExportOptions = {}) => {
      log('========== 开始导出 ==========');
      log('元素:', element);
      log('文件名:', filename);
      log('选项:', options);

      if (!element) {
        setError('导出元素不存在');
        log('错误: 元素不存在');
        return;
      }

      setExporting(true);
      setError(null);

      try {
        // 动态导入 html2canvas
        log('正在加载 html2canvas...');
        const html2canvas = (await import('html2canvas')).default;
        log('html2canvas 加载成功');

        // 等待字体加载
        log('等待字体加载...');
        await document.fonts?.ready;
        log('字体加载完成');

        // 获取元素信息
        const rect = element.getBoundingClientRect();
        log('元素位置:', {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });

        // 获取背景色
        const backgroundColor = options.backgroundColor ?? DEFAULT_BACKGROUND;
        const scale = options.scale ?? DEFAULT_SCALE;
        log('背景色:', backgroundColor);
        log('缩放比例:', scale);

        // 检查元素内容
        const svgElements = element.querySelectorAll('svg');
        log('SVG 元素数量:', svgElements.length);

        svgElements.forEach((svg, i) => {
          log(`SVG[${i}]:`, {
            width: svg.getAttribute('width'),
            height: svg.getAttribute('height'),
            viewBox: svg.getAttribute('viewBox'),
            childCount: svg.children.length,
          });
        });

        // 使用 html2canvas 截取
        log('开始 html2canvas 截取...');

        const canvas = await html2canvas(element, {
          backgroundColor,
          scale,
          useCORS: true,
          logging: DEBUG,
          // 关键：使用 onclone 回调处理克隆元素中的 CSS 变量
          onclone: (clonedDoc, clonedElement) => {
            log('onclone 回调触发');
            log('克隆文档:', clonedDoc);
            log('克隆元素:', clonedElement);

            // 解析 CSS 变量
            resolveCssVariablesInElement(clonedElement, element);
            log('CSS 变量解析完成');
          },
        });

        log('html2canvas 截取完成');
        log('Canvas 尺寸:', canvas.width, 'x', canvas.height);

        // 检查 canvas 是否为空
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          let nonWhitePixels = 0;
          for (let i = 0; i < data.length; i += 4) {
            // 检查是否有非白色像素
            if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) {
              nonWhitePixels++;
            }
          }
          log('非白色像素数量:', nonWhitePixels);
          log('总像素数:', data.length / 4);

          if (nonWhitePixels === 0) {
            log('警告: Canvas 全部为白色像素！');
          }
        }

        // 转换为 blob 并下载
        log('转换为 blob...');
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, 'image/png');
        });

        if (!blob) {
          throw new Error('Canvas 转换 blob 失败');
        }

        log('Blob 大小:', blob.size, 'bytes');

        // 下载
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const dateStr = new Date().toISOString().split('T')[0];
        link.href = url;
        link.download = `${filename}-${dateStr}.png`;

        log('开始下载:', link.download);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 清理
        setTimeout(() => URL.revokeObjectURL(url), 100);
        log('========== 导出完成 ==========');

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '导出失败';
        setError(errorMessage);
        console.error('[Export] 导出错误:', err);
      } finally {
        setExporting(false);
      }
    },
    []
  );

  return { exportAsImage, exporting, error };
};

/**
 * 解析元素中的 CSS 变量为实际颜色值
 *
 * 遍历所有元素，将 hsl(var(--xxx)) 格式的颜色替换为计算后的实际值
 */
function resolveCssVariablesInElement(clonedElement: HTMLElement, sourceElement: HTMLElement): void {
  log('开始解析 CSS 变量...');

  // 获取所有子元素（包括自身）
  const clonedElements = [clonedElement, ...Array.from(clonedElement.querySelectorAll('*'))];
  const sourceElements = [sourceElement, ...Array.from(sourceElement.querySelectorAll('*'))];

  log('元素数量:', clonedElements.length);

  let resolvedCount = 0;

  clonedElements.forEach((clonedEl, index) => {
    const sourceEl = sourceElements[index];
    if (!sourceEl) return;

    // 获取源元素的计算样式
    const computedStyle = getComputedStyle(sourceEl);

    // 处理 SVG 属性
    const svgAttrs = ['fill', 'stroke', 'stop-color'];
    svgAttrs.forEach((attr) => {
      const attrValue = clonedEl.getAttribute(attr);
      if (attrValue && attrValue.includes('var(--')) {
        // 方案1: 从计算样式获取
        let newValue = computedStyle.getPropertyValue(attr);

        // 方案2: 如果计算样式没有值，尝试解析 CSS 变量
        if (!newValue || newValue === 'none' || newValue === '') {
          newValue = resolveCssVariable(attrValue, sourceEl);
        }

        if (newValue && newValue !== 'none' && newValue !== '') {
          log(`解析 ${attr}: "${attrValue}" -> "${newValue}"`);
          clonedEl.setAttribute(attr, newValue);
          resolvedCount++;
        } else {
          log(`警告: 无法解析 ${attr}="${attrValue}"`);
        }
      }
    });

    // 处理 style 属性中的颜色
    if (clonedEl instanceof HTMLElement || clonedEl instanceof SVGElement) {
      const el = clonedEl as HTMLElement;
      const styleProps = ['fill', 'stroke', 'background-color', 'color', 'border-color'];

      styleProps.forEach((prop) => {
        const value = el.style.getPropertyValue(prop);
        if (value && value.includes('var(--')) {
          const newValue = resolveCssVariable(value, sourceEl);
          if (newValue) {
            log(`解析 style.${prop}: "${value}" -> "${newValue}"`);
            el.style.setProperty(prop, newValue);
            resolvedCount++;
          }
        }
      });
    }
  });

  log('解析完成，共解析:', resolvedCount, '个属性');
}

/**
 * 解析单个 CSS 变量值
 *
 * 输入: "hsl(var(--primary))" 或 "var(--primary)"
 * 输出: 实际的颜色值，如 "rgb(59, 130, 246)"
 */
function resolveCssVariable(value: string, element: Element): string {
  // 提取 CSS 变量名
  const varMatch = value.match(/var\(--([^)]+)\)/);
  if (!varMatch) {
    return value;
  }

  const varName = `--${varMatch[1]}`;

  // 从元素的计算样式中获取 CSS 变量的值
  const computedStyle = getComputedStyle(element);
  const varValue = computedStyle.getPropertyValue(varName).trim();

  log(`CSS 变量 ${varName} = "${varValue}"`);

  if (!varValue) {
    // 尝试从 :root 获取
    const rootStyle = getComputedStyle(document.documentElement);
    const rootValue = rootStyle.getPropertyValue(varName).trim();
    log(`从 :root 获取 ${varName} = "${rootValue}"`);

    if (rootValue) {
      // 替换变量引用为实际值
      return value.replace(/var\(--[^)]+\)/, rootValue);
    }
    return '';
  }

  // 替换变量引用为实际值
  return value.replace(/var\(--[^)]+\)/, varValue);
}
