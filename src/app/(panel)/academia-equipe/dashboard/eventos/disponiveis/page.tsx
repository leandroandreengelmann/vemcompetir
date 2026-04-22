import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SectionHeader } from "@/components/layout/SectionHeader";
import { getAvailableEventsAction } from '../registrations-actions';
import { AvailableEventsList } from '../components/available-events-list';
import { UserFocusIcon, XIcon } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';

interface PageProps {
    searchParams: Promise<{ atleta?: string }>;
}

export default async function EventosDisponiveisPage(props: PageProps) {
    const searchParams = await props.searchParams;
    const preSelectedAthleteId = searchParams?.atleta;

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
        .eq('role', 'atleta')
        .order('full_name', { ascending: true });

    const preSelectedAthlete = preSelectedAthleteId
        ? (athletes ?? []).find((a) => a.id === preSelectedAthleteId) ?? null
        : null;

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Eventos Disponíveis"
                description="Inscreva seus atletas em eventos de outras academias."
            />

            {preSelectedAthlete && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <UserFocusIcon size={22} weight="duotone" className="text-amber-700 dark:text-amber-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-panel-sm font-semibold text-amber-900 dark:text-amber-200">
                                Inscrevendo {preSelectedAthlete.full_name}
                            </p>
                            <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                                Escolha um evento abaixo para continuar. O atleta já estará pré-selecionado no formulário.
                            </p>
                        </div>
                    </div>
                    <Button
                        pill
                        size="sm"
                        asChild
                        className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white shadow-sm dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-amber-950"
                    >
                        <Link href="/academia-equipe/dashboard/eventos/disponiveis">
                            <XIcon size={16} weight="bold" className="mr-1" />
                            Cancelar
                        </Link>
                    </Button>
                </div>
            )}

            <AvailableEventsList
                events={events || []}
                athletes={athletes || []}
                preSelectedAthleteId={preSelectedAthleteId}
            />
        </div>
    );
}
