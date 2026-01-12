import type { SciPlotSettings, SciPlotThread } from '@/lib/sci-plot/types';

const SETTINGS_KEY = 'sci-plot-settings';
const THREADS_KEY = 'sci-plot-threads';
const ACTIVE_THREAD_ID_KEY = 'sci-plot-active-thread-id';

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function getSciPlotSettings(): SciPlotSettings | null {
  if (typeof window === 'undefined') return null;
  return safeParseJson<SciPlotSettings>(localStorage.getItem(SETTINGS_KEY));
}

export function saveSciPlotSettings(settings: SciPlotSettings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getSciPlotThreads(): SciPlotThread[] {
  if (typeof window === 'undefined') return [];
  const threads = safeParseJson<SciPlotThread[]>(localStorage.getItem(THREADS_KEY)) || [];
  threads.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return threads;
}

export function saveSciPlotThreads(threads: SciPlotThread[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
}

export function upsertSciPlotThread(thread: SciPlotThread) {
  const threads = getSciPlotThreads();
  const idx = threads.findIndex((t) => t.id === thread.id);
  if (idx >= 0) threads[idx] = thread;
  else threads.unshift(thread);
  saveSciPlotThreads(threads);
}

export function deleteSciPlotThread(threadId: string) {
  const threads = getSciPlotThreads().filter((t) => t.id !== threadId);
  saveSciPlotThreads(threads);

  const activeId = getActiveSciPlotThreadId();
  if (activeId === threadId) setActiveSciPlotThreadId(null);
}

export function getActiveSciPlotThreadId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_THREAD_ID_KEY);
}

export function setActiveSciPlotThreadId(threadId: string | null) {
  if (typeof window === 'undefined') return;
  if (!threadId) localStorage.removeItem(ACTIVE_THREAD_ID_KEY);
  else localStorage.setItem(ACTIVE_THREAD_ID_KEY, threadId);
}

