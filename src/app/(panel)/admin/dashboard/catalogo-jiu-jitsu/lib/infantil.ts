// Demo estático Infantil IBJJF/CBJJ (4 a 15 anos) — não conectado ao banco.
// Dados oficiais extraídos dos CSVs importados em jj_lab_raw_rows.

export type KidsBeltKey =
    | 'branca'
    | 'cinza-branca' | 'cinza' | 'cinza-preta'
    | 'amarela-branca' | 'amarela' | 'amarela-preta'
    | 'laranja-branca' | 'laranja' | 'laranja-preta'
    | 'verde-branca' | 'verde' | 'verde-preta';

export type KidsBelt = {
    key: KidsBeltKey;
    label: string;
    dot: string; // tailwind classes p/ a bolinha
};

export const KIDS_BELTS: KidsBelt[] = [
    { key: 'branca', label: 'Branca', dot: 'bg-white border-zinc-300' },
    { key: 'cinza-branca', label: 'Cinza e Branca', dot: 'bg-gradient-to-b from-zinc-300 to-white border-zinc-400' },
    { key: 'cinza', label: 'Cinza', dot: 'bg-zinc-400 border-zinc-500' },
    { key: 'cinza-preta', label: 'Cinza e Preta', dot: 'bg-gradient-to-b from-zinc-400 to-zinc-900 border-zinc-700' },
    { key: 'amarela-branca', label: 'Amarela e Branca', dot: 'bg-gradient-to-b from-yellow-400 to-white border-yellow-500' },
    { key: 'amarela', label: 'Amarela', dot: 'bg-yellow-400 border-yellow-500' },
    { key: 'amarela-preta', label: 'Amarela e Preta', dot: 'bg-gradient-to-b from-yellow-400 to-zinc-900 border-yellow-600' },
    { key: 'laranja-branca', label: 'Laranja e Branca', dot: 'bg-gradient-to-b from-orange-500 to-white border-orange-600' },
    { key: 'laranja', label: 'Laranja', dot: 'bg-orange-500 border-orange-600' },
    { key: 'laranja-preta', label: 'Laranja e Preta', dot: 'bg-gradient-to-b from-orange-500 to-zinc-900 border-orange-700' },
    { key: 'verde-branca', label: 'Verde e Branca', dot: 'bg-gradient-to-b from-green-600 to-white border-green-700' },
    { key: 'verde', label: 'Verde', dot: 'bg-green-600 border-green-700' },
    { key: 'verde-preta', label: 'Verde e Preta', dot: 'bg-gradient-to-b from-green-600 to-zinc-900 border-green-800' },
];

const PRE_MIRIM_BELTS: KidsBeltKey[] = ['branca', 'cinza-branca', 'cinza', 'cinza-preta'];
const MIRIM_BELTS: KidsBeltKey[] = [...PRE_MIRIM_BELTS, 'amarela-branca', 'amarela', 'amarela-preta'];
const INFANTIL_BELTS: KidsBeltKey[] = [...MIRIM_BELTS, 'laranja-branca', 'laranja', 'laranja-preta'];
const INFANTOJUV_BELTS: KidsBeltKey[] = [...INFANTIL_BELTS, 'verde-branca', 'verde', 'verde-preta'];

export type KidsAgeGroup = 'pre-mirim' | 'mirim' | 'infantil' | 'infantojuv';

export type KidsAge = {
    key: string;
    label: string;       // "Pré-mirim I"
    age: number;         // idade do atleta
    group: KidsAgeGroup;
    belts: KidsBeltKey[];
    weights: { min: number; max: number | null }[];
};

