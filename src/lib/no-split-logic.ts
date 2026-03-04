/**
 * Pure utility for no-split (cobrança integral) position calculation.
 * No database dependencies — easily unit-testable.
 */

/**
 * Determines if a given paid inscription position should be "no-split" (integral).
 *
 * The rule works with cycling offsets:
 * - After `startAfterPaid` inscriptions, the first integral position is startAfterPaid + offsets[0]
 * - The next is that position + offsets[1]
 * - Then + offsets[2], and so on, cycling through offsets
 *
 * @param paidPosition - 1-indexed position of the inscription being paid
 * @param startAfterPaid - integral rule starts after this number of paid inscriptions
 * @param offsets - array of intervals that cycle (e.g., [10, 7, 13])
 * @returns true if the position is an integral (no-split) position
 */
export function isNoSplitPosition(
    paidPosition: number,
    startAfterPaid: number,
    offsets: number[]
): boolean {
    if (!offsets || offsets.length === 0) return false;
    if (paidPosition <= startAfterPaid) return false;
    if (offsets.some(o => o <= 0)) return false;

    // Walk through the integral positions until we pass the target
    let currentIntegralPos = startAfterPaid;
    let offsetIndex = 0;

    while (currentIntegralPos < paidPosition) {
        currentIntegralPos += offsets[offsetIndex % offsets.length];
        if (currentIntegralPos === paidPosition) return true;
        offsetIndex++;
    }

    return false;
}

/**
 * Checks if any inscription in a range [startPos, startPos + count - 1]
 * falls on a no-split position. Used when a cart has multiple inscriptions.
 *
 * @param currentPaidCount - how many inscriptions are already paid for this event
 * @param cartCount - how many inscriptions are in the current cart
 * @param startAfterPaid - integral rule starts after this number
 * @param offsets - cycling intervals
 * @returns true if the entire payment should be no-split
 */
export function shouldPaymentBeNoSplit(
    currentPaidCount: number,
    cartCount: number,
    startAfterPaid: number,
    offsets: number[]
): boolean {
    if (!offsets || offsets.length === 0) return false;

    for (let i = 1; i <= cartCount; i++) {
        const position = currentPaidCount + i;
        if (isNoSplitPosition(position, startAfterPaid, offsets)) {
            return true;
        }
    }

    return false;
}

/**
 * Returns the next N integral positions for preview purposes.
 *
 * @param startAfterPaid - integral rule starts after this number
 * @param offsets - cycling intervals
 * @param count - how many positions to return
 * @returns array of integral position numbers
 */
export function getNextIntegralPositions(
    startAfterPaid: number,
    offsets: number[],
    count: number = 10
): number[] {
    if (!offsets || offsets.length === 0) return [];

    const positions: number[] = [];
    let currentPos = startAfterPaid;
    let offsetIndex = 0;

    for (let i = 0; i < count; i++) {
        currentPos += offsets[offsetIndex % offsets.length];
        positions.push(currentPos);
        offsetIndex++;
    }

    return positions;
}
