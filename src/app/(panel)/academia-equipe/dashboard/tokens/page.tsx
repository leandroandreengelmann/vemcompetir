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
        .order('created_at', { ascending: false })
        .limit(100);

    return (
        <TokensClient
            balance={tenant.inscription_token_balance}
            transactions={(transactions ?? []) as any}
        />
    );
}
