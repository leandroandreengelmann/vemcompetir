/**
 * Lógica pura do combo_bundle.
 * Classifica categorias nos 4 slots do combo e avalia se o combo está completo.
 * Sem dependências de Next.js ou Supabase — pode ser importado de qualquer lugar.
 */

export type ComboSlot = 'gi_absoluto' | 'gi_regular' | 'nogi_absoluto' | 'nogi_regular';

function normalize(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * Classifica uma categoria em um dos 4 slots do combo com base nos campos
 * `uniforme` ("Kimono Gi" / "No-Gi") e `categoria_peso` ("Absoluto" / outros).
 * Retorna null se a categoria não se encaixa em nenhum slot (ex: modalidade desconhecida).
 */
export function classifyComboSlot(
    uniforme: string | null,
    categoria_peso: string | null
): ComboSlot | null {
    if (!uniforme) return null;

    const uni = normalize(uniforme);
    const peso = normalize(categoria_peso || '');

    const isNogi = uni.includes('no-gi') || uni.includes('nogi');
    const isGi = !isNogi && (uni.includes('kimono') || uni.includes(' gi') || uni === 'gi');

    if (!isGi && !isNogi) return null;

    const isAbsoluto = peso === 'absoluto';

    if (isGi) return isAbsoluto ? 'gi_absoluto' : 'gi_regular';
    return isAbsoluto ? 'nogi_absoluto' : 'nogi_regular';
}

export interface ComboCartItem {
    id: string;
    category_id: string;
    category_rows: {
        uniforme: string | null;
        categoria_peso: string | null;
    } | null;
    promo_type_applied?: string | null;
}

export interface ComboConfig {
    bundle_total: number;
}

export interface ComboEvaluation {
    complete: boolean;
    slotPricePerItem: number;
    comboRegistrationIds: string[];
}

/**
 * Avalia se o carrinho contém os 4 slots do combo.
 * - Ignora itens com outro promo_type_applied (ex: free_second_registration)
 * - Cada slot deve ter exatamente 1 item (duplicatas invalidam o combo)
 */
export function evaluateComboBundle(
    cartItems: ComboCartItem[],
    combo: ComboConfig
): ComboEvaluation {
    const slotMap: Record<ComboSlot, string[]> = {
        gi_absoluto: [],
        gi_regular: [],
        nogi_absoluto: [],
        nogi_regular: [],
    };

    for (const item of cartItems) {
        // Não considera itens de outra promoção ativa
        if (item.promo_type_applied && item.promo_type_applied !== 'combo_bundle') continue;

        const slot = classifyComboSlot(
            item.category_rows?.uniforme ?? null,
            item.category_rows?.categoria_peso ?? null
        );
        if (!slot) continue;

        slotMap[slot].push(item.id);
    }

    const allSlots: ComboSlot[] = ['gi_absoluto', 'gi_regular', 'nogi_absoluto', 'nogi_regular'];
    const complete = allSlots.every(slot => slotMap[slot].length === 1);

    const comboRegistrationIds = complete
        ? allSlots.map(slot => slotMap[slot][0])
        : [];

    // Arredonda para evitar drift de centavos (ex: 240/4 = 60.00 exato)
    const slotPricePerItem = Math.round((combo.bundle_total / 4) * 100) / 100;

    return { complete, slotPricePerItem, comboRegistrationIds };
}
