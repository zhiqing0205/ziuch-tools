import { FormulaRecord } from './types';

const STORAGE_KEY = 'latex-ocr-records';

export function getAllFormulaRecords(): FormulaRecord[] {
    if (typeof window === 'undefined') return [];
    const records = localStorage.getItem(STORAGE_KEY);
    if (!records) return [];  // 如果记录为空，返回空数组

    const parsedRecords: FormulaRecord[] = JSON.parse(records);
    // 根据修改时间排序(需要转换成时间戳)
    parsedRecords.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    return parsedRecords;
}

export function getFormulaRecordById(id: string): FormulaRecord | undefined {
    const records = getAllFormulaRecords();
    return records.find(record => record.id === id);
}

export async function saveFormulaRecord(record: FormulaRecord): Promise<void> {
    const records = getAllFormulaRecords();
    records.push(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export async function deleteFormulaRecord(id: string): Promise<void> {
    const records = getAllFormulaRecords();
    const newRecords = records.filter(record => record.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newRecords));
}

export async function updateFormulaRecord(id: string, updates: Partial<FormulaRecord>): Promise<void> {
    const records = getAllFormulaRecords();
    const index = records.findIndex(record => record.id === id);
    if (index !== -1) {
        records[index] = { ...records[index], ...updates };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }
}
