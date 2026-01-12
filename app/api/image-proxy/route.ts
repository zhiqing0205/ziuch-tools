import { NextResponse } from 'next/server';

function getAllowedImageHosts(): Set<string> {
  const hostingUrl =
    process.env.IMAGE_HOSTING_URL || process.env.NEXT_PUBLIC_IMAGE_HOSTING_URL;
  const hosts = new Set<string>();

  if (hostingUrl) {
    try {
      hosts.add(new URL(hostingUrl).host);
    } catch {
      // ignore
    }
  }

  // Common default for this project (direct links)
  hosts.add('img.ziuch.top');

  return hosts;
}

function sanitizeFilename(value: string) {
  const fallback = 'image.png';
  const raw = value.trim();
  if (!raw) return fallback;
  const cleaned = raw
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const urlParam = searchParams.get('url');
    const filenameParam = searchParams.get('filename');

    if (!urlParam) {
      return NextResponse.json({ error: '缺少 url 参数' }, { status: 400 });
    }

    let target: URL;
    try {
      target = new URL(urlParam);
    } catch {
      return NextResponse.json({ error: '无效的 url' }, { status: 400 });
    }

    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      return NextResponse.json({ error: '不支持的协议' }, { status: 400 });
    }

    const allowedHosts = getAllowedImageHosts();
    if (!allowedHosts.has(target.host)) {
      return NextResponse.json({ error: '该图片地址不允许代理下载' }, { status: 403 });
    }

    const resp = await fetch(target.toString());
    if (!resp.ok) {
      return NextResponse.json(
        { error: `图片获取失败 (${resp.status})` },
        { status: resp.status }
      );
    }

    const arrayBuffer = await resp.arrayBuffer();
    const contentType =
      resp.headers.get('content-type')?.split(';')?.[0]?.trim() ||
      'application/octet-stream';

    const filename = sanitizeFilename(filenameParam || target.pathname.split('/').pop() || 'image');

    return new NextResponse(Buffer.from(arrayBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    console.error('image-proxy error:', error);
    return NextResponse.json({ error: '下载失败，请重试' }, { status: 500 });
  }
}
