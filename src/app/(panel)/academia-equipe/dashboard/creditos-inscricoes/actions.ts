'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function getEventCategoriesAction(eventId: string) {
    const adminClient = createAdminClient();

    const { data: eventTables } = await adminClient
        .from('event_category_tables')
        .select('category_table_id')
        .eq('event_id', eventId);

    if (!eventTables || eventTables.length === 0) return [];

    const tableIds = eventTables.map((t: any) => t.category_table_id);

    const { data: rows } = await adminClient
        .from('category_rows')
        .select('id, categoria_completa, divisao_idade, faixa, categoria_peso, sexo, peso_min_kg, peso_max_kg')
        .in('table_id', tableIds)
        .order('categoria_completa');

    return rows ?? [];
}

export async function registerWithCreditAction(
    packageId: string,
    eventId: string,
    athleteId: string,
    categoryId: string,
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autorizado.' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

    if (!profile?.tenant_id) return { error: 'Sem permissão.' };

    const adminClient = createAdminClient();

    // Fetch and validate package
    const { data: pkg } = await adminClient
        .from('inscription_packages')
        .select('id, total_credits, used_credits, excluded_divisions, assigned_to_tenant_id, event_id')
        .eq('id', packageId)
        .single();

    if (!pkg) return { error: 'Pacote não encontrado.' };
    if (pkg.assigned_to_tenant_id !== profile.tenant_id) return { error: 'Sem permissão para usar este pacote.' };
    if (pkg.event_id !== eventId) return { error: 'Pacote não é válido para este evento.' };
    if (pkg.used_credits >= pkg.total_credits) return { error: 'Créditos esgotados neste pacote.' };

    // Check division restriction (block logic)
    const excluded: string[] = pkg.excluded_divisions ?? [];
    if (excluded.length > 0) {
        const { data: category } = await adminClient
            .from('category_rows')
            .select('divisao_idade')
            .eq('id', categoryId)
            .single();

        const div = category?.divisao_idade ?? '';
        const isExcluded = excluded.some(ex => ex.toLowerCase() === div.toLowerCase());
        if (isExcluded) {
            return { error: `Este pacote não permite inscrições na divisão "${div}".` };
        }
    }

    // Check duplicate registration
    const { data: existing } = await adminClient
        .from('event_registrations')
        .select('id')
        .eq('event_id', eventId)
        .eq('athlete_id', athleteId)
        .eq('category_id', categoryId)
        .maybeSingle();

    if (existing) return { error: 'Atleta já inscrito nesta categoria.' };

    // Create registration with isento status and package reference
    const { error: regError } = await adminClient
        .from('event_registrations')
        .insert({
            event_id: eventId,
            athlete_id: athleteId,
            category_id: categoryId,
            registered_by: user.id,
            tenant_id: profile.tenant_id,
            status: 'isento',
            package_id: packageId,
        });

    if (regError) return { error: regError.message };

    // Increment used_credits
    const { error: updateError } = await adminClient
        .from('inscription_packages')
        .update({ used_credits: pkg.used_credits + 1 })
        .eq('id', packageId);

    if (updateError) console.error('Erro ao atualizar créditos:', updateError);

    revalidatePath('/academia-equipe/dashboard/creditos-inscricoes');
    return { success: true };
}
