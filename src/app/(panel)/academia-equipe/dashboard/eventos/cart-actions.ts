'use server';

import { createClient } from '@/lib/supabase/server';
import { requireTenantScope } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { consumeTokens } from '@/lib/token-utils';
import {
    isAbsolutoCategory,
    isEligible,
    isMasterLivre,
    parseAgeRangeFromText,
    AthleteProfile,
    CategoryRow,
} from '@/app/atleta/dashboard/campeonatos/lib/eligible-categories';
import { applyComboBundle } from '@/lib/apply-combo-bundle-to-cart';

// Add item to cart (create registration with status 'carrinho')
export async function addToCartAction(item: { eventId: string, athleteId: string, categoryId: string, price: number }) {
    const { profile, tenant_id } = await requireTenantScope();
    const supabase = await createClient();

    // Check if already exists (any active status)
    const { data: existing } = await supabase
        .from('event_registrations')
        .select('id, status')
        .eq('event_id', item.eventId)
        .eq('athlete_id', item.athleteId)
        .eq('category_id', item.categoryId)
        .in('status', ['carrinho', 'aguardando_pagamento', 'pago', 'pendente', 'confirmado', 'isento'])
        .maybeSingle();

    if (existing) {
        if (existing.status === 'carrinho') {
            // Preço será recalculado no servidor abaixo, mas para update rápido
            // mantemos o fluxo simples — o preço correto é aplicado na inserção
            return { success: true, message: 'Item já está no carrinho.' };
        }
        return { error: 'Atleta já inscrito nesta categoria.' };
    }

    const { data: event } = await supabase
        .from('events')
        .select('tenant_id')
        .eq('id', item.eventId)
        .single();

    const isOwnEvent = event?.tenant_id === tenant_id;

    // Get category info for promo detection
    const { data: category } = await supabase
        .from('category_rows')
        .select('table_id, categoria_completa')
        .eq('id', item.categoryId)
        .single();

    let promoType: string | null = null;
    if (category?.table_id) {
        const { data: override } = await supabase
            .from('event_category_overrides')
            .select('promo_type')
            .eq('event_id', item.eventId)
            .eq('category_id', item.categoryId)
            .maybeSingle();
        promoType = override?.promo_type ?? null;
    }

    // Validação server-side: calcular o preço correto no servidor
    let serverPrice = item.price;
    if (category?.table_id) {
        // 1. Preço base da tabela
        const { data: tableLink } = await supabase
            .from('event_category_tables')
            .select('registration_fee')
            .eq('event_id', item.eventId)
            .eq('category_table_id', category.table_id)
            .maybeSingle();

        // 2. Override por categoria
        const { data: override } = await supabase
            .from('event_category_overrides')
            .select('registration_fee')
            .eq('event_id', item.eventId)
            .eq('category_id', item.categoryId)
            .maybeSingle();

        const basePrice = override?.registration_fee ?? tableLink?.registration_fee ?? 0;

        // 3. Preço diferenciado por academia (prioridade máxima)
        const { data: tenantPricing } = await supabase
            .from('event_tenant_pricing')
            .select('registration_fee, promo_registration_fee')
            .eq('event_id', item.eventId)
            .eq('tenant_id', tenant_id)
            .eq('active', true)
            .maybeSingle();

        if (tenantPricing) {
            if (promoType) {
                // Categoria promo (ex: absoluto) → só sobrescreve se definiu promo_registration_fee
                if (tenantPricing.promo_registration_fee !== null) {
                    serverPrice = tenantPricing.promo_registration_fee;
                } else {
                    serverPrice = basePrice; // mantém preço padrão do absoluto
                }
            } else {
                serverPrice = tenantPricing.registration_fee;
            }
        } else {
            serverPrice = basePrice;
        }
    }

    const registrationId = crypto.randomUUID();

    const { error } = await supabase
        .from('event_registrations')
        .insert({
            id: registrationId,
            event_id: item.eventId,
            athlete_id: item.athleteId,
            category_id: item.categoryId,
            registered_by: profile.id,
            tenant_id: tenant_id,
            status: 'carrinho',
            price: serverPrice
        });

    if (error) {
        console.error('Error adding to cart:', error);
        return { error: 'Erro ao adicionar ao carrinho.' };
    }

    // PROMO: free_second_registration — only for third-party events
    if (
        promoType === 'free_second_registration' &&
        category?.table_id &&
        (await isAbsolutoCategory(category.categoria_completa))
    ) {
        const { data: athleteProfile } = await supabase
            .from('profiles')
            .select('sexo, belt_color, birth_date, weight')
            .eq('id', item.athleteId)
            .single();

        if (athleteProfile) {
            try {
                const result = await applyAcademyFreeCompanionCategory({
                    athleteId: item.athleteId,
                    eventId: item.eventId,
                    tableId: category.table_id,
                    absolutoRegistrationId: registrationId,
                    registeredBy: profile.id,
                    tenantId: tenant_id,
                    athleteProfile: {
                        sexo: athleteProfile.sexo,
                        belt_color: athleteProfile.belt_color,
                        birth_date: athleteProfile.birth_date,
                        weight: athleteProfile.weight,
                    },
                });
                revalidatePath('/academia-equipe/dashboard/eventos');
                if (result?.companionAdded) {
                    return { success: true, companionAdded: true, companionName: result.categoryName };
                }
            } catch (companionErr: any) {
                console.error('[promo] Falha ao adicionar companion (academia):', companionErr);
                revalidatePath('/academia-equipe/dashboard/eventos');
                return {
                    success: true,
                    companionAdded: false,
                    companionWarning: 'Não foi possível adicionar a categoria gratuita automaticamente. Tente novamente ou entre em contato com o suporte.',
                };
            }
        }
    }

    // PROMO: combo_bundle — só para eventos de terceiros, re-avalia após toda alteração
    if (!isOwnEvent) {
        await applyComboBundle({
            athleteId: item.athleteId,
            eventId: item.eventId,
            registeredById: profile.id,
            tenantId: tenant_id,
        });
    }

    revalidatePath('/academia-equipe/dashboard/eventos');
    return { success: true };
}

