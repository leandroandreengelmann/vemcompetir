// Demo estático Kids AAMEP — não conectado ao banco.
// 5 grupos pareados por ano de nascimento (Mirim → Inf. Juvenil B).
// Faixas simples (sem variantes Branca/Preta).
// Pesos com nome (Galo → Pesadíssimo).

import type { AamepWeight } from './aamep-adulto';

export type AamepKidsBeltKey = 'branca' | 'cinza' | 'amarela' | 'laranja' | 'verde' | 'azul';

export type AamepKidsBelt = {
    key: AamepKidsBeltKey;
    label: string;
    dot: string;
};

export const AAMEP_KIDS_BELTS: AamepKidsBelt[] = [
    { key: 'branca', label: 'Branca', dot: 'bg-white border-zinc-300' },
    { key: 'cinza', label: 'Cinza', dot: 'bg-zinc-400 border-zinc-500' },
    { key: 'amarela', label: 'Amarela', dot: 'bg-yellow-400 border-yellow-500' },
    { key: 'laranja', label: 'Laranja', dot: 'bg-orange-500 border-orange-600' },
    { key: 'verde', label: 'Verde', dot: 'bg-green-600 border-green-700' },
    { key: 'azul', label: 'Azul', dot: 'bg-blue-500 border-blue-600' },
];

export type AamepKidsAge = {
    key: string;
    label: string;
    ageRange: string;
    birthYears: string;
    fightTime: string;
    belts: AamepKidsBeltKey[];
    weights: { masculino: AamepWeight[]; feminino: AamepWeight[] };
};

