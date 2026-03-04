import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import AdminEventForm from '../../components/admin-event-form';

export default async function AdminEditarEventoPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params;
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

    // 1. Fetch the event
    const { data: event, error: eventError } = await adminClient
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

    if (eventError || !event) {
        notFound();
    }

    // 2. Fetch all academies to populate the select
    const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, full_name, gym_name, tenant_id')
        .eq('role', 'academia/equipe')
        .not('tenant_id', 'is', null);

    const academies = profiles || [];

    return (
        <AdminEventForm
            academies={academies}
            initialData={event}
        />
    );
}
