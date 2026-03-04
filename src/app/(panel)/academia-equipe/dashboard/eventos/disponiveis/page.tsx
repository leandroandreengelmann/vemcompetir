import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SectionHeader } from "@/components/layout/SectionHeader";
import { getAvailableEventsAction } from '../registrations-actions';
import { AvailableEventsList } from '../components/available-events-list';

export default async function EventosDisponiveisPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'academia/equipe') redirect('/login');

    if (!profile?.tenant_id) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Você não está vinculado a uma equipe / academia. Entre em contato com o suporte.
            </div>
        );
    }

    // Fetch available events
    const events = await getAvailableEventsAction();

    // Fetch my athletes
    const { data: athletes } = await supabase
        .from('profiles')
        .select('id, full_name, sexo, belt_color, birth_date, weight')
        .eq('tenant_id', profile.tenant_id)
        .eq('role', 'atleta') // Assuming checking role is enough, or checking if they are students
        .order('full_name', { ascending: true });

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Eventos Disponíveis"
                description="Inscreva seus atletas em eventos de outras academias."
            />

            <AvailableEventsList
                events={events || []}
                athletes={athletes || []}
            />
        </div>
    );
}
