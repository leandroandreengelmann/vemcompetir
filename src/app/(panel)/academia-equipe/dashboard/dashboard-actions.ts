'use server';

import { createClient } from '@/lib/supabase/server';
import { requireTenantScope } from '@/lib/auth-guards';

export async function getDashboardStatsAction() {
    const { profile, tenant_id } = await requireTenantScope();
    if (!profile || !tenant_id) return null;

    const supabase = await createClient();

    // 1. Total Atletas
    const { count: totalAtletas } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant_id)
        .eq('role', 'atleta');

    // 2. Total Inscrições
    const { count: totalInscricoes } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant_id)
        .neq('status', 'carrinho');

    // 3. Eventos Participando (Distinct event_id from registrations)
    const { data: participations } = await supabase
        .from('event_registrations')
        .select('event_id')
        .eq('tenant_id', tenant_id)
        .neq('status', 'carrinho');

    const uniqueParticipatingEvents = new Set(participations?.map(p => p.event_id) || []);
    const totalEventosParticipando = uniqueParticipatingEvents.size;

    // 4. Eventos Organizados
    const { count: totalEventosOrganizados } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant_id);

    // 5. Financeiro
    // Fetch SAS tax from system_settings
    const { data: taxSetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'own_event_registration_tax')
        .single();

    const sasTax = parseFloat(taxSetting?.value || '5.00');

    // Get all registrations with event organizer info to differentiate fees
    const { data: regs } = await supabase
        .from('event_registrations')
        .select(`
            price,
            event:events!event_id (
                tenant_id
            )
        `)
        .eq('tenant_id', tenant_id)
        .neq('status', 'carrinho');

    let totalSpending = 0;
    let totalSasFees = 0;

    regs?.forEach(reg => {
        const isOwnEvent = (reg.event as any)?.tenant_id === tenant_id;
        if (isOwnEvent) {
            // If own event, the academy pays the SAS fee per registration
            totalSasFees += sasTax;
            totalSpending += sasTax;
        } else {
            // If third-party event, the academy pays the registration price
            totalSpending += Number(reg.price || 0);
        }
    });

    return {
        totalAtletas: totalAtletas || 0,
        totalInscricoes: totalInscricoes || 0,
        totalEventosParticipando,
        totalEventosOrganizados: totalEventosOrganizados || 0,
        totalSpending,
        totalSasFees
    };
}
