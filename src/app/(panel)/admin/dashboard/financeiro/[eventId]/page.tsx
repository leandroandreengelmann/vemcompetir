import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, CalendarIcon, BuildingsIcon } from '@phosphor-icons/react/dist/ssr';
import { getEventFinanceiroDetail } from './actions';
import { EventFinanceiroClient } from './EventFinanceiroClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const EVENT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    publicado: {
        label: 'Publicado',
        className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
    },
    aprovado: {
        label: 'Aprovado',
        className: 'bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300 dark:border-sky-500/30',
    },
    pendente: {
        label: 'Pendente',
        className: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
    },
    rejeitado: {
        label: 'Rejeitado',
        className: 'bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-300 dark:border-red-500/30',
    },
    encerrado: {
        label: 'Encerrado',
        className: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:text-zinc-400 dark:border-zinc-500/30',
    },
};

export default async function EventFinanceiroPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const { eventId } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin_geral') redirect('/login');

    const data = await getEventFinanceiroDetail(eventId);
    if (!data) notFound();

    const { event } = data;

    return (
        <div className="space-y-6">
            <SectionHeader
                title={event.title}
                description="Detalhamento financeiro completo — atletas, status, comissões e repasses"
                rightElement={
                    <Button variant="outline" pill asChild className="h-11 gap-2 font-semibold shadow-sm">
                        <Link href="/admin/dashboard/financeiro">
                            <ArrowLeftIcon size={20} weight="duotone" />
                            Voltar ao Financeiro
                        </Link>
                    </Button>
                }
            />

            {/* Event Meta */}
            <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="px-3 py-1.5 text-panel-sm font-semibold">
                    {event.organizer_name}
                </Badge>
                {event.event_date && (
                    <Badge variant="outline" className="px-3 py-1.5 text-panel-sm font-semibold">
                        {format(new Date(event.event_date.slice(0, 10) + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </Badge>
                )}
                <Badge
                    variant="outline"
                    className={`px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider ${
                        EVENT_STATUS_CONFIG[event.status]?.className ?? ''
                    }`}
                >
                    {EVENT_STATUS_CONFIG[event.status]?.label ?? event.status}
                </Badge>
            </div>

            <EventFinanceiroClient data={data} />
        </div>
    );
}
