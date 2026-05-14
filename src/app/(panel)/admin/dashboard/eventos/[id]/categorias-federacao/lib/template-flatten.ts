// Helpers para "achatar" templates de federação em uma lista plana de
// categorias editáveis pelo evento (em memória, fase A — sem banco).

import {
    AAMEP_ADULTO,
    AAMEP_ADULTO_BELTS,
    getAamepAdultoWeights,
} from '@/app/(panel)/admin/dashboard/catalogo-jiu-jitsu/lib/aamep-adulto';
import {
    AAMEP_JUVENIL,
    AAMEP_JUVENIL_BELTS,
    getAamepJuvenilWeights,
} from '@/app/(panel)/admin/dashboard/catalogo-jiu-jitsu/lib/aamep-juvenil';
import {
    AAMEP_MASTER,
    AAMEP_MASTER_AGES,
    AAMEP_MASTER_BELTS,
} from '@/app/(panel)/admin/dashboard/catalogo-jiu-jitsu/lib/aamep-master';
import {
    AAMEP_KIDS_AGES,
    AAMEP_KIDS_BELTS,
    getAamepKidsWeights,
} from '@/app/(panel)/admin/dashboard/catalogo-jiu-jitsu/lib/aamep-kids';
import { AAMEP_ABSOLUTOS } from '@/app/(panel)/admin/dashboard/catalogo-jiu-jitsu/lib/aamep-absolutos';
import {
    ADULT_MALE_BELTS,
    ADULT_MALE_WEIGHTS,
    formatWeightRange,
} from '@/app/(panel)/admin/dashboard/catalogo-jiu-jitsu/lib/adulto-masculino';
import { ADULT_FEMALE_WEIGHTS } from '@/app/(panel)/admin/dashboard/catalogo-jiu-jitsu/lib/adulto-feminino';
import {
    MASTER_AGES,
    MASTER_BELTS,
    getMasterWeights,
} from '@/app/(panel)/admin/dashboard/catalogo-jiu-jitsu/lib/master';
import {
    JUVENIL_AGES,
    JUVENIL_BELTS,
    getJuvenilWeights,
} from '@/app/(panel)/admin/dashboard/catalogo-jiu-jitsu/lib/juvenil';
import { KIDS_AGES, KIDS_BELTS } from '@/app/(panel)/admin/dashboard/catalogo-jiu-jitsu/lib/infantil';
import {
    KIDS_NOGI_AGES,
    KIDS_NOGI_BELTS,
    getNogiWeights,
} from '@/app/(panel)/admin/dashboard/catalogo-jiu-jitsu/lib/infantil-nogi';

// Helpers de idade em anos
function masterAgeYears(age: { minAge: number; maxAge: number | null }): string {
    return age.maxAge === null ? `${age.minAge}+ anos` : `${age.minAge}–${age.maxAge} anos`;
}
function aamepAbsolutoAgeYears(faixaEtaria: string): string {
    if (faixaEtaria === 'Adulto') return '18+ anos';
    if (faixaEtaria === 'Master') return '30+ anos';
    const m = faixaEtaria.match(/\((\d+)\s*a\s*(\d+)\s*anos\)/i);
    if (m) return `${m[1]}–${m[2]} anos`;
    return faixaEtaria;
}

export type Genero = 'masculino' | 'feminino';
export type Federacao = 'aamep' | 'ibjjf';
export type Modalidade = 'gi' | 'nogi';
export type Grupo = 'adulto' | 'juvenil' | 'master' | 'kids' | 'absolutos';

// Categoria do evento — modelo unificado (linha plana).
// Quando `beltKeys.length > 1` ou `ageKeys.length > 1`, é uma categoria mesclada.
// `isAbsoluto = true` significa "Open Class": faixas são definidas pelo organizador
// (no AAMEP começam vazias; no IBJJF herdam do template mas podem ser editadas).
export type EventoCategoria = {
    id: string;
    federacao: Federacao;
    modalidade: Modalidade;
    grupo: Grupo;
    ativa: boolean;
    label: string;
    genero: Genero;
    ageKeys: string[];
    ageLabels: string[];
    ageYears: string[];
    beltKeys: string[];
    beltLabels: string[];
    weightKey: string;
    weightName: string;
    range: string;
    pesoMin: number;
    pesoMax: number | null;
    fightTime: string;
    valorInscricao: number | null;
    isAbsoluto: boolean;
    origemTemplateIds: string[];
};

const GENERO_LABEL: Record<Genero, string> = { masculino: 'Masculino', feminino: 'Feminino' };
const MOD_LABEL: Record<Modalidade, string> = { gi: 'Kimono', nogi: 'No-Gi' };

// ============================================================================
// AAMEP — só Gi.
// ============================================================================

