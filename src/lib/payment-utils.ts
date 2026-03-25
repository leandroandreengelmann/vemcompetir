export interface SplitConfig {
    walletId: string;
    fixedValue: number;
}

/**
 * Calculates the split for Asaas based on total value and platform fee.
 * In Asaas split:
 * - fixedValue: The amount that goes to the subaccount (organizer).
 * - Remainder: Stays in the main account (platform).
 */
export function calculateAsaasSplit(
    totalValue: number,
    platformFeeGross: number,
    organizerWalletId: string | null
): SplitConfig[] | undefined {
    // No split if it's the platform's own event or no fee is charged
    if (!organizerWalletId || platformFeeGross <= 0) {
        return undefined;
    }

    // Ensure we don't send a negative or zero value to the organizer
    const organizerAmount = Math.max(0, totalValue - platformFeeGross);

    // Asaas requires fixedValue to be formatted to 2 decimal places
    const fixedValue = parseFloat(organizerAmount.toFixed(2));

    // If organizer receives nothing, no split needed — all goes to platform
    if (fixedValue <= 0) {
        return undefined;
    }

    return [
        {
            walletId: organizerWalletId,
            fixedValue: fixedValue,
        }
    ];
}
