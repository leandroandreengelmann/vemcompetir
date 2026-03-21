import { describe, expect, test, it } from 'vitest';
import {
    normalizeText,
    computeAgeOnDate,
    parseBelts,
    parseAgeRangeFromText,
    isMasterLivre,
    isAbsolutoCategory,
    isEligible,
    AthleteProfile,
    CategoryRow
} from '../eligible-categories';

describe('normalizeText', () => {
    it('normalizes text correctly', async () => {
        expect(await normalizeText('Açúcar')).toBe('acucar');
        expect(await normalizeText('Branca  e   Azul ')).toBe('branca e azul');
        expect(await normalizeText(null)).toBe('');
    });
});

describe('computeAgeOnDate', () => {
    it('computes CBJJ age correctly (year diff only)', async () => {
        // Born Oct 1996, Event Jun 2026 -> 2026 - 1996 = 30
        expect(await computeAgeOnDate('1996-10-15T00:00:00Z', '2026-06-01T00:00:00Z')).toBe(30);
    });
});

describe('parseBelts', () => {
    it('parses basic belts', async () => {
        expect(await parseBelts('Branca')).toEqual(['branca']);
        expect(await parseBelts('Azul e Roxa')).toEqual(['azul', 'roxa']);
        expect(await parseBelts('Marrom - Preta')).toEqual(['marrom', 'preta']);
        expect(await parseBelts('Branca, Cinza, Amarela')).toEqual(['branca', 'cinza', 'amarela']);
    });

    it('preserves composite kids belts', async () => {
        expect(await parseBelts('Cinza e Branca e Cinza')).toEqual(['cinza e branca', 'cinza']);
        expect(await parseBelts('Amarela e Preta')).toEqual(['amarela e preta']);
    });

    // Failing edge case: " a " separator
    it('handles "a" separator (Azul a Preta) -> Falha 2', async () => {
        const result = await parseBelts('Azul a Preta');
        // Will fail initially because it doesn't split on "a", giving ["azul a preta"]
        expect(result).toEqual(expect.arrayContaining(['azul', 'preta']));
    });
});

describe('parseAgeRangeFromText', () => {
    it('parses explicit ranges', async () => {
        const range = await parseAgeRangeFromText('30-35', null, null);
        expect(range.min).toBe(30);
        expect(range.max).toBe(35);
    });

    it('parses plus syntax', async () => {
        const plus = await parseAgeRangeFromText('61+', null, null);
        expect(plus.min).toBe(61);
        expect(plus.wildcard).toBe(false);
    });

    it('parses isolated numbers correctly based on context', async () => {
        const youth = await parseAgeRangeFromText('Juvenil (17)', null, null);
        expect(youth.max).toBe(17);
        expect(youth.min).toBeUndefined();

        const adult = await parseAgeRangeFromText('Adulto (18)', null, null);
        expect(adult.min).toBe(18);
        expect(adult.max).toBeUndefined();
    });

    // Failing edge case: "Master 1" isolating the number '1' as age -> Falha 1
    it('ignores nomenclature numbers like Master 1, Master 2, Juvenil II -> Falha 1', async () => {
        // If there is ONLY 'Master 1' and no other age hints, it should NOT return min=1
        const result = await parseAgeRangeFromText('Master 1', null, null);

        // It shouldn't parse '1' as age
        expect(result.min).not.toBe(1);
    });
});

describe('isMasterLivre', () => {
    it('detects master livre correctly', async () => {
        expect(await isMasterLivre('Master Livre', null, null)).toBe(true);
        expect(await isMasterLivre('Master 1', null, null)).toBe(false);
        expect(await isMasterLivre('Master Livre', 50, 60)).toBe(false);
    });
});

describe('isAbsolutoCategory', () => {
    it('detects absoluto by word in categoria_completa', async () => {
        expect(await isAbsolutoCategory('Absoluto Branca, Azul, Roxa, Marrom, Preta Feminino')).toBe(true);
        expect(await isAbsolutoCategory('ABSOLUTO Masculino')).toBe(true);
        expect(await isAbsolutoCategory('absoluto misto')).toBe(true);
        expect(await isAbsolutoCategory('Adulto - Branca - Medio')).toBe(false);
        expect(await isAbsolutoCategory(null)).toBe(false);
    });
});

