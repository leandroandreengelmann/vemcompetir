import { describe, it, expect } from 'vitest';
import { generateBracket, nextPowerOf2, applyWinnerPropagation } from './bracket-generator';

const mkAthletes = (n: number, teamMod = 1) =>
    Array.from({ length: n }, (_, i) => ({
        id: `a${i + 1}`,
        name: `Atleta ${i + 1}`,
        team: `Time ${(i % teamMod) + 1}`,
    }));

describe('nextPowerOf2', () => {
    it('basics', () => {
        expect(nextPowerOf2(1)).toBe(1);
        expect(nextPowerOf2(2)).toBe(2);
        expect(nextPowerOf2(3)).toBe(4);
        expect(nextPowerOf2(5)).toBe(8);
        expect(nextPowerOf2(17)).toBe(32);
    });
});

describe('generateBracket — formatos', () => {
    it('0 atletas → wo sem matches', () => {
        const r = generateBracket([]);
        expect(r.format).toBe('wo');
        expect(r.matches).toHaveLength(0);
    });

    it('1 atleta → wo sem matches', () => {
        const r = generateBracket(mkAthletes(1));
        expect(r.format).toBe('wo');
        expect(r.matches).toHaveLength(0);
    });

    it('2 atletas → final_only com 1 luta', () => {
        const r = generateBracket(mkAthletes(2));
        expect(r.format).toBe('final_only');
        expect(r.matches).toHaveLength(1);
        expect(r.matches[0].is_bye).toBe(false);
    });

    it('3 atletas → round_robin com 3 lutas', () => {
        const r = generateBracket(mkAthletes(3));
        expect(r.format).toBe('round_robin');
        expect(r.matches).toHaveLength(3);
    });

    it('4 atletas → single_elimination + disputa de 3º', () => {
        const r = generateBracket(mkAthletes(4), { seed: 'fixo' });
        expect(r.format).toBe('single_elimination');
        const final = r.matches.find((m) => m.round === 2 && m.position === 0);
        const third = r.matches.find((m) => m.position === 99);
        expect(final).toBeDefined();
        expect(third).toBeDefined();
        expect(third!.round).toBe(2);
    });

    it('6 atletas → bracket size 8, 2 BYEs em R1', () => {
        const r = generateBracket(mkAthletes(6), { seed: 'seis' });
        expect(r.main_bracket_size).toBe(8);
        const r1 = r.matches.filter((m) => m.round === 1);
        expect(r1).toHaveLength(4);
        const byes = r1.filter((m) => m.is_bye);
        expect(byes).toHaveLength(2);
        for (const bye of byes) {
            expect(bye.winner_id).not.toBeNull();
        }
    });
});

describe('generateBracket — Fisher-Yates seed', () => {
    it('mesmo seed gera mesma chave', () => {
        const a = mkAthletes(8);
        const r1 = generateBracket(a, { seed: 'X' });
        const r2 = generateBracket(a, { seed: 'X' });
        expect(r1.placed_order.map((p) => p.id)).toEqual(r2.placed_order.map((p) => p.id));
    });

    it('seeds diferentes produzem ordens diferentes na maioria dos casos', () => {
        const a = mkAthletes(16);
        const r1 = generateBracket(a, { seed: 'AAA' });
        const r2 = generateBracket(a, { seed: 'BBB' });
        expect(r1.placed_order.map((p) => p.id)).not.toEqual(r2.placed_order.map((p) => p.id));
    });
});

describe('generateBracket — sem duplo BYE em R1', () => {
    it('5 atletas em 8 slots, nenhum par BYE×BYE', () => {
        const r = generateBracket(mkAthletes(5), { seed: 'cinco' });
        const r1 = r.matches.filter((m) => m.round === 1);
        for (const m of r1) {
            const aBye = m.athlete_a_id === null;
            const bBye = m.athlete_b_id === null;
            expect(aBye && bBye).toBe(false);
        }
    });
});

describe('generateBracket — disputa de 3º', () => {
    it('2 atletas: NÃO inclui disputa de 3º', () => {
        const r = generateBracket(mkAthletes(2));
        expect(r.matches.find((m) => m.position === 99)).toBeUndefined();
    });

    it('3 atletas (round_robin): NÃO inclui disputa de 3º', () => {
        const r = generateBracket(mkAthletes(3));
        expect(r.matches.find((m) => m.position === 99)).toBeUndefined();
    });

    it('≥4 atletas: inclui disputa de 3º', () => {
        const r = generateBracket(mkAthletes(7), { seed: 'sete' });
        expect(r.matches.find((m) => m.position === 99)).toBeDefined();
    });
});

describe('applyWinnerPropagation', () => {
    it('propaga vencedor para próximo round', () => {
        const r = generateBracket(mkAthletes(4), { seed: 'prop' });
        const r1m0Idx = r.matches.findIndex((m) => m.round === 1 && m.position === 0);
        const r1m0 = r.matches[r1m0Idx];
        const winnerId = r1m0.athlete_a_id!;
        const updated = applyWinnerPropagation(r.matches, r1m0Idx, winnerId, mkAthletes(4));
        const final = updated.find((m) => m.round === 2 && m.position === 0)!;
        expect(final.athlete_a_id).toBe(winnerId);
    });
});

describe('grupos de separação', () => {
    it('atletas do mesmo grupo ficam em metades opostas', () => {
        const athletes = mkAthletes(8);
        const r = generateBracket(athletes, {
            seed: 'sep',
            separationGroups: [[athletes[0].id, athletes[1].id]],
        });
        const slots = r.placed_order;
        const idxA = slots.findIndex((s) => s.id === athletes[0].id);
        const idxB = slots.findIndex((s) => s.id === athletes[1].id);
        const half = slots.length / 2;
        const sideA = idxA < half ? 'L' : 'R';
        const sideB = idxB < half ? 'L' : 'R';
        expect(sideA).not.toBe(sideB);
    });
});
