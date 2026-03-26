/**
 * Re-avalia o combo_bundle para um atleta em um evento após qualquer alteração no carrinho.
 * Chamado após add/remove de itens nos dois fluxos (atleta e academia).
 * Nunca lança exceção — falhas são logadas e retornam { comboApplied: false, comboRemoved: false }.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { evaluateComboBundle, ComboCartItem } from './combo-bundle';

interface ApplyComboBundleParams {
    athleteId: string;
    eventId: string;
    registeredById: string;
    tenantId: string | null;
}

export interface ApplyComboBundleResult {
    comboApplied: boolean;
    comboRemoved: boolean;
}

export async function applyComboBundle({
    athleteId,
    eventId,
    registeredById,
    tenantId,
}: ApplyComboBundleParams): Promise<ApplyComboBundleResult> {
    try {
        const supabaseAdmin = createAdminClient();

        // 1. Verificar se existe combo ativo para este evento
        const { data: combo } = await supabaseAdmin
            .from('event_combo_bundles')
            .select('id, bundle_total')
            .eq('event_id', eventId)
            .eq('is_active', true)
            .maybeSingle();

        if (!combo) return { comboApplied: false, comboRemoved: false };

        // 2. Buscar todos os itens no carrinho do atleta neste evento
        let cartQuery = supabaseAdmin
            .from('event_registrations')
            .select('id, category_id, promo_type_applied, category_rows(uniforme, categoria_peso)')
            .eq('event_id', eventId)
            .eq('athlete_id', athleteId)
            .eq('status', 'carrinho');

        if (tenantId) {
            cartQuery = (cartQuery as any)
                .eq('tenant_id', tenantId)
                .eq('registered_by', registeredById);
        } else {
            cartQuery = (cartQuery as any)
                .is('tenant_id', null)
                .eq('registered_by', registeredById);
        }

        const { data: cartRegistrations } = await cartQuery;
        if (!cartRegistrations || cartRegistrations.length === 0) {
            return { comboApplied: false, comboRemoved: false };
        }

        const cartItems: ComboCartItem[] = (cartRegistrations as any[]).map((r) => ({
            id: r.id,
            category_id: r.category_id,
            category_rows: r.category_rows ?? null,
            promo_type_applied: r.promo_type_applied,
        }));

        // 3. Avaliar combo
        const { complete, slotPricePerItem, comboRegistrationIds } = evaluateComboBundle(cartItems, combo);

        if (complete) {
            // Aplicar preço do combo nos 4 slots
            const { error } = await supabaseAdmin
                .from('event_registrations')
                .update({
                    price: slotPricePerItem,
                    promo_type_applied: 'combo_bundle',
                    promo_source_id: null,
                })
                .in('id', comboRegistrationIds);

            if (error) {
                console.error('[combo] Erro ao aplicar combo_bundle:', error);
                return { comboApplied: false, comboRemoved: false };
            }

            console.log('[combo] combo_bundle aplicado — atleta:', athleteId, 'evento:', eventId, 'slots:', comboRegistrationIds);
            return { comboApplied: true, comboRemoved: false };
        } else {
            // Combo incompleto — reverter itens que estavam marcados como combo
            const comboItems = cartItems.filter(i => i.promo_type_applied === 'combo_bundle');

            if (comboItems.length === 0) {
                return { comboApplied: false, comboRemoved: false };
            }

            let reverted = 0;
            for (const item of comboItems) {
                const standardPrice = await getStandardPrice(supabaseAdmin, eventId, item.category_id);
                const { error } = await supabaseAdmin
                    .from('event_registrations')
                    .update({
                        price: standardPrice,
                        promo_type_applied: null,
                        promo_source_id: null,
                    })
                    .eq('id', item.id);

                if (error) {
                    console.error('[combo] Erro ao reverter combo item', item.id, error);
                } else {
                    reverted++;
                }
            }

            console.log('[combo] combo_bundle revertido — atleta:', athleteId, 'evento:', eventId, `${reverted}/${comboItems.length} itens revertidos`);
            return { comboApplied: false, comboRemoved: reverted > 0 };
        }
    } catch (err) {
        console.error('[combo] applyComboBundle falhou silenciosamente:', err);
        return { comboApplied: false, comboRemoved: false };
    }
}

/**
 * Busca o preço padrão de uma categoria em um evento.
 * Primeiro verifica override individual, depois o preço base da tabela.
 */
async function getStandardPrice(
    supabaseAdmin: ReturnType<typeof createAdminClient>,
    eventId: string,
    categoryId: string
): Promise<number> {
    try {
        // Override individual tem prioridade
        const { data: override } = await supabaseAdmin
            .from('event_category_overrides')
            .select('registration_fee')
            .eq('event_id', eventId)
            .eq('category_id', categoryId)
            .maybeSingle();

        if (override?.registration_fee != null) return Number(override.registration_fee);

        // Fallback: preço da tabela de categorias vinculada ao evento
        const { data: catRow } = await supabaseAdmin
            .from('category_rows')
            .select('table_id')
            .eq('id', categoryId)
            .single();

        if (!catRow?.table_id) return 0;

        const { data: tableLink } = await supabaseAdmin
            .from('event_category_tables')
            .select('registration_fee')
            .eq('event_id', eventId)
            .eq('category_table_id', catRow.table_id)
            .single();

        return Number(tableLink?.registration_fee ?? 0);
    } catch {
        return 0;
    }
}
