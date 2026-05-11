import React from 'react';
import { Badge } from "@/components/ui/badge";
import { TrophyIcon, HourglassMediumIcon } from '@phosphor-icons/react';

interface EventHeaderProps {
    title: string;
    imagePath?: string;
    eventDate?: string;
}

export function EventHeader({ title, imagePath, eventDate }: EventHeaderProps) {
    const isEndingSoon = React.useMemo(() => {
        if (!eventDate) return false;
        const date = new Date(eventDate);
        const today = new Date();
        const diffTime = date.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= 14;
    }, [eventDate]);

    return (
        <div className="space-y-4">
            {/* 1) Imagem do evento (1:1 aspect-square conforme prompt restritivo v2.8) */}
            <div className="relative aspect-square w-full rounded-md border border-border overflow-hidden bg-muted shadow-sm">
                {imagePath ? (
                    <img
                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-images/${imagePath}`}
                        alt={title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/50">
                        <TrophyIcon size={64} weight="duotone" className="text-muted-foreground/20" />
                    </div>
                )}
            </div>

            {/* 2) Titulo removido por duplicidade (handled by AthletePageHeader) */}

            {/* 3) Badge de status + selo "últimos dias" (≤14 dias do evento) */}
            <div className="px-1 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-panel-sm font-bold uppercase tracking-widest rounded-full px-3 py-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Inscrições Abertas
                </span>
                {isEndingSoon && (
                    <span className="inline-flex items-center gap-1.5 bg-amber-100 border-2 border-amber-500 text-amber-800 text-panel-sm font-black uppercase tracking-widest rounded-md px-2.5 py-1 shadow-sm -rotate-3 ring-1 ring-amber-300 ring-offset-1 ring-offset-amber-50">
                        <HourglassMediumIcon size={14} weight="duotone" className="animate-pulse" />
                        Últimos Dias
                    </span>
                )}
            </div>
        </div>
    );
}
