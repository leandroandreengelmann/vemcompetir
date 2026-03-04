import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SectionHeader } from "@/components/layout/SectionHeader";
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

    return (
        <div className="space-y-8">
            <SectionHeader
                title="Dashboard"
            />

            <EventDashboardsSection />
        </div>
    );
}
