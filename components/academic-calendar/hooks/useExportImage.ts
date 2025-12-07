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

      try {
        // 动态导入 html2canvas 以减少初始加载体积
        const html2canvas = (await import('html2canvas')).default;

        // 等待字体加载完成，确保截图准确
        await document.fonts?.ready;

        // 额外等待确保 SVG 完全渲染
        await new Promise((resolve) => setTimeout(resolve, 200));

        // 获取元素的实际位置和尺寸
        const rect = element.getBoundingClientRect();
        const width = Math.ceil(rect.width);
        const height = Math.ceil(rect.height);

        // 获取元素背景色
        const computedStyle = getComputedStyle(element);
        const backgroundColor = options.backgroundColor || computedStyle.backgroundColor || '#ffffff';

        // 使用 x/y 参数裁剪，只截取元素区域
        const canvas = await html2canvas(document.body, {
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
          width,
          height,
          backgroundColor,
          scale: options.scale ?? window.devicePixelRatio ?? 1,
          useCORS: true,
          logging: false,
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
        setExporting(false);
      }
    },
    []
  );

  return { exportAsImage, exporting, error };
};
