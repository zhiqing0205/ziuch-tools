import { NextResponse } from 'next/server';

type StoredMessage = {
  role: 'user' | 'assistant' | 'system';
  text?: string;
  imageUrls?: string[];
};

type GenerateRequestBody = {
  apiBaseUrl: string;
  apiKey: string;
  model:
    | 'gemini-3-pro-image-preview'
    | 'gemini-3-pro-image-preview-2k'
    | 'gemini-3-pro-image-preview-4k';
  aspectRatio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16';
  language?: 'zh' | 'en';
  messages: StoredMessage[];
};

type OpenAIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | OpenAIContentPart[];
};

function getImageHostingConfig() {
  const url = process.env.IMAGE_HOSTING_URL || process.env.NEXT_PUBLIC_IMAGE_HOSTING_URL;
  const token = process.env.IMAGE_HOSTING_KEY || process.env.NEXT_PUBLIC_IMAGE_HOSTING_KEY;
  if (!url || !token) {
    throw new Error(
      'Missing image hosting env: IMAGE_HOSTING_URL / IMAGE_HOSTING_KEY'
    );
  }
  return { url, token };
}

function resolveOpenAIUrl(apiBaseUrl: string, pathFromV1: string) {
  const normalized = apiBaseUrl.trim().replace(/\/+$/, '');
  const url = new URL(normalized);
  const pathname = url.pathname.replace(/\/+$/, '');
  const suffix = pathFromV1.startsWith('/') ? pathFromV1 : `/${pathFromV1}`;

  if (pathname.endsWith('/v1')) {
    url.pathname = `${pathname}${suffix}`;
    return url.toString();
  }

  url.pathname = pathname && pathname !== '/' ? `${pathname}/v1${suffix}` : `/v1${suffix}`;
  return url.toString();
}

function guessMimeFromUrl(url: string) {
  const lower = url.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/png';
}

function mimeToExt(mime: string) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  return 'png';
}

function stripMarkdownImageLinks(text: string) {
  return text.replace(/!\[[^\]]*\]\([^)]+\)/g, '').trim();
}

function extractMarkdownImageLinks(text: string) {
  const links: string[] = [];
  const regex = /!\[[^\]]*\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const url = match[1]?.trim();
    if (url) links.push(url);
  }
  return links;
}