async function applyAcademyFreeCompanionCategory({
    athleteId,
    eventId,
    tableId,
    absolutoRegistrationId,
    registeredBy,
    tenantId,
    athleteProfile,
}: {
    athleteId: string;
    eventId: string;
    tableId: string;
    absolutoRegistrationId: string;
    registeredBy: string;
    tenantId: string;
    athleteProfile: AthleteProfile;
}) {
    const supabaseAdmin = createAdminClient();

    const { data: event } = await supabaseAdmin
        .from('events')
        .select('event_date')
        .eq('id', eventId)
        .single();

    const { data: alreadyRegistered } = await supabaseAdmin
        .from('event_registrations')
        .select('category_id')
        .eq('event_id', eventId)
        .eq('athlete_id', athleteId)
        .in('status', ['carrinho', 'aguardando_pagamento', 'pago', 'pendente', 'confirmado', 'isento']);

    const registeredCategoryIds = new Set(
        alreadyRegistered?.map((r: any) => r.category_id) || []
    );

    const { data: linkedTables } = await supabaseAdmin
        .from('event_category_tables')
        .select('category_table_id')
        .eq('event_id', eventId);

    const allTableIds = [
        tableId,
        ...((linkedTables || [])
            .map((lt: any) => lt.category_table_id)
            .filter((id: string) => id !== tableId))
    ];

    const fetchCategoriesForTables = async (tableIds: string[]): Promise<any[]> => {
        let result: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data: batch } = await supabaseAdmin
                .from('category_rows')
                .select('*')
                .in('table_id', tableIds)
                .order('id', { ascending: true })
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (!batch || batch.length === 0) {
                hasMore = false;
            } else {
                result = [...result, ...batch];
                hasMore = batch.length === pageSize;
                page++;
            }
        }
        return result;
    };

    const findBestCompanion = async (categories: any[]): Promise<{ cat: any; score: number } | null> => {
        let bestCategory: any = null;
        let bestScore = -1;

        for (const cat of categories) {
            if (await isAbsolutoCategory(cat.categoria_completa)) continue;
            if (registeredCategoryIds.has(cat.id)) continue;

            const match = await isEligible(athleteProfile, cat as CategoryRow, event?.event_date || null);
            if (!match.eligible) continue;

            let score = 0;
            const masterLivre = await isMasterLivre(cat.divisao_idade, cat.peso_min_kg, cat.peso_max_kg);
            if (!masterLivre) {
                const ageRange = await parseAgeRangeFromText(cat.divisao_idade, cat.categoria_completa, cat.idade);
                if (ageRange.parse_ok && !ageRange.wildcard) score += 1;
                if (cat.peso_min_kg !== null || cat.peso_max_kg !== null) score += 1;
            }

            if (score > bestScore || (score === bestScore && bestCategory && cat.categoria_completa < bestCategory.categoria_completa)) {
                bestScore = score;
                bestCategory = cat;
            }
        }

        return bestCategory ? { cat: bestCategory, score: bestScore } : null;
    };

    // Pass 1: same table
    const sameTableCategories = await fetchCategoriesForTables([tableId]);
    let found = await findBestCompanion(sameTableCategories);

    // Pass 2: all event tables (fallback)
    if (!found && allTableIds.length > 1) {
        const allCategories = await fetchCategoriesForTables(allTableIds);
        found = await findBestCompanion(allCategories);
    }

    const bestCategory = found?.cat ?? null;

    if (!bestCategory) {
        console.log('[promo] Nenhuma categoria companion elegível encontrada para atleta', athleteId);
        return { companionAdded: false };
    }

    const { error: companionError } = await supabaseAdmin
        .from('event_registrations')
        .insert({
            event_id: eventId,
            athlete_id: athleteId,
            category_id: bestCategory.id,
            registered_by: registeredBy,
            tenant_id: tenantId,
            status: 'carrinho',
            price: 0,
            promo_type_applied: 'free_second_registration',
            promo_source_id: absolutoRegistrationId,
        });

    if (companionError) {
        console.error('[promo] Erro ao inserir companion (academia):', companionError);
        throw new Error(`Erro ao adicionar categoria gratuita: ${companionError.message}`);
    }

    return { companionAdded: true, categoryName: bestCategory.categoria_completa };
}

