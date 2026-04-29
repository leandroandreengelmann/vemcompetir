// Demo estático Infantil No-Gi IBJJF/CBJJ — não conectado ao banco.
// Estrutura própria do No-Gi: 6 grupos pareados, 6 faixas simples (Branca → Azul),
// 12 categorias de peso (inclui Extra Pesadíssimo 1/2/3). Não compartilha shape com o Gi.

export type KidsNogiBeltKey = 'branca' | 'cinza' | 'amarela' | 'laranja' | 'verde' | 'azul';

export type KidsNogiBelt = {
    key: KidsNogiBeltKey;
    label: string;
    dot: string;
};

export const KIDS_NOGI_BELTS: KidsNogiBelt[] = [
    { key: 'branca', label: 'Branca', dot: 'bg-white border-zinc-300' },
    { key: 'cinza', label: 'Cinza', dot: 'bg-zinc-400 border-zinc-500' },
    { key: 'amarela', label: 'Amarela', dot: 'bg-yellow-400 border-yellow-500' },
    { key: 'laranja', label: 'Laranja', dot: 'bg-orange-500 border-orange-600' },
    { key: 'verde', label: 'Verde', dot: 'bg-green-600 border-green-700' },
    { key: 'azul', label: 'Azul', dot: 'bg-blue-500 border-blue-600' },
];

export type KidsNogiWeightKey =
    | 'galo' | 'pluma' | 'pena' | 'leve' | 'medio' | 'meio-pesado'
    | 'pesado' | 'super-pesado' | 'pesadissimo'
    | 'extra-pesadissimo' | 'extra-pesadissimo-2' | 'extra-pesadissimo-3';

export type KidsNogiWeight = {
    key: KidsNogiWeightKey;
    name: string;
    min: number;
    max: number | null;
};

export type KidsNogiAgeGroupKey =
    | 'pre-mirim' | 'mirim-little' | 'infantil-a' | 'infantil-b'
    | 'infanto-juvenil-a' | 'infanto-juvenil-b';

export type KidsNogiAge = {
    key: KidsNogiAgeGroupKey;
    label: string;
    ageRange: string;
    ageFrom: number;
    ageTo: number;
    belts: KidsNogiBeltKey[];
    weights: { masculino: KidsNogiWeight[]; feminino: KidsNogiWeight[] };
};

const W_NAMES: { key: KidsNogiWeightKey; name: string }[] = [
    { key: 'galo', name: 'Galo' },
    { key: 'pluma', name: 'Pluma' },
    { key: 'pena', name: 'Pena' },
    { key: 'leve', name: 'Leve' },
    { key: 'medio', name: 'Médio' },
    { key: 'meio-pesado', name: 'Meio Pesado' },
    { key: 'pesado', name: 'Pesado' },
    { key: 'super-pesado', name: 'Super Pesado' },
    { key: 'pesadissimo', name: 'Pesadíssimo' },
    { key: 'extra-pesadissimo', name: 'Extra Pesadíssimo' },
    { key: 'extra-pesadissimo-2', name: 'Extra Pesadíssimo 2' },
    { key: 'extra-pesadissimo-3', name: 'Extra Pesadíssimo 3' },
];

function mkWeights(values: Array<[number, number | null]>): KidsNogiWeight[] {
    return W_NAMES.map((w, i) => ({ key: w.key, name: w.name, min: values[i][0], max: values[i][1] }));
}

