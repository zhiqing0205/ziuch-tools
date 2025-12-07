/**
 * 图片导出 Hook
 * 用于将页面内容导出为PNG图片
 */

'use client';

import { useState, useCallback } from 'react';

interface ExportOptions {
  /** 自定义背景色 */
  backgroundColor?: string;
  /** 缩放比例，默认使用设备像素比 */
  scale?: number;
}

/**
 * 导出图片的 Hook
 * @returns 导出函数和导出状态
 */
export const useExportImage = () => {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 将DOM元素导出为PNG图片
   * @param element - 要导出的DOM元素
   * @param filename - 文件名（不含扩展名）
   * @param options - 导出选项
   */
  const exportAsImage = useCallback(
    async (element: HTMLElement, filename: string, options: ExportOptions = {}) => {
      setExporting(true);
      setError(null);

      // 保存原始样式
      const originalStyles = {
        width: element.style.width,
        height: element.style.height,
        overflow: element.style.overflow,
      };

      try {
        // 动态导入 html2canvas 以减少初始加载体积
        const html2canvas = (await import('html2canvas')).default;

        // 等待字体加载完成，确保截图准确
        await document.fonts?.ready;

        // 额外等待确保 SVG 完全渲染
        await new Promise((resolve) => setTimeout(resolve, 200));

        // 临时调整容器样式以显示完整内容
        const scrollWidth = element.scrollWidth;
        const scrollHeight = element.scrollHeight;

        element.style.width = `${scrollWidth}px`;
        element.style.height = `${scrollHeight}px`;
        element.style.overflow = 'visible';

        // 等待样式应用
        await new Promise((resolve) => setTimeout(resolve, 50));

        // 获取元素背景色
        const computedStyle = getComputedStyle(element);
        const backgroundColor = options.backgroundColor || computedStyle.backgroundColor || '#ffffff';

        // 计算实际尺寸
        const rect = element.getBoundingClientRect();
        const width = Math.max(scrollWidth, rect.width);
        const height = Math.max(scrollHeight, rect.height);

        // 生成 canvas
        const canvas = await html2canvas(element, {
          backgroundColor,
          width,
          height,
          scrollX: -window.scrollX,
          scrollY: -window.scrollY,
          scale: options.scale ?? window.devicePixelRatio ?? 1,
          useCORS: true,
          logging: false,
          foreignObjectRendering: false,
        });

        // 转换为 blob 并下载
        await new Promise<void>((resolve, reject) => {
          canvas.toBlob((blob) => {
            try {
              if (!blob) {
                reject(new Error('图片生成失败'));
                return;
              }

              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${filename}-${new Date().toISOString().split('T')[0]}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              // 释放 URL 对象
              setTimeout(() => URL.revokeObjectURL(url), 100);
              resolve();
            } catch (err) {
              reject(err);
            }
          }, 'image/png');
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '导出失败';
        setError(errorMessage);
        console.error('图片导出错误:', err);
      } finally {
        // 恢复原始样式
        element.style.width = originalStyles.width;
        element.style.height = originalStyles.height;
        element.style.overflow = originalStyles.overflow;

        setExporting(false);
      }
    },
    []
  );

  return { exportAsImage, exporting, error };
};
