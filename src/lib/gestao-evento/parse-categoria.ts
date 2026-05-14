export type CategoriaParsed = {
    grupo: string;
    idade: string;
    genero: string;
    faixa: string;
    peso: string;
    modalidade: string;
};

export function parseCategoria(name: string): CategoriaParsed {
    const parts = name.split(' • ').map((p) => p.trim());
    if (parts.length === 4 && parts[2]?.toLowerCase().includes('absoluto')) {
        return {
            grupo: 'Absoluto',
            idade: '',
            genero: parts[0] || '',
            faixa: parts[1] || '',
            peso: parts[2] || '',
            modalidade: parts[3] || '',
        };
    }
    return {
        grupo: parts[0] || '',
        idade: parts[1] || '',
        genero: parts[2] || '',
        faixa: parts[3] || '',
        peso: parts[4] || '',
        modalidade: parts[5] || '',
    };
}

const FAIXA_ORDER = [
    'Branca',
    'Cinza',
    'Amarela',
    'Laranja',
    'Verde',
    'Azul',
    'Roxa',
    'Marrom',
    'Preta',
];

export function faixaSortKey(faixa: string): number {
    const lower = faixa.toLowerCase();
    for (let i = 0; i < FAIXA_ORDER.length; i++) {
        if (lower.startsWith(FAIXA_ORDER[i].toLowerCase())) return i;
    }
    return 99;
}

export function divisaoSortKey(grupo: string, idade: string): number {
    const m = idade.match(/(\d+)/);
    if (m) return parseInt(m[1], 10);
    const lower = grupo.toLowerCase();
    if (lower.includes('pré-mirim')) return 4;
    if (lower.includes('mirim')) return 7;
    if (lower.includes('infantojuvenil')) return 13;
    if (lower.includes('infantil')) return 10;
    if (lower.includes('juvenil')) return 16;
    if (lower.includes('adulto')) return 18;
    if (lower.includes('master')) return 30;
    return 99;
}

export type SuperDivisao = 'kids' | 'juvenil' | 'adulto' | 'master' | 'absoluto' | 'outro';

export const SUPER_DIVISAO_LABELS: Record<SuperDivisao, string> = {
    kids: 'Kids',
    juvenil: 'Juvenil',
    adulto: 'Adulto',
    master: 'Master',
    absoluto: 'Absoluto',
    outro: 'Outros',
};

export const SUPER_DIVISAO_ORDER: SuperDivisao[] = [
    'kids',
    'juvenil',
    'adulto',
    'master',
    'absoluto',
    'outro',
];

export type ModalidadeKey = 'kimono' | 'nogi';

export const MODALIDADE_LABELS: Record<ModalidadeKey, string> = {
    kimono: 'Kimono',
    nogi: 'No-Gi',
};

export function getModalidadeKey(modalidade: string): ModalidadeKey {
    const lower = modalidade.toLowerCase().trim();
    if (lower === 'kimono' || lower === 'com kimono' || lower === 'gi') return 'kimono';
    return 'nogi';
}

export function getSuperDivisao(grupo: string): SuperDivisao {
    const lower = grupo.toLowerCase();
    if (lower === 'absoluto') return 'absoluto';
    if (lower.includes('pré-mirim') || lower.includes('pre-mirim')) return 'kids';
    if (lower.includes('mirim')) return 'kids';
    if (lower.includes('infantojuvenil')) return 'juvenil';
    if (lower.includes('infantil')) return 'kids';
    if (lower.includes('juvenil')) return 'juvenil';
    if (lower.includes('adulto')) return 'adulto';
    if (lower.includes('master')) return 'master';
    return 'outro';
}

export type FaixaColor = {
    bg: string;
    border: string;
    text: string;
    activeBg: string;
    activeBorder: string;
    activeText: string;
};

export function getFaixaColor(faixa: string): FaixaColor {
    const lower = faixa.toLowerCase();
    if (lower.startsWith('branca')) {
        return {
            bg: 'bg-zinc-50',
            border: 'border-zinc-300',
            text: 'text-zinc-700',
            activeBg: 'bg-zinc-100',
            activeBorder: 'border-zinc-500',
            activeText: 'text-zinc-900',
        };
    }
    if (lower.startsWith('cinza')) {
        return {
            bg: 'bg-slate-100',
            border: 'border-slate-300',
            text: 'text-slate-700',
            activeBg: 'bg-slate-200',
            activeBorder: 'border-slate-500',
            activeText: 'text-slate-900',
        };
    }
    if (lower.startsWith('amarela')) {
        return {
            bg: 'bg-yellow-50',
            border: 'border-yellow-400',
            text: 'text-yellow-800',
            activeBg: 'bg-yellow-100',
            activeBorder: 'border-yellow-600',
            activeText: 'text-yellow-900',
        };
    }
    if (lower.startsWith('laranja')) {
        return {
            bg: 'bg-orange-50',
            border: 'border-orange-400',
            text: 'text-orange-800',
            activeBg: 'bg-orange-100',
            activeBorder: 'border-orange-600',
            activeText: 'text-orange-900',
        };
    }
    if (lower.startsWith('verde')) {
        return {
            bg: 'bg-green-50',
            border: 'border-green-400',
            text: 'text-green-800',
            activeBg: 'bg-green-100',
            activeBorder: 'border-green-600',
            activeText: 'text-green-900',
        };
    }
    if (lower.startsWith('azul')) {
        return {
            bg: 'bg-blue-50',
            border: 'border-blue-400',
            text: 'text-blue-800',
            activeBg: 'bg-blue-100',
            activeBorder: 'border-blue-600',
            activeText: 'text-blue-900',
        };
    }
    if (lower.startsWith('roxa')) {
        return {
            bg: 'bg-violet-50',
            border: 'border-violet-400',
            text: 'text-violet-800',
            activeBg: 'bg-violet-100',
            activeBorder: 'border-violet-600',
            activeText: 'text-violet-900',
        };
    }
    if (lower.startsWith('marrom')) {
        return {
            bg: 'bg-amber-50',
            border: 'border-amber-700',
            text: 'text-amber-900',
            activeBg: 'bg-amber-100',
            activeBorder: 'border-amber-800',
            activeText: 'text-amber-950',
        };
    }
    if (lower.startsWith('preta')) {
        return {
            bg: 'bg-zinc-900/5',
            border: 'border-zinc-700',
            text: 'text-zinc-900',
            activeBg: 'bg-zinc-900',
            activeBorder: 'border-zinc-900',
            activeText: 'text-white',
        };
    }
    return {
        bg: 'bg-muted/40',
        border: 'border-muted-foreground/30',
        text: 'text-muted-foreground',
        activeBg: 'bg-muted',
        activeBorder: 'border-muted-foreground',
        activeText: 'text-foreground',
    };
}
