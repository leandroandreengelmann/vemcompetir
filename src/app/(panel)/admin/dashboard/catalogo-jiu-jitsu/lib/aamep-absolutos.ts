// Demo estático Absolutos AAMEP — não conectado ao banco.
// Tabela própria de Absolutos (separada das categorias por peso).

export type AamepAbsolutoEntry = {
    key: string;
    label: string;
    max: number | null; // null = livre
    fightTime: string;
};

export type AamepAbsolutoGroup = {
    key: string;
    faixaEtaria: string;
    genero: 'masculino' | 'feminino';
    entries: AamepAbsolutoEntry[];
};

export const AAMEP_ABSOLUTOS: AamepAbsolutoGroup[] = [
    {
        key: 'adulto-m',
        faixaEtaria: 'Adulto',
        genero: 'masculino',
        entries: [
            { key: 'absoluto-livre', label: 'Absoluto Livre', max: null, fightTime: '6 min' },
        ],
    },
    {
        key: 'adulto-f',
        faixaEtaria: 'Adulto',
        genero: 'feminino',
        entries: [
            { key: 'absoluto-livre', label: 'Absoluto Livre', max: null, fightTime: '6 min' },
        ],
    },
    {
        key: 'juvenil-m',
        faixaEtaria: 'Juvenil (14 a 17 anos)',
        genero: 'masculino',
        entries: [
            { key: 'ate-65', label: 'Absoluto até 65 kg', max: 65.0, fightTime: '5 min' },
            { key: 'ate-82', label: 'Absoluto até 82 kg', max: 82.0, fightTime: '5 min' },
        ],
    },
    {
        key: 'juvenil-f',
        faixaEtaria: 'Juvenil (14 a 17 anos)',
        genero: 'feminino',
        entries: [
            { key: 'ate-60', label: 'Absoluto até 60 kg', max: 60.0, fightTime: '5 min' },
            { key: 'ate-80', label: 'Absoluto até 80 kg', max: 80.0, fightTime: '5 min' },
        ],
    },
    {
        key: 'master-m',
        faixaEtaria: 'Master',
        genero: 'masculino',
        entries: [
            { key: 'absoluto-livre', label: 'Absoluto Livre', max: null, fightTime: '5 min' },
        ],
    },
];
