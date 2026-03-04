import { describe, it, expect } from 'vitest'
import { calculateAsaasSplit } from './payment-utils'

describe('calculateAsaasSplit', () => {
    it('should return undefined if no organizerWalletId is provided', () => {
        expect(calculateAsaasSplit(100, 10, null)).toBeUndefined()
    })

    it('should return undefined if platformFeeGross is 0', () => {
        expect(calculateAsaasSplit(100, 0, 'wallet-123')).toBeUndefined()
    })

    it('should calculate correct organizer amount for simple values', () => {
        const split = calculateAsaasSplit(100, 15, 'wallet-organizer')
        expect(split).toHaveLength(1)
        expect(split![0]).toEqual({
            walletId: 'wallet-organizer',
            fixedValue: 85
        })
    })

    it('should handle decimal values and rounding', () => {
        // 100.55 total, 10.33 fee -> 90.22 organizer
        const split = calculateAsaasSplit(100.55, 10.33, 'wallet-organizer')
        expect(split![0].fixedValue).toBe(90.22)
    })

    it('should handle precision cases (e.g. 0.1 + 0.2)', () => {
        // total: 30, fee: 10.1 + 10.2 (20.3) -> 9.7
        const split = calculateAsaasSplit(30, 10.1 + 10.2, 'wallet-organizer')
        expect(split![0].fixedValue).toBe(9.7)
    })

    it('should not return negative fixedValue if fee exceeds total', () => {
        // This is a safety check. In practice, the route should block this.
        const split = calculateAsaasSplit(50, 60, 'wallet-organizer')
        expect(split![0].fixedValue).toBe(0)
    })

    it('should handle very small amounts', () => {
        const split = calculateAsaasSplit(0.02, 0.01, 'wallet-organizer')
        expect(split![0].fixedValue).toBe(0.01)
    })
})
