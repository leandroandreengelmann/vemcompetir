import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';
import { SectionHeader } from "@/components/layout/SectionHeader";
import { getDashboardStatsAction } from './dashboard-actions';
import { StatsCards } from './components/stats-cards';
import { EventDashboardsSection } from './components/EventDashboardsSection';

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

    const stats = await getDashboardStatsAction();

    return (
        <div className="space-y-8">
            <SectionHeader
                title="Dashboard"
                description={`Bem-vindo, ${profile?.full_name || profile?.gym_name}. Acompanhe o desempenho da sua academia.`}
                descriptionClassName="text-base font-medium"
            />

            {stats && <StatsCards stats={stats} />}

            <EventDashboardsSection />
        </div>
    );
}
