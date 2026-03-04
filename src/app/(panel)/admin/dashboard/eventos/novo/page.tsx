import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminEventForm from '../components/admin-event-form';

export default async function AdminNovoEventoPage({
    searchParams
}: {
    searchParams: { academyId?: string }
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (adminProfile?.role !== 'admin_geral') redirect('/login');

    const adminClient = createAdminClient();

    // Fetch all academies to populate the select
    // We filter by role 'academia/equipe' and ensure they have a tenant_id
    const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, full_name, gym_name, tenant_id')
        .eq('role', 'academia/equipe')
        .not('tenant_id', 'is', null);

    const academies = profiles || [];

    // Optional: if academyId is provided in URL, we find its tenant_id
    let initialTenantId = '';
    if (searchParams.academyId) {
        const target = academies.find(a => a.id === searchParams.academyId);
        if (target) initialTenantId = target.tenant_id;
    }

    return (
        <AdminEventForm
            academies={academies}
            initialData={initialTenantId ? { tenant_id: initialTenantId } as any : undefined}
        />
    );
}
