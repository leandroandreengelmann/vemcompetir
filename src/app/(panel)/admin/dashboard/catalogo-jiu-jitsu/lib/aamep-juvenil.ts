// Demo estático Juvenil AAMEP — não conectado ao banco.
// AAMEP usa Juvenil 14-17 anos (não 16-17 como IBJJF).
// Faixas até Roxa (igual IBJJF — Marrom só aos 18, Preta aos 19).

import type { Belt } from './adulto-masculino';
import type { AamepWeight } from './aamep-adulto';

export const AAMEP_JUVENIL_BELTS: Belt[] = [
    { key: 'branca', label: 'Branca', color: 'bg-white', text: 'text-foreground', border: 'border-zinc-300' },
    { key: 'azul', label: 'Azul', color: 'bg-blue-500', text: 'text-white', border: 'border-blue-600' },
    { key: 'roxa', label: 'Roxa', color: 'bg-purple-600', text: 'text-white', border: 'border-purple-700' },
];

export const AAMEP_JUVENIL_WEIGHTS_MASCULINO: AamepWeight[] = [
    { key: 'galo', name: 'Galo', range: { min: 0, max: 53.5 } },
    { key: 'pluma', name: 'Pluma', range: { min: 53.5, max: 58.5 } },
    { key: 'pena', name: 'Pena', range: { min: 58.5, max: 64.0 } },
    { key: 'leve', name: 'Leve', range: { min: 64.0, max: 69.0 } },
    { key: 'medio', name: 'Médio', range: { min: 69.0, max: 74.0 } },
    { key: 'meio-pesado', name: 'Meio-pesado', range: { min: 74.0, max: 79.3 } },
    { key: 'pesado', name: 'Pesado', range: { min: 79.3, max: 84.3 } },
    { key: 'super-pesado', name: 'Super Pesado', range: { min: 84.3, max: 89.3 } },
    { key: 'pesadissimo', name: 'Pesadíssimo', range: { min: 89.3, max: null } },
];

export const AAMEP_JUVENIL_WEIGHTS_FEMININO: AamepWeight[] = [
    { key: 'galo', name: 'Galo', range: { min: 0, max: 44.3 } },
    { key: 'pluma', name: 'Pluma', range: { min: 44.3, max: 48.3 } },
    { key: 'pena', name: 'Pena', range: { min: 48.3, max: 52.5 } },
    { key: 'leve', name: 'Leve', range: { min: 52.5, max: 56.5 } },
    { key: 'medio', name: 'Médio', range: { min: 56.5, max: 60.5 } },
    { key: 'meio-pesado', name: 'Meio-pesado', range: { min: 60.5, max: 65.0 } },
    { key: 'pesado', name: 'Pesado', range: { min: 65.0, max: 69.0 } },
    { key: 'super-pesado', name: 'Super Pesado', range: { min: 69.0, max: null } },
];

export const AAMEP_JUVENIL = {
    label: 'Juvenil',
    ageRange: '14 a 17 anos',
    fightTime: '5 min',
};

export function getAamepJuvenilWeights(genero: 'masculino' | 'feminino'): AamepWeight[] {
    return genero === 'masculino' ? AAMEP_JUVENIL_WEIGHTS_MASCULINO : AAMEP_JUVENIL_WEIGHTS_FEMININO;
}
