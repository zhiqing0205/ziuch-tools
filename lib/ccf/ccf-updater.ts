import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import yaml from 'js-yaml';
import { CCFMetadata, CCFUpdateResult } from './types';

const DATA_DIR = path.resolve(process.cwd(), 'data', 'ccf');
const CONF_FILE = path.join(DATA_DIR, 'allconf.yml');
const ACC_FILE = path.join(DATA_DIR, 'allacc.yml');
const METADATA_FILE = path.join(DATA_DIR, 'metadata.json');

const CONF_URL = 'https://ccfddl.com/conference/allconf.yml';
const ACC_URL = 'https://ccfddl.com/conference/allacc.yml';

function calculateMD5(data: string): string {
  return crypto.createHash('md5').update(data).digest('hex');
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

async function fetchData(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    throw new Error(`Failed to fetch data from ${url}: ${error}`);
  }
}

function saveFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, 'utf-8');
}

function loadMetadata(): CCFMetadata | null {
  if (!fs.existsSync(METADATA_FILE)) {
    return null;
  }
  try {
    const content = fs.readFileSync(METADATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading metadata:', error);
    return null;
  }
}

function saveMetadata(metadata: CCFMetadata): void {
  fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2), 'utf-8');
}

export async function updateCCFData(): Promise<CCFUpdateResult> {
  try {
    ensureDataDir();
    
    // 先检查文件是否存在
    const filesExist = fs.existsSync(CONF_FILE) && fs.existsSync(ACC_FILE);
    console.log('开始更新CCF数据...');
    console.log('数据文件存在状态:', filesExist, 'CONF:', fs.existsSync(CONF_FILE), 'ACC:', fs.existsSync(ACC_FILE));
    
    // 并行获取数据
    const [confData, accData] = await Promise.all([
      fetchData(CONF_URL),
      fetchData(ACC_URL)
    ]);
    
    // 计算MD5
    const confMD5 = calculateMD5(confData);
    const accMD5 = calculateMD5(accData);
    
    const currentMetadata = loadMetadata();
    console.log('当前metadata:', currentMetadata);
    console.log('新计算的MD5 - conf:', confMD5, 'acc:', accMD5);
    
    // 如果文件不存在，强制更新（即使MD5相同）
    if (!filesExist) {
      console.log('数据文件不存在，强制更新...');
    } else if (currentMetadata && 
        currentMetadata.confMD5 === confMD5 && 
        currentMetadata.accMD5 === accMD5) {
      console.log('数据未发生变化且文件存在，跳过更新');
      return {
        success: true,
        message: '数据未发生变化，跳过更新',
        metadata: currentMetadata
      };
    }
    
    // 保存数据文件
    console.log('保存数据文件到:', CONF_FILE, ACC_FILE);
    saveFile(CONF_FILE, confData);
    saveFile(ACC_FILE, accData);
    
    // 更新元数据
    const metadata: CCFMetadata = {
      confMD5,
      accMD5,
      lastUpdate: new Date().toISOString()
    };
    
    saveMetadata(metadata);
    
    console.log('CCF数据更新完成:', metadata);
    
    return {
      success: true,
      message: '数据更新成功',
      metadata
    };
    
  } catch (error) {
    console.error('更新CCF数据失败:', error);
    return {
      success: false,
      message: `更新失败: ${error}`
    };
  }
}

export function getCCFData(): { conferences: any[], acceptances: any[] } | null {
  try {
    // 添加详细日志
    console.log('尝试读取CCF数据，目录:', DATA_DIR);
    console.log('CONF_FILE路径:', CONF_FILE);
    console.log('ACC_FILE路径:', ACC_FILE);
    console.log('会议文件是否存在:', fs.existsSync(CONF_FILE));
    console.log('录用率文件是否存在:', fs.existsSync(ACC_FILE));
    
    if (!fs.existsSync(CONF_FILE) || !fs.existsSync(ACC_FILE)) {
      console.log('数据文件不存在，需要先更新数据');
      return null;
    }
    
    const confData = fs.readFileSync(CONF_FILE, 'utf-8');
    const accData = fs.readFileSync(ACC_FILE, 'utf-8');
    
    console.log('成功读取数据文件，会议数据长度:', confData.length, '录用率数据长度:', accData.length);
    
    // 使用js-yaml解析
    const conferences = yaml.load(confData);
    const acceptances = yaml.load(accData);
    
    // 验证解析结果是数组格式
    if (!Array.isArray(conferences) || !Array.isArray(acceptances)) {
      console.error('解析的数据不是数组格式，conferences:', typeof conferences, 'isArray:', Array.isArray(conferences));
      console.error('acceptances:', typeof acceptances, 'isArray:', Array.isArray(acceptances));
      return null;
    }
    
    console.log('解析完成，会议数量:', conferences?.length || 0, '录用率记录数量:', acceptances?.length || 0);
    
    return {
      conferences,
      acceptances
    };
  } catch (error) {
    console.error('Error loading CCF data:', error);
    return null;
  }
}

export function getCCFMetadata(): CCFMetadata | null {
  return loadMetadata();
}