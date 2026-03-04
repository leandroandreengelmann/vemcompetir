import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { TeamCard } from './components/TeamCard';
import { ScoringConfigModal } from './components/ScoringConfigModal';
import { getTeamsByEventAction, getScoringConfigAction } from '../../equipes-actions';

interface TeamsPageProps {
    params: Promise<{ id: string }>;
}

export default async function EventTeamsPage(props: TeamsPageProps) {
    const { id } = await props.params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'academia/equipe') redirect('/login');

    // Fetch event to validate ownership and get title
    const { data: event, error } = await supabase
        .from('events')
        .select('id, title, tenant_id')
        .eq('id', id)
        .single();

    if (error || !event) notFound();

    // Only the organizer of this event can view this page
    if (event.tenant_id !== profile.tenant_id) redirect('/academia-equipe/dashboard/eventos');

    const [teams, scoringConfig] = await Promise.all([
        getTeamsByEventAction(id),
        getScoringConfigAction(id),
    ]);

    const totalAthletes = teams.reduce((acc, t) => acc + t.total_athletes, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild pill className="h-10 w-10 text-muted-foreground">
                    <Link href="/academia-equipe/dashboard/eventos">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <SectionHeader
                        title={`Equipes — ${event.title}`}
                        description={`${teams.length} equipe${teams.length !== 1 ? 's' : ''} · ${totalAthletes} atleta${totalAthletes !== 1 ? 's' : ''} inscritos`}
                    />
                </div>
                {teams.length > 0 && (
                    <ScoringConfigModal
                        eventId={id}
                        eventTitle={event.title}
                        teams={teams}
                        initialConfig={scoringConfig}
                    />
                )}
            </div>

            {/* Empty state */}
            {teams.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                    <div className="h-14 w-14 rounded-2xl bg-muted/40 flex items-center justify-center">
                        <Users className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-ui font-medium">Nenhuma equipe inscrita ainda</p>
                        <p className="text-caption text-muted-foreground mt-1">
                            Equipes aparecem aqui conforme atletas são inscritos no evento.
                        </p>
                    </div>
                </div>
            )}

            {/* Teams grid */}
            {teams.length > 0 && (
                <div className="flex flex-col gap-3">
                    {teams.map((team) => (
                        <TeamCard key={team.team_slug} team={team} eventId={id} />
                    ))}
                </div>
            )}
        </div>
    );
}
