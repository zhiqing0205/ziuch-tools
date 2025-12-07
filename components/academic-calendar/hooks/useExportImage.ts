/**
 * 图片导出 Hook - 重构版本
 * 简化逻辑，确保导出图片完整且居中
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
   * 使用 html2canvas 截取 body 并裁剪到元素区域
   *
   * @param element - 要导出的DOM元素（应该是 inline-block 容器）
   * @param filename - 文件名（不含扩展名）
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

      try {
        // 动态导入 html2canvas
        const html2canvas = (await import('html2canvas')).default;

        // 1. 等待字体加载完成
        await document.fonts?.ready;

        // 2. 小延迟确保 SVG 和布局完全稳定
        await new Promise((resolve) => setTimeout(resolve, 150));

        // 3. 获取背景色
        const backgroundColor =
          options.backgroundColor || getComputedStyle(element).backgroundColor || '#ffffff';

        // 4. 直接截取元素本身（最简单可靠的方式）
        const canvas = await html2canvas(element, {
          backgroundColor,
          scale: Math.min(options.scale ?? window.devicePixelRatio ?? 1, 2), // 限制最大scale为2
          useCORS: true,
          logging: false,
          allowTaint: true,
        });

        // 6. 转换为 blob
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, 'image/png');
        });

        if (!blob) {
          throw new Error('图片生成失败');
        }

        // 7. 下载图片
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}-${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 8. 清理
        setTimeout(() => URL.revokeObjectURL(url), 100);
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
