import type { SciPlotAspectRatio, SciPlotLanguage, SciPlotModel, SciPlotSettings, SciPlotThread } from '@/lib/sci-plot/types';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSciPlotModel(value: unknown): value is SciPlotModel {
  return (
    value === 'gemini-3-pro-image-preview' ||
    value === 'gemini-3-pro-image-preview-2k' ||
    value === 'gemini-3-pro-image-preview-4k'
  );
}

function isSciPlotAspectRatio(value: unknown): value is SciPlotAspectRatio {
  return value === '1:1' || value === '4:3' || value === '3:4' || value === '16:9' || value === '9:16';
}

function isSciPlotLanguage(value: unknown): value is SciPlotLanguage {
  return value === 'zh' || value === 'en';
}

function normalizeThread(raw: unknown): SciPlotThread | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'string') return null;

  const now = Date.now();
  const model: SciPlotModel = isSciPlotModel(raw.model) ? raw.model : 'gemini-3-pro-image-preview-2k';
  const aspectRatio: SciPlotAspectRatio = isSciPlotAspectRatio(raw.aspectRatio) ? raw.aspectRatio : '1:1';
  const language: SciPlotLanguage = isSciPlotLanguage(raw.language) ? raw.language : 'zh';

  const messagesRaw = raw.messages;
  const messages = Array.isArray(messagesRaw)
    ? messagesRaw
        .map((m) => {
          if (!isRecord(m)) return null;
          const id = typeof m.id === 'string' ? m.id : null;
          const role = m.role === 'user' || m.role === 'assistant' ? m.role : null;
          if (!id || !role) return null;

          const imageUrls: string[] = [];
          if (Array.isArray(m.imageUrls)) {
            for (const url of m.imageUrls) {
              if (typeof url === 'string' && url.trim()) imageUrls.push(url.trim());
            }
          }
          if (typeof m.imageUrl === 'string' && m.imageUrl.trim()) imageUrls.push(m.imageUrl.trim());

          return {
            id,
            role,
            text: typeof m.text === 'string' ? m.text : undefined,
            imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
            createdAt: typeof m.createdAt === 'number' ? m.createdAt : now,
          };
        })
        .filter(Boolean)
    : [];

  const title = typeof raw.title === 'string' ? raw.title : '未命名对话';
  const createdAt = typeof raw.createdAt === 'number' ? raw.createdAt : now;
  const updatedAt = typeof raw.updatedAt === 'number' ? raw.updatedAt : createdAt;

  return {
    id: raw.id,
    title,
    model,
    aspectRatio,
    language,
    messages,
    createdAt,
    updatedAt,
  };
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
  const raw = safeParseJson<unknown>(localStorage.getItem(THREADS_KEY));
  const threads = Array.isArray(raw) ? raw.map(normalizeThread).filter(Boolean) : [];
  threads.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return threads as SciPlotThread[];
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
