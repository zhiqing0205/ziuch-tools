export type SciPlotModel =
  | 'gemini-3-pro-image-preview'
  | 'gemini-3-pro-image-preview-2k'
  | 'gemini-3-pro-image-preview-4k';

export type SciPlotAspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16';

export type SciPlotLanguage = 'zh' | 'en';

export type SciPlotStoredMessage = {
  role: 'user' | 'assistant' | 'system';
  text?: string;
  imageUrls?: string[];
};

export type SciPlotGenerateRequest = {
  requestId?: string;
  apiBaseUrl: string;
  apiKey: string;
  model: SciPlotModel;
  aspectRatio: SciPlotAspectRatio;
  language: SciPlotLanguage;
  messages: SciPlotStoredMessage[];
};

export type SciPlotGenerateResponse = {
  requestId?: string;
  imageUrls: string[];
  assistantText?: string;
};

function getErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const maybe = data as { error?: unknown };
  return typeof maybe.error === 'string' ? maybe.error : null;
}

function getRequestId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const maybe = data as { requestId?: unknown };
  return typeof maybe.requestId === 'string' && maybe.requestId.trim() ? maybe.requestId.trim() : null;
}

export async function generateSciPlot(req: SciPlotGenerateRequest): Promise<SciPlotGenerateResponse> {
  const resp = await fetch('/api/sci-plot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  const data: unknown = await resp.json().catch(() => null);
  if (!resp.ok) {
    const requestId = getRequestId(data);
    const message = getErrorMessage(data) || `生成失败 (${resp.status})`;
    throw new Error(requestId ? `${message} (requestId: ${requestId})` : message);
  }
  return data as SciPlotGenerateResponse;
}
