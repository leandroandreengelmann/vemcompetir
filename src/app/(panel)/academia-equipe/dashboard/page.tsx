import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SectionHeader } from "@/components/layout/SectionHeader";
import { EventDashboardsSection } from './components/EventDashboardsSection';
import { EmptyDashboardState } from './components/EmptyDashboardState';

export default async function AcademiaEquipeDashboard() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'academia/equipe') redirect('/login');

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminSupabase = createAdminClient();

    // Check if the tenant has any events created
    const { count } = await adminSupabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', profile.tenant_id);

    const hasEvents = (count || 0) > 0;

    return (
        <div className="space-y-8">
            <SectionHeader
                title="Dashboard"
            />

            {hasEvents ? <EventDashboardsSection /> : <EmptyDashboardState />}
        </div>
    );
}