export function flattenAamepAdulto(genero: Genero): EventoCategoria[] {
    const weights = getAamepAdultoWeights(genero);
    const list: EventoCategoria[] = [];
    for (const belt of AAMEP_ADULTO_BELTS) {
        for (const w of weights) {
            const range = formatWeightRange(w.range.min, w.range.max);
            const tplId = `aamep-gi-adulto-${genero}-${belt.key}-${w.key}`;
            list.push({
                id: tplId,
                federacao: 'aamep',
                modalidade: 'gi',
                grupo: 'adulto',
                ativa: true,
                label: `Adulto • ${GENERO_LABEL[genero]} • ${belt.label} • ${w.name} (${range}) • Kimono`,
                genero,
                ageKeys: ['adulto'],
                ageLabels: ['Adulto'],
                ageYears: ['18+ anos'],
                beltKeys: [belt.key],
                beltLabels: [belt.label],
                weightKey: w.key,
                weightName: w.name,
                range,
                pesoMin: w.range.min,
                pesoMax: w.range.max,
                fightTime: AAMEP_ADULTO.fightTime,
                valorInscricao: null,
                isAbsoluto: false,
                origemTemplateIds: [tplId],
            });
        }
    }
    return list;
}

export function flattenAamepJuvenil(genero: Genero): EventoCategoria[] {
    const weights = getAamepJuvenilWeights(genero);
    const list: EventoCategoria[] = [];
    for (const belt of AAMEP_JUVENIL_BELTS) {
        for (const w of weights) {
            const range = formatWeightRange(w.range.min, w.range.max);
            const tplId = `aamep-gi-juvenil-${genero}-${belt.key}-${w.key}`;
            list.push({
                id: tplId,
                federacao: 'aamep',
                modalidade: 'gi',
                grupo: 'juvenil',
                ativa: true,
                label: `Juvenil • ${GENERO_LABEL[genero]} • ${belt.label} • ${w.name} (${range}) • Kimono`,
                genero,
                ageKeys: ['juvenil'],
                ageLabels: ['Juvenil'],
                ageYears: ['14–17 anos'],
                beltKeys: [belt.key],
                beltLabels: [belt.label],
                weightKey: w.key,
                weightName: w.name,
                range,
                pesoMin: w.range.min,
                pesoMax: w.range.max,
                fightTime: AAMEP_JUVENIL.fightTime,
                valorInscricao: null,
                isAbsoluto: false,
                origemTemplateIds: [tplId],
            });
        }
    }
    return list;
}

// AAMEP Master é apenas Masculino.
export function flattenAamepMaster(): EventoCategoria[] {
    const list: EventoCategoria[] = [];
    for (const age of AAMEP_MASTER_AGES) {
        for (const belt of AAMEP_MASTER_BELTS) {
            for (const w of age.weights) {
                const range = formatWeightRange(w.range.min, w.range.max);
                const tplId = `aamep-gi-master-${age.key}-masculino-${belt.key}-${w.key}`;
                list.push({
                    id: tplId,
                    federacao: 'aamep',
                    modalidade: 'gi',
                    grupo: 'master',
                    ativa: true,
                    label: `${age.label} • Masculino • ${belt.label} • ${w.name} (${range}) • Kimono`,
                    genero: 'masculino',
                    ageKeys: [age.key],
                    ageLabels: [age.label],
                    ageYears: [age.range],
                    beltKeys: [belt.key],
                    beltLabels: [belt.label],
                    weightKey: w.key,
                    weightName: w.name,
                    range,
                    pesoMin: w.range.min,
                    pesoMax: w.range.max,
                    fightTime: AAMEP_MASTER.fightTime,
                    valorInscricao: null,
                    isAbsoluto: false,
                    origemTemplateIds: [tplId],
                });
            }
        }
    }
    return list;
}

export function flattenAamepKids(): EventoCategoria[] {
    const list: EventoCategoria[] = [];
    for (const age of AAMEP_KIDS_AGES) {
        for (const beltKey of age.belts) {
            const belt = AAMEP_KIDS_BELTS.find((b) => b.key === beltKey)!;
            for (const genero of ['masculino', 'feminino'] as const) {
                const weights = getAamepKidsWeights(age, genero);
                for (const w of weights) {
                    const range = formatWeightRange(w.range.min, w.range.max);
                    const tplId = `aamep-gi-kids-${age.key}-${genero}-${beltKey}-${w.key}`;
                    list.push({
                        id: tplId,
                        federacao: 'aamep',
                        modalidade: 'gi',
                        grupo: 'kids',
                        ativa: true,
                        label: `${age.label} • ${GENERO_LABEL[genero]} • ${belt.label} • ${w.name} (${range}) • Kimono`,
                        genero,
                        ageKeys: [age.key],
                        ageLabels: [age.label],
                        ageYears: [age.ageRange],
                        beltKeys: [beltKey],
                        beltLabels: [belt.label],
                        weightKey: w.key,
                        weightName: w.name,
                        range,
                        pesoMin: w.range.min,
                        pesoMax: w.range.max,
                        fightTime: age.fightTime,
                        valorInscricao: null,
                        isAbsoluto: false,
                        origemTemplateIds: [tplId],
                    });
                }
            }
        }
    }
    return list;
}

