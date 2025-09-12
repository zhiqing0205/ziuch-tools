import { NextResponse } from 'next/server';
import { getCCFData, getCCFMetadata, updateCCFData } from '@/lib/ccf/ccf-updater';

export async function GET() {
  try {
    console.log('API调用: /api/ccf/data - 开始获取数据');
    
    let data = getCCFData();
    let metadata = getCCFMetadata();
    
    console.log('初次检查结果 - data:', data ? '存在' : '不存在', 'metadata:', metadata ? '存在' : '不存在');
    
    // 如果数据不存在，尝试立即更新
    if (!data || !metadata) {
      console.log('数据不存在，尝试立即更新...');
      const updateResult = await updateCCFData();
      console.log('更新结果:', updateResult.message);
      
      if (updateResult.success) {
        data = getCCFData();
        metadata = getCCFMetadata();
        console.log('更新后检查结果 - data:', data ? '存在' : '不存在', 'metadata:', metadata ? '存在' : '不存在');
      }
    }
    
    if (!data || !metadata) {
      console.error('CCF数据仍然不可用');
      // 返回更详细的错误信息
      return NextResponse.json(
        { 
          error: 'CCF数据未找到',
          details: '数据文件不存在或无法读取',
          suggestion: '请稍后重试或手动触发更新',
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }
    
    console.log('成功获取CCF数据，会议数量:', data.conferences?.length || 0, '录用率记录数量:', data.acceptances?.length || 0);
    
    return NextResponse.json({
      conferences: data.conferences,
      acceptances: data.acceptances,
      metadata
    });
  } catch (error) {
    console.error('获取CCF数据失败:', error);
    return NextResponse.json(
      { 
        error: '获取数据失败',
        details: error.message,
        timestamp: new Date().toISOString()
      },
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