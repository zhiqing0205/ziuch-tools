import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://www.easyscholar.cc/open';
const API_KEY = process.env.PUB_FINDER_API_KEY;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicationName = searchParams.get('publicationName');
    
    if (!publicationName) {
      return NextResponse.json(
        { error: 'Publication name is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${API_BASE_URL}/getPublicationRank?secretKey=${API_KEY}&publicationName=${encodeURIComponent(publicationName)}`
    );
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: '查询失败，请重试' },
      { status: 500 }
    );
  }
}