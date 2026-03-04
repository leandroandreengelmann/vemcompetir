import { describe, it, expect } from 'vitest';
import { isNoSplitPosition, shouldPaymentBeNoSplit, getNextIntegralPositions } from './no-split-logic';

describe('isNoSplitPosition', () => {
    it('should return false for positions before startAfterPaid', () => {
        expect(isNoSplitPosition(1, 40, [10])).toBe(false);
        expect(isNoSplitPosition(39, 40, [10])).toBe(false);
        expect(isNoSplitPosition(40, 40, [10])).toBe(false);
    });

    it('should return true for the first integral position', () => {
        // start=40, offsets=[10] → first integral at 50
        expect(isNoSplitPosition(50, 40, [10])).toBe(true);
    });

    it('should return false for positions between integrals', () => {
        expect(isNoSplitPosition(45, 40, [10])).toBe(false);
        expect(isNoSplitPosition(49, 40, [10])).toBe(false);
        expect(isNoSplitPosition(51, 40, [10])).toBe(false);
    });

    it('should cycle through multiple offsets correctly', () => {
        // start=40, offsets=[10, 7, 13]
        // Positions: 50, 57, 70, 80, 87, 100
        const offsets = [10, 7, 13];
        expect(isNoSplitPosition(50, 40, offsets)).toBe(true);  // 40+10
        expect(isNoSplitPosition(57, 40, offsets)).toBe(true);  // 50+7
        expect(isNoSplitPosition(70, 40, offsets)).toBe(true);  // 57+13
        expect(isNoSplitPosition(80, 40, offsets)).toBe(true);  // 70+10 (cycle)
        expect(isNoSplitPosition(87, 40, offsets)).toBe(true);  // 80+7
        expect(isNoSplitPosition(100, 40, offsets)).toBe(true); // 87+13
    });

    it('should return false for non-integral positions with multiple offsets', () => {
        const offsets = [10, 7, 13];
        expect(isNoSplitPosition(55, 40, offsets)).toBe(false);
        expect(isNoSplitPosition(60, 40, offsets)).toBe(false);
        expect(isNoSplitPosition(65, 40, offsets)).toBe(false);
        expect(isNoSplitPosition(75, 40, offsets)).toBe(false);
    });

    it('should handle single offset (fixed interval)', () => {
        // start=0, offsets=[5] → 5, 10, 15, 20...
        expect(isNoSplitPosition(5, 0, [5])).toBe(true);
        expect(isNoSplitPosition(10, 0, [5])).toBe(true);
        expect(isNoSplitPosition(15, 0, [5])).toBe(true);
        expect(isNoSplitPosition(7, 0, [5])).toBe(false);
    });

    it('should return false for empty offsets', () => {
        expect(isNoSplitPosition(50, 40, [])).toBe(false);
    });

    it('should return false for zero or negative offsets', () => {
        expect(isNoSplitPosition(50, 40, [0])).toBe(false);
        expect(isNoSplitPosition(50, 40, [-5])).toBe(false);
    });

    it('should handle start=0', () => {
        expect(isNoSplitPosition(10, 0, [10])).toBe(true);
        expect(isNoSplitPosition(5, 0, [10])).toBe(false);
    });
});

describe('shouldPaymentBeNoSplit', () => {
    it('should return false when no position in cart hits integral', () => {
        // Currently 45 paid, cart has 3 items → positions 46, 47, 48
        // Integral at 50 (start=40, offsets=[10])
        expect(shouldPaymentBeNoSplit(45, 3, 40, [10])).toBe(false);
    });

    it('should return true when one position in cart hits integral', () => {
        // Currently 48 paid, cart has 3 items → positions 49, 50, 51
        // Integral at 50
        expect(shouldPaymentBeNoSplit(48, 3, 40, [10])).toBe(true);
    });

    it('should return true when the first position hits integral', () => {
        // Currently 49 paid, cart has 1 item → position 50
        expect(shouldPaymentBeNoSplit(49, 1, 40, [10])).toBe(true);
    });

    it('should return false for empty offsets', () => {
        expect(shouldPaymentBeNoSplit(49, 1, 40, [])).toBe(false);
    });

    it('should handle single inscription cart', () => {
        expect(shouldPaymentBeNoSplit(49, 1, 40, [10])).toBe(true);
        expect(shouldPaymentBeNoSplit(48, 1, 40, [10])).toBe(false);
    });
});

describe('getNextIntegralPositions', () => {
    it('should return correct positions with single offset', () => {
        const positions = getNextIntegralPositions(40, [10], 5);
        expect(positions).toEqual([50, 60, 70, 80, 90]);
    });

    it('should return correct positions with cycling offsets', () => {
        const positions = getNextIntegralPositions(40, [10, 7, 13], 6);
        expect(positions).toEqual([50, 57, 70, 80, 87, 100]);
    });

    it('should return empty array for empty offsets', () => {
        expect(getNextIntegralPositions(40, [], 5)).toEqual([]);
    });

    it('should respect count parameter', () => {
        const positions = getNextIntegralPositions(0, [5], 3);
        expect(positions).toEqual([5, 10, 15]);
    });
});
