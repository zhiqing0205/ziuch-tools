export type SciPlotModel =
  | 'gemini-3-pro-image-preview'
  | 'gemini-3-pro-image-preview-2k'
  | 'gemini-3-pro-image-preview-4k';

export type SciPlotAspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16';

export type SciPlotMessageRole = 'user' | 'assistant';

export type SciPlotMessage = {
  id: string;
  role: SciPlotMessageRole;
  text?: string;
  imageUrl?: string;
  createdAt: number;
};

export type SciPlotThread = {
  id: string;
  title: string;
  model: SciPlotModel;
  aspectRatio: SciPlotAspectRatio;
  messages: SciPlotMessage[];
  createdAt: number;
  updatedAt: number;
};

export type SciPlotSettings = {
  apiBaseUrl: string;
  apiKey: string;
  updatedAt: number;
};

