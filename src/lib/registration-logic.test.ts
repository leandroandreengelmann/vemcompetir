import { describe, it, expect } from 'vitest'
import {
    normalizeText,
    computeAgeOnDate,
    parseBelts,
    parseAgeRangeFromText,
    checkEligibility,
    AthleteProfile,
    CategoryRow
} from './registration-logic'

describe('Registration Logic', () => {

    describe('normalizeText', () => {
        it('should remove accents and lowercase text', async () => {
            expect(await normalizeText('Coração')).toBe('coracao')
            expect(await normalizeText('  MÁSTER  ')).toBe('master')
            expect(await normalizeText('Açaí com Granola')).toBe('acai com granola')
        })

        it('should handle null/empty inputs', async () => {
            expect(await normalizeText(null)).toBe('')
            expect(await normalizeText('')).toBe('')
        })
    })

    describe('computeAgeOnDate', () => {
        it('should compute age correctly based on event date', async () => {
            // Birth: 1990-01-01, Event: 2024-01-01 -> 34 years
            expect(await computeAgeOnDate('1990-01-01', '2024-01-01')).toBe(34)

            // Birth: 1990-01-01, Event: 2023-12-31 -> 33 years
            expect(await computeAgeOnDate('1990-01-01', '2023-12-31')).toBe(33)
        })

        it('should return null for invalid dates', async () => {
            expect(await computeAgeOnDate(null, '2024-01-01')).toBeNull()
            expect(await computeAgeOnDate('invalid-date', '2024-01-01')).toBeNull()
        })
    })

    describe('parseBelts', () => {
        it('should split multiple belts from string', async () => {
            expect(await parseBelts('Branca, Azul')).toEqual(['branca', 'azul'])
            expect(await parseBelts('Roxa e Marrom')).toEqual(['roxa', 'marrom'])
            expect(await parseBelts('Preta / Coral')).toEqual(['preta', 'coral'])
        })

        it('should protect composite belts (e.g. Cinza e Branca)', async () => {
            const belts = await parseBelts('Cinza e Branca, Cinza e Preta')
            expect(belts).toContain('cinza e branca')
            expect(belts).toContain('cinza e preta')
            expect(belts).toHaveLength(2)
        })

        it('should handle complex separator combinations', async () => {
            const input = 'Branca e Amarela, Amarela e Preta - Verde'
            const belts = await parseBelts(input)
            expect(belts).toEqual(['branca e amarela', 'amarela e preta', 'verde'])
        })
    })

    describe('parseAgeRangeFromText', () => {
        it('should parse simple range (e.g. 18-30)', async () => {
            const range = await parseAgeRangeFromText(null, 'Adulto 18-30 anos', null)
            expect(range).toMatchObject({ min: 18, max: 30, parse_ok: true })
        })

        it('should parse "plus" match (e.g. 30+)', async () => {
            const range = await parseAgeRangeFromText('Master 30+', null, null)
            expect(range).toMatchObject({ min: 30, parse_ok: true })
        })

        it('should parse youth category correctly', async () => {
            // Juvenile usually means Max age
            const range = await parseAgeRangeFromText('Juvenil 17', null, null)
            expect(range).toMatchObject({ max: 17, parse_ok: true })
        })

        it('should return wildcard for entries like 0-99', async () => {
            const range = await parseAgeRangeFromText('Open 0-100', null, null)
            expect(range.wildcard).toBe(true)
        })
    })

    describe('checkEligibility', () => {
        const defaultAthlete: AthleteProfile = {
            belt_color: 'Azul',
            weight: 75,
            birth_date: '1995-05-15',
            sexo: 'Masculino'
        }

        const defaultCategory: CategoryRow = {
            id: 'cat-1',
            table_id: 'tab-1',
            faixa: 'Azul',
            idade: '18-40',
            divisao_idade: 'Adulto',
            peso_min_kg: 70,
            peso_max_kg: 80,
            sexo: 'Masculino',
            categoria_completa: 'Adulto Azul Médio',
            registration_fee: 100
        }

        it('should be eligible for matching profile', async () => {
            const result = await checkEligibility(defaultAthlete, defaultCategory, '2024-01-01')
            expect(result.eligible).toBe(true)
        })

        it('should be ineligible for wrong sex', async () => {
            const athlete = { ...defaultAthlete, sexo: 'Feminino' }
            const result = await checkEligibility(athlete, defaultCategory, '2024-01-01')
            expect(result.eligible).toBe(false)
            expect(result.reasons.sex).toBe(false)
        })

        it('should be ineligible for wrong belt', async () => {
            const athlete = { ...defaultAthlete, belt_color: 'Branca' }
            const result = await checkEligibility(athlete, defaultCategory, '2024-01-01')
            expect(result.eligible).toBe(false)
            expect(result.reasons.belt).toBe(false)
        })

        it('should be ineligible for wrong age', async () => {
            const athlete = { ...defaultAthlete, birth_date: '2015-01-01' } // 9 years old
            const result = await checkEligibility(athlete, defaultCategory, '2024-01-01')
            expect(result.eligible).toBe(false)
            expect(result.reasons.age).toBe(false)
        })

        it('should be ineligible for wrong weight', async () => {
            const athlete = { ...defaultAthlete, weight: 100 }
            const result = await checkEligibility(athlete, defaultCategory, '2024-01-01')
            expect(result.eligible).toBe(false)
            expect(result.reasons.weight).toBe(false)
        })

        it('should handle "Absoluto" categories (No weight limit)', async () => {
            const category = { ...defaultCategory, peso_min_kg: 0, peso_max_kg: 200 }
            const results = await checkEligibility(defaultAthlete, category, '2024-01-01')
            expect(results.eligible).toBe(true)
            expect(results.reasons.weight).toBe(true)
        })
    })
})
