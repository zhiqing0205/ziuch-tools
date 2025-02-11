export interface FormulaRecord {
    id: string;
    image: string;
    latex: string;
    confidence: number;
    createdAt: string;
    updatedAt: string;
}

export type ThemeMode = 'light' | 'dark';
