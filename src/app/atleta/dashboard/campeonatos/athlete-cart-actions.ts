'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
    isAbsolutoCategory,
    isEligible,
    isMasterLivre,
    parseAgeRangeFromText,
    AthleteProfile,
    CategoryRow,
} from './lib/eligible-categories';

export async function addToAthleteCartAction(item: {
    eventId: string;
    categoryId: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Não autenticado');

    // Get full profile — needed for eligibility + role check
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, sexo, belt_color, birth_date, weight')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'atleta') {
        throw new Error('Apenas atletas podem se inscrever diretamente.');
    }

    // Check for duplicate
    const { data: existing } = await supabase
        .from('event_registrations')
        .select('id')
        .eq('event_id', item.eventId)
        .eq('athlete_id', user.id)
        .eq('category_id', item.categoryId)
        .in('status', ['carrinho', 'aguardando_pagamento', 'pago', 'pendente', 'confirmado'])
        .maybeSingle();

    if (existing) {
        throw new Error('Você já possui inscrição nesta categoria.');
    }

    // SECURE PRICE CALCULATION
    const { data: category } = await supabase
        .from('category_rows')
        .select('table_id, categoria_completa')
        .eq('id', item.categoryId)
        .single();

    let finalPrice = 0;
    let promoType: string | null = null;

    if (category?.table_id) {
        const { data: tableLink } = await supabase
            .from('event_category_tables')
            .select('registration_fee')
            .eq('event_id', item.eventId)
            .eq('category_table_id', category.table_id)
            .single();

        const { data: override } = await supabase
            .from('event_category_overrides')
            .select('registration_fee, promo_type')
            .eq('event_id', item.eventId)
            .eq('category_id', item.categoryId)
            .maybeSingle();

        finalPrice = override?.registration_fee ?? tableLink?.registration_fee ?? 0;
        promoType = override?.promo_type ?? null;
    }

    // Generate registration ID upfront so we can reference it in the companion insert
    const registrationId = crypto.randomUUID();

    // Insert main registration
    const { error } = await supabase
        .from('event_registrations')
        .insert({
            id: registrationId,
            event_id: item.eventId,
            athlete_id: user.id,
            category_id: item.categoryId,
            registered_by: user.id,
            tenant_id: null,
            status: 'carrinho',
            price: finalPrice,
        });

    if (error) {
        console.error('addToAthleteCartAction error:', error);
        throw new Error('Erro ao adicionar à cesta.');
    }

    // PROMO: free_second_registration
    // When athlete adds an Absoluto with this promo, find the best eligible regular
    // category in the same table and add it for free (price = 0).
    if (
        promoType === 'free_second_registration' &&
        category?.table_id &&
        (await isAbsolutoCategory(category.categoria_completa))
    ) {
        try {
            const result = await applyFreeCompanionCategory({
                userId: user.id,
                eventId: item.eventId,
                tableId: category.table_id,
                absolutoRegistrationId: registrationId,
                athleteProfile: {
                    sexo: profile.sexo,
                    belt_color: profile.belt_color,
                    birth_date: profile.birth_date,
                    weight: profile.weight,
                },
            });
            // Companion added — return flag so UI can show confirmation
            if (result?.companionAdded) {
                return { success: true, companionAdded: true, companionName: result.categoryName };
            }
        } catch (companionErr: any) {
            // Absoluto was already added successfully — don't roll it back.
            // Return a warning so the UI can inform the athlete.
            console.error('[promo] Falha ao adicionar companion, Absoluto mantido:', companionErr);
            return { success: true, companionAdded: false, companionWarning: 'Não foi possível adicionar a categoria gratuita automaticamente. Tente novamente ou entre em contato com o suporte.' };
        }
    }

    return { success: true };
}

/**
 * Finds the best eligible non-Absoluto category in the same table as the Absoluto
 * and inserts it into the cart at R$0, linked to the Absoluto registration.
 */
async function applyFreeCompanionCategory({
    userId,
    eventId,
    tableId,
    absolutoRegistrationId,
    athleteProfile,
}: {
    userId: string;
    eventId: string;
    tableId: string;
    absolutoRegistrationId: string;
    athleteProfile: AthleteProfile;
}) {
    try {
        const supabaseAdmin = createAdminClient();

        // Get event date for age calculation
        const { data: event } = await supabaseAdmin
            .from('events')
            .select('event_date')
            .eq('id', eventId)
            .single();

        // Get category IDs the athlete is already registered in for this event
        const { data: alreadyRegistered } = await supabaseAdmin
            .from('event_registrations')
            .select('category_id')
            .eq('event_id', eventId)
            .eq('athlete_id', userId)
            .in('status', ['carrinho', 'aguardando_pagamento', 'pago', 'pendente', 'confirmado', 'isento']);

        const registeredCategoryIds = new Set(
            alreadyRegistered?.map((r: any) => r.category_id) || []
        );

        // Build the list of table IDs to search.
        // Strategy: same table first. If no companion found there (e.g. Absolutos are in
        // their own "special" table), expand to ALL tables linked to the event.
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

        // Pass 1: same table only
        const sameTableCategories = await fetchCategoriesForTables([tableId]);
        let found = await findBestCompanion(sameTableCategories);

        // Pass 2: all event tables (fallback when Absolutos are in a separate table)
        if (!found && allTableIds.length > 1) {
            console.log('[promo] Nenhum companion na mesma tabela, expandindo para todas as tabelas do evento...');
            const allCategories = await fetchCategoriesForTables(allTableIds);
            found = await findBestCompanion(allCategories);
        }

        const bestCategory = found?.cat ?? null;

        if (!bestCategory) {
            console.log('[promo] Nenhuma categoria companion elegível encontrada para atleta', userId);
            return;
        }

        console.log('[promo] Inserindo companion grátis:', bestCategory.categoria_completa, 'para atleta', userId);

        // Use admin client to bypass RLS on insert
        const { error: companionError } = await supabaseAdmin
            .from('event_registrations')
            .insert({
                event_id: eventId,
                athlete_id: userId,
                category_id: bestCategory.id,
                registered_by: userId,
                tenant_id: null,
                status: 'carrinho',
                price: 0,
                promo_type_applied: 'free_second_registration',
                promo_source_id: absolutoRegistrationId,
            });

        if (companionError) {
            console.error('[promo] Erro ao inserir companion:', companionError);
            throw new Error(`Erro ao adicionar categoria gratuita: ${companionError.message}`);
        }

        console.log('[promo] Companion inserido com sucesso.');
        return { companionAdded: true, categoryName: bestCategory.categoria_completa };
    } catch (err) {
        // Re-throw so the caller (addToAthleteCartAction) can decide how to handle
        throw err;
    }
}

