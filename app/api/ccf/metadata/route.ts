import { NextResponse } from 'next/server';
import { getCCFMetadata } from '@/lib/ccf/ccf-updater';

export async function GET() {
  try {
    const metadata = getCCFMetadata();
    
    if (!metadata) {
      return NextResponse.json(
        { error: 'CCF数据元信息未找到' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(metadata);
  } catch (error) {
    console.error('获取CCF元信息失败:', error);
    return NextResponse.json(
      { error: '获取元信息失败' },
      { status: 500 }
    );
  }
}