export const KIDS_AGES: KidsAge[] = [
    {
        key: 'pre-mirim-1', label: 'Pré-mirim I', age: 4, group: 'pre-mirim', belts: PRE_MIRIM_BELTS,
        weights: [
            { min: 0, max: 11.3 }, { min: 11.31, max: 14.2 }, { min: 14.21, max: 17.2 },
            { min: 17.21, max: 20.2 }, { min: 20.21, max: 23.2 }, { min: 23.21, max: 26.2 },
            { min: 26.21, max: 29.3 }, { min: 29.31, max: 32.3 }, { min: 32.31, max: null },
        ],
    },
    {
        key: 'pre-mirim-2', label: 'Pré-mirim II', age: 5, group: 'pre-mirim', belts: PRE_MIRIM_BELTS,
        weights: [
            { min: 0, max: 14.2 }, { min: 14.21, max: 16.2 }, { min: 16.21, max: 19.2 },
            { min: 19.21, max: 22.2 }, { min: 22.21, max: 25.3 }, { min: 25.31, max: 28.3 },
            { min: 28.31, max: 31.3 }, { min: 31.31, max: 34.3 }, { min: 34.31, max: null },
        ],
    },
    {
        key: 'pre-mirim-3', label: 'Pré-mirim III', age: 6, group: 'pre-mirim', belts: PRE_MIRIM_BELTS,
        weights: [
            { min: 0, max: 16.2 }, { min: 16.21, max: 18.2 }, { min: 18.21, max: 21.2 },
            { min: 21.21, max: 24.3 }, { min: 24.31, max: 27.3 }, { min: 27.31, max: 30.4 },
            { min: 30.41, max: 33.4 }, { min: 33.41, max: 36.4 }, { min: 36.41, max: null },
        ],
    },
    {
        key: 'mirim-1', label: 'Mirim I', age: 7, group: 'mirim', belts: MIRIM_BELTS,
        weights: [
            { min: 0, max: 17.5 }, { min: 17.51, max: 20.5 }, { min: 20.51, max: 23.5 },
            { min: 23.51, max: 26.5 }, { min: 26.51, max: 29.5 }, { min: 29.51, max: 32.5 },
            { min: 32.51, max: 35.5 }, { min: 35.51, max: 38.5 }, { min: 38.51, max: null },
        ],
    },
    {
        key: 'mirim-2', label: 'Mirim II', age: 8, group: 'mirim', belts: MIRIM_BELTS,
        weights: [
            { min: 0, max: 20.5 }, { min: 20.51, max: 23.3 }, { min: 23.31, max: 26.3 },
            { min: 26.31, max: 29.4 }, { min: 29.41, max: 32.4 }, { min: 32.41, max: 35.4 },
            { min: 35.41, max: 38.5 }, { min: 38.51, max: 41.5 }, { min: 41.51, max: null },
        ],
    },
    {
        key: 'mirim-3', label: 'Mirim III', age: 9, group: 'mirim', belts: MIRIM_BELTS,
        weights: [
            { min: 0, max: 23.3 }, { min: 23.31, max: 26.3 }, { min: 26.31, max: 29.4 },
            { min: 29.41, max: 32.4 }, { min: 32.41, max: 35.4 }, { min: 35.41, max: 38.5 },
            { min: 38.51, max: 41.5 }, { min: 41.51, max: 44.5 }, { min: 44.51, max: null },
        ],
    },
    {
        key: 'infantil-1', label: 'Infantil I', age: 10, group: 'infantil', belts: INFANTIL_BELTS,
        weights: [
            { min: 0, max: 26.3 }, { min: 26.31, max: 29.4 }, { min: 29.41, max: 32.4 },
            { min: 32.41, max: 35.4 }, { min: 35.41, max: 38.5 }, { min: 38.51, max: 41.5 },
            { min: 41.51, max: 44.5 }, { min: 44.51, max: 47.5 }, { min: 47.51, max: null },
        ],
    },
    {
        key: 'infantil-2', label: 'Infantil II', age: 11, group: 'infantil', belts: INFANTIL_BELTS,
        weights: [
            { min: 0, max: 29.4 }, { min: 29.41, max: 32.4 }, { min: 32.41, max: 35.4 },
            { min: 35.41, max: 38.5 }, { min: 38.51, max: 41.5 }, { min: 41.51, max: 44.5 },
            { min: 44.51, max: 47.5 }, { min: 47.51, max: 51.1 }, { min: 51.11, max: null },
        ],
    },
    {
        key: 'infantil-3', label: 'Infantil III', age: 12, group: 'infantil', belts: INFANTIL_BELTS,
        weights: [
            { min: 0, max: 31.4 }, { min: 31.41, max: 35.4 }, { min: 35.41, max: 39.5 },
            { min: 39.51, max: 43.5 }, { min: 43.51, max: 47.5 }, { min: 47.51, max: 52.1 },
            { min: 52.11, max: 56.1 }, { min: 56.11, max: 60.1 }, { min: 60.11, max: null },
        ],
    },
    {
        key: 'infantojuv-1', label: 'Infantojuvenil I', age: 13, group: 'infantojuv', belts: INFANTOJUV_BELTS,
        weights: [
            { min: 0, max: 35.4 }, { min: 35.41, max: 39.5 }, { min: 39.51, max: 43.5 },
            { min: 43.51, max: 47.5 }, { min: 47.51, max: 52.1 }, { min: 52.11, max: 56.1 },
            { min: 56.11, max: 60.1 }, { min: 60.11, max: 64.2 }, { min: 64.21, max: null },
        ],
    },
    {
        key: 'infantojuv-2', label: 'Infantojuvenil II', age: 14, group: 'infantojuv', belts: INFANTOJUV_BELTS,
        weights: [
            { min: 0, max: 39.5 }, { min: 39.51, max: 43.5 }, { min: 43.51, max: 47.5 },
            { min: 47.51, max: 52.1 }, { min: 52.11, max: 56.1 }, { min: 56.11, max: 60.1 },
            { min: 60.11, max: 64.2 }, { min: 64.21, max: 68.2 }, { min: 68.21, max: null },
        ],
    },
    {
        key: 'infantojuv-3', label: 'Infantojuvenil III', age: 15, group: 'infantojuv', belts: INFANTOJUV_BELTS,
        weights: [
            { min: 0, max: 43.5 }, { min: 43.51, max: 47.5 }, { min: 47.51, max: 52.1 },
            { min: 52.11, max: 56.1 }, { min: 56.11, max: 60.1 }, { min: 60.11, max: 64.2 },
            { min: 64.21, max: 68.2 }, { min: 68.21, max: 72.2 }, { min: 72.21, max: null },
        ],
    },
];

export const KIDS_GROUPS: { key: KidsAgeGroup; label: string; sub: string }[] = [
    { key: 'pre-mirim', label: 'Pré-mirim', sub: '4 a 6 anos' },
    { key: 'mirim', label: 'Mirim', sub: '7 a 9 anos' },
    { key: 'infantil', label: 'Infantil', sub: '10 a 12 anos' },
    { key: 'infantojuv', label: 'Infantojuvenil', sub: '13 a 15 anos' },
];

export function getBelt(key: KidsBeltKey): KidsBelt {
    return KIDS_BELTS.find((b) => b.key === key) ?? KIDS_BELTS[0];
}