// Absolutos AAMEP — faixas dinâmicas (organizador escolhe por evento).
export function flattenAamepAbsolutos(): EventoCategoria[] {
    const list: EventoCategoria[] = [];
    for (const group of AAMEP_ABSOLUTOS) {
        for (const e of group.entries) {
            const range = e.max === null ? 'Sem limite' : `Até ${e.max.toFixed(1).replace('.', ',')} kg`;
            const tplId = `aamep-gi-absoluto-${group.key}-${e.key}`;
            list.push({
                id: tplId,
                federacao: 'aamep',
                modalidade: 'gi',
                grupo: 'absolutos',
                ativa: true,
                label: `${group.faixaEtaria} • ${GENERO_LABEL[group.genero]} • ${e.label} • Kimono`,
                genero: group.genero,
                ageKeys: [group.key],
                ageLabels: [group.faixaEtaria],
                ageYears: [aamepAbsolutoAgeYears(group.faixaEtaria)],
                beltKeys: [], // dinâmico — definido pelo organizador
                beltLabels: [],
                weightKey: e.key,
                weightName: e.label,
                range,
                pesoMin: 0,
                pesoMax: e.max,
                fightTime: e.fightTime,
                valorInscricao: null,
                isAbsoluto: true,
                origemTemplateIds: [tplId],
            });
        }
    }
    return list;
}

// ============================================================================
// IBJJF / CBJJ — Gi e No-Gi.
// ============================================================================

function ibjjfAdultoWeights(genero: Genero) {
    return genero === 'masculino' ? ADULT_MALE_WEIGHTS : ADULT_FEMALE_WEIGHTS;
}

export function flattenIbjjfAdulto(genero: Genero, modalidade: Modalidade): EventoCategoria[] {
    const list: EventoCategoria[] = [];
    const weights = ibjjfAdultoWeights(genero).filter((w) => w.key !== 'absoluto');
    const absoluto = ibjjfAdultoWeights(genero).find((w) => w.key === 'absoluto')!;
    for (const belt of ADULT_MALE_BELTS) {
        for (const w of weights) {
            const r = w[modalidade];
            const range = formatWeightRange(r.min, r.max);
            const tplId = `ibjjf-${modalidade}-adulto-${genero}-${belt.key}-${w.key}`;
            list.push({
                id: tplId,
                federacao: 'ibjjf',
                modalidade,
                grupo: 'adulto',
                ativa: true,
                label: `Adulto • ${GENERO_LABEL[genero]} • ${belt.label} • ${w.name} (${range}) • ${MOD_LABEL[modalidade]}`,
                genero,
                ageKeys: ['adulto'],
                ageLabels: ['Adulto'],
                ageYears: ['18+ anos'],
                beltKeys: [belt.key],
                beltLabels: [belt.label],
                weightKey: w.key,
                weightName: w.name,
                range,
                pesoMin: r.min,
                pesoMax: r.max,
                fightTime: belt.key === 'preta' ? '10 min' : belt.key === 'marrom' ? '8 min' : belt.key === 'roxa' ? '7 min' : belt.key === 'azul' ? '6 min' : '5 min',
                valorInscricao: null,
                isAbsoluto: false,
                origemTemplateIds: [tplId],
            });
        }
        // Open class por faixa
        const tplId = `ibjjf-${modalidade}-adulto-${genero}-${belt.key}-absoluto`;
        list.push({
            id: tplId,
            federacao: 'ibjjf',
            modalidade,
            grupo: 'absolutos',
            ativa: true,
            label: `Adulto • ${GENERO_LABEL[genero]} • ${belt.label} • Absoluto • ${MOD_LABEL[modalidade]}`,
            genero,
            ageKeys: ['adulto'],
            ageLabels: ['Adulto'],
            ageYears: ['18+ anos'],
            beltKeys: [belt.key],
            beltLabels: [belt.label],
            weightKey: 'absoluto',
            weightName: 'Absoluto',
            range: 'Sem limite',
            pesoMin: absoluto[modalidade].min,
            pesoMax: absoluto[modalidade].max,
            fightTime: belt.key === 'preta' ? '10 min' : '6 min',
            valorInscricao: null,
            isAbsoluto: true,
            origemTemplateIds: [tplId],
        });
    }
    return list;
}

export function flattenIbjjfJuvenil(genero: Genero, modalidade: Modalidade): EventoCategoria[] {
    const list: EventoCategoria[] = [];
    const weights = getJuvenilWeights(genero).filter((w) => w.key !== 'absoluto');
    for (const age of JUVENIL_AGES) {
        for (const belt of JUVENIL_BELTS) {
            for (const w of weights) {
                const r = w[modalidade];
                const range = formatWeightRange(r.min, r.max);
                const tplId = `ibjjf-${modalidade}-juvenil-${age.key}-${genero}-${belt.key}-${w.key}`;
                list.push({
                    id: tplId,
                    federacao: 'ibjjf',
                    modalidade,
                    grupo: 'juvenil',
                    ativa: true,
                    label: `${age.label} • ${GENERO_LABEL[genero]} • ${belt.label} • ${w.name} (${range}) • ${MOD_LABEL[modalidade]}`,
                    genero,
                    ageKeys: [age.key],
                    ageLabels: [age.label],
                    ageYears: [`${age.age} anos`],
                    beltKeys: [belt.key],
                    beltLabels: [belt.label],
                    weightKey: w.key,
                    weightName: w.name,
                    range,
                    pesoMin: r.min,
                    pesoMax: r.max,
                    fightTime: '5 min',
                    valorInscricao: null,
                    isAbsoluto: false,
                    origemTemplateIds: [tplId],
                });
            }
        }
    }
    return list;
}

