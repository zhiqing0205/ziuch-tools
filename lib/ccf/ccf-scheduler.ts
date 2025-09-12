import cron from 'node-cron';
import { updateCCFData } from './ccf-updater';

let isSchedulerInitialized = false;

export async function initCCFScheduler(): Promise<void> {
  if (isSchedulerInitialized) {
    console.log('CCF调度器已经初始化');
    return;
  }

  try {
    console.log('初始化CCF数据调度器...');
    
    // 启动时立即执行一次数据更新
    console.log('启动时执行初始数据更新...');
    const result = await updateCCFData();
    console.log('初始数据更新结果:', result.message);
    
    // 设置定时任务：每天东八区0点执行
    cron.schedule('0 0 * * *', async () => {
      console.log('执行定时CCF数据更新 - 东八区 00:00');
      const result = await updateCCFData();
      console.log('定时更新结果:', result.message);
    }, {
      timezone: "Asia/Shanghai"
    });
    
    isSchedulerInitialized = true;
    console.log('CCF数据调度器初始化完成 - 每天东八区00:00执行更新');
    
  } catch (error) {
    console.error('初始化CCF调度器失败:', error);
    throw error;
  }
}

// 手动触发更新的函数
export async function triggerManualUpdate(): Promise<void> {
  console.log('手动触发CCF数据更新...');
  const result = await updateCCFData();
  console.log('手动更新结果:', result.message);
}