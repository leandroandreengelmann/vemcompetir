import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, UsersIcon } from '@phosphor-icons/react/dist/ssr';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" asChild pill className="h-10 w-10 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <Link href="/academia-equipe/dashboard/eventos">
                                <ArrowLeftIcon size={20} weight="duotone" />
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Voltar para eventos</TooltipContent>
                </Tooltip>
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
                        <UsersIcon size={28} weight="duotone" className="text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-panel-sm font-medium">Nenhuma equipe inscrita ainda</p>
                        <p className="text-panel-sm text-muted-foreground mt-1">
                            Equipes aparecem aqui conforme atletas são inscritos no evento.
                        </p>
                    </div>
                </div>
            )}

            {/* Teams grid */}
            {teams.length > 0 && (
                <div className="flex flex-col gap-3">
                    {teams.map((team) => (
                        <TeamCard key={team.team_slug} team={team} eventId={id} eventTitle={event.title} />
                    ))}
                </div>
            )}
        </div>
    );
}
