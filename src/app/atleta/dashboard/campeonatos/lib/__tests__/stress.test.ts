/**
 * Stress test: 2000+ combinações atleta × categoria
 * Verifica que isEligible produz os resultados corretos em toda a amplitude de cenários.
 */
import { describe, it, expect } from 'vitest';
import { isEligible, AthleteProfile, CategoryRow } from '../eligible-categories';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeAthlete(
    sexo: string | null,
    belt: string | null,
    birthYear: number | null,
    weight: number | null
): AthleteProfile {
    return {
        sexo,
        belt_color: belt,
        birth_date: birthYear ? `${birthYear}-06-15` : null,
        weight,
    };
}

function makeCat(overrides: Partial<CategoryRow> & { id: string }): CategoryRow {
    return {
        table_id: 't1',
        sexo: 'Masculino',
        faixa: 'Branca',
        idade: null,
        divisao_idade: 'Adulto',
        peso_min_kg: 0,
        peso_max_kg: 999,
        categoria_completa: 'Adulto • Masculino • Branca • Pesado',
        registration_fee: 100,
        ...overrides,
    };
}

// Ano-base para cálculo de idade (regra CBJJ = ano do evento − ano nascimento)
const EVENT = '2026-06-01';
const YEAR = 2026;
function ageToYear(age: number) { return YEAR - age; }

// ─── Atletas (28 perfis) ────────────────────────────────────────────────────

const BELTS = ['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'];
const AGES  = [10, 14, 17, 18, 20, 25, 29, 30, 35, 40, 50, 61];
const WEIGHTS = [40, 55, 65, 70, 76, 82, 95, 110, null];
const SEXES: Array<'Masculino' | 'Feminino'> = ['Masculino', 'Feminino'];

// ─── Categorias (70+ modelos) ───────────────────────────────────────────────