export function flattenIbjjfMaster(genero: Genero, modalidade: Modalidade): EventoCategoria[] {
    const list: EventoCategoria[] = [];
    const weights = getMasterWeights(genero).filter((w) => w.key !== 'absoluto');
    for (const age of MASTER_AGES) {
        for (const belt of MASTER_BELTS) {
            for (const w of weights) {
                const r = w[modalidade];
                const range = formatWeightRange(r.min, r.max);
                const tplId = `ibjjf-${modalidade}-master-${age.key}-${genero}-${belt.key}-${w.key}`;
                list.push({
                    id: tplId,
                    federacao: 'ibjjf',
                    modalidade,
                    grupo: 'master',
                    ativa: true,
                    label: `${age.label} • ${GENERO_LABEL[genero]} • ${belt.label} • ${w.name} (${range}) • ${MOD_LABEL[modalidade]}`,
                    genero,
                    ageKeys: [age.key],
                    ageLabels: [age.label],
                    ageYears: [masterAgeYears(age)],
                    beltKeys: [belt.key],
                    beltLabels: [belt.label],
                    weightKey: w.key,
                    weightName: w.name,
                    range,
                    pesoMin: r.min,
                    pesoMax: r.max,
                    fightTime: '5 min',
                    valorInscricao: null,
                    isAbsoluto: false,
                    origemTemplateIds: [tplId],
                });
            }
        }
    }
    return list;
}

// IBJJF Infantil Gi: 12 idades individuais, faixas progressivas por grupo etário,
// ambos os gêneros (mesma tabela de pesos é compartilhada conforme CSV — os
// CSVs trazem uma única tabela por idade, então geramos M e F a partir dela).
export function flattenIbjjfInfantil(): EventoCategoria[] {
    const list: EventoCategoria[] = [];
    for (const age of KIDS_AGES) {
        for (const beltKey of age.belts) {
            const belt = KIDS_BELTS.find((b) => b.key === beltKey)!;
            for (const genero of ['masculino', 'feminino'] as const) {
                age.weights.forEach((w, idx) => {
                    const range = formatWeightRange(w.min, w.max);
                    const wKey = `peso-${idx + 1}`;
                    const wName = w.max === null ? `Acima ${w.min}` : `Até ${w.max} kg`;
                    const tplId = `ibjjf-gi-kids-${age.key}-${genero}-${beltKey}-${wKey}`;
                    list.push({
                        id: tplId,
                        federacao: 'ibjjf',
                        modalidade: 'gi',
                        grupo: 'kids',
                        ativa: true,
                        label: `${age.label} • ${GENERO_LABEL[genero]} • ${belt.label} • ${range} • Kimono`,
                        genero,
                        ageKeys: [age.key],
                        ageLabels: [age.label],
                        ageYears: [`${age.age} anos`],
                        beltKeys: [beltKey],
                        beltLabels: [belt.label],
                        weightKey: wKey,
                        weightName: wName,
                        range,
                        pesoMin: w.min,
                        pesoMax: w.max,
                        fightTime: age.group === 'pre-mirim' ? '2 min' : age.group === 'mirim' ? '3 min' : age.group === 'infantil' ? '4 min' : '4 min',
                        valorInscricao: null,
                        isAbsoluto: false,
                        origemTemplateIds: [tplId],
                    });
                });
            }
        }
    }
    return list;
}

export function flattenIbjjfInfantilNogi(): EventoCategoria[] {
    const list: EventoCategoria[] = [];
    for (const age of KIDS_NOGI_AGES) {
        for (const beltKey of age.belts) {
            const belt = KIDS_NOGI_BELTS.find((b) => b.key === beltKey)!;
            for (const genero of ['masculino', 'feminino'] as const) {
                const weights = getNogiWeights(age, genero);
                for (const w of weights) {
                    const range = formatWeightRange(w.min, w.max);
                    const tplId = `ibjjf-nogi-kids-${age.key}-${genero}-${beltKey}-${w.key}`;
                    list.push({
                        id: tplId,
                        federacao: 'ibjjf',
                        modalidade: 'nogi',
                        grupo: 'kids',
                        ativa: true,
                        label: `${age.label} • ${GENERO_LABEL[genero]} • ${belt.label} • ${w.name} (${range}) • No-Gi`,
                        genero,
                        ageKeys: [age.key],
                        ageLabels: [age.label],
                        ageYears: [age.ageFrom === age.ageTo ? `${age.ageFrom} anos` : `${age.ageFrom}–${age.ageTo} anos`],
                        beltKeys: [beltKey],
                        beltLabels: [belt.label],
                        weightKey: w.key,
                        weightName: w.name,
                        range,
                        pesoMin: w.min,
                        pesoMax: w.max,
                        fightTime: age.ageFrom <= 5 ? '2 min' : age.ageFrom <= 7 ? '3 min' : '4 min',
                        valorInscricao: null,
                        isAbsoluto: false,
                        origemTemplateIds: [tplId],
                    });
                }
            }
        }
    }
    return list;
}