// Remove from cart (delete registration if status is 'carrinho')
export async function removeFromCartAction(registrationId: string) {
    const { profile, tenant_id } = await requireTenantScope();
    const supabaseAdmin = createAdminClient();
    const supabase = await createClient();

    // Busca event_id e athlete_id antes de deletar (para re-avaliar combo depois)
    const { data: regToRemove } = await supabaseAdmin
        .from('event_registrations')
        .select('event_id, athlete_id')
        .eq('id', registrationId)
        .maybeSingle();

    // Cascade: remove any companion granted by this registration
    await supabaseAdmin
        .from('event_registrations')
        .delete()
        .eq('promo_source_id', registrationId)
        .eq('registered_by', profile.id)
        .eq('status', 'carrinho');

    const { error, count } = await supabase
        .from('event_registrations')
        .delete({ count: 'exact' })
        .eq('id', registrationId)
        .eq('registered_by', profile.id)
        .eq('status', 'carrinho');

    if (error) {
        console.error('[removeFromCart] DB Error:', error);
        return { error: 'Erro ao remover do carrinho.' };
    }

    if (count === 0) {
        return { error: 'Item não encontrado ou não pode ser removido.' };
    }

    // PROMO: combo_bundle — re-avalia após remoção (pode desfazer o combo)
    if (regToRemove?.event_id && regToRemove?.athlete_id) {
        await applyComboBundle({
            athleteId: regToRemove.athlete_id,
            eventId: regToRemove.event_id,
            registeredById: profile.id,
            tenantId: tenant_id,
        });
    }

    revalidatePath('/academia-equipe/dashboard/eventos');
    return { success: true };
}

