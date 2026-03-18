import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SectionHeader } from "@/components/layout/SectionHeader";
import { EventDashboardsSection } from './components/EventDashboardsSection';
import { EmptyDashboardState } from './components/EmptyDashboardState';
import { StatsCards } from './components/stats-cards';
import { getDashboardStatsAction } from './dashboard-actions';

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

    // Fetch stats and event count in parallel
    const [stats, { count }] = await Promise.all([
        getDashboardStatsAction(),
        adminSupabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', profile.tenant_id),
    ]);

    const hasEvents = (count || 0) > 0;

    return (
        <div className="space-y-8">
            <SectionHeader title="Dashboard" />

            {stats && hasEvents && <StatsCards stats={stats} />}

            {hasEvents ? <EventDashboardsSection /> : <EmptyDashboardState />}
        </div>
    );
}