// ============================================================================
// Roteador genérico — clona N grupos de uma federação de uma só vez.
// ============================================================================

export type ClonarOpts = {
    federacao: Federacao;
    modalidades: Modalidade[];
    grupos: Grupo[];
};

export function flattenTudo({ federacao, modalidades, grupos }: ClonarOpts): EventoCategoria[] {
    const out: EventoCategoria[] = [];
    if (federacao === 'aamep') {
        // AAMEP só tem Gi (independente do que vier em modalidades).
        if (grupos.includes('adulto')) {
            out.push(...flattenAamepAdulto('masculino'), ...flattenAamepAdulto('feminino'));
        }
        if (grupos.includes('juvenil')) {
            out.push(...flattenAamepJuvenil('masculino'), ...flattenAamepJuvenil('feminino'));
        }
        if (grupos.includes('master')) {
            out.push(...flattenAamepMaster());
        }
        if (grupos.includes('kids')) {
            out.push(...flattenAamepKids());
        }
        if (grupos.includes('absolutos')) {
            out.push(...flattenAamepAbsolutos());
        }
        return out;
    }
    // ibjjf — para cada modalidade pedida, gera o lote
    for (const modalidade of modalidades) {
        if (grupos.includes('adulto')) {
            out.push(
                ...flattenIbjjfAdulto('masculino', modalidade),
                ...flattenIbjjfAdulto('feminino', modalidade),
            );
        }
        if (grupos.includes('juvenil')) {
            out.push(
                ...flattenIbjjfJuvenil('masculino', modalidade),
                ...flattenIbjjfJuvenil('feminino', modalidade),
            );
        }
        if (grupos.includes('master')) {
            out.push(
                ...flattenIbjjfMaster('masculino', modalidade),
                ...flattenIbjjfMaster('feminino', modalidade),
            );
        }
        if (grupos.includes('kids')) {
            out.push(...(modalidade === 'gi' ? flattenIbjjfInfantil() : flattenIbjjfInfantilNogi()));
        }
        // IBJJF: "absolutos" do grupo 'adulto' já vêm dentro de flattenIbjjfAdulto
    }
    return out;
}

// Recria as categorias originais a partir dos `origemTemplateIds`. Usado pra
// desfazer mesclagem.
export function reconstruirOriginais(origemIds: string[], opts: ClonarOpts): EventoCategoria[] {
    const universo = flattenTudo({ ...opts, grupos: ['adulto', 'juvenil', 'master', 'kids', 'absolutos'] });
    return universo.filter((c) => origemIds.includes(c.id));
}

// ============================================================================
// Mesclagem.
// ============================================================================

// Para mesclar por FAIXA: tudo igual menos as faixas. Considera modalidade e
// peso (min/max) — assim galo adulto não casa com galo juvenil.
export function chaveFatiaPorFaixa(c: EventoCategoria): string {
    return [
        c.federacao,
        c.modalidade,
        c.grupo,
        c.genero,
        c.ageKeys.slice().sort().join(','),
        c.weightKey,
        c.pesoMin,
        c.pesoMax ?? 'open',
        c.isAbsoluto ? 'abs' : 'reg',
    ].join('|');
}

// Para mesclar por IDADE: tudo igual menos as idades.
export function chaveFatiaPorIdade(c: EventoCategoria): string {
    return [
        c.federacao,
        c.modalidade,
        c.grupo,
        c.genero,
        c.beltKeys.slice().sort().join(','),
        c.weightKey,
        c.pesoMin,
        c.pesoMax ?? 'open',
        c.isAbsoluto ? 'abs' : 'reg',
    ].join('|');
}

export function mesclarPorFaixa(cats: EventoCategoria[]): EventoCategoria {
    if (cats.length === 0) throw new Error('Nada para mesclar.');
    const base = cats[0];
    const beltKeys = Array.from(new Set(cats.flatMap((c) => c.beltKeys)));
    const beltLabels = Array.from(new Set(cats.flatMap((c) => c.beltLabels)));
    const ageDisplay = base.ageLabels.join('/');
    const generoLabel = GENERO_LABEL[base.genero];
    return {
        ...base,
        id: `merged-faixa-${beltKeys.join('-')}-${base.weightKey}-${base.genero}-${base.ageKeys.join('-')}-${Date.now()}`,
        ativa: true,
        beltKeys,
        beltLabels,
        label: `${ageDisplay} • ${generoLabel} • ${beltLabels.join('/')} • ${base.weightName} (${base.range}) • ${MOD_LABEL[base.modalidade]}`,
        origemTemplateIds: Array.from(new Set(cats.flatMap((c) => c.origemTemplateIds))),
    };
}