// Get cart items grouped by event
export async function getCartItemsAction() {
    const { profile } = await requireTenantScope();
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('event_registrations')
        .select(`
            id,
            event_id,
            status,
            created_at,
            price,
            athlete_id,
            category_id,
            promo_type_applied,
            promo_source_id,
            athlete:profiles!athlete_id (full_name),
            category:category_rows!category_id (divisao_idade, categoria_peso, faixa, sexo, categoria_completa, peso_min_kg, peso_max_kg),
            event:events!event_id (title, event_date)
        `)
        .eq('registered_by', profile.id)
        .in('status', ['carrinho', 'aguardando_pagamento'])
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching cart:', error);
        return [];
    }

    return data;
}

// Checkout (update status to 'pendente')
export async function checkoutCartAction(eventIds?: string[]) {
    const { profile } = await requireTenantScope();
    const supabase = await createClient();

    let query = supabase
        .from('event_registrations')
        .update({ status: 'pendente' })
        .eq('registered_by', profile.id)
        .eq('status', 'carrinho');

    if (eventIds && eventIds.length > 0) {
        query = query.in('event_id', eventIds);
    }

    const { error } = await query;

    if (error) {
        return { error: 'Erro ao finalizar inscrições.' };
    }

    revalidatePath('/academia-equipe/dashboard/eventos');
    return { success: true };
}

// Reactivate pending item back to cart
export async function reactivateCartItemAction(registrationId: string) {
    const { profile } = await requireTenantScope();
    const supabaseAdmin = createAdminClient();

    // Check if this is a companion — block individual reactivation
    const { data: reg } = await supabaseAdmin
        .from('event_registrations')
        .select('promo_source_id')
        .eq('id', registrationId)
        .eq('registered_by', profile.id)
        .single();

    if (reg?.promo_source_id) {
        return { error: 'Esta categoria foi adicionada gratuitamente com o Absoluto. Para reativá-la sem o Absoluto, cancele-a e adicione-a normalmente pelo valor cheio.' };
    }

    // Reactivate the source item
    const { error } = await supabaseAdmin
        .from('event_registrations')
        .update({ status: 'carrinho', payment_id: null })
        .eq('id', registrationId)
        .eq('registered_by', profile.id)
        .eq('status', 'aguardando_pagamento');

    if (error) {
        console.error('reactivateCartItemAction error:', error);
        return { error: 'Erro ao reativar item na cesta.' };
    }

    // Cascade: reactivate companion if any
    await supabaseAdmin
        .from('event_registrations')
        .update({ status: 'carrinho', payment_id: null })
        .eq('promo_source_id', registrationId)
        .eq('registered_by', profile.id)
        .eq('status', 'aguardando_pagamento');

    revalidatePath('/academia-equipe/dashboard/eventos');
    return { success: true };
}

// Cancel a pending registration (aguardando_pagamento) placed by this academy user
export async function cancelPendingCartItemAction(registrationId: string) {
    const { profile } = await requireTenantScope();
    const supabaseAdmin = createAdminClient();

    // Cascade: cancel any companion granted by this registration
    await supabaseAdmin
        .from('event_registrations')
        .delete()
        .eq('promo_source_id', registrationId)
        .eq('registered_by', profile.id)
        .in('status', ['aguardando_pagamento', 'pendente', 'carrinho']);

    const { data, error } = await supabaseAdmin
        .from('event_registrations')
        .delete()
        .eq('id', registrationId)
        .eq('registered_by', profile.id)
        .in('status', ['aguardando_pagamento', 'pendente'])
        .select();

    if (error) {
        console.error('cancelPendingCartItemAction error:', error);
        throw new Error('Erro ao cancelar inscrição pendente.');
    }

    if (!data || data.length === 0) {
        throw new Error('Nenhuma inscrição foi removida. Ela pode já ter sido processada ou não existe.');
    }

    revalidatePath('/academia-equipe/dashboard/eventos');
    return { success: true };
}

