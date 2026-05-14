// Demo estático Adulto AAMEP — não conectado ao banco.
// Dados oficiais extraídos do CSV aamep_2026_tabela_pesos.

import type { Belt } from './adulto-masculino';

export type AamepWeight = {
    key: string;
    name: string;
    range: { min: number; max: number | null };
};

export const AAMEP_ADULTO_BELTS: Belt[] = [
    { key: 'branca', label: 'Branca', color: 'bg-white', text: 'text-foreground', border: 'border-zinc-300' },
    { key: 'azul', label: 'Azul', color: 'bg-blue-500', text: 'text-white', border: 'border-blue-600' },
    { key: 'roxa', label: 'Roxa', color: 'bg-purple-600', text: 'text-white', border: 'border-purple-700' },
    { key: 'marrom', label: 'Marrom', color: 'bg-amber-800', text: 'text-white', border: 'border-amber-900' },
    { key: 'preta', label: 'Preta', color: 'bg-zinc-900', text: 'text-white', border: 'border-zinc-950' },
];

// AAMEP Adulto Masculino: 9 pesos (Galo → Pesadíssimo)
export const AAMEP_ADULTO_WEIGHTS_MASCULINO: AamepWeight[] = [
    { key: 'galo', name: 'Galo', range: { min: 0, max: 57.5 } },
    { key: 'pluma', name: 'Pluma', range: { min: 57.5, max: 64.0 } },
    { key: 'pena', name: 'Pena', range: { min: 64.0, max: 70.0 } },
    { key: 'leve', name: 'Leve', range: { min: 70.0, max: 76.0 } },
    { key: 'medio', name: 'Médio', range: { min: 76.0, max: 82.3 } },
    { key: 'meio-pesado', name: 'Meio-pesado', range: { min: 82.3, max: 88.3 } },
    { key: 'pesado', name: 'Pesado', range: { min: 88.3, max: 94.3 } },
    { key: 'super-pesado', name: 'Super Pesado', range: { min: 94.3, max: 100.5 } },
    { key: 'pesadissimo', name: 'Pesadíssimo', range: { min: 100.5, max: null } },
];

// AAMEP Adulto Feminino: 8 pesos (Galo → Super Pesado livre — não tem Pesadíssimo)
export const AAMEP_ADULTO_WEIGHTS_FEMININO: AamepWeight[] = [
    { key: 'galo', name: 'Galo', range: { min: 0, max: 48.5 } },
    { key: 'pluma', name: 'Pluma', range: { min: 48.5, max: 53.5 } },
    { key: 'pena', name: 'Pena', range: { min: 53.5, max: 58.5 } },
    { key: 'leve', name: 'Leve', range: { min: 58.5, max: 64.0 } },
    { key: 'medio', name: 'Médio', range: { min: 64.0, max: 69.0 } },
    { key: 'meio-pesado', name: 'Meio-pesado', range: { min: 69.0, max: 74.0 } },
    { key: 'pesado', name: 'Pesado', range: { min: 74.0, max: 79.3 } },
    { key: 'super-pesado', name: 'Super Pesado', range: { min: 79.3, max: null } },
];

export const AAMEP_ADULTO = {
    label: 'Adulto',
    ageRange: '18 anos ou mais',
    fightTime: '6 min',
};

export function getAamepAdultoWeights(genero: 'masculino' | 'feminino'): AamepWeight[] {
    return genero === 'masculino' ? AAMEP_ADULTO_WEIGHTS_MASCULINO : AAMEP_ADULTO_WEIGHTS_FEMININO;
}
