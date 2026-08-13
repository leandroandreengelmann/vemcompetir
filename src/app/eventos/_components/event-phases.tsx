import { Ticket, ClipboardCheck, Trophy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PublicEvent } from '../_data/events';

interface EventPhasesProps {
    event: PublicEvent;
}

type PhaseStatus = 'completed' | 'current' | 'upcoming';

interface Phase {
    key: string;
    label: string;
    description: string;
    icon: React.ElementType;
    status: PhaseStatus;
    daysLeft?: number | null;
}

// Datas "somente-dia" (ex: "2026-08-20") vêm do banco sem horário. `new Date(...)`
// as interpreta como meia-noite UTC, o que "puxa" um dia pra trás em fusos negativos
// (Brasil). Aqui montamos a data direto no fuso local pra não perder esse dia.
function parseLocalDate(dateStr: string): Date {
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (dateOnlyMatch) {
        const [, year, month, day] = dateOnlyMatch;
        return new Date(Number(year), Number(month) - 1, Number(day));
    }
    return new Date(dateStr);
}

function endOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

function startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatDate(date: Date): string {
    return format(date, "dd 'de' MMMM", { locale: ptBR });
}

export function EventPhases({ event }: EventPhasesProps) {
    const now = new Date();

    const eventStart = event.starts_at ? parseLocalDate(event.starts_at) : null;
    const eventEnd = event.event_end_date ? parseLocalDate(event.event_end_date) : eventStart;
    const registrationEnd = event.registration_end_date ? parseLocalDate(event.registration_end_date) : null;
    const deadlineDays = event.category_change_deadline_days ?? 0;

    const checagemDeadline = eventStart && deadlineDays > 0
        ? (() => {
            const d = new Date(eventStart);
            d.setDate(d.getDate() - deadlineDays);
            return d;
        })()
        : null;

    // Inscrições e Checagem correm em paralelo desde a publicação do evento -
    // cada uma fica "atual" independentemente até o próprio prazo vencer.
    const inscricoesPast = !!event.inscricoes_encerradas || (registrationEnd ? now > endOfDay(registrationEnd) : false);

    const daysUntilRegistrationEnd = registrationEnd
        ? Math.ceil((startOfDay(registrationEnd).getTime() - startOfDay(now).getTime()) / 86400000)
        : null;

    const phases: Phase[] = [
        {
            key: 'inscricoes',
            label: 'Inscrições',
            description: event.inscricoes_encerradas
                ? 'Encerradas'
                : registrationEnd
                    ? `Até ${formatDate(registrationEnd)}`
                    : 'Sem prazo definido',
            icon: Ticket,
            status: inscricoesPast ? 'completed' : 'current',
            daysLeft: !inscricoesPast ? daysUntilRegistrationEnd : null,
        },
    ];

    if (checagemDeadline) {
        const checagemPast = now > endOfDay(checagemDeadline);
        phases.push({
            key: 'checagem',
            label: 'Checagem',
            description: `Troca de categoria até ${formatDate(checagemDeadline)}`,
            icon: ClipboardCheck,
            status: checagemPast ? 'completed' : 'current',
        });
    }

    // Competição só começa na data do evento - antes disso fica "a seguir"
    let competicaoStatus: PhaseStatus = 'upcoming';
    if (eventStart) {
        if (eventEnd && now > endOfDay(eventEnd)) competicaoStatus = 'completed';
        else if (now >= startOfDay(eventStart)) competicaoStatus = 'current';
    }

    phases.push({
        key: 'competicao',
        label: 'Competição',
        description: eventStart
            ? (eventEnd && eventEnd.toDateString() !== eventStart.toDateString()
                ? `${formatDate(eventStart)} a ${formatDate(eventEnd)}`
                : formatDate(eventStart))
            : 'Data a definir',
        icon: Trophy,
        status: competicaoStatus,
    });

    // Contagem regressiva até o início do evento
    const daysUntilEvent = eventStart
        ? Math.ceil((startOfDay(eventStart).getTime() - startOfDay(now).getTime()) / 86400000)
        : null;

    const n = phases.length;
    const lineInset = `${100 / (n * 2)}%`;

    return (
        <div className="max-w-4xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12 px-6">
                <div className="flex flex-col gap-2">
                    <h2 className="text-h1 font-black uppercase tracking-widest text-foreground">
                        Fases do Evento
                    </h2>
                    <div className="h-2 w-16 bg-foreground rounded-full" />
                </div>

                {competicaoStatus === 'upcoming' && daysUntilEvent !== null && daysUntilEvent > 0 && (
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center justify-center h-16 w-16 rounded-2xl bg-success text-white shrink-0 shadow-lg shadow-success/30">
                            <span className="text-2xl font-black leading-none tabular-nums">
                                {daysUntilEvent}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-wider leading-none mt-1">
                                {daysUntilEvent === 1 ? 'dia' : 'dias'}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-panel-sm font-black uppercase tracking-widest text-foreground">
                                Faltam
                            </span>
                            <span className="text-panel-sm text-muted-foreground">
                                para o evento
                            </span>
                        </div>
                    </div>
                )}

                {competicaoStatus === 'current' && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-success/10 shrink-0">
                        <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                        <span className="text-panel-sm font-black uppercase tracking-widest text-success">
                            Evento em andamento
                        </span>
                    </div>
                )}
            </div>

            <div className="relative px-6">
                {/* Linha conectora - desktop */}
                {n > 1 && (
                    <div
                        className="hidden sm:block absolute top-6 h-0.5 bg-black/10"
                        style={{ left: lineInset, right: lineInset }}
                    />
                )}
                {/* Linha conectora - mobile */}
                {n > 1 && (
                    <div className="sm:hidden absolute left-12 top-6 bottom-6 w-0.5 bg-black/10" />
                )}

                <div className="relative flex flex-col sm:flex-row gap-8 sm:gap-4">
                    {phases.map((phase) => {
                        const Icon = phase.icon;
                        return (
                            <div
                                key={phase.key}
                                className="relative z-10 flex items-start sm:flex-col sm:items-center gap-4 sm:gap-3 sm:flex-1 sm:text-center"
                            >
                                <div
                                    className={cn(
                                        'flex items-center justify-center h-12 w-12 rounded-full border-2 shrink-0 transition-all',
                                        phase.status === 'completed' && 'bg-foreground border-foreground text-background',
                                        phase.status === 'current' && 'bg-success border-success text-white shadow-lg shadow-success/30 scale-110',
                                        phase.status === 'upcoming' && 'bg-background border-black/20 text-muted-foreground/50'
                                    )}
                                >
                                    {phase.status === 'completed' ? (
                                        <Check className="h-5 w-5" strokeWidth={3} />
                                    ) : (
                                        <Icon className="h-5 w-5" />
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center sm:justify-center gap-2">
                                        <p
                                            className={cn(
                                                'text-ui font-black uppercase tracking-widest',
                                                phase.status === 'current' ? 'text-success' : 'text-foreground'
                                            )}
                                        >
                                            {phase.label}
                                        </p>
                                        {phase.status === 'current' && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-success/10 text-success text-[9px] font-black uppercase tracking-wider">
                                                Agora
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-panel-sm text-muted-foreground mt-1">
                                        {phase.description}
                                    </p>
                                    {typeof phase.daysLeft === 'number' && phase.daysLeft >= 0 && (
                                        <div className="flex items-center gap-3 mt-3 sm:justify-center">
                                            <div className="flex flex-col items-center justify-center h-16 w-16 rounded-2xl bg-success text-white shrink-0 shadow-lg shadow-success/30">
                                                <span className="text-2xl font-black leading-none tabular-nums">
                                                    {phase.daysLeft}
                                                </span>
                                                <span className="text-[9px] font-black uppercase tracking-wider leading-none mt-1">
                                                    {phase.daysLeft === 1 ? 'dia' : 'dias'}
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-panel-sm font-black uppercase tracking-widest text-foreground">
                                                    {phase.daysLeft === 0 ? 'Último dia' : 'Faltam'}
                                                </span>
                                                <span className="text-panel-sm text-muted-foreground">
                                                    para as inscrições
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