export async function removeFromAthleteCartAction(registrationId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Não autenticado');

    // Remove any sponsored (free) category that was granted by this registration
    // Uses admin client to ensure bypass of RLS (companion was inserted via admin)
    const supabaseAdmin = createAdminClient();
    await supabaseAdmin
        .from('event_registrations')
        .delete()
        .eq('promo_source_id', registrationId)
        .eq('athlete_id', user.id)
        .eq('status', 'carrinho');

    // Remove the registration itself
    const { error } = await supabase
        .from('event_registrations')
        .delete()
        .eq('id', registrationId)
        .eq('registered_by', user.id)
        .eq('status', 'carrinho')
        .is('tenant_id', null);

    if (error) {
        console.error('removeFromAthleteCartAction error:', error);
        throw new Error('Erro ao remover da cesta.');
    }

    return { success: true };
}

export async function getAthleteCartAction() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from('event_registrations')
        .select(`
            id,
            event_id,
            athlete_id,
            category_id,
            price,
            status,
            promo_type_applied,
            promo_source_id,
            event:events(title),
            category:category_rows(categoria_completa, faixa, divisao_idade, categoria_peso, peso_min_kg, peso_max_kg)
        `)
        .eq('athlete_id', user.id)
        .eq('registered_by', user.id)
        .is('tenant_id', null)
        .in('status', ['carrinho', 'aguardando_pagamento']);

    if (error) {
        console.error('getAthleteCartAction error:', error);
        return [];
    }

    return data || [];
}

export async function reactivateAthleteCartItemAction(registrationId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Não autenticado');

    const supabaseAdmin = createAdminClient();

    // Fetch the registration to check if it's a promo companion
    const { data: reg } = await supabaseAdmin
        .from('event_registrations')
        .select('promo_source_id')
        .eq('id', registrationId)
        .eq('athlete_id', user.id)
        .single();

    // If it's a companion: block individual reactivation
    // The athlete must either reactivate via the source (Absoluto) or cancel and re-add at full price
    if (reg?.promo_source_id) {
        throw new Error('Esta categoria foi adicionada gratuitamente com o Absoluto. Para reativá-la sem o Absoluto, cancele-a e adicione-a normalmente na lista de categorias pelo valor cheio.');
    }

    // Reactivate the item itself using admin to avoid RLS issues
    const { error } = await supabaseAdmin
        .from('event_registrations')
        .update({
            status: 'carrinho',
            payment_id: null
        })
        .eq('id', registrationId)
        .eq('athlete_id', user.id)
        .eq('status', 'aguardando_pagamento');

    if (error) {
        console.error('reactivateAthleteCartItemAction error:', error);
        throw new Error('Erro ao reativar item na cesta.');
    }

    // Cascade: also reactivate any companion granted by this registration
    await supabaseAdmin
        .from('event_registrations')
        .update({
            status: 'carrinho',
            payment_id: null
        })
        .eq('promo_source_id', registrationId)
        .eq('athlete_id', user.id)
        .eq('status', 'aguardando_pagamento');

    return { success: true };
}

export async function cancelPendingRegistrationAction(registrationId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Não autenticado');

    const supabaseAdmin = createAdminClient();

    // Cascade: remove any companion granted by this registration (promo_source_id = registrationId)
    await supabaseAdmin
        .from('event_registrations')
        .delete()
        .eq('promo_source_id', registrationId)
        .eq('athlete_id', user.id)
        .in('status', ['aguardando_pagamento', 'pendente', 'carrinho']);

    // Only allow deletion if the status is aguardando_pagamento ou pendente
    // registered_by ensures the athlete can only cancel their own self-registrations (not academia-created ones)
    const { data, error } = await supabaseAdmin
        .from('event_registrations')
        .delete()
        .eq('id', registrationId)
        .eq('athlete_id', user.id)
        .eq('registered_by', user.id)
        .in('status', ['aguardando_pagamento', 'pendente'])
        .select();

    if (error) {
        console.error('cancelPendingRegistrationAction error:', error);
        throw new Error('Erro ao cancelar inscrição pendente.');
    }

    if (!data || data.length === 0) {
        throw new Error('Nenhuma inscrição foi removida. Ela pode já ter sido processada ou não existe.');
    }

    return { success: true };
}