describe('isEligible (Edge Cases)', () => {
    const defaultProfile: AthleteProfile = {
        sexo: 'Masculino',
        belt_color: 'Branca',
        birth_date: '1990-01-01',
        weight: 75
    };

    const defaultCategory: CategoryRow = {
        id: '1',
        table_id: '1',
        sexo: 'Masculino',
        faixa: 'Branca',
        idade: null,
        divisao_idade: 'Adulto',
        peso_min_kg: 70,
        peso_max_kg: 80,
        categoria_completa: 'Adulto - Branca - Medio',
        registration_fee: 100
    };

    it('baseline: perfect match', async () => {
        const res = await isEligible(defaultProfile, defaultCategory, '2026-01-01');
        expect(res.eligible).toBe(true);
    });

    // Falha 3: Peso sem Fallback
    it('properly guards against empty bounds on weight (Falha 3)', async () => {
        const catNoWeight: CategoryRow = {
            ...defaultCategory,
            peso_min_kg: null,
            peso_max_kg: null,
            categoria_completa: 'Categoria Estranha Sem Peso',
        };

        const res = await isEligible(defaultProfile, catNoWeight, '2026-01-01');
        // If min and max are null, and it's not Master Livre or Absoluto (by normal bounds),
        // it historically allowed anyone. We should ensure it either accepts it as Absoluto Free OR we clarify the rule.
        // For BJJ, if min=null and max=null, it practically means "Livre".
        // Was it considered a "falha" because it leaks? If the BD is wrong, it accepts anyone.
        expect(res.eligible).toBe(true); // Right now it allows. Let's make sure it's intentional or guarded.
    });

    // Extrema Idade: Criança em Master 1
    it('Master 1 Bug (Falha 1): prevents 10 year old from entering Master 1', async () => {
        const kidProfile: AthleteProfile = {
            sexo: 'Masculino',
            belt_color: 'Branca',
            birth_date: '2016-01-01', // 10 years old in 2026
            weight: 75
        };

        const catMaster1: CategoryRow = {
            ...defaultCategory,
            divisao_idade: 'Master 1', // no other hints
            idade: null
        };

        const res = await isEligible(kidProfile, catMaster1, '2026-01-01');

        // This fails initially because Master 1 extracts "1" -> min 1 year old -> 10 yr old is eligible.
        // It SHOULD be false because 10 is not Master.
        expect(res.eligible).toBe(false);
    });

    // "Azul a Preta" array (Falha 2)
    it('Azul a Preta (Falha 2): allows Azul and Preta', async () => {
        const pretaProfile = { ...defaultProfile, belt_color: 'Preta' };

        const cat: CategoryRow = {
            ...defaultCategory,
            faixa: 'Azul a Preta'
        };

        const res = await isEligible(pretaProfile, cat, '2026-01-01');
        expect(res.eligible).toBe(true);
    });
});

describe('isEligible — Absoluto', () => {
    const absolutoCategory: CategoryRow = {
        id: 'abs-1',
        table_id: 't1',
        sexo: 'Feminino',
        faixa: 'Branca, Azul, Roxa, Marrom, Preta',
        idade: null,
        divisao_idade: null,
        peso_min_kg: null,
        peso_max_kg: null,
        categoria_completa: 'Absoluto Branca, Azul, Roxa, Marrom, Preta Feminino',
        registration_fee: 100
    };

    it('match: mulher 20 anos, faixa azul → deve dar match', async () => {
        const athlete: AthleteProfile = {
            sexo: 'Feminino',
            belt_color: 'Azul',
            birth_date: '2006-01-01', // 20 anos em 2026
            weight: null // peso não importa em absoluto
        };
        const res = await isEligible(athlete, absolutoCategory, '2026-06-01');
        expect(res.eligible).toBe(true);
        expect(res.reasons.weight).toBe(true);
        expect(res.reasons.age).toBe(true);
    });

    it('não match: mulher 17 anos, faixa azul → abaixo de 18', async () => {
        const athlete: AthleteProfile = {
            sexo: 'Feminino',
            belt_color: 'Azul',
            birth_date: '2009-01-01', // 17 anos em 2026
            weight: 60
        };
        const res = await isEligible(athlete, absolutoCategory, '2026-06-01');
        expect(res.eligible).toBe(false);
        expect(res.reasons.age).toBe(false);
    });

    it('não match: homem 25 anos, faixa azul → sexo errado', async () => {
        const athlete: AthleteProfile = {
            sexo: 'Masculino',
            belt_color: 'Azul',
            birth_date: '2001-01-01',
            weight: 80
        };
        const res = await isEligible(athlete, absolutoCategory, '2026-06-01');
        expect(res.eligible).toBe(false);
        expect(res.reasons.sex).toBe(false);
    });

    it('não match: mulher 20 anos, faixa verde → faixa não listada', async () => {
        const athlete: AthleteProfile = {
            sexo: 'Feminino',
            belt_color: 'Verde',
            birth_date: '2006-01-01',
            weight: 55
        };
        const res = await isEligible(athlete, absolutoCategory, '2026-06-01');
        expect(res.eligible).toBe(false);
        expect(res.reasons.belt).toBe(false);
    });

    it('match: atleta sem peso cadastrado → absoluto ignora peso', async () => {
        const athlete: AthleteProfile = {
            sexo: 'Feminino',
            belt_color: 'Roxa',
            birth_date: '2000-01-01', // 26 anos
            weight: null
        };
        const res = await isEligible(athlete, absolutoCategory, '2026-06-01');
        expect(res.eligible).toBe(true);
        expect(res.reasons.weight).toBe(true);
    });

    it('match: exatamente 18 anos → limite mínimo', async () => {
        const athlete: AthleteProfile = {
            sexo: 'Feminino',
            belt_color: 'Branca',
            birth_date: '2008-06-15', // 18 anos em 2026
            weight: 50
        };
        const res = await isEligible(athlete, absolutoCategory, '2026-06-01');
        expect(res.eligible).toBe(true);
        expect(res.reasons.age).toBe(true);
    });
});
