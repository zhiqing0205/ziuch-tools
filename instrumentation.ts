export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('初始化CCF数据调度服务...');
    
    try {
      const { initCCFScheduler } = await import('@/lib/ccf/ccf-scheduler');
      await initCCFScheduler();
      console.log('CCF数据调度服务初始化成功');
    } catch (error) {
      console.error('CCF数据调度服务初始化失败:', error);
    }
  }
}