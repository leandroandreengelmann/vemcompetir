import { describe, it, expect } from 'vitest';
import { formatWeightRange, formatCategoryTitle, formatFullCategoryName } from './category-utils';

// ---------------------------------------------------------------------------
// formatWeightRange
// ---------------------------------------------------------------------------

describe('formatWeightRange', () => {
    it('returns "Xkg a Ykg" when both min and max are set', () => {
        expect(formatWeightRange({ peso_min_kg: 70, peso_max_kg: 76 })).toBe('70kg a 76kg');
    });

    it('returns "Até Xkg" when only max is set', () => {
        expect(formatWeightRange({ peso_min_kg: null, peso_max_kg: 60 })).toBe('Até 60kg');
    });

    it('returns "Acima de Xkg" when only min is set', () => {
        expect(formatWeightRange({ peso_min_kg: 100, peso_max_kg: null })).toBe('Acima de 100kg');
    });

    it('returns "Peso a definir" when both are null', () => {
        expect(formatWeightRange({ peso_min_kg: null, peso_max_kg: null })).toBe('Peso a definir');
    });

    it('returns "Peso a definir" when both are undefined', () => {
        expect(formatWeightRange({})).toBe('Peso a definir');
    });

    it('returns "Peso Livre" when min <= 1 and max >= 150', () => {
        expect(formatWeightRange({ peso_min_kg: 0, peso_max_kg: 200 })).toBe('Peso Livre');
        expect(formatWeightRange({ peso_min_kg: 1, peso_max_kg: 150 })).toBe('Peso Livre');
    });

    it('does NOT return "Peso Livre" for normal ranges touching the boundaries', () => {
        expect(formatWeightRange({ peso_min_kg: 2, peso_max_kg: 149 })).toBe('2kg a 149kg');
    });
});

// ---------------------------------------------------------------------------
// formatCategoryTitle
// ---------------------------------------------------------------------------

describe('formatCategoryTitle', () => {
    it('formats a regular category removing bullets and Kimono', () => {
        const cat = {
            categoria_completa: 'Adulto • Masculino • Branca • Kimono • Médio',
            faixa: 'Branca',
            categoria_peso: 'Médio',
            peso: 'Médio',
        };
        const result = formatCategoryTitle(cat);
        expect(result).not.toContain('Kimono');
        expect(result).not.toContain('•');
    });

    it('formats an Absoluto category with clean belt and gender', () => {
        const cat = {
            categoria_completa: 'Absoluto Branca, Azul, Roxa, Marrom, Preta Masculino',
            faixa: 'Branca, Azul, Roxa, Marrom, Preta',
            divisao: 'Adulto Masculino',
            peso: 'Absoluto',
        };
        const result = formatCategoryTitle(cat);
        expect(result).toContain('Absoluto');
        expect(result).toContain('Masculino');
    });

    it('detects Absoluto via categoria_completa when peso is not set', () => {
        const cat = {
            categoria_completa: 'Absoluto Feminino Branca Azul',
            faixa: 'Branca, Azul',
            divisao: 'Adulto Feminino',
            peso: null,
        };
        const result = formatCategoryTitle(cat);
        expect(result.toLowerCase()).toContain('absoluto');
    });

    it('returns clean string for empty categoria_completa', () => {
        const result = formatCategoryTitle({ categoria_completa: '' });
        expect(typeof result).toBe('string');
    });
});

// ---------------------------------------------------------------------------
// formatFullCategoryName
// ---------------------------------------------------------------------------

describe('formatFullCategoryName', () => {
    it('appends weight range for non-absoluto categories', () => {
        const cat = {
            categoria_completa: 'Adulto Branca Médio',
            peso_min_kg: 70,
            peso_max_kg: 76,
            peso: 'Médio',
        };
        const result = formatFullCategoryName(cat);
        expect(result).toContain('70kg a 76kg');
    });

    it('does NOT append weight range for Absoluto categories', () => {
        const cat = {
            categoria_completa: 'Absoluto Masculino Branca',
            peso: 'Absoluto',
            peso_min_kg: null,
            peso_max_kg: null,
        };
        const result = formatFullCategoryName(cat);
        expect(result).not.toContain('Peso a definir');
        expect(result).not.toContain('kg a');
    });

    it('includes "Acima de" suffix for open-ended weight categories', () => {
        const cat = {
            categoria_completa: 'Adulto Branca Pesado',
            peso_min_kg: 100,
            peso_max_kg: null,
            peso: 'Pesado',
        };
        const result = formatFullCategoryName(cat);
        expect(result).toContain('Acima de 100kg');
    });
});
