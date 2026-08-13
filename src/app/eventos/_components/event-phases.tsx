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
    return format(date, "dd 'de' MMM", { locale: ptBR });
}

export function EventPhases({ event }: EventPhasesProps) {
    const now = new Date();

    const eventStart = event.starts_at ? new Date(event.starts_at) : null;
    const eventEnd = event.event_end_date ? new Date(event.event_end_date) : eventStart;
    const registrationEnd = event.registration_end_date ? new Date(event.registration_end_date) : null;
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

    const n = phases.length;
    const lineInset = `${100 / (n * 2)}%`;

    return (
        <div className="max-w-4xl mx-auto w-full">
            <div className="flex flex-col gap-2 mb-12 px-6">
                <h2 className="text-h1 font-black uppercase tracking-widest text-foreground">
                    Fases do Evento
                </h2>
                <div className="h-2 w-16 bg-foreground rounded-full" />
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
                                        phase.status === 'current' && 'bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-110',
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
                                                phase.status === 'current' ? 'text-primary' : 'text-foreground'
                                            )}
                                        >
                                            {phase.label}
                                        </p>
                                        {phase.status === 'current' && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-wider">
                                                Agora
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-panel-sm text-muted-foreground mt-1">
                                        {phase.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