type ExtractedImageSource =
  | { kind: 'data_url'; dataUrl: string }
  | { kind: 'url'; url: string }
  | { kind: 'b64_json'; b64: string; mime?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractImagesFromUpstreamResponse(data: unknown): {
  images: ExtractedImageSource[];
  assistantText: string;
} {
  const images: ExtractedImageSource[] = [];

  const choices = isRecord(data) ? data['choices'] : undefined;
  const firstChoice = Array.isArray(choices) ? choices[0] : undefined;
  const message = isRecord(firstChoice) ? firstChoice['message'] : undefined;
  const content = isRecord(message) ? message['content'] : undefined;

  if (Array.isArray(content)) {
    for (const part of content) {
      if (!isRecord(part)) continue;
      if (part['type'] === 'text' && typeof part['text'] === 'string') {
        continue;
      }
      const imageUrl = part['image_url'];
      if (part['type'] === 'image_url' && isRecord(imageUrl) && typeof imageUrl['url'] === 'string') {
        const url = imageUrl['url'].trim();
        if (url.startsWith('data:image/')) images.push({ kind: 'data_url', dataUrl: url });
        else images.push({ kind: 'url', url });
      }
    }
    const textParts: string[] = [];
    for (const part of content) {
      if (!isRecord(part)) continue;
      if (part['type'] === 'text' && typeof part['text'] === 'string') textParts.push(part['text']);
    }
    const assistantText = textParts.join('\n').trim();
    return { images, assistantText };
  }

  if (typeof content === 'string') {
    const markdownLinks = extractMarkdownImageLinks(content);
    for (const link of markdownLinks) {
      if (link.startsWith('data:image/')) images.push({ kind: 'data_url', dataUrl: link });
      else if (/^https?:\/\//i.test(link)) images.push({ kind: 'url', url: link });
    }
    const assistantText = stripMarkdownImageLinks(content);
    return { images, assistantText };
  }

  const dataArr = isRecord(data) ? data['data'] : undefined;
  if (Array.isArray(dataArr)) {
    for (const item of dataArr) {
      if (!isRecord(item)) continue;
      if (typeof item['b64_json'] === 'string') images.push({ kind: 'b64_json', b64: item['b64_json'] });
      if (typeof item['url'] === 'string') images.push({ kind: 'url', url: item['url'] });
    }
    return { images, assistantText: '' };
  }

  return { images, assistantText: '' };
}

async function fetchUrlAsDataUrl(url: string) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch image url: ${resp.status}`);
  const arrayBuffer = await resp.arrayBuffer();
  const mime = resp.headers.get('content-type')?.split(';')?.[0]?.trim() || guessMimeFromUrl(url);
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return `data:${mime};base64,${base64}`;
}

function parseDataUrl(dataUrl: string): { mime: string; base64: string } {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new Error('Invalid data url');
  return { mime: match[1], base64: match[2] };
}

function sniffImageMimeFromBytes(bytes: Buffer): string {
  if (bytes.length >= 8) {
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      return 'image/png';
    }
  }
  if (bytes.length >= 2) {
    // JPEG: FF D8
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  }
  return 'image/png';
}

async function imageSourceToBytes(source: ExtractedImageSource): Promise<{ bytes: Buffer; mime: string }> {
  if (source.kind === 'data_url') {
    const { mime, base64 } = parseDataUrl(source.dataUrl);
    return { bytes: Buffer.from(base64, 'base64'), mime };
  }
  if (source.kind === 'b64_json') {
    const bytes = Buffer.from(source.b64, 'base64');
    return { bytes, mime: source.mime || sniffImageMimeFromBytes(bytes) };
  }
  const resp = await fetch(source.url);
  if (!resp.ok) throw new Error(`Failed to fetch upstream image: ${resp.status}`);
  const arrayBuffer = await resp.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);
  const mime =
    resp.headers.get('content-type')?.split(';')?.[0]?.trim() ||
    guessMimeFromUrl(source.url) ||
    sniffImageMimeFromBytes(bytes);
  return { bytes, mime };
}

async function uploadToImageHosting(bytes: Buffer, mime: string) {
  const { url, token } = getImageHostingConfig();
  const ext = mimeToExt(mime);
  const filename = `sci-plot-${Date.now()}.${ext}`;

  const formData = new FormData();
  formData.append('token', token);
  formData.append('image', new Blob([bytes], { type: mime }), filename);

  const resp = await fetch(url, { method: 'POST', body: formData });
  const text = await resp.text();
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    // ignore
  }
  if (!resp.ok) {
    throw new Error(`Image hosting failed: ${resp.status} ${text.slice(0, 200)}`);
  }
  if (!isRecord(data) || data.result !== 'success' || typeof data.url !== 'string') {
    throw new Error(`Image hosting failed: ${text.slice(0, 200)}`);
  }
  return data.url;
}

async function buildOpenAIMessages(
  messages: StoredMessage[],
  aspectRatio: string,
  language: 'zh' | 'en'
): Promise<OpenAIMessage[]> {
  const languageHint =
    language === 'en'
      ? 'All text in the figure (title, axis labels, legend, annotations) must be in English.'
      : '图中所有文字（标题、坐标轴、图例、注释）必须使用中文。';

  const openaiMessages: OpenAIMessage[] = [
    {
      role: 'system',
      content:
        `你是一名科研绘图助手。请生成清晰、出版级的科研风格图像，白色背景，干净无水印。` +
        `优先使用矢量/图表风格，字体清晰。输出宽高比：${aspectRatio}。` +
        `语言要求：${languageHint}`,
    },
  ];

  for (const msg of messages) {
    if (!msg || !msg.role) continue;
    const parts: OpenAIContentPart[] = [];
    if (typeof msg.text === 'string' && msg.text.trim()) {
      parts.push({ type: 'text', text: msg.text.trim() });
    }
    const imageUrls = Array.isArray(msg.imageUrls) ? msg.imageUrls : [];
    for (const url of imageUrls) {
      if (typeof url !== 'string' || !url.trim()) continue;
      const raw = url.trim();
      const dataUrl = raw.startsWith('data:image/') ? raw : await fetchUrlAsDataUrl(raw);
      parts.push({ type: 'image_url', image_url: { url: dataUrl } });
    }
    if (parts.length === 0) continue;
    openaiMessages.push({ role: msg.role, content: parts });
  }

  return openaiMessages;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<GenerateRequestBody>;

    const apiBaseUrl = body.apiBaseUrl?.trim();
    const apiKey = body.apiKey?.trim();
    const model = body.model;
    const aspectRatio = body.aspectRatio;
    const language = body.language === 'en' ? 'en' : 'zh';
    const messages = body.messages;

    if (!apiBaseUrl || !apiKey || !model || !aspectRatio || !Array.isArray(messages)) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    const openaiMessages = await buildOpenAIMessages(messages, aspectRatio, language);
    const upstreamUrl = resolveOpenAIUrl(apiBaseUrl, '/chat/completions');

    const upstreamResp = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: openaiMessages,
        stream: false,
      }),
    });

    const upstreamJson = await upstreamResp.json().catch(() => null);
    if (!upstreamResp.ok) {
      const message =
        upstreamJson?.error?.message ||
        upstreamJson?.message ||
        `上游请求失败 (${upstreamResp.status})`;
      return NextResponse.json({ error: message }, { status: upstreamResp.status });
    }

    const { images, assistantText } = extractImagesFromUpstreamResponse(upstreamJson);
    if (images.length === 0) {
      return NextResponse.json({ error: '模型返回中未找到图片' }, { status: 500 });
    }

    const uploadedUrls: string[] = [];
    for (const img of images) {
      const { bytes, mime } = await imageSourceToBytes(img);
      const directUrl = await uploadToImageHosting(bytes, mime);
      uploadedUrls.push(directUrl);
    }

    return NextResponse.json({
      imageUrls: uploadedUrls,
      assistantText: assistantText || undefined,
    });
  } catch (error) {
    console.error('sci-plot error:', error);
    return NextResponse.json({ error: '生成失败，请重试' }, { status: 500 });
  }
}
