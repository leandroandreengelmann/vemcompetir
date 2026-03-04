'use server';

import { createClient } from '@/lib/supabase/server';

export async function addToAthleteCartAction(item: {
    eventId: string;
    categoryId: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Não autenticado');

    // Get athlete profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
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
        .select('table_id')
        .eq('id', item.categoryId)
        .single();

    let finalPrice = 0;

    if (category?.table_id) {
        const { data: tableLink } = await supabase
            .from('event_category_tables')
            .select('registration_fee')
            .eq('event_id', item.eventId)
            .eq('category_table_id', category.table_id)
            .single();

        const { data: override } = await supabase
            .from('event_category_overrides')
            .select('registration_fee')
            .eq('event_id', item.eventId)
            .eq('category_id', item.categoryId)
            .maybeSingle();

        finalPrice = override?.registration_fee ?? tableLink?.registration_fee ?? 0;
    }

    const { error } = await supabase
        .from('event_registrations')
        .insert({
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

    return { success: true };
}

export async function removeFromAthleteCartAction(registrationId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Não autenticado');

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
