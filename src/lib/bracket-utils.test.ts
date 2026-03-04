import { describe, it, expect } from 'vitest'
import { generateBracketLogic, nextPowerOf2 } from './bracket-utils'

describe('Bracket Utilities', () => {
    describe('nextPowerOf2', () => {
        it('should return the next power of 2', () => {
            expect(nextPowerOf2(2)).toBe(2)
            expect(nextPowerOf2(3)).toBe(4)
            expect(nextPowerOf2(4)).toBe(4)
            expect(nextPowerOf2(5)).toBe(8)
            expect(nextPowerOf2(10)).toBe(16)
            expect(nextPowerOf2(16)).toBe(16)
        })
    })

    describe('generateBracketLogic', () => {
        const createAthletes = (n: number) =>
            Array.from({ length: n }, (_, i) => ({ name: `Athlete ${i + 1}`, team: `Team ${i + 1}` }))

        it('should return empty for less than 2 athletes', () => {
            expect(generateBracketLogic(createAthletes(0))).toEqual([])
            expect(generateBracketLogic(createAthletes(1))).toEqual([])
        })

        it('should generate a simple 2-athlete bracket (Final only)', () => {
            const athletes = createAthletes(2)
            const rounds = generateBracketLogic(athletes)

            expect(rounds).toHaveLength(1)
            expect(rounds[0].name).toBe('Round 1')
            expect(rounds[0].matches).toHaveLength(1)
            expect(rounds[0].matches[0].athleteA).toBe('Athlete 1')
            expect(rounds[0].matches[0].athleteB).toBe('Athlete 2')
        })

        it('should generate a 4-athlete bracket (2 rounds)', () => {
            const athletes = createAthletes(4)
            const rounds = generateBracketLogic(athletes)

            expect(rounds).toHaveLength(2)
            expect(rounds[0].name).toBe('Round 1')
            expect(rounds[0].matches).toHaveLength(2)
            expect(rounds[1].name).toBe('Final')
            expect(rounds[1].matches).toHaveLength(1)
        })

        it('should handle BYEs correctly for 3 athletes', () => {
            const athletes = createAthletes(3)
            const rounds = generateBracketLogic(athletes)

            // 3 athletes -> size 4 -> 1 BYE
            expect(rounds).toHaveLength(2)
            const r1 = rounds[0]
            expect(r1.matches).toHaveLength(2)

            // Match 0: Athlete 1 vs BYE (Winner: Athlete 1)
            expect(r1.matches[0].athleteA).toBe('Athlete 1')
            expect(r1.matches[0].athleteB).toBe('BYE')
            expect(r1.matches[0].winner).toBe('Athlete 1')
            expect(r1.matches[0].isBye).toBe(true)

            // Match 1: Athlete 2 vs Athlete 3
            expect(r1.matches[1].athleteA).toBe('Athlete 2')
            expect(r1.matches[1].athleteB).toBe('Athlete 3')
            expect(r1.matches[1].isBye).toBe(false)

            // Round 2 (Final) should have Athlete 1 already propagated
            const r2 = rounds[1]
            expect(r2.matches[0].athleteA).toBe('Athlete 1')
            expect(r2.matches[0].athleteB).toBeNull()
        })

        it('should handle BYEs correctly for 6 athletes', () => {
            const athletes = createAthletes(6)
            const rounds = generateBracketLogic(athletes)

            // 6 athletes -> size 8 -> 2 BYEs
            expect(rounds).toHaveLength(3) // R1, R2 (Semi), R3 (Final)
            const r1 = rounds[0]
            expect(r1.matches).toHaveLength(4)

            const byes = r1.matches.filter(m => m.isBye)
            expect(byes).toHaveLength(2)

            // Propagation check to R2
            const r2 = rounds[1]
            expect(r2.matches[0].athleteA).toBe('Athlete 1')
            expect(r2.matches[0].athleteB).toBe('Athlete 2')
        })

        it('should handle 5 athletes correctly (3 BYEs)', () => {
            const athletes = createAthletes(5)
            const rounds = generateBracketLogic(athletes)

            // 5 athletes -> size 8 -> 3 BYEs
            expect(rounds).toHaveLength(3)
            const r1 = rounds[0]
            expect(r1.matches).toHaveLength(4)
            expect(r1.matches.filter(m => m.isBye)).toHaveLength(3)

            // Winners of Match 0, 1, 2 should propagate
            const r2 = rounds[1]
            expect(r2.matches[0].athleteA).toBe('Athlete 1') // Match 0 BYE
            expect(r2.matches[0].athleteB).toBe('Athlete 2') // Match 1 BYE
            expect(r2.matches[1].athleteA).toBe('Athlete 3') // Match 2 BYE
            expect(r2.matches[1].athleteB).toBeNull()        // Match 3 (4 vs 5)
        })

        it('should handle 8 athletes correctly (0 BYEs)', () => {
            const athletes = createAthletes(8)
            const rounds = generateBracketLogic(athletes)

            expect(rounds).toHaveLength(3)
            const r1 = rounds[0]
            expect(r1.matches).toHaveLength(4)
            expect(r1.matches.filter(m => m.isBye)).toHaveLength(0)

            const r2 = rounds[1]
            expect(r2.matches[0].athleteA).toBeNull()
            expect(r2.matches[0].athleteB).toBeNull()
        })
        it('should handle a large number of athletes (1287)', () => {
            const count = 1287
            const athletes = createAthletes(count)
            const rounds = generateBracketLogic(athletes)

            const size = nextPowerOf2(count) // 2048
            const roundsCount = Math.log2(size) // 11
            const byesCount = size - count // 761

            expect(rounds).toHaveLength(roundsCount)

            // Round 1 check
            const r1 = rounds[0]
            expect(r1.matches).toHaveLength(size / 2) // 1024
            expect(r1.matches.filter(m => m.isBye)).toHaveLength(byesCount)

            // Winners count check in R1
            const r1Winners = r1.matches.filter(m => m.winner).length
            expect(r1Winners).toBe(byesCount)

            // Propagation check for R2
            const r2 = rounds[1]
            expect(r2.matches).toHaveLength(size / 4) // 512

            // First few matches in R2 should have athletes from BYEs
            // BYE 0 (Match 0) -> R2 Match 0 Athlete A
            // BYE 1 (Match 1) -> R2 Match 0 Athlete B
            expect(r2.matches[0].athleteA).toBe('Athlete 1')
            expect(r2.matches[0].athleteB).toBe('Athlete 2')
        })
    })
})