export function mesclarPorIdade(cats: EventoCategoria[]): EventoCategoria {
    if (cats.length === 0) throw new Error('Nada para mesclar.');
    const base = cats[0];
    const ageKeys = Array.from(new Set(cats.flatMap((c) => c.ageKeys)));
    const ageLabels = Array.from(new Set(cats.flatMap((c) => c.ageLabels)));
    const ageYears = Array.from(new Set(cats.flatMap((c) => c.ageYears)));
    const generoLabel = GENERO_LABEL[base.genero];
    return {
        ...base,
        id: `merged-idade-${base.beltKeys.join('-')}-${base.weightKey}-${base.genero}-${ageKeys.join('-')}-${Date.now()}`,
        ativa: true,
        ageKeys,
        ageLabels,
        ageYears,
        label: `${ageLabels.join('/')} • ${generoLabel} • ${base.beltLabels.join('/')} • ${base.weightName} (${base.range}) • ${MOD_LABEL[base.modalidade]}`,
        origemTemplateIds: Array.from(new Set(cats.flatMap((c) => c.origemTemplateIds))),
    };
}

export function podeMesclarPorFaixa(cats: EventoCategoria[]): boolean {
    if (cats.length < 2) return false;
    const k = chaveFatiaPorFaixa(cats[0]);
    return cats.every((c) => chaveFatiaPorFaixa(c) === k);
}

export function podeMesclarPorIdade(cats: EventoCategoria[]): boolean {
    if (cats.length < 2) return false;
    const k = chaveFatiaPorIdade(cats[0]);
    return cats.every((c) => chaveFatiaPorIdade(c) === k);
}

// ============================================================================
// Mesclagem em massa (atalho — sem precisar marcar linha por linha).
// ============================================================================

type EscopoMassa = {
    grupo: Grupo;
    genero: Genero;
    modalidade?: Modalidade | 'all';
};

// Mescla TODAS as categorias do escopo cujas faixas estão dentro do conjunto
// alvo, agrupando por chaveFatiaPorFaixa. Ex: alvo = ['branca','azul'] →
// para cada (idade,peso) do escopo, junta as linhas Branca e Azul numa só.
export function mesclarFaixasEmMassa(
    todas: EventoCategoria[],
    beltKeysAlvo: string[],
    escopo: EscopoMassa,
): { categorias: EventoCategoria[]; mescladas: number; afetadas: number } {
    if (beltKeysAlvo.length < 2) return { categorias: todas, mescladas: 0, afetadas: 0 };
    const alvoSet = new Set(beltKeysAlvo);
    const { grupo, genero, modalidade = 'all' } = escopo;

    const dentro: EventoCategoria[] = [];
    const fora: EventoCategoria[] = [];
    for (const c of todas) {
        const noEscopo =
            c.grupo === grupo &&
            c.genero === genero &&
            (modalidade === 'all' || c.modalidade === modalidade);
        if (noEscopo) dentro.push(c);
        else fora.push(c);
    }

    // Candidatas: têm faixas e todas as suas faixas estão no alvo.
    const candidatas: EventoCategoria[] = [];
    const ignoradas: EventoCategoria[] = [];
    for (const c of dentro) {
        if (c.beltKeys.length > 0 && c.beltKeys.every((k) => alvoSet.has(k))) candidatas.push(c);
        else ignoradas.push(c);
    }

    const grupos = new Map<string, EventoCategoria[]>();
    for (const c of candidatas) {
        const k = chaveFatiaPorFaixa(c);
        if (!grupos.has(k)) grupos.set(k, []);
        grupos.get(k)!.push(c);
    }

    const novas: EventoCategoria[] = [];
    let mescladas = 0;
    let afetadas = 0;
    for (const cats of grupos.values()) {
        if (cats.length >= 2) {
            novas.push(mesclarPorFaixa(cats));
            mescladas += 1;
            afetadas += cats.length;
        } else {
            novas.push(...cats);
        }
    }

    return { categorias: [...fora, ...ignoradas, ...novas], mescladas, afetadas };
}

// Mescla TODAS as categorias do escopo cujas idades estão dentro do conjunto
// alvo, agrupando por chaveFatiaPorIdade. Ex: alvo = ['master-1','master-2']
// → junta as linhas dessas duas idades em todas as combinações faixa+peso.
export function mesclarIdadesEmMassa(
    todas: EventoCategoria[],
    ageKeysAlvo: string[],
    escopo: EscopoMassa,
): { categorias: EventoCategoria[]; mescladas: number; afetadas: number } {
    if (ageKeysAlvo.length < 2) return { categorias: todas, mescladas: 0, afetadas: 0 };
    const alvoSet = new Set(ageKeysAlvo);
    const { grupo, genero, modalidade = 'all' } = escopo;

    const dentro: EventoCategoria[] = [];
    const fora: EventoCategoria[] = [];
    for (const c of todas) {
        const noEscopo =
            c.grupo === grupo &&
            c.genero === genero &&
            (modalidade === 'all' || c.modalidade === modalidade);
        if (noEscopo) dentro.push(c);
        else fora.push(c);
    }

    const candidatas: EventoCategoria[] = [];
    const ignoradas: EventoCategoria[] = [];
    for (const c of dentro) {
        if (c.ageKeys.length > 0 && c.ageKeys.every((k) => alvoSet.has(k))) candidatas.push(c);
        else ignoradas.push(c);
    }

    const grupos = new Map<string, EventoCategoria[]>();
    for (const c of candidatas) {
        const k = chaveFatiaPorIdade(c);
        if (!grupos.has(k)) grupos.set(k, []);
        grupos.get(k)!.push(c);
    }

    const novas: EventoCategoria[] = [];
    let mescladas = 0;
    let afetadas = 0;
    for (const cats of grupos.values()) {
        if (cats.length >= 2) {
            novas.push(mesclarPorIdade(cats));
            mescladas += 1;
            afetadas += cats.length;
        } else {
            novas.push(...cats);
        }
    }

    return { categorias: [...fora, ...ignoradas, ...novas], mescladas, afetadas };
}

