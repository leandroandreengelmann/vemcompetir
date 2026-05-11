import Link from 'next/link';
import { ArrowsClockwiseIcon, ArrowRightIcon } from '@phosphor-icons/react/dist/ssr';
import { createClient } from '@/lib/supabase/server';

const PAID_STATUSES = ['pago', 'paga', 'confirmado', 'isento'];

export async function CategoryChangeNotificationWrapper() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: regs } = await supabase
        .from('event_registrations')
        .select(`
            id,
            status,
            event:events!event_id (
                id,
                title,
                event_date,
                category_change_deadline_days
            )
        `)
        .eq('athlete_id', user.id)
        .in('status', PAID_STATUSES);

    if (!regs || regs.length === 0) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eligible = regs
        .map((r: any) => {
            const ev = Array.isArray(r.event) ? r.event[0] : r.event;
            if (!ev) return null;
            const deadlineDays = ev.category_change_deadline_days ?? 0;
            if (deadlineDays === 0) return null;

            const eventDate = new Date(ev.event_date);
            const deadlineDate = new Date(eventDate);
            deadlineDate.setDate(deadlineDate.getDate() - deadlineDays);
            if (today > deadlineDate) return null;

            return {
                registrationId: r.id as string,
                eventTitle: ev.title as string,
                deadlineLabel: deadlineDate.toLocaleDateString('pt-BR'),
            };
        })
        .filter(Boolean) as Array<{ registrationId: string; eventTitle: string; deadlineLabel: string }>;

    if (eligible.length === 0) return null;

    return (
        <div className="w-full max-w-lg md:max-w-xl px-4 z-20 mb-4 space-y-3 motion-safe:animate-in motion-safe:slide-in-from-top-4 motion-safe:fade-in motion-safe:duration-500">
            {eligible.map((item) => (
                <Link
                    key={item.registrationId}
                    href={`/atleta/dashboard/inscricoes/${item.registrationId}/trocar-categoria`}
                    aria-label={`Trocar categoria do evento ${item.eventTitle}. Prazo até ${item.deadlineLabel}.`}
                    className="block group"
                >
                    <div
                        className="relative rounded-2xl border-2 border-red-500/50 bg-red-50 p-3.5 flex items-center justify-between gap-3 shadow-[0_0_24px_rgba(239,68,68,0.15)] hover:bg-red-100 hover:border-red-600 transition-all"
                    >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="relative shrink-0 h-9 w-9">
                                <span className="absolute inset-0 rounded-full bg-red-500 opacity-60 motion-safe:animate-ping" />
                                <div className="relative h-9 w-9 rounded-full flex items-center justify-center bg-red-600">
                                    <ArrowsClockwiseIcon size={18} weight="duotone" className="text-white" />
                                </div>
                            </div>

                            <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-red-600">
                                    Trocar Categoria
                                </span>
                                <span className="text-panel-sm font-bold text-natural-800 truncate">
                                    {item.eventTitle}
                                </span>
                                <span className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                                    Prazo: <span className="text-red-600 font-bold">{item.deadlineLabel}</span>
                                </span>
                            </div>
                        </div>

                        <ArrowRightIcon
                            size={22}
                            weight="duotone"
                            className="shrink-0 transition-transform group-hover:translate-x-1 text-red-600"
                        />
                    </div>
                </Link>
            ))}
        </div>
    );
}
