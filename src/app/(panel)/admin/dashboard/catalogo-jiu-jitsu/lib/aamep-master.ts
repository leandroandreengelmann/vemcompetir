// Demo estático Master AAMEP — não conectado ao banco.
// Apenas Masculino (AAMEP não modela Master Feminino).
// Apenas 2 grupos (M1 30-40, M2 40+) e 3 pesos + Absoluto.

import type { Belt } from './adulto-masculino';
import type { AamepWeight } from './aamep-adulto';

export const AAMEP_MASTER_BELTS: Belt[] = [
    { key: 'branca', label: 'Branca', color: 'bg-white', text: 'text-foreground', border: 'border-zinc-300' },
    { key: 'azul', label: 'Azul', color: 'bg-blue-500', text: 'text-white', border: 'border-blue-600' },
    { key: 'roxa', label: 'Roxa', color: 'bg-purple-600', text: 'text-white', border: 'border-purple-700' },
    { key: 'marrom', label: 'Marrom', color: 'bg-amber-800', text: 'text-white', border: 'border-amber-900' },
    { key: 'preta', label: 'Preta', color: 'bg-zinc-900', text: 'text-white', border: 'border-zinc-950' },
];

export type AamepMasterAge = {
    key: string;
    label: string;
    range: string;
    weights: AamepWeight[];
};

export const AAMEP_MASTER_AGES: AamepMasterAge[] = [
    {
        key: 'master-1',
        label: 'Master 1',
        range: '30 a 40 anos',
        weights: [
            { key: 'pluma', name: 'Pluma', range: { min: 0, max: 64.0 } },
            { key: 'medio', name: 'Médio', range: { min: 64.0, max: 74.0 } },
            { key: 'pesado', name: 'Pesado', range: { min: 74.0, max: null } },
        ],
    },
    {
        key: 'master-2',
        label: 'Master 2',
        range: '40 anos ou mais',
        weights: [
            { key: 'pluma', name: 'Pluma', range: { min: 0, max: 70.0 } },
            { key: 'medio', name: 'Médio', range: { min: 70.0, max: 80.0 } },
            { key: 'pesado', name: 'Pesado', range: { min: 80.0, max: null } },
        ],
    },
];

export const AAMEP_MASTER = {
    label: 'Master',
    ageRange: '30 anos ou mais',
    fightTime: '5 min',
    gender: 'Masculino apenas',
};
