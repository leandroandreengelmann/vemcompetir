'use server';

import { createClient } from '@/lib/supabase/server';
import { requireTenantScope } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';

// Add item to cart (create registration with status 'carrinho')
export async function addToCartAction(item: { eventId: string, athleteId: string, categoryId: string, price: number }) {
    const { profile, tenant_id } = await requireTenantScope();
    const supabase = await createClient();

    // Check if already exists (any status)
    const { data: existing } = await supabase
        .from('event_registrations')
        .select('id, status')
        .eq('event_id', item.eventId)
        .eq('athlete_id', item.athleteId)
        .eq('category_id', item.categoryId)
        .single();

    if (existing) {
        if (existing.status === 'carrinho') {
            // Update price if re-adding (category is same due to query above)
            await supabase
                .from('event_registrations')
                .update({
                    price: item.price
                })
                .eq('id', existing.id);

            return { success: true, message: 'Item atualizado no carrinho.' };
        }
        return { error: 'Atleta já inscrito nesta categoria.' };
    }

    const { error } = await supabase
        .from('event_registrations')
        .insert({
            event_id: item.eventId,
            athlete_id: item.athleteId,
            category_id: item.categoryId,
            registered_by: profile.id,
            tenant_id: tenant_id,
            status: 'carrinho',
            price: item.price
        });

    if (error) {
        console.error('Error adding to cart:', error);
        return { error: 'Erro ao adicionar ao carrinho.' };
    }

    revalidatePath('/academia-equipe/dashboard/eventos');
    return { success: true };
}

// Remove from cart (delete registration if status is 'carrinho')
export async function removeFromCartAction(registrationId: string) {
    const { profile } = await requireTenantScope();
    const supabase = await createClient();

    console.log(`[removeFromCart] Attempting to delete ${registrationId} for user ${profile.id}`);

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
        console.warn('[removeFromCart] No rows deleted. Possible mismatch of ID, User, or Status.');
        // We return success to simple UI, but in reality it failed to find item.
        // It's possible someone else deleted it or status changed?
        // Let's return error to alert user/dev.
        return { error: 'Item não encontrado ou não pode ser removido.' };
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
            created_at,
            price,
            created_at,
            price,
            athlete_id,
            category_id,
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

    // Process and group by event
    // We can do grouping client-side or here.
    // For now, return flat list with event info.

    // We need price! 
    // Price logic is complex (getEligibleCategoriesAction). 
    // Ideally we should store price snapshot or fetch it.
    // fetch price for each item? expensive.
    // For V1, let's fetch basic info. Price might be tricky if not stored.
    // Assuming we can fetch price again or it was stored? 
    // The DB schema doesn't seem to have 'price' column in event_registrations.
    // We might need to recalculate or add a column.
    // For now, we will re-calculate or assume 0 if expensive.
    // BETTER: The cart item addition should probably store the price if possible, or we fetch it.

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
    const supabase = await createClient();

    const { error } = await supabase
        .from('event_registrations')
        .update({
            status: 'carrinho',
            payment_id: null
        })
        .eq('id', registrationId)
        .eq('registered_by', profile.id)
        .eq('status', 'aguardando_pagamento');

    if (error) {
        console.error('reactivateCartItemAction error:', error);
        return { error: 'Erro ao reativar item na cesta.' };
    }

    revalidatePath('/academia-equipe/dashboard/eventos');
    return { success: true };
}
