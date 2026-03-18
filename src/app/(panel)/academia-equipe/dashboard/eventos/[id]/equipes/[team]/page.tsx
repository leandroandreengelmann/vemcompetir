import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AthleteTeamList } from '../components/AthleteTeamList';
import { getAthletesByTeamAction } from '../../../equipes-actions';

interface TeamDetailPageProps {
    params: Promise<{ id: string; team: string }>;
}

export default async function TeamDetailPage(props: TeamDetailPageProps) {
    const { id, team } = await props.params;
    const teamSlug = decodeURIComponent(team);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'academia/equipe') redirect('/login');

    // Validate event ownership
    const { data: event, error } = await supabase
        .from('events')
        .select('id, title, tenant_id')
        .eq('id', id)
        .single();

    if (error || !event) notFound();
    if (event.tenant_id !== profile.tenant_id) redirect('/academia-equipe/dashboard/eventos');

    const athletes = await getAthletesByTeamAction(id, teamSlug);

    // Use original gym_name from first athlete (we stored it in getAthletesByTeamAction)
    const teamDisplayName = athletes.length > 0 && athletes[0].gym_name
        ? athletes[0].gym_name
        : teamSlug.replace(/\b\w/g, (c) => c.toUpperCase());

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" asChild pill className="h-10 w-10 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <Link href={`/academia-equipe/dashboard/eventos/${id}/equipes`}>
                                <ArrowLeftIcon size={20} weight="duotone" />
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Voltar para equipes</TooltipContent>
                </Tooltip>
                <div className="flex-1">
                    <SectionHeader
                        title={teamDisplayName}
                        description={`${athletes.length} atleta${athletes.length !== 1 ? 's' : ''} · ${event.title}`}
                    />
                </div>
            </div>

            {/* Athletes table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-panel-md font-semibold">Atletas da Equipe</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <AthleteTeamList athletes={athletes} />
                </CardContent>
            </Card>
        </div>
    );
}
