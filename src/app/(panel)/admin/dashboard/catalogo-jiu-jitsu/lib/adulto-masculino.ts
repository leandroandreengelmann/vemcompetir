// Demo estático Adulto Masculino IBJJF — não está conectado ao banco.
// Serve só para visualizar como o gestor renderiza o modelo de 5 eixos.

export type Belt = {
    key: 'branca' | 'azul' | 'roxa' | 'marrom' | 'preta';
    label: string;
    color: string;
    text: string;
    border: string;
};

export type WeightRow = {
    key: string;
    name: string;
    nameEn: string;
    gi: { min: number; max: number | null };
    nogi: { min: number; max: number | null };
};

export const ADULT_MALE_BELTS: Belt[] = [
    { key: 'branca', label: 'Branca', color: 'bg-white', text: 'text-foreground', border: 'border-zinc-300' },
    { key: 'azul', label: 'Azul', color: 'bg-blue-500', text: 'text-white', border: 'border-blue-600' },
    { key: 'roxa', label: 'Roxa', color: 'bg-purple-600', text: 'text-white', border: 'border-purple-700' },
    { key: 'marrom', label: 'Marrom', color: 'bg-amber-800', text: 'text-white', border: 'border-amber-900' },
    { key: 'preta', label: 'Preta', color: 'bg-zinc-900', text: 'text-white', border: 'border-zinc-950' },
];

export const ADULT_MALE_WEIGHTS: WeightRow[] = [
    { key: 'galo', name: 'Galo', nameEn: 'Rooster', gi: { min: 0, max: 57.5 }, nogi: { min: 0, max: 55.5 } },
    { key: 'pluma', name: 'Pluma', nameEn: 'Light Feather', gi: { min: 57.5, max: 64.0 }, nogi: { min: 55.5, max: 61.5 } },
    { key: 'pena', name: 'Pena', nameEn: 'Feather', gi: { min: 64.0, max: 70.0 }, nogi: { min: 61.5, max: 67.5 } },
    { key: 'leve', name: 'Leve', nameEn: 'Light', gi: { min: 70.0, max: 76.0 }, nogi: { min: 67.5, max: 73.5 } },
    { key: 'medio', name: 'Médio', nameEn: 'Middle', gi: { min: 76.0, max: 82.3 }, nogi: { min: 73.5, max: 79.5 } },
    { key: 'meio-pesado', name: 'Meio-Pesado', nameEn: 'Medium Heavy', gi: { min: 82.3, max: 88.3 }, nogi: { min: 79.5, max: 85.5 } },
    { key: 'pesado', name: 'Pesado', nameEn: 'Heavy', gi: { min: 88.3, max: 94.3 }, nogi: { min: 85.5, max: 91.5 } },
    { key: 'super-pesado', name: 'Super Pesado', nameEn: 'Super Heavy', gi: { min: 94.3, max: 100.5 }, nogi: { min: 91.5, max: 97.5 } },
    { key: 'pesadissimo', name: 'Pesadíssimo', nameEn: 'Ultra Heavy', gi: { min: 100.5, max: null }, nogi: { min: 97.5, max: null } },
    { key: 'absoluto', name: 'Absoluto', nameEn: 'Open Class', gi: { min: 0, max: null }, nogi: { min: 0, max: null } },
];

export function formatWeightRange(min: number, max: number | null): string {
    if (max === null && min === 0) return 'Qualquer peso';
    if (max === null) return `acima de ${min.toFixed(1).replace('.', ',')} kg`;
    if (min === 0) return `até ${max.toFixed(1).replace('.', ',')} kg`;
    return `${min.toFixed(1).replace('.', ',')} – ${max.toFixed(1).replace('.', ',')} kg`;
}
