import React from 'react';
import { Badge } from "@/components/ui/badge";
import { TrophyIcon } from '@phosphor-icons/react';

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

            {/* 3) Badge de status */}
            <div className="px-1">
                {isEndingSoon ? (
                    <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-panel-sm font-bold uppercase tracking-widest rounded-full px-3 py-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        Lote termina em breve
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-panel-sm font-bold uppercase tracking-widest rounded-full px-3 py-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Inscrições Abertas
                    </span>
                )}
            </div>
        </div>
    );
}
