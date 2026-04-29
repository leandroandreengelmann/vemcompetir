// Demo estático Adulto Feminino IBJJF — não está conectado ao banco.
// Pesos Gi extraídos dos CSVs em jj_lab_raw_rows; No-Gi conforme tabela oficial IBJJF.

import type { Belt, WeightRow } from './adulto-masculino';

export const ADULT_FEMALE_BELTS: Belt[] = [
    { key: 'branca', label: 'Branca', color: 'bg-white', text: 'text-foreground', border: 'border-zinc-300' },
    { key: 'azul', label: 'Azul', color: 'bg-blue-500', text: 'text-white', border: 'border-blue-600' },
    { key: 'roxa', label: 'Roxa', color: 'bg-purple-600', text: 'text-white', border: 'border-purple-700' },
    { key: 'marrom', label: 'Marrom', color: 'bg-amber-800', text: 'text-white', border: 'border-amber-900' },
    { key: 'preta', label: 'Preta', color: 'bg-zinc-900', text: 'text-white', border: 'border-zinc-950' },
];

// IBJJF Adulto Feminino: 8 pesos + Open Class
export const ADULT_FEMALE_WEIGHTS: WeightRow[] = [
    { key: 'galo', name: 'Galo', nameEn: 'Rooster', gi: { min: 0, max: 48.5 }, nogi: { min: 0, max: 46.5 } },
    { key: 'pluma', name: 'Pluma', nameEn: 'Light Feather', gi: { min: 48.5, max: 53.5 }, nogi: { min: 46.5, max: 49.5 } },
    { key: 'pena', name: 'Pena', nameEn: 'Feather', gi: { min: 53.5, max: 58.5 }, nogi: { min: 49.5, max: 55.0 } },
    { key: 'leve', name: 'Leve', nameEn: 'Light', gi: { min: 58.5, max: 64.0 }, nogi: { min: 55.0, max: 61.5 } },
    { key: 'medio', name: 'Médio', nameEn: 'Middle', gi: { min: 64.0, max: 69.0 }, nogi: { min: 61.5, max: 66.5 } },
    { key: 'meio-pesado', name: 'Meio-Pesado', nameEn: 'Medium Heavy', gi: { min: 69.0, max: 74.0 }, nogi: { min: 66.5, max: 71.5 } },
    { key: 'pesado', name: 'Pesado', nameEn: 'Heavy', gi: { min: 74.0, max: 79.3 }, nogi: { min: 71.5, max: 76.5 } },
    { key: 'super-pesado', name: 'Super Pesado', nameEn: 'Super Heavy', gi: { min: 79.3, max: null }, nogi: { min: 76.5, max: null } },
    { key: 'absoluto', name: 'Absoluto', nameEn: 'Open Class', gi: { min: 0, max: null }, nogi: { min: 0, max: null } },
];
