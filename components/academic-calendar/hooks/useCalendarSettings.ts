/**
 * 学术日历设置持久化 Hook
 * 使用 localStorage 保存和恢复用户设置
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { CalendarSettings, DEFAULT_SETTINGS } from '../types';

const STORAGE_KEY = 'academicCalendar:v1:settings';
const CURRENT_VERSION = 1;

/**
 * 安全地从 localStorage 读取设置
 */
const loadSettings = (): CalendarSettings => {
  // SSR 保护
  if (typeof window === 'undefined') {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_SETTINGS };
    }

    const parsed = JSON.parse(stored) as Partial<CalendarSettings>;

    // 版本检查
    if (parsed.version !== CURRENT_VERSION) {
      console.warn('设置版本不匹配，使用默认设置');
      return { ...DEFAULT_SETTINGS };
    }

    // 合并默认值，处理字段缺失
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      version: CURRENT_VERSION,
    };
  } catch (error) {
    console.warn('读取设置失败，使用默认设置:', error);
    // 清理损坏的数据
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // 忽略清理错误
    }
    return { ...DEFAULT_SETTINGS };
  }
};

/**
 * 安全地保存设置到 localStorage
 */
const saveSettings = (settings: CalendarSettings): boolean => {
  // SSR 保护
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const toSave = {
      ...settings,
      version: CURRENT_VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    return true;
  } catch (error) {
    console.warn('保存设置失败:', error);
    return false;
  }
};

/**
 * 学术日历设置持久化 Hook
 * @param settings - 当前设置
 * @returns 初始设置和保存函数
 */
export const useCalendarSettings = (settings: CalendarSettings) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);

  // 防抖保存
  const debouncedSave = useCallback((settingsToSave: CalendarSettings) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveSettings(settingsToSave);
    }, 500); // 500ms 防抖
  }, []);

  // 监听设置变化并自动保存
  useEffect(() => {
    // 跳过初始化时的保存
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    debouncedSave(settings);

    // 清理定时器
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        // 立即保存最后的状态
        saveSettings(settings);
      }
    };
  }, [settings, debouncedSave]);

  // 页面卸载前保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      saveSettings(settings);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        saveSettings(settings);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [settings]);

  return {
    loadSettings,
    saveSettings,
  };
};

/**
 * 初始化设置 Hook
 * 仅在组件挂载时从 localStorage 加载一次
 */
export const useInitialSettings = (): CalendarSettings => {
  const settingsRef = useRef<CalendarSettings | null>(null);

  if (settingsRef.current === null) {
    settingsRef.current = loadSettings();
  }

  return settingsRef.current;
};
