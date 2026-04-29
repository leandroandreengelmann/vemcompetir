// Demo estático Master IBJJF/CBJJ — não conectado ao banco.
// Dados oficiais extraídos dos CSVs em jj_lab_raw_rows.

import type { Belt } from './adulto-masculino';

export type MasterWeight = {
    key: string;
    name: string;
    nameEn: string;
    range: { min: number; max: number | null };
    gi: { min: number; max: number | null };
    nogi: { min: number; max: number | null };
};

export type MasterAge = {
    key: string;
    label: string;
    range: string;
    minAge: number;
    maxAge: number | null;
};

// Master tem as 5 faixas (atletas com 30+ já podem ter Marrom/Preta).
export const MASTER_BELTS: Belt[] = [
    { key: 'branca', label: 'Branca', color: 'bg-white', text: 'text-foreground', border: 'border-zinc-300' },
    { key: 'azul', label: 'Azul', color: 'bg-blue-500', text: 'text-white', border: 'border-blue-600' },
    { key: 'roxa', label: 'Roxa', color: 'bg-purple-600', text: 'text-white', border: 'border-purple-700' },
    { key: 'marrom', label: 'Marrom', color: 'bg-amber-800', text: 'text-white', border: 'border-amber-900' },
    { key: 'preta', label: 'Preta', color: 'bg-zinc-900', text: 'text-white', border: 'border-zinc-950' },
];

// Gi vem dos CSVs jj_lab_raw_rows (Master 1–7 herdam tabela do Adulto).
// No-Gi vem da tabela oficial IBJJF (Master usa as mesmas faixas do Adulto No-Gi).
export const MASTER_WEIGHTS_MASCULINO: MasterWeight[] = [
    { key: 'galo', name: 'Galo', nameEn: 'Rooster', range: { min: 0, max: 57.5 }, gi: { min: 0, max: 57.5 }, nogi: { min: 0, max: 55.5 } },
    { key: 'pluma', name: 'Pluma', nameEn: 'Light Feather', range: { min: 57.5, max: 64.0 }, gi: { min: 57.5, max: 64.0 }, nogi: { min: 55.5, max: 61.5 } },
    { key: 'pena', name: 'Pena', nameEn: 'Feather', range: { min: 64.0, max: 70.0 }, gi: { min: 64.0, max: 70.0 }, nogi: { min: 61.5, max: 67.5 } },
    { key: 'leve', name: 'Leve', nameEn: 'Light', range: { min: 70.0, max: 76.0 }, gi: { min: 70.0, max: 76.0 }, nogi: { min: 67.5, max: 73.5 } },
    { key: 'medio', name: 'Médio', nameEn: 'Middle', range: { min: 76.0, max: 82.3 }, gi: { min: 76.0, max: 82.3 }, nogi: { min: 73.5, max: 79.5 } },
    { key: 'meio-pesado', name: 'Meio-Pesado', nameEn: 'Medium Heavy', range: { min: 82.3, max: 88.3 }, gi: { min: 82.3, max: 88.3 }, nogi: { min: 79.5, max: 85.5 } },
    { key: 'pesado', name: 'Pesado', nameEn: 'Heavy', range: { min: 88.3, max: 94.3 }, gi: { min: 88.3, max: 94.3 }, nogi: { min: 85.5, max: 91.5 } },
    { key: 'super-pesado', name: 'Super Pesado', nameEn: 'Super Heavy', range: { min: 94.3, max: 100.5 }, gi: { min: 94.3, max: 100.5 }, nogi: { min: 91.5, max: 97.5 } },
    { key: 'pesadissimo', name: 'Pesadíssimo', nameEn: 'Ultra Heavy', range: { min: 100.5, max: null }, gi: { min: 100.5, max: null }, nogi: { min: 97.5, max: null } },
    { key: 'absoluto', name: 'Absoluto', nameEn: 'Open Class', range: { min: 0, max: null }, gi: { min: 0, max: null }, nogi: { min: 0, max: null } },
];

export const MASTER_WEIGHTS_FEMININO: MasterWeight[] = [
    { key: 'galo', name: 'Galo', nameEn: 'Rooster', range: { min: 0, max: 48.5 }, gi: { min: 0, max: 48.5 }, nogi: { min: 0, max: 46.5 } },
    { key: 'pluma', name: 'Pluma', nameEn: 'Light Feather', range: { min: 48.5, max: 53.5 }, gi: { min: 48.5, max: 53.5 }, nogi: { min: 46.5, max: 49.5 } },
    { key: 'pena', name: 'Pena', nameEn: 'Feather', range: { min: 53.5, max: 58.5 }, gi: { min: 53.5, max: 58.5 }, nogi: { min: 49.5, max: 55.5 } },
    { key: 'leve', name: 'Leve', nameEn: 'Light', range: { min: 58.5, max: 64.0 }, gi: { min: 58.5, max: 64.0 }, nogi: { min: 55.5, max: 61.5 } },
    { key: 'medio', name: 'Médio', nameEn: 'Middle', range: { min: 64.0, max: 69.0 }, gi: { min: 64.0, max: 69.0 }, nogi: { min: 61.5, max: 66.5 } },
    { key: 'meio-pesado', name: 'Meio-Pesado', nameEn: 'Medium Heavy', range: { min: 69.0, max: 74.0 }, gi: { min: 69.0, max: 74.0 }, nogi: { min: 66.5, max: 71.5 } },
    { key: 'pesado', name: 'Pesado', nameEn: 'Heavy', range: { min: 74.0, max: 79.3 }, gi: { min: 74.0, max: 79.3 }, nogi: { min: 71.5, max: 76.5 } },
    { key: 'super-pesado', name: 'Super Pesado', nameEn: 'Super Heavy', range: { min: 79.3, max: null }, gi: { min: 79.3, max: null }, nogi: { min: 76.5, max: null } },
    { key: 'absoluto', name: 'Absoluto', nameEn: 'Open Class', range: { min: 0, max: null }, gi: { min: 0, max: null }, nogi: { min: 0, max: null } },
];

export const MASTER_AGES: MasterAge[] = [
    { key: 'master-1', label: 'Master 1', range: '30 a 35 anos', minAge: 30, maxAge: 35 },
    { key: 'master-2', label: 'Master 2', range: '36 a 40 anos', minAge: 36, maxAge: 40 },
    { key: 'master-3', label: 'Master 3', range: '41 a 45 anos', minAge: 41, maxAge: 45 },
    { key: 'master-4', label: 'Master 4', range: '46 a 50 anos', minAge: 46, maxAge: 50 },
    { key: 'master-5', label: 'Master 5', range: '51 a 55 anos', minAge: 51, maxAge: 55 },
    { key: 'master-6', label: 'Master 6', range: '56 a 60 anos', minAge: 56, maxAge: 60 },
    { key: 'master-7', label: 'Master 7', range: '61 anos ou mais', minAge: 61, maxAge: null },
];

export function getMasterWeights(genero: 'masculino' | 'feminino'): MasterWeight[] {
    return genero === 'masculino' ? MASTER_WEIGHTS_MASCULINO : MASTER_WEIGHTS_FEMININO;
}
