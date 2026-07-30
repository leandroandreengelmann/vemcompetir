import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { SectionHeader } from "@/components/layout/SectionHeader";
import { getAcademiesWithMasters } from '@/lib/academies-with-masters';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ExternalAthleteWizard } from './wizard';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function InscreverExternoPage(props: PageProps) {
    const { id } = await props.params;

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

    const { data: event, error } = await supabase
        .from('events')
        .select('id, title, tenant_id, inscricoes_encerradas')
        .eq('id', id)
        .single();

    if (error || !event) notFound();

    // Inscrição de atleta externo só faz sentido para o organizador do próprio evento.
    if (event.tenant_id !== profile.tenant_id) {
        redirect(`/academia-equipe/dashboard/eventos/${id}/inscrever`);
    }

    // Academias com conta no sistema E com ao menos um professor cadastrado
    const academies = await getAcademiesWithMasters();

    return (
        <div className="space-y-6 container mx-auto max-w-4xl">
            <div className="flex items-center gap-4 mb-8">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" asChild pill className="h-10 w-10 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <Link href={`/academia-equipe/dashboard/gestao-evento/${id}`}>
                                <ArrowLeftIcon size={20} weight="duotone" />
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Voltar para a gestão do evento</TooltipContent>
                </Tooltip>
                <div className="flex-1">
                    <SectionHeader
                        title="Inscrever atleta externo"
                        description={`Cadastre e inscreva um atleta no evento ${event.title}`}
                    />
                </div>
            </div>

            {event.inscricoes_encerradas ? (
                <div className="rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 p-6 text-amber-800 dark:text-amber-300 font-semibold">
                    As inscrições para este evento foram encerradas.
                </div>
            ) : (
                <ExternalAthleteWizard
                    eventId={event.id}
                    eventTitle={event.title}
                    academies={academies}
                />
            )}
        </div>
    );
}
