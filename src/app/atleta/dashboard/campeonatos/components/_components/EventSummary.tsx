import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EventSummaryProps {
    date: string;
    location?: string;
    city?: string;
}

export function EventSummary({ date, location, city }: EventSummaryProps) {
    const formattedDate = format(new Date(date), "dd 'de' MMMM, yyyy", { locale: ptBR });
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
                    <p className="text-label uppercase tracking-wide text-muted-foreground">
                        Data do Evento
                    </p>
                    <p
                        className="text-ui font-medium leading-snug break-words truncate"
                        title={formattedDate}
                    >
                        {formattedDate}
                    </p>
                </div>

                <div className="space-y-1 min-w-0">
                    <p className="text-label uppercase tracking-wide text-muted-foreground">
                        Localização
                    </p>
                    <p
                        className="text-ui font-medium leading-snug break-words truncate"
                        title={fullLocation}
                    >
                        {fullLocation}
                    </p>
                </div>
            </div>

            {isEndingSoon && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                    <p className="text-caption font-bold text-amber-700 uppercase tracking-tighter">
                        Últimos dias para inscrição! Lote termina em breve.
                    </p>
                </div>
            )}
        </div>
    );
}
