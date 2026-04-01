'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { consumeTokens } from '@/lib/token-utils';

export async function createInscriptionPackageAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autorizado.' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'academia/equipe' || !profile.tenant_id) return { error: 'Sem permissão.' };

    const event_id = formData.get('event_id') as string;
    const assigned_to_tenant_id = formData.get('assigned_to_tenant_id') as string;
    const total_credits = parseInt(formData.get('total_credits') as string, 10);
    const price_paid = parseFloat(formData.get('price_paid') as string) || 0;
    const excluded_divisions = formData.getAll('excluded_divisions') as string[];
    const notes = (formData.get('notes') as string)?.trim() || null;

    if (!event_id || !assigned_to_tenant_id || !total_credits || total_credits < 1) {
        return { error: 'Preencha todos os campos obrigatórios.' };
    }

    // Verify the event belongs to this tenant
    const { data: event } = await supabase
        .from('events')
        .select('id, tenant_id')
        .eq('id', event_id)
        .eq('tenant_id', profile.tenant_id)
        .single();

    if (!event) return { error: 'Evento não encontrado ou sem permissão.' };

    const adminClient = createAdminClient();

    // Bloqueia criação de pacote se gerenciamento de tokens não estiver ativo
    const { data: tenantCheck } = await adminClient
        .from('tenants')
        .select('token_management_enabled')
        .eq('id', profile.tenant_id)
        .single();

    if (!tenantCheck?.token_management_enabled) {
        return { error: 'Sua academia não tem o gerenciamento de tokens ativo. Entre em contato com o administrador.' };
    }

    // Consome tokens upfront (tokens são gastos no ato de criar o pacote)
    const tokenResult = await consumeTokens(profile.tenant_id, total_credits, {
        eventId: event_id,
        notes: `Pacote de ${total_credits} créditos criado`,
        createdBy: user.id,
    });
    if (!tokenResult.success && tokenResult.error) {
        return { error: tokenResult.error };
    }
    const tokenWarning = tokenResult.warning;

    const { data: pkg, error } = await adminClient
        .from('inscription_packages')
        .insert({
            event_id,
            created_by_tenant_id: profile.tenant_id,
            assigned_to_tenant_id,
            total_credits,
            used_credits: 0,
            excluded_divisions,
            price_paid,
            notes,
        })
        .select('id')
        .single();

    if (error) {
        // Rollback: estorna os tokens consumidos
        const { refundTokens } = await import('@/lib/token-utils');
        await refundTokens(profile.tenant_id, total_credits, {
            eventId: event_id,
            notes: 'Estorno por falha na criação do pacote',
            createdBy: user.id,
        });
        return { error: error.message };
    }

    // Atualiza a transação de token com o ID do pacote criado
    if (pkg?.id) {
        await adminClient
            .from('token_transactions')
            .update({ inscription_package_id: pkg.id })
            .eq('tenant_id', profile.tenant_id)
            .eq('type', 'consumed')
            .is('inscription_package_id', null)
            .order('created_at', { ascending: false })
            .limit(1);
    }

    revalidatePath('/academia-equipe/dashboard/academias-afiliadas');
    revalidatePath('/academia-equipe/dashboard/pacotes-inscricoes');
    return { success: true, warning: tokenWarning };
}

export async function getOwnedEventsAction() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

    if (!profile?.tenant_id) return [];

    const { data: events } = await supabase
        .from('events')
        .select('id, title, event_date')
        .eq('tenant_id', profile.tenant_id)
        .gte('event_date', new Date().toISOString())
        .order('event_date');

    return events ?? [];
}
