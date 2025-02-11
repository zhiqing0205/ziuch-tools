import { FormulaRecord } from './types';

const STORAGE_KEY = 'latex-ocr-history';

export function saveFormulaRecord(record: FormulaRecord): void {
    const records = getFormulaRecords();
    records.unshift(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function getFormulaRecords(): FormulaRecord[] {
    const records = localStorage.getItem(STORAGE_KEY);
    return records ? JSON.parse(records) : [];
}

export function getFormulaRecord(id: string): FormulaRecord | undefined {
    const records = getFormulaRecords();
    return records.find(record => record.id === id);
}

export function updateFormulaRecord(id: string, updates: Partial<FormulaRecord>): void {
    const records = getFormulaRecords();
    const index = records.findIndex(record => record.id === id);
    if (index !== -1) {
        records[index] = {
            ...records[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }
}

export function deleteFormulaRecord(id: string): void {
    const records = getFormulaRecords();
    const filtered = records.filter(record => record.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function getPaginatedRecords(page: number, pageSize: number): {
    records: FormulaRecord[];
    total: number;
} {
    const records = getFormulaRecords();
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    
    return {
        records: records.slice(start, end),
        total: records.length
    };
}