// Returns which of the given eventIds are "own events" for a tenant that uses own Asaas API
export async function getOwnApiEventIdsAction(eventIds: string[]): Promise<string[]> {
    if (eventIds.length === 0) return [];

    const { tenant_id } = await requireTenantScope();
    const admin = createAdminClient();

    const { data: tenant } = await admin
        .from('tenants')
        .select('use_own_asaas_api')
        .eq('id', tenant_id)
        .single();

    if (!tenant?.use_own_asaas_api) return [];

    const { data: events } = await admin
        .from('events')
        .select('id')
        .in('id', eventIds)
        .eq('tenant_id', tenant_id);

    return (events ?? []).map(e => e.id);
}

// Checkout own-event registrations with manual payment method
export async function checkoutOwnEventAction(
    eventId: string,
    items: Array<{
        registrationId: string;
        paymentMethod: 'pago_em_mao' | 'pix_direto' | 'isento';
        amount: number;
        notes?: string;
    }>
) {
    const { profile, tenant_id } = await requireTenantScope();
    const admin = createAdminClient();

    // Verify event belongs to tenant
    const { data: event } = await admin
        .from('events')
        .select('tenant_id')
        .eq('id', eventId)
        .single();

    if (!event || event.tenant_id !== tenant_id) {
        return { error: 'Evento nao pertence a esta academia.' };
    }

    // Verify cart items belong to this user
    const registrationIds = items.map(i => i.registrationId);
    const { data: cartItems } = await admin
        .from('event_registrations')
        .select('id')
        .in('id', registrationIds)
        .eq('event_id', eventId)
        .eq('registered_by', profile.id)
        .eq('status', 'carrinho');

    if (!cartItems || cartItems.length !== items.length) {
        return { error: 'Alguns itens nao foram encontrados no carrinho.' };
    }

    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);

    // Create payment record
    const paymentId = crypto.randomUUID();
    const { error: payError } = await admin.from('payments').insert({
        id: paymentId,
        event_id: eventId,
        payer_type: 'ACADEMY',
        payer_ref: profile.id,
        tenant_id_organizer: tenant_id,
        qtd_inscricoes: items.length,
        total_inscricoes_snapshot: totalAmount,
        fee_unit_snapshot: 0,
        fee_saas_gross_snapshot: 0,
        fee_source: 'none',
        asaas_payment_id: `own_event_${paymentId}`,
        payment_method: 'PIX',
        status: 'PAID',
        is_authorized_free: true,
    });

    if (payError) {
        console.error('checkoutOwnEventAction payment error:', payError);
        return { error: 'Erro ao criar registro de pagamento.' };
    }

    // Update each registration with specific own-event status
    const statusMap: Record<string, string> = {
        pago_em_mao: 'pago_em_mao',
        pix_direto: 'pix_direto',
        isento: 'isento_evento_proprio',
    };

    for (const item of items) {
        const status = statusMap[item.paymentMethod] || 'isento_evento_proprio';
        const { error } = await admin
            .from('event_registrations')
            .update({
                status,
                payment_id: paymentId,
                manual_payment_method: item.paymentMethod,
                manual_amount: item.amount,
                manual_payment_notes: item.notes || null,
            })
            .eq('id', item.registrationId);

        if (error) {
            console.error('checkoutOwnEventAction reg update error:', error);
        }
    }

    // Consume tokens
    await consumeTokens(tenant_id, items.length, {
        eventId,
        notes: `${items.length} inscricao(oes) confirmada(s) - evento proprio`,
        createdBy: profile.id,
    });

    revalidatePath('/academia-equipe/dashboard/eventos');
    return { success: true, payment_id: paymentId };
}
