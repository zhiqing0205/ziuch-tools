/**
 * 图片导出 Hook
 * 使用离屏固定尺寸容器方案，确保导出结果与屏幕尺寸解耦
 */

'use client';

import { useState, useCallback } from 'react';

// ==================== 导出配置常量 ====================

/** 导出基准宽度 (px) */
const BASE_WIDTH = 960;

/** 导出基准高度 (px) - SVG 520 + Legend margin 24 + Legend ~40 + buffer */
const BASE_HEIGHT = 620;

/** 默认缩放倍率 */
const DEFAULT_SCALE = 2;

/** 最大缩放倍率 */
const MAX_SCALE = 4;

/** 默认背景色 */
const DEFAULT_BACKGROUND = '#ffffff';

/** 内边距 (px) */
const PADDING = 16;

/** 渲染稳定等待时间 (ms) */
const RENDER_DELAY = 100;

// ==================== 类型定义 ====================

interface ExportOptions {
  /** 自定义背景色 */
  backgroundColor?: string;
  /** 缩放比例 (1-4)，默认 2 */
  scale?: number;
}

interface ExportState {
  /** 是否正在导出 */
  exporting: boolean;
  /** 错误信息 */
  error: string | null;
}

// ==================== Hook 实现 ====================

/**
 * 图片导出 Hook
 *
 * 导出流程：
 * 1. 等待字体加载
 * 2. 创建离屏容器
 * 3. 克隆源元素并固定尺寸
 * 4. 等待渲染稳定
 * 5. 使用 html-to-image 截取
 * 6. 触发下载
 * 7. 清理离屏容器
 */
export const useExportImage = () => {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 将 DOM 元素导出为 PNG 图片
   * @param element - 要导出的 DOM 元素
   * @param filename - 文件名（不含扩展名和日期后缀）
   * @param options - 导出选项
   */
  const exportAsImage = useCallback(
    async (element: HTMLElement, filename: string, options: ExportOptions = {}) => {
      if (!element) {
        setError('导出元素不存在');
        return;
      }

      setExporting(true);
      setError(null);

      let offscreenContainer: HTMLDivElement | null = null;

      try {
        // 动态导入 html-to-image
        const { toPng } = await import('html-to-image');

        // 1. 等待字体加载完成
        await document.fonts?.ready;

        // 2. 创建离屏容器
        offscreenContainer = createOffscreenContainer(options.backgroundColor);
        document.body.appendChild(offscreenContainer);

        // 3. 克隆源元素并重置响应式样式
        const clonedElement = cloneAndFixSize(element);
        offscreenContainer.appendChild(clonedElement);

        // 4. 等待渲染稳定
        await new Promise((resolve) => setTimeout(resolve, RENDER_DELAY));

        // 5. 计算导出尺寸
        const totalWidth = BASE_WIDTH + PADDING * 2;
        const totalHeight = BASE_HEIGHT + PADDING * 2;
        const pixelRatio = Math.min(Math.max(options.scale ?? DEFAULT_SCALE, 1), MAX_SCALE);

        // 6. 生成图片
        const dataUrl = await toPng(offscreenContainer, {
          pixelRatio,
          backgroundColor: options.backgroundColor ?? DEFAULT_BACKGROUND,
          width: totalWidth,
          height: totalHeight,
          cacheBust: true,
        });

        // 7. 触发下载
        downloadDataUrl(dataUrl, filename);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '导出失败';
        setError(errorMessage);
        console.error('图片导出错误:', err);
      } finally {
        // 8. 清理离屏容器（确保在任何情况下都执行）
        if (offscreenContainer && document.body.contains(offscreenContainer)) {
          document.body.removeChild(offscreenContainer);
        }
        setExporting(false);
      }
    },
    []
  );

  return { exportAsImage, exporting, error };
};

// ==================== 辅助函数 ====================

/**
 * 创建离屏容器
 * 容器放置在屏幕外，固定尺寸，不受页面滚动/视口影响
 */
function createOffscreenContainer(backgroundColor?: string): HTMLDivElement {
  const container = document.createElement('div');
  const totalWidth = BASE_WIDTH + PADDING * 2;
  const totalHeight = BASE_HEIGHT + PADDING * 2;

  Object.assign(container.style, {
    // 离屏定位
    position: 'fixed',
    left: '-99999px',
    top: '0',
    zIndex: '-1',
    // 固定尺寸
    width: `${totalWidth}px`,
    height: `${totalHeight}px`,
    padding: `${PADDING}px`,
    boxSizing: 'border-box',
    // 样式
    backgroundColor: backgroundColor ?? DEFAULT_BACKGROUND,
    overflow: 'hidden',
    // 防止交互
    pointerEvents: 'none',
  });

  return container;
}

/**
 * 克隆元素并固定尺寸
 * 禁用响应式样式，确保导出尺寸一致
 */
function cloneAndFixSize(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;

  // 重置克隆元素的响应式样式（保留原有 Tailwind p-4 padding）
  Object.assign(clone.style, {
    maxWidth: 'none',
    width: `${BASE_WIDTH}px`,
    height: 'auto',
    margin: '0',
    boxSizing: 'border-box',
    transform: 'none',
  });

  // 修正所有内部 SVG 的响应式样式
  const svgs = clone.querySelectorAll('svg');
  svgs.forEach((svg) => {
    // 主 SVG 固定尺寸，小图标 SVG 保持原样
    if (svg.getAttribute('width') === '960' || svg.classList.contains('block')) {
      Object.assign((svg as HTMLElement).style, {
        maxWidth: 'none',
        width: '960px',
        height: '520px',
      });
    }
  });

  return clone;
}

/**
 * 触发图片下载
 */
function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];

  link.href = dataUrl;
  link.download = `${filename}-${dateStr}.png`;

  // 触发下载
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