export const KIDS_NOGI_AGES: KidsNogiAge[] = [
    {
        key: 'pre-mirim',
        label: 'Pré-mirim',
        ageRange: '4–5',
        ageFrom: 4,
        ageTo: 5,
        belts: ['branca', 'cinza'],
        weights: {
            masculino: mkWeights([
                [0, 16.5], [16.51, 18.5], [18.51, 21.5], [21.51, 24.5],
                [24.51, 27.5], [27.51, 30.5], [30.51, 33.5], [33.51, 36.5],
                [36.51, 41.5], [41.51, 44.0], [44.01, 48.0], [48.01, null],
            ]),
            feminino: mkWeights([
                [0, 14.5], [14.51, 16.5], [16.51, 19.5], [19.51, 22.5],
                [22.51, 25.5], [25.51, 28.5], [28.51, 31.5], [31.51, 34.5],
                [34.51, 37.5], [37.51, 42.0], [42.01, 46.0], [46.01, null],
            ]),
        },
    },
    {
        key: 'mirim-little',
        label: 'Mirim/Little',
        ageRange: '6–7',
        ageFrom: 6,
        ageTo: 7,
        belts: ['branca', 'cinza', 'amarela'],
        weights: {
            masculino: mkWeights([
                [0, 17.5], [17.51, 19.5], [19.51, 22.5], [22.51, 25.5],
                [25.51, 28.5], [28.51, 31.5], [31.51, 34.5], [34.51, 37.5],
                [37.51, 42.5], [42.51, 49.0], [49.01, 55.0], [55.01, null],
            ]),
            feminino: mkWeights([
                [0, 15.5], [15.51, 17.5], [17.51, 20.5], [20.51, 23.5],
                [23.51, 26.5], [26.51, 29.5], [29.51, 32.5], [32.51, 35.5],
                [35.51, 38.5], [38.51, 43.0], [43.01, 47.0], [47.01, null],
            ]),
        },
    },
    {
        key: 'infantil-a',
        label: 'Infantil A',
        ageRange: '8–9',
        ageFrom: 8,
        ageTo: 9,
        belts: ['branca', 'cinza', 'amarela', 'laranja'],
        weights: {
            masculino: mkWeights([
                [0, 22.5], [22.51, 25.5], [25.51, 28.5], [28.51, 31.5],
                [31.51, 34.5], [34.51, 37.5], [37.51, 40.5], [40.51, 43.5],
                [43.51, 48.5], [48.51, 56.0], [56.01, 63.0], [63.01, null],
            ]),
            feminino: mkWeights([
                [0, 17.5], [17.51, 19.5], [19.51, 22.5], [22.51, 25.5],
                [25.51, 28.5], [28.51, 31.5], [31.51, 34.5], [34.51, 37.5],
                [37.51, 41.5], [41.51, 45.5], [45.51, 51.0], [51.01, null],
            ]),
        },
    },
    {
        key: 'infantil-b',
        label: 'Infantil B',
        ageRange: '10–11',
        ageFrom: 10,
        ageTo: 11,
        belts: ['branca', 'cinza', 'amarela', 'laranja'],
        weights: {
            masculino: mkWeights([
                [0, 28.5], [28.51, 31.5], [31.51, 34.5], [34.51, 37.5],
                [37.51, 40.5], [40.51, 43.5], [43.51, 46.5], [46.51, 49.5],
                [49.51, 53.5], [53.51, 58.8], [58.81, 65.8], [65.81, null],
            ]),
            feminino: mkWeights([
                [0, 22.5], [22.51, 25.5], [25.51, 28.5], [28.51, 31.5],
                [31.51, 34.5], [34.51, 37.5], [37.51, 40.5], [40.51, 43.5],
                [43.51, 46.5], [46.51, 51.8], [51.81, 58.8], [58.81, null],
            ]),
        },
    },
    {
        key: 'infanto-juvenil-a',
        label: 'Infanto Juvenil A',
        ageRange: '12–13',
        ageFrom: 12,
        ageTo: 13,
        belts: ['branca', 'cinza', 'amarela', 'laranja', 'verde'],
        weights: {
            masculino: mkWeights([
                [0, 33.5], [33.51, 37.5], [37.51, 41.5], [41.51, 45.5],
                [45.51, 49.5], [49.51, 53.5], [53.51, 57.5], [57.51, 61.5],
                [61.51, 65.5], [65.51, 69.5], [69.51, 76.5], [76.51, null],
            ]),
            feminino: mkWeights([
                [0, 28.5], [28.51, 31.5], [31.51, 34.5], [34.51, 37.5],
                [37.51, 40.5], [40.51, 43.5], [43.51, 46.5], [46.51, 49.5],
                [49.51, 52.5], [52.51, 57.5], [57.51, 63.5], [63.51, null],
            ]),
        },
    },
    {
        key: 'infanto-juvenil-b',
        label: 'Infanto Juvenil B',
        ageRange: '14–15',
        ageFrom: 14,
        ageTo: 15,
        belts: ['branca', 'cinza', 'amarela', 'laranja', 'verde', 'azul'],
        weights: {
            masculino: mkWeights([
                [0, 42.5], [42.51, 46.5], [46.51, 50.5], [50.51, 54.5],
                [54.51, 58.5], [58.51, 62.5], [62.51, 66.5], [66.51, 70.5],
                [70.51, 74.5], [74.51, 79.5], [79.51, 87.5], [87.51, null],
            ]),
            feminino: mkWeights([
                [0, 34.5], [34.51, 38.5], [38.51, 42.5], [42.51, 46.5],
                [46.51, 50.5], [50.51, 54.5], [54.51, 58.5], [58.51, 62.5],
                [62.51, 66.5], [66.51, 69.5], [69.51, 76.5], [76.51, null],
            ]),
        },
    },
];

export function getNogiBelt(key: KidsNogiBeltKey): KidsNogiBelt {
    return KIDS_NOGI_BELTS.find((b) => b.key === key) ?? KIDS_NOGI_BELTS[0];
}

export function getNogiWeights(age: KidsNogiAge, genero: 'masculino' | 'feminino'): KidsNogiWeight[] {
    return age.weights[genero];
}
