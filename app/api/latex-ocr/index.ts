export interface LatexOCRResponse {
  status: boolean;
  res?: {
    latex: string;
    conf: number;
  };
  error?: string;
}

export const recognizeLatex = async (file: File | Blob): Promise<LatexOCRResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/latex-ocr', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('API请求失败');
  }

  return response.json();
};