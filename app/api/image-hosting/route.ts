import { NextResponse } from 'next/server';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getImageHostingConfig() {
  const url = process.env.IMAGE_HOSTING_URL || process.env.NEXT_PUBLIC_IMAGE_HOSTING_URL;
  const token = process.env.IMAGE_HOSTING_KEY || process.env.NEXT_PUBLIC_IMAGE_HOSTING_KEY;
  if (!url || !token) {
    throw new Error('Missing image hosting env: IMAGE_HOSTING_URL / IMAGE_HOSTING_KEY');
  }
  return { url, token };
}

export async function POST(request: Request) {
  try {
    const incoming = await request.formData();
    const file = incoming.get('image') || incoming.get('file');

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: '请上传图片文件' }, { status: 400 });
    }

    const { url, token } = getImageHostingConfig();
    const filename =
      file instanceof File && file.name ? file.name : `reference-${Date.now()}.png`;

    const formData = new FormData();
    formData.append('token', token);
    formData.append('image', file, filename);

    const resp = await fetch(url, { method: 'POST', body: formData });
    const text = await resp.text();
    let data: unknown = null;
    try {
      data = JSON.parse(text);
    } catch {
      // ignore
    }

    if (!resp.ok) {
      return NextResponse.json(
        { error: `图床上传失败 (${resp.status})` },
        { status: resp.status }
      );
    }

    if (!isRecord(data) || data.result !== 'success' || typeof data.url !== 'string') {
      return NextResponse.json({ error: '图床上传失败' }, { status: 500 });
    }

    return NextResponse.json({ url: data.url });
  } catch (error) {
    console.error('image-hosting error:', error);
    return NextResponse.json({ error: '图床上传失败，请重试' }, { status: 500 });
  }
}