const categories: Array<{ cat: CategoryRow; label: string }> = [

    // ── ADULTO KIMONO ──────────────────────────────────────────────────────

    ...BELTS.flatMap((belt, bi) =>
        SEXES.map((sex, si) => ({
            label: `Adulto ${sex} ${belt} Médio`,
            cat: makeCat({
                id: `adulto-${bi}-${si}`,
                sexo: sex,
                faixa: belt,
                divisao_idade: '18-29',
                peso_min_kg: 64,
                peso_max_kg: 70,
                categoria_completa: `Adulto • 18 anos a 29 anos • ${sex} • ${belt} • Médio • Kimono`,
            }),
        }))
    ),

    // ── MASTER 1 ──────────────────────────────────────────────────────────

    ...BELTS.flatMap((belt, bi) =>
        SEXES.map((sex, si) => ({
            label: `Master 1 ${sex} ${belt}`,
            cat: makeCat({
                id: `master1-${bi}-${si}`,
                sexo: sex,
                faixa: belt,
                divisao_idade: '30-35',
                peso_min_kg: 64,
                peso_max_kg: 70,
                categoria_completa: `Master 1 • 30 anos a 35 anos • ${sex} • ${belt} • Médio • Kimono`,
            }),
        }))
    ),

    // ── MASTER 4 (46-50) ──────────────────────────────────────────────────

    ...['Roxa', 'Marrom', 'Preta'].flatMap((belt, bi) =>
        SEXES.map((sex, si) => ({
            label: `Master 4 ${sex} ${belt}`,
            cat: makeCat({
                id: `master4-${bi}-${si}`,
                sexo: sex,
                faixa: belt,
                divisao_idade: '46-50',
                peso_min_kg: 58,
                peso_max_kg: 64,
                categoria_completa: `Master 4 • 46 anos a 50 anos • ${sex} • ${belt} • Leve • Kimono`,
            }),
        }))
    ),

    // ── MASTER 6 (61+) ────────────────────────────────────────────────────

    {
        label: 'Master 6 Masculino Branca 61+',
        cat: makeCat({
            id: 'master6-m',
            sexo: 'Masculino',
            faixa: 'Branca',
            divisao_idade: '61+',
            peso_min_kg: 0,
            peso_max_kg: 999,
            categoria_completa: 'Master 6 • 61+ • Masculino • Branca • Pesado • Kimono',
        }),
    },

    // ── JUVENIL (max 17) ──────────────────────────────────────────────────

    ...SEXES.map((sex, si) => ({
        label: `Juvenil II ${sex} Branca`,
        cat: makeCat({
            id: `juvenil-${si}`,
            sexo: sex,
            faixa: 'Branca',
            divisao_idade: 'Juvenil II (17)',
            peso_min_kg: 44,
            peso_max_kg: 49,
            categoria_completa: `Juvenil II (17) • 17 anos • ${sex} • Branca • Pena • Kimono`,
        }),
    })),

    // ── INFANTIL (max 10) ─────────────────────────────────────────────────

    {
        label: 'Infantil I Masculino Branca (max 10)',
        cat: makeCat({
            id: 'infantil-m',
            sexo: 'Masculino',
            faixa: 'Branca',
            divisao_idade: 'Infantil I (10)',
            peso_min_kg: 20,
            peso_max_kg: 25,
            categoria_completa: 'Infantil I (10) • 10 anos • Masculino • Branca • Galo • Kimono',
        }),
    },

    // ── MULTI-BELT: "Azul a Preta" ─────────────────────────────────────────

    ...SEXES.map((sex, si) => ({
        label: `Adulto ${sex} Azul a Preta Médio`,
        cat: makeCat({
            id: `multi-azulpreta-${si}`,
            sexo: sex,
            faixa: 'Azul a Preta',
            divisao_idade: '18-29',
            peso_min_kg: 64,
            peso_max_kg: 70,
            categoria_completa: `Adulto • ${sex} • Azul a Preta • Médio`,
        }),
    })),

    // ── MULTI-BELT: "Branca, Azul, Roxa, Marrom, Preta" ──────────────────

    ...SEXES.map((sex, si) => ({
        label: `Adulto ${sex} Todas faixas Médio`,
        cat: makeCat({
            id: `multi-todas-${si}`,
            sexo: sex,
            faixa: 'Branca, Azul, Roxa, Marrom, Preta',
            divisao_idade: '18-29',
            peso_min_kg: 64,
            peso_max_kg: 70,
            categoria_completa: `Adulto • 18 anos a 29 anos • ${sex} • Branca, Azul, Roxa, Marrom, Preta • Médio`,
        }),
    })),

    // ── ABSOLUTO FEMININO (todas faixas, 18+) ─────────────────────────────

    {
        label: 'Absoluto Feminino todas faixas',
        cat: makeCat({
            id: 'abs-fem',
            sexo: 'Feminino',
            faixa: 'Branca, Azul, Roxa, Marrom, Preta',
            divisao_idade: '0',
            peso_min_kg: 0,
            peso_max_kg: 200,
            categoria_completa: '0 • 200 anos • Feminino • Branca, Azul, Roxa, Marrom, Preta • Absoluto, Mulheres Geral • Kimono',
        }),
    },

    // ── ABSOLUTO MASCULINO Azul e Roxa ────────────────────────────────────

    {
        label: 'Absoluto Masculino Azul e Roxa',
        cat: makeCat({
            id: 'abs-masc-azulroxa',
            sexo: 'Masculino',
            faixa: 'Azul e Roxa',
            divisao_idade: '0',
            peso_min_kg: 0,
            peso_max_kg: 999,
            categoria_completa: '0 • 200 anos • Masculino • Azul e Roxa • Absoluto • Kimono',
        }),
    },

    // ── ABSOLUTO MASCULINO Preta e Marrom ─────────────────────────────────

    {
        label: 'Absoluto Masculino Preta e Marrom',
        cat: makeCat({
            id: 'abs-masc-pretamarrom',
            sexo: 'Masculino',
            faixa: 'Preta e Marrom',
            divisao_idade: '0',
            peso_min_kg: 0,
            peso_max_kg: 999,
            categoria_completa: '0 • 200 anos • Masculino • Preta e Marrom • Absoluto • Kimono',
        }),
    },

    // ── ABSOLUTO MASCULINO Branca ─────────────────────────────────────────

    {
        label: 'Absoluto Masculino Branca',
        cat: makeCat({
            id: 'abs-masc-branca',
            sexo: 'Masculino',
            faixa: 'Branca',
            divisao_idade: '0',
            peso_min_kg: 0,
            peso_max_kg: 999,
            categoria_completa: '0 • 200 anos • Masculino • Branca • Absoluto • Kimono',
        }),
    },

    // ── MASTER LIVRE ──────────────────────────────────────────────────────

    {
        label: 'Master Livre Masculino Preta',
        cat: makeCat({
            id: 'masterlivre-m',
            sexo: 'Masculino',
            faixa: 'Preta',
            divisao_idade: 'Master Livre',
            peso_min_kg: null,
            peso_max_kg: null,
            categoria_completa: 'Master Livre • Masculino • Preta',
        }),
    },

    // ── SEXO MISTO ────────────────────────────────────────────────────────

    {
        label: 'Misto Adulto Branca Médio',
        cat: makeCat({
            id: 'misto-branca',
            sexo: 'Misto',
            faixa: 'Branca',
            divisao_idade: '18-29',
            peso_min_kg: 64,
            peso_max_kg: 70,
            categoria_completa: 'Adulto • 18-29 • Misto • Branca • Médio',
        }),
    },

    // ── SEM PESO (null bounds) ────────────────────────────────────────────

    {
        label: 'Adulto Masculino Azul sem peso definido',
        cat: makeCat({
            id: 'nopeso-m',
            sexo: 'Masculino',
            faixa: 'Azul',
            divisao_idade: '18-29',
            peso_min_kg: null,
            peso_max_kg: null,
            categoria_completa: 'Adulto • 18-29 • Masculino • Azul • Peso Livre',
        }),
    },
];

