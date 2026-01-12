export type SciPlotModel =
  | 'gemini-3-pro-image-preview'
  | 'gemini-3-pro-image-preview-2k'
  | 'gemini-3-pro-image-preview-4k';

export type SciPlotAspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16';

export type SciPlotStoredMessage = {
  role: 'user' | 'assistant' | 'system';
  text?: string;
  imageUrl?: string;
};

export type SciPlotGenerateRequest = {
  apiBaseUrl: string;
  apiKey: string;
  model: SciPlotModel;
  aspectRatio: SciPlotAspectRatio;
  messages: SciPlotStoredMessage[];
};

export type SciPlotGenerateResponse = {
  imageUrls: string[];
  assistantText?: string;
};

function getErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const maybe = data as { error?: unknown };
  return typeof maybe.error === 'string' ? maybe.error : null;
}

export async function generateSciPlot(req: SciPlotGenerateRequest): Promise<SciPlotGenerateResponse> {
  const resp = await fetch('/api/sci-plot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  const data: unknown = await resp.json().catch(() => null);
  if (!resp.ok) {
    throw new Error(getErrorMessage(data) || `生成失败 (${resp.status})`);
  }
  return data as SciPlotGenerateResponse;
}
