import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import TokensClient from './TokensClient';

export default async function TokensPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'academia/equipe' || !profile.tenant_id) {
        redirect('/academia-equipe/dashboard');
    }

    const adminClient = createAdminClient();

    const { data: tenant } = await adminClient
        .from('tenants')
        .select('inscription_token_balance, token_management_enabled')
        .eq('id', profile.tenant_id)
        .single();

    if (!tenant?.token_management_enabled) {
        redirect('/academia-equipe/dashboard');
    }

    const { data: transactions } = await adminClient
        .from('token_transactions')
        .select(`
            id,
            type,
            amount,
            balance_after,
            notes,
            created_at,
            event:events!event_id (title),
            registration:event_registrations!registration_id (
                athlete:profiles!athlete_id (full_name)
            )
        `)
        .eq('tenant_id', profile.tenant_id)
        // Ordenação determinística: dentro do mesmo created_at, o lançamento
        // mais recente é o de menor balance_after — evita o extrato "pular".
        .order('created_at', { ascending: false })
        .order('balance_after', { ascending: true })
        .limit(100);

    // Totais calculados sobre TODO o histórico (não só os 100 exibidos acima).
    const { data: allMovements } = await adminClient
        .from('token_transactions')
        .select('type, amount')
        .eq('tenant_id', profile.tenant_id);

    const summary = (allMovements ?? []).reduce(
        (acc, t) => {
            if (t.type === 'consumed') acc.consumed += Math.abs(t.amount);
            else if (t.type === 'refunded') acc.refunded += t.amount;
            else if (t.type === 'granted' || t.type === 'adjusted') acc.granted += t.amount;
            acc.count += 1;
            return acc;
        },
        { consumed: 0, refunded: 0, granted: 0, count: 0 },
    );

    return (
        <TokensClient
            balance={tenant.inscription_token_balance}
            transactions={(transactions ?? []) as any}
            summary={summary}
        />
    );
}
