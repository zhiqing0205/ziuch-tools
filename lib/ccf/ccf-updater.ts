import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { CCFMetadata, CCFUpdateResult } from './types';

const DATA_DIR = path.join(process.cwd(), 'data', 'ccf');
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
    
    console.log('开始更新CCF数据...');
    
    // 并行获取数据
    const [confData, accData] = await Promise.all([
      fetchData(CONF_URL),
      fetchData(ACC_URL)
    ]);
    
    // 计算MD5
    const confMD5 = calculateMD5(confData);
    const accMD5 = calculateMD5(accData);
    
    // 检查是否需要更新
    const currentMetadata = loadMetadata();
    if (currentMetadata && 
        currentMetadata.confMD5 === confMD5 && 
        currentMetadata.accMD5 === accMD5) {
      console.log('数据未发生变化，跳过更新');
      return {
        success: true,
        message: '数据未发生变化，跳过更新',
        metadata: currentMetadata
      };
    }
    
    // 保存数据文件
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
    if (!fs.existsSync(CONF_FILE) || !fs.existsSync(ACC_FILE)) {
      return null;
    }
    
    const confData = fs.readFileSync(CONF_FILE, 'utf-8');
    const accData = fs.readFileSync(ACC_FILE, 'utf-8');
    
    // 使用yaml解析
    const { parse } = require('yaml');
    
    return {
      conferences: parse(confData),
      acceptances: parse(accData)
    };
  } catch (error) {
    console.error('Error loading CCF data:', error);
    return null;
  }
}

export function getCCFMetadata(): CCFMetadata | null {
  return loadMetadata();
}