// ============================================================================
// Mesclagem de idades unindo pesos (pra Kids onde cada idade tem tabela própria).
// Cria novos buckets de peso = união de cortes das idades selecionadas.
// ============================================================================

const MOD_LABEL_LOCAL: Record<Modalidade, string> = { gi: 'Kimono', nogi: 'No-Gi' };

export function mesclarIdadesUnindoPesos(
    todas: EventoCategoria[],
    ageKeysAlvo: string[],
    escopo: EscopoMassa,
): { categorias: EventoCategoria[]; gruposCriados: number; afetadas: number } {
    if (ageKeysAlvo.length < 2) return { categorias: todas, gruposCriados: 0, afetadas: 0 };
    const alvoSet = new Set(ageKeysAlvo);
    const { grupo, genero, modalidade = 'all' } = escopo;

    const dentro: EventoCategoria[] = [];
    const fora: EventoCategoria[] = [];
    for (const c of todas) {
        const noEscopo =
            c.grupo === grupo &&
            c.genero === genero &&
            (modalidade === 'all' || c.modalidade === modalidade);
        if (noEscopo) dentro.push(c);
        else fora.push(c);
    }

    // candidatas: linhas cujas idades estão TODAS dentro do alvo, com peso real (não absoluto)
    const candidatas: EventoCategoria[] = [];
    const ignoradas: EventoCategoria[] = [];
    for (const c of dentro) {
        const idadeOk = c.ageKeys.length > 0 && c.ageKeys.every((k) => alvoSet.has(k));
        if (idadeOk && !c.isAbsoluto) candidatas.push(c);
        else ignoradas.push(c);
    }

    // agrupa por (faixa+modalidade) — peso é IGNORADO porque vamos reconstruir
    const gruposPorFaixa = new Map<string, EventoCategoria[]>();
    for (const c of candidatas) {
        const k = `${c.federacao}|${c.modalidade}|${c.grupo}|${c.genero}|${[...c.beltKeys].sort().join('+')}`;
        if (!gruposPorFaixa.has(k)) gruposPorFaixa.set(k, []);
        gruposPorFaixa.get(k)!.push(c);
    }

    const novas: EventoCategoria[] = [];
    let gruposCriados = 0;
    let afetadas = 0;

    for (const cats of gruposPorFaixa.values()) {
        const idadesDistintas = new Set(cats.map((c) => c.ageKeys.join(',')));
        if (idadesDistintas.size < 2) {
            novas.push(...cats);
            continue;
        }

        // Une pontos de corte de peso
        const cortesSet = new Set<number>();
        let temIlimitado = false;
        for (const c of cats) {
            cortesSet.add(c.pesoMin);
            if (c.pesoMax === null) temIlimitado = true;
            else cortesSet.add(c.pesoMax);
        }
        const cortes = [...cortesSet].sort((a, b) => a - b);

        // Coleta idades únicas mantendo ordem do alvo
        const idadeKeysComb: string[] = [];
        const idadeLabelsComb: string[] = [];
        const idadeYearsComb: string[] = [];
        for (const k of ageKeysAlvo) {
            for (const c of cats) {
                const idx = c.ageKeys.indexOf(k);
                if (idx !== -1 && !idadeKeysComb.includes(k)) {
                    idadeKeysComb.push(k);
                    idadeLabelsComb.push(c.ageLabels[idx] ?? k);
                    idadeYearsComb.push(c.ageYears?.[idx] ?? '');
                    break;
                }
            }
        }

        const sample = cats[0];
        const origemAll = [...new Set(cats.flatMap((c) => c.origemTemplateIds))];
        const beltLabel = sample.beltLabels.join(' / ') || 'Sem faixa';
        const idadesLabel = idadeLabelsComb.join(' + ');

        let bucketIdx = 0;
        const totalBuckets = (cortes.length - 1) + (temIlimitado ? 1 : 0);

        for (let i = 0; i < cortes.length - 1; i++) {
            bucketIdx += 1;
            const min = cortes[i];
            const max = cortes[i + 1];
            const range = formatWeightRange(min, max);
            const wKey = `unido-${bucketIdx}-${totalBuckets}`;
            const wName = min === 0 ? `Até ${max} kg` : `Acima ${min} até ${max} kg`;
            novas.push({
                ...sample,
                id: `merged-idades-${idadeKeysComb.join('+')}-${[...sample.beltKeys].sort().join('+')}-${wKey}`,
                ativa: true,
                ageKeys: idadeKeysComb,
                ageLabels: idadeLabelsComb,
                ageYears: idadeYearsComb,
                weightKey: wKey,
                weightName: wName,
                range,
                pesoMin: min,
                pesoMax: max,
                label: `${idadesLabel} • ${GENERO_LABEL[sample.genero]} • ${beltLabel} • ${range} • ${MOD_LABEL_LOCAL[sample.modalidade]}`,
                origemTemplateIds: origemAll,
                valorInscricao: null,
            });
        }

        if (temIlimitado) {
            bucketIdx += 1;
            const min = cortes[cortes.length - 1];
            const range = formatWeightRange(min, null);
            const wKey = `unido-${bucketIdx}-${totalBuckets}`;
            const wName = `Acima ${min} kg`;
            novas.push({
                ...sample,
                id: `merged-idades-${idadeKeysComb.join('+')}-${[...sample.beltKeys].sort().join('+')}-${wKey}`,
                ativa: true,
                ageKeys: idadeKeysComb,
                ageLabels: idadeLabelsComb,
                ageYears: idadeYearsComb,
                weightKey: wKey,
                weightName: wName,
                range,
                pesoMin: min,
                pesoMax: null,
                label: `${idadesLabel} • ${GENERO_LABEL[sample.genero]} • ${beltLabel} • ${range} • ${MOD_LABEL_LOCAL[sample.modalidade]}`,
                origemTemplateIds: origemAll,
                valorInscricao: null,
            });
        }

        gruposCriados += 1;
        afetadas += cats.length;
    }

    return { categorias: [...fora, ...ignoradas, ...novas], gruposCriados, afetadas };
}

