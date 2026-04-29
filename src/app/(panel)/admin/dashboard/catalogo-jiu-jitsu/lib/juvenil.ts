// Demo estático Juvenil IBJJF/CBJJ — não conectado ao banco.
// Dados oficiais extraídos dos CSVs em jj_lab_raw_rows.

import type { Belt } from './adulto-masculino';

export type JuvenilWeight = {
    key: string;
    name: string;
    nameEn: string;
    range: { min: number; max: number | null };
    gi: { min: number; max: number | null };
    nogi: { min: number; max: number | null };
};

// Juvenil só tem 3 faixas (não existe Marrom/Preta antes dos 18)
export const JUVENIL_BELTS: Belt[] = [
    { key: 'branca', label: 'Branca', color: 'bg-white', text: 'text-foreground', border: 'border-zinc-300' },
    { key: 'azul', label: 'Azul', color: 'bg-blue-500', text: 'text-white', border: 'border-blue-600' },
    { key: 'roxa', label: 'Roxa', color: 'bg-purple-600', text: 'text-white', border: 'border-purple-700' },
];

// Gi vem dos CSVs jj_lab_raw_rows. No-Gi vem da tabela oficial IBJJF (Juvenil
// usa pesos ~2 kg menores que o Gi, mesmo padrão do Adulto).
export const JUVENIL_WEIGHTS_MASCULINO: JuvenilWeight[] = [
    { key: 'galo', name: 'Galo', nameEn: 'Rooster', range: { min: 0, max: 53.5 }, gi: { min: 0, max: 53.5 }, nogi: { min: 0, max: 51.5 } },
    { key: 'pluma', name: 'Pluma', nameEn: 'Light Feather', range: { min: 53.5, max: 58.5 }, gi: { min: 53.5, max: 58.5 }, nogi: { min: 51.5, max: 56.5 } },
    { key: 'pena', name: 'Pena', nameEn: 'Feather', range: { min: 58.5, max: 64.0 }, gi: { min: 58.5, max: 64.0 }, nogi: { min: 56.5, max: 62.0 } },
    { key: 'leve', name: 'Leve', nameEn: 'Light', range: { min: 64.0, max: 69.0 }, gi: { min: 64.0, max: 69.0 }, nogi: { min: 62.0, max: 67.5 } },
    { key: 'medio', name: 'Médio', nameEn: 'Middle', range: { min: 69.0, max: 74.0 }, gi: { min: 69.0, max: 74.0 }, nogi: { min: 67.5, max: 72.5 } },
    { key: 'meio-pesado', name: 'Meio-Pesado', nameEn: 'Medium Heavy', range: { min: 74.0, max: 79.3 }, gi: { min: 74.0, max: 79.3 }, nogi: { min: 72.5, max: 77.5 } },
    { key: 'pesado', name: 'Pesado', nameEn: 'Heavy', range: { min: 79.3, max: 84.3 }, gi: { min: 79.3, max: 84.3 }, nogi: { min: 77.5, max: 82.5 } },
    { key: 'super-pesado', name: 'Super Pesado', nameEn: 'Super Heavy', range: { min: 84.3, max: 89.3 }, gi: { min: 84.3, max: 89.3 }, nogi: { min: 82.5, max: 88.5 } },
    { key: 'pesadissimo', name: 'Pesadíssimo', nameEn: 'Ultra Heavy', range: { min: 89.3, max: null }, gi: { min: 89.3, max: null }, nogi: { min: 88.5, max: null } },
    { key: 'absoluto', name: 'Absoluto', nameEn: 'Open Class', range: { min: 0, max: null }, gi: { min: 0, max: null }, nogi: { min: 0, max: null } },
];

export const JUVENIL_WEIGHTS_FEMININO: JuvenilWeight[] = [
    { key: 'galo', name: 'Galo', nameEn: 'Rooster', range: { min: 0, max: 44.3 }, gi: { min: 0, max: 44.3 }, nogi: { min: 0, max: 42.5 } },
    { key: 'pluma', name: 'Pluma', nameEn: 'Light Feather', range: { min: 44.3, max: 48.3 }, gi: { min: 44.3, max: 48.3 }, nogi: { min: 42.5, max: 46.5 } },
    { key: 'pena', name: 'Pena', nameEn: 'Feather', range: { min: 48.3, max: 52.5 }, gi: { min: 48.3, max: 52.5 }, nogi: { min: 46.5, max: 50.5 } },
    { key: 'leve', name: 'Leve', nameEn: 'Light', range: { min: 52.5, max: 56.5 }, gi: { min: 52.5, max: 56.5 }, nogi: { min: 50.5, max: 55.0 } },
    { key: 'medio', name: 'Médio', nameEn: 'Middle', range: { min: 56.5, max: 60.5 }, gi: { min: 56.5, max: 60.5 }, nogi: { min: 55.0, max: 59.5 } },
    { key: 'meio-pesado', name: 'Meio-Pesado', nameEn: 'Medium Heavy', range: { min: 60.5, max: 65.0 }, gi: { min: 60.5, max: 65.0 }, nogi: { min: 59.5, max: 63.5 } },
    { key: 'pesado', name: 'Pesado', nameEn: 'Heavy', range: { min: 65.0, max: 69.0 }, gi: { min: 65.0, max: 69.0 }, nogi: { min: 63.5, max: 68.0 } },
    { key: 'super-pesado', name: 'Super Pesado', nameEn: 'Super Heavy', range: { min: 69.0, max: null }, gi: { min: 69.0, max: null }, nogi: { min: 68.0, max: null } },
    { key: 'absoluto', name: 'Absoluto', nameEn: 'Open Class', range: { min: 0, max: null }, gi: { min: 0, max: null }, nogi: { min: 0, max: null } },
];

export const JUVENIL_AGES = [
    { key: 'juvenil-1', label: 'Juvenil I', age: 16 },
    { key: 'juvenil-2', label: 'Juvenil II', age: 17 },
];

export function getJuvenilWeights(genero: 'masculino' | 'feminino'): JuvenilWeight[] {
    return genero === 'masculino' ? JUVENIL_WEIGHTS_MASCULINO : JUVENIL_WEIGHTS_FEMININO;
}
