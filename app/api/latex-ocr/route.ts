import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const API_TOKEN = process.env.NEXT_PUBLIC_LATEX_OCR_API_TOKEN;

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