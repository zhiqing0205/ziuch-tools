import { NextResponse } from 'next/server';
import { getCCFData, getCCFMetadata, updateCCFData } from '@/lib/ccf/ccf-updater';

export async function GET() {
  try {
    const data = getCCFData();
    const metadata = getCCFMetadata();
    
    if (!data || !metadata) {
      return NextResponse.json(
        { error: 'CCF数据未找到' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      conferences: data.conferences,
      acceptances: data.acceptances,
      metadata
    });
  } catch (error) {
    console.error('获取CCF数据失败:', error);
    return NextResponse.json(
      { error: '获取数据失败' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const result = await updateCCFData();
    
    if (result.success) {
      return NextResponse.json({
        message: result.message,
        metadata: result.metadata
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('手动更新CCF数据失败:', error);
    return NextResponse.json(
      { error: '更新数据失败' },
      { status: 500 }
    );
  }
}