// ─── Engine de expectativas ───────────────────────────────────────────────────

function normalize(s: string | null) {
    if (!s) return '';
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

const COMPOSITE_BELTS = [
    'cinza e branca', 'cinza e preta', 'amarela e branca', 'amarela e preta',
    'laranja e branca', 'laranja e preta', 'verde e branca', 'verde e preta', 'branca e amarela',
];

function splitBelts(raw: string | null): string[] {
    let text = normalize(raw);
    if (!text) return [];
    const protected_ = new Map<string, string>();
    COMPOSITE_BELTS.forEach((cb, i) => {
        const ph = `__CB${i}__`;
        if (text.includes(cb)) { protected_.set(ph, cb); text = text.split(cb).join(ph); }
    });
    const parts = text.split(/\s+e\s+|[,/|]|\s+-\s+|\s+a\s+/).map(p => p.trim()).filter(Boolean);
    return [...new Set(parts.map(p => {
        let r = p;
        protected_.forEach((cb, ph) => { r = r.split(ph).join(cb); });
        return r;
    }))];
}

function expectedEligible(
    athlete: AthleteProfile,
    cat: CategoryRow,
): { sex: boolean; belt: boolean; age: boolean; weight: boolean } {
    const catSexN = normalize(cat.sexo);
    const athSexN = normalize(athlete.sexo);
    const sex = !catSexN || catSexN.includes('absoluto') || catSexN.includes('misto')
        ? true
        : catSexN === athSexN;

    const validBelts = splitBelts(cat.faixa);
    const athBeltN = normalize(athlete.belt_color);
    const belt = validBelts.includes(athBeltN);

    const catNameN = normalize(cat.categoria_completa);
    const isAbsoluto = catNameN.includes('absoluto');

    const divN = normalize(cat.divisao_idade);
    const isMasterLivre = divN.includes('master') && !/\d/.test(divN)
        && cat.peso_min_kg === null && cat.peso_max_kg === null;

    let age = false;
    if (!athlete.birth_date) {
        age = isMasterLivre || false;
    } else {
        const athleteAge = YEAR - new Date(athlete.birth_date).getFullYear();
        if (isMasterLivre) {
            age = true;
        } else if (isAbsoluto) {
            age = athleteAge >= 18;
        } else {
            // parse range
            const fullN = normalize(`${cat.divisao_idade} ${cat.categoria_completa}`);
            const isYouth = /juvenil|infantil|mirim|sub|junior|kids|pre-mirim/.test(fullN);
            const isSenior = /adulto|master|senior/.test(fullN);
            const text = (cat.divisao_idade || '').replace(
                /\b(master|juvenil|infantil|mirim|infanto[- ]?juvenil|pre[- ]?mirim)\s*\d+\b/gi, ''
            ).trim();
            const rangeM = text.match(/(\d+)\s*(?:-|–|a|ate)\s*(\d+)/i);
            if (rangeM) {
                const lo = +rangeM[1], hi = +rangeM[2];
                age = (lo <= 1 && hi >= 100) ? true : athleteAge >= lo && athleteAge <= hi;
            } else {
                const plusM = text.match(/(\d+)\s*(?:\+|anos\s+ou\s+mais)/i);
                if (plusM) { age = athleteAge >= +plusM[1]; }
                else {
                    const exactM = text.match(/(\d+)/);
                    if (exactM) {
                        const v = +exactM[1];
                        if (v > 100) age = true;
                        else if (isYouth && !isSenior) age = athleteAge <= v;
                        else age = athleteAge >= v;
                    } else {
                        // no numbers → wildcard
                        const hasNumbers = /\d/.test(cat.divisao_idade || '') || /\d/.test(cat.categoria_completa || '');
                        age = !hasNumbers;
                    }
                }
            }
        }
    }

    let weight = false;
    if (isMasterLivre || isAbsoluto) {
        weight = true;
    } else {
        const isAbsoluteWeight =
            cat.peso_min_kg !== null && cat.peso_min_kg <= 1 &&
            cat.peso_max_kg !== null && cat.peso_max_kg >= 150;
        if (isAbsoluteWeight) {
            weight = true;
        } else if (athlete.weight === null) {
            weight = cat.peso_min_kg === null && cat.peso_max_kg === null;
        } else {
            const minOk = cat.peso_min_kg === null || athlete.weight >= cat.peso_min_kg;
            const maxOk = cat.peso_max_kg === null || athlete.weight <= cat.peso_max_kg;
            weight = minOk && maxOk;
        }
    }

    return { sex, belt, age, weight };
}

// ─── Geração das combinações ──────────────────────────────────────────────────

type Combo = {
    athlete: AthleteProfile;
    athleteLabel: string;
    cat: CategoryRow;
    catLabel: string;
    expected: ReturnType<typeof expectedEligible>;
};

const combos: Combo[] = [];

// Gera atletas: todas combinações de belt × sex × age × weight
for (const belt of [...BELTS, null]) {
    for (const sex of [...SEXES, null]) {
        for (const age of AGES) {
            for (const weight of WEIGHTS) {
                const athlete = makeAthlete(sex, belt, ageToYear(age), weight);
                const athleteLabel = `sex=${sex ?? 'null'} belt=${belt ?? 'null'} age=${age} weight=${weight ?? 'null'}`;
                for (const { cat, label: catLabel } of categories) {
                    combos.push({
                        athlete,
                        athleteLabel,
                        cat,
                        catLabel,
                        expected: expectedEligible(athlete, cat),
                    });
                }
            }
        }
    }
}

// ─── Testes ──────────────────────────────────────────────────────────────────

describe(`Stress test — ${combos.length} combinações atleta × categoria`, () => {
    let passed = 0;
    let failed = 0;
    const failures: string[] = [];

    // Executa todos em um único teste para performance, relatando falhas individualmente
    it(`deve processar todas as ${combos.length} combinações sem divergência`, async () => {
        for (const { athlete, athleteLabel, cat, catLabel, expected } of combos) {
            const result = await isEligible(athlete, cat, EVENT);

            const sexOk    = result.reasons.sex    === expected.sex;
            const beltOk   = result.reasons.belt   === expected.belt;
            const ageOk    = result.reasons.age    === expected.age;
            const weightOk = result.reasons.weight === expected.weight;
            const eligOk   = result.eligible === (expected.sex && expected.belt && expected.age && expected.weight);

            if (sexOk && beltOk && ageOk && weightOk && eligOk) {
                passed++;
            } else {
                failed++;
                const diff = [
                    !sexOk    && `sex: got=${result.reasons.sex} want=${expected.sex}`,
                    !beltOk   && `belt: got=${result.reasons.belt} want=${expected.belt}`,
                    !ageOk    && `age: got=${result.reasons.age} want=${expected.age}`,
                    !weightOk && `weight: got=${result.reasons.weight} want=${expected.weight}`,
                ].filter(Boolean).join(' | ');
                failures.push(`[FAIL] ${catLabel} | ${athleteLabel} → ${diff}`);
            }
        }

        console.log(`\n✅ Passou: ${passed} / ${combos.length}`);
        if (failures.length > 0) {
            console.log(`\n❌ Falhas (${failures.length}):`);
            failures.slice(0, 50).forEach(f => console.log(f));
            if (failures.length > 50) console.log(`  ... e mais ${failures.length - 50} falhas`);
        }

        expect(failures).toHaveLength(0);
    }, 120_000);
});
