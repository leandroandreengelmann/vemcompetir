import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { HourglassMediumIcon } from '@phosphor-icons/react';

interface EventSummaryProps {
    date: string;
    endDate?: string | null;
    location?: string;
    city?: string;
}

export function EventSummary({ date, endDate, location, city }: EventSummaryProps) {
    const formattedDate = format(new Date(date), "dd 'de' MMMM, yyyy", { locale: ptBR });
    const formattedEndDate = endDate ? format(new Date(endDate), "dd 'de' MMMM, yyyy", { locale: ptBR }) : null;
    const dateDisplay = formattedEndDate && formattedEndDate !== formattedDate
        ? `${formattedDate} – ${formattedEndDate}`
        : formattedDate;
    const fullLocation = location || city || 'Local a definir';

    const isEndingSoon = React.useMemo(() => {
        const eventDate = new Date(date);
        const today = new Date();
        const diffTime = eventDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= 14;
    }, [date]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                {/* 4) Metadados: Data + Local (Lado a lado no MOBILE v2.13 - Prompt Restritivo) */}
                <div className="space-y-1 min-w-0">
                    <p className="text-panel-sm uppercase tracking-wide text-muted-foreground">
                        Data do Evento
                    </p>
                    <p
                        className="text-panel-sm font-medium leading-snug break-words"
                        title={dateDisplay}
                    >
                        {dateDisplay}
                    </p>
                </div>

                <div className="space-y-1 min-w-0">
                    <p className="text-panel-sm uppercase tracking-wide text-muted-foreground">
                        Localização
                    </p>
                    <p
                        className="text-panel-sm font-medium leading-snug break-words truncate"
                        title={fullLocation}
                    >
                        {fullLocation}
                    </p>
                </div>
            </div>

            {isEndingSoon && (
                <div className="flex justify-center pt-1">
                    <div className="inline-flex items-center gap-2.5 bg-amber-100 border-2 border-amber-500 rounded-md px-4 py-2 shadow-md -rotate-2 ring-2 ring-amber-300 ring-offset-2 ring-offset-amber-50 animate-in fade-in zoom-in-95 duration-500">
                        <HourglassMediumIcon size={20} weight="duotone" className="text-amber-700 animate-pulse" />
                        <p className="text-panel-sm font-black text-amber-800 uppercase tracking-widest leading-none">
                            Últimos dias de inscrição
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