export const AAMEP_KIDS_AGES: AamepKidsAge[] = [
    {
        key: 'mirim',
        label: 'Mirim',
        ageRange: '6 e 7 anos',
        birthYears: '2019/2020',
        fightTime: '2 min',
        belts: ['branca', 'cinza'],
        weights: {
            masculino: [
                { key: 'galo', name: 'Galo', range: { min: 0, max: 21.0 } },
                { key: 'pluma', name: 'Pluma', range: { min: 21.0, max: 24.0 } },
                { key: 'pena', name: 'Pena', range: { min: 24.0, max: 27.0 } },
                { key: 'leve', name: 'Leve', range: { min: 27.0, max: 30.2 } },
                { key: 'medio', name: 'Médio', range: { min: 30.2, max: 33.2 } },
                { key: 'meio-pesado', name: 'Meio-pesado', range: { min: 33.2, max: 36.2 } },
                { key: 'pesado', name: 'Pesado', range: { min: 36.2, max: 39.3 } },
                { key: 'super-pesado', name: 'Super Pesado', range: { min: 39.3, max: 42.3 } },
                { key: 'pesadissimo', name: 'Pesadíssimo', range: { min: 42.3, max: null } },
            ],
            feminino: [
                { key: 'galo', name: 'Galo', range: { min: 0, max: 18.2 } },
                { key: 'pluma', name: 'Pluma', range: { min: 18.2, max: 21.0 } },
                { key: 'pena', name: 'Pena', range: { min: 21.0, max: 24.0 } },
                { key: 'leve', name: 'Leve', range: { min: 24.0, max: 27.0 } },
                { key: 'medio', name: 'Médio', range: { min: 27.0, max: 30.2 } },
                { key: 'meio-pesado', name: 'Meio-pesado', range: { min: 30.2, max: 33.2 } },
                { key: 'pesado', name: 'Pesado', range: { min: 33.2, max: 36.2 } },
                { key: 'super-pesado', name: 'Super Pesado', range: { min: 36.2, max: 39.3 } },
                { key: 'pesadissimo', name: 'Pesadíssimo', range: { min: 39.3, max: null } },
            ],
        },
    },
    {
        key: 'infantil-a',
        label: 'Infantil A',
        ageRange: '8 e 9 anos',
        birthYears: '2017/2018',
        fightTime: '3 min',
        belts: ['branca', 'cinza', 'amarela'],
        weights: {
            masculino: [
                { key: 'galo', name: 'Galo', range: { min: 0, max: 27.0 } },
                { key: 'pluma', name: 'Pluma', range: { min: 27.0, max: 30.2 } },
                { key: 'pena', name: 'Pena', range: { min: 30.2, max: 33.2 } },
                { key: 'leve', name: 'Leve', range: { min: 33.2, max: 36.2 } },
                { key: 'medio', name: 'Médio', range: { min: 36.2, max: 39.3 } },
                { key: 'meio-pesado', name: 'Meio-pesado', range: { min: 39.3, max: 42.3 } },
                { key: 'pesado', name: 'Pesado', range: { min: 42.3, max: 45.3 } },
                { key: 'super-pesado', name: 'Super Pesado', range: { min: 45.3, max: 48.3 } },
                { key: 'pesadissimo', name: 'Pesadíssimo', range: { min: 48.3, max: null } },
            ],
            feminino: [
                { key: 'galo', name: 'Galo', range: { min: 0, max: 24.0 } },
                { key: 'pluma', name: 'Pluma', range: { min: 24.0, max: 27.0 } },
                { key: 'pena', name: 'Pena', range: { min: 27.0, max: 30.2 } },
                { key: 'leve', name: 'Leve', range: { min: 30.2, max: 33.2 } },
                { key: 'medio', name: 'Médio', range: { min: 33.2, max: 36.2 } },
                { key: 'meio-pesado', name: 'Meio-pesado', range: { min: 36.2, max: 39.3 } },
                { key: 'pesado', name: 'Pesado', range: { min: 39.3, max: 42.3 } },
                { key: 'super-pesado', name: 'Super Pesado', range: { min: 42.3, max: 45.3 } },
                { key: 'pesadissimo', name: 'Pesadíssimo', range: { min: 45.3, max: null } },
            ],
        },
    },
    {
        key: 'infantil-b',
        label: 'Infantil B',
        ageRange: '10 e 11 anos',
        birthYears: '2015/2016',
        fightTime: '3,5 min',
        belts: ['branca', 'cinza', 'amarela', 'laranja'],
        weights: {
            masculino: [
                { key: 'galo', name: 'Galo', range: { min: 0, max: 32.2 } },
                { key: 'pluma', name: 'Pluma', range: { min: 32.2, max: 36.2 } },
                { key: 'pena', name: 'Pena', range: { min: 36.2, max: 39.3 } },
                { key: 'leve', name: 'Leve', range: { min: 39.3, max: 42.3 } },
                { key: 'medio', name: 'Médio', range: { min: 42.3, max: 45.3 } },
                { key: 'meio-pesado', name: 'Meio-pesado', range: { min: 45.3, max: 48.3 } },
                { key: 'pesado', name: 'Pesado', range: { min: 48.3, max: 51.5 } },
                { key: 'super-pesado', name: 'Super Pesado', range: { min: 51.5, max: 54.5 } },
                { key: 'pesadissimo', name: 'Pesadíssimo', range: { min: 54.5, max: null } },
            ],
            feminino: [
                { key: 'galo', name: 'Galo', range: { min: 0, max: 30.2 } },
                { key: 'pluma', name: 'Pluma', range: { min: 30.2, max: 33.2 } },
                { key: 'pena', name: 'Pena', range: { min: 33.2, max: 36.2 } },
                { key: 'leve', name: 'Leve', range: { min: 36.2, max: 39.3 } },
                { key: 'medio', name: 'Médio', range: { min: 39.3, max: 42.3 } },
                { key: 'meio-pesado', name: 'Meio-pesado', range: { min: 42.3, max: 45.3 } },
                { key: 'pesado', name: 'Pesado', range: { min: 45.3, max: 48.3 } },
                { key: 'super-pesado', name: 'Super Pesado', range: { min: 48.3, max: 51.5 } },
                { key: 'pesadissimo', name: 'Pesadíssimo', range: { min: 51.5, max: null } },
            ],
        },
    },
    {
        key: 'inf-juvenil-a',
        label: 'Inf. Juvenil A',
        ageRange: '12 e 13 anos',
        birthYears: '2013/2014',
        fightTime: '4 min',
        belts: ['branca', 'cinza', 'amarela', 'laranja', 'verde'],
        weights: {
            masculino: [
                { key: 'galo', name: 'Galo', range: { min: 0, max: 40.3 } },
                { key: 'pluma', name: 'Pluma', range: { min: 40.3, max: 44.3 } },
                { key: 'pena', name: 'Pena', range: { min: 44.3, max: 48.3 } },
                { key: 'leve', name: 'Leve', range: { min: 48.3, max: 52.5 } },
                { key: 'medio', name: 'Médio', range: { min: 52.5, max: 56.5 } },
                { key: 'meio-pesado', name: 'Meio-pesado', range: { min: 56.5, max: 60.5 } },
                { key: 'pesado', name: 'Pesado', range: { min: 60.5, max: 65.0 } },
                { key: 'super-pesado', name: 'Super Pesado', range: { min: 65.0, max: 69.0 } },
                { key: 'pesadissimo', name: 'Pesadíssimo', range: { min: 69.0, max: null } },
            ],
            feminino: [
                { key: 'galo', name: 'Galo', range: { min: 0, max: 36.2 } },
                { key: 'pluma', name: 'Pluma', range: { min: 36.2, max: 40.3 } },
                { key: 'pena', name: 'Pena', range: { min: 40.3, max: 44.3 } },
                { key: 'leve', name: 'Leve', range: { min: 44.3, max: 48.3 } },
                { key: 'medio', name: 'Médio', range: { min: 48.3, max: 52.5 } },
                { key: 'meio-pesado', name: 'Meio-pesado', range: { min: 52.5, max: 56.5 } },
                { key: 'pesado', name: 'Pesado', range: { min: 56.5, max: 60.5 } },
                { key: 'super-pesado', name: 'Super Pesado', range: { min: 60.5, max: 65.0 } },
                { key: 'pesadissimo', name: 'Pesadíssimo', range: { min: 65.0, max: null } },
            ],
        },
    },
    {
        key: 'inf-juvenil-b',
        label: 'Inf. Juvenil B',
        ageRange: '14 e 15 anos',
        birthYears: '2011/2012',
        fightTime: '4 min',
        belts: ['branca', 'cinza', 'amarela', 'laranja', 'verde', 'azul'],
        weights: {
            masculino: [
                { key: 'galo', name: 'Galo', range: { min: 0, max: 48.3 } },
                { key: 'pluma', name: 'Pluma', range: { min: 48.3, max: 52.5 } },
                { key: 'pena', name: 'Pena', range: { min: 52.5, max: 56.5 } },
                { key: 'leve', name: 'Leve', range: { min: 56.5, max: 60.5 } },
                { key: 'medio', name: 'Médio', range: { min: 60.5, max: 65.0 } },
                { key: 'meio-pesado', name: 'Meio-pesado', range: { min: 65.0, max: 69.0 } },
                { key: 'pesado', name: 'Pesado', range: { min: 69.0, max: 73.0 } },
                { key: 'super-pesado', name: 'Super Pesado', range: { min: 73.0, max: 77.0 } },
                { key: 'pesadissimo', name: 'Pesadíssimo', range: { min: 77.0, max: null } },
            ],
            feminino: [
                { key: 'galo', name: 'Galo', range: { min: 0, max: 44.3 } },
                { key: 'pluma', name: 'Pluma', range: { min: 44.3, max: 48.3 } },
                { key: 'pena', name: 'Pena', range: { min: 48.3, max: 52.5 } },
                { key: 'leve', name: 'Leve', range: { min: 52.5, max: 56.5 } },
                { key: 'medio', name: 'Médio', range: { min: 56.5, max: 60.5 } },
                { key: 'meio-pesado', name: 'Meio-pesado', range: { min: 60.5, max: 65.0 } },
                { key: 'pesado', name: 'Pesado', range: { min: 65.0, max: 69.0 } },
                { key: 'super-pesado', name: 'Super Pesado', range: { min: 69.0, max: 73.0 } },
                { key: 'pesadissimo', name: 'Pesadíssimo', range: { min: 73.0, max: null } },
            ],
        },
    },
];

export function getAamepKidsBelt(key: AamepKidsBeltKey): AamepKidsBelt {
    return AAMEP_KIDS_BELTS.find((b) => b.key === key) ?? AAMEP_KIDS_BELTS[0];
}

export function getAamepKidsWeights(age: AamepKidsAge, genero: 'masculino' | 'feminino'): AamepWeight[] {
    return age.weights[genero];
}
