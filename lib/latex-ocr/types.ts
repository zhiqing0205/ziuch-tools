export interface FormulaRecord {
    id: string;
    latex: string;
    confidence: number;
    image: string;
    createdAt: string;
    updatedAt: string;
}

export interface FormulaRecordWithoutId extends Omit<FormulaRecord, 'id'> {}

export type ThemeMode = 'light' | 'dark';