// ============================================================================
// Desativação em massa por cor de faixa.
// ============================================================================

// Desativa toda categoria do escopo cujas faixas tocam o conjunto alvo.
// Ex: alvo=['amarela','preta'] → desativa qualquer linha que tenha amarela
// OU preta, inclusive linhas mescladas que contenham essas cores.
export function desativarFaixasEmMassa(
    todas: EventoCategoria[],
    beltKeysAlvo: string[],
    escopo: EscopoMassa,
): { categorias: EventoCategoria[]; afetadas: number } {
    if (beltKeysAlvo.length === 0) return { categorias: todas, afetadas: 0 };
    const alvoSet = new Set(beltKeysAlvo);
    const { grupo, genero, modalidade = 'all' } = escopo;
    let afetadas = 0;
    const categorias = todas.map((c) => {
        const noEscopo =
            c.grupo === grupo &&
            c.genero === genero &&
            (modalidade === 'all' || c.modalidade === modalidade);
        if (!noEscopo) return c;
        if (!c.ativa) return c;
        const toca = c.beltKeys.some((k) => alvoSet.has(k));
        if (!toca) return c;
        afetadas += 1;
        return { ...c, ativa: false };
    });
    return { categorias, afetadas };
}

// Reativa toda categoria do escopo cujas faixas tocam o conjunto alvo.
export function reativarFaixasEmMassa(
    todas: EventoCategoria[],
    beltKeysAlvo: string[],
    escopo: EscopoMassa,
): { categorias: EventoCategoria[]; afetadas: number } {
    if (beltKeysAlvo.length === 0) return { categorias: todas, afetadas: 0 };
    const alvoSet = new Set(beltKeysAlvo);
    const { grupo, genero, modalidade = 'all' } = escopo;
    let afetadas = 0;
    const categorias = todas.map((c) => {
        const noEscopo =
            c.grupo === grupo &&
            c.genero === genero &&
            (modalidade === 'all' || c.modalidade === modalidade);
        if (!noEscopo) return c;
        if (c.ativa) return c;
        const toca = c.beltKeys.some((k) => alvoSet.has(k));
        if (!toca) return c;
        afetadas += 1;
        return { ...c, ativa: true };
    });
    return { categorias, afetadas };
}

// ============================================================================
// Helpers de UI.
// ============================================================================

export const GRUPO_LABEL: Record<Grupo, string> = {
    adulto: 'Adulto',
    juvenil: 'Juvenil',
    master: 'Master',
    kids: 'Kids',
    absolutos: 'Absolutos',
};

// Faixas disponíveis por grupo/federação — usado pra atribuir faixas a
// absolutos AAMEP (que começam vazios).
export function faixasDisponiveis(c: EventoCategoria): { key: string; label: string }[] {
    if (c.federacao === 'aamep') {
        if (c.grupo === 'kids') return AAMEP_KIDS_BELTS.map((b) => ({ key: b.key, label: b.label }));
        if (c.grupo === 'juvenil') return AAMEP_JUVENIL_BELTS.map((b) => ({ key: b.key, label: b.label }));
        return AAMEP_ADULTO_BELTS.map((b) => ({ key: b.key, label: b.label }));
    }
    // ibjjf
    if (c.grupo === 'kids') {
        if (c.modalidade === 'nogi') return KIDS_NOGI_BELTS.map((b) => ({ key: b.key, label: b.label }));
        return KIDS_BELTS.map((b) => ({ key: b.key, label: b.label }));
    }
    if (c.grupo === 'juvenil') return JUVENIL_BELTS.map((b) => ({ key: b.key, label: b.label }));
    return MASTER_BELTS.map((b) => ({ key: b.key, label: b.label }));
}
