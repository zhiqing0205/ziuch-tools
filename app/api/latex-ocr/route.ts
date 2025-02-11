import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const API_TOKEN = 'gJV3gNxbB6epDYJqjWybaSrVCrF0uYHh71B5HtH6JiEOeGELAqWEa8OzvdElL2zx';

    const response = await fetch('https://server.simpletex.cn/api/latex_ocr', {
      method: 'POST',
      headers: {
        'token': API_TOKEN,
      },
      body: formData,
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: '识别失败，请重试' },
      { status: 500 }
    );
  }
}