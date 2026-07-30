import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { getAcademiesWithMasters } from '@/lib/academies-with-masters';
import { InscreverAtletaClient } from './client';

export default async function InscreverAtletaPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'academia/equipe') redirect('/login');
    if (!profile.tenant_id) redirect('/academia-equipe/dashboard');

    // Eventos da própria academia
    const { data: events } = await supabase
        .from('events')
        .select('id, title, event_date, inscricoes_encerradas')
        .eq('tenant_id', profile.tenant_id)
        .order('event_date', { ascending: false });

    // Academias com conta no sistema E com ao menos um professor cadastrado
    const academies = await getAcademiesWithMasters();

    return (
        <div className="space-y-6 container mx-auto max-w-4xl">
            <SectionHeader
                title="Inscrever atleta"
                description="Cadastre e inscreva qualquer atleta em um dos seus eventos, escolhendo a academia e o mestre dele."
            />
            <InscreverAtletaClient
                events={(events || []).map(e => ({
                    id: e.id,
                    title: e.title,
                    eventDate: e.event_date,
                    closed: !!e.inscricoes_encerradas,
                }))}
                academies={academies}
            />
        </div>
    );
}
