'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, ArrowLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { ExternalAthleteWizard, type AcademyOption } from '../eventos/[id]/inscrever-externo/wizard';

interface EventItem {
    id: string;
    title: string;
    eventDate: string | null;
    closed: boolean;
}

interface Props {
    events: EventItem[];
    academies: AcademyOption[];
}

export function InscreverAtletaClient({ events, academies }: Props) {
    const [selected, setSelected] = useState<EventItem | null>(null);

    if (selected) {
        return (
            <div className="space-y-4">
                <button
                    onClick={() => setSelected(null)}
                    className="inline-flex items-center gap-2 text-panel-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeftIcon size={18} weight="duotone" />
                    Trocar evento ({selected.title})
                </button>
                <ExternalAthleteWizard
                    eventId={selected.id}
                    eventTitle={selected.title}
                    academies={academies}
                />
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                    Você ainda não tem eventos próprios para inscrever atletas.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="space-y-3 pt-6">
                <p className="text-panel-sm font-semibold text-muted-foreground">
                    Escolha o evento para inscrever o atleta
                </p>
                {events.map(ev => (
                    <button
                        key={ev.id}
                        disabled={ev.closed}
                        onClick={() => !ev.closed && setSelected(ev)}
                        className={`w-full text-left rounded-2xl border-2 p-4 flex items-center justify-between gap-3 transition-all ${
                            ev.closed
                                ? 'border-border bg-muted/30 opacity-60 cursor-not-allowed'
                                : 'border-border hover:border-primary/50 hover:bg-muted/30'
                        }`}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-xl bg-primary/10 shrink-0">
                                <CalendarIcon size={22} weight="duotone" className="text-primary" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold truncate">{ev.title}</p>
                                {ev.eventDate && (
                                    <p className="text-panel-sm text-muted-foreground">
                                        {new Date(ev.eventDate).toLocaleDateString('pt-BR')}
                                    </p>
                                )}
                            </div>
                        </div>
                        {ev.closed ? (
                            <Badge variant="outline" className="shrink-0">Inscrições encerradas</Badge>
                        ) : (
                            <CaretRightIcon size={20} weight="bold" className="text-muted-foreground shrink-0" />
                        )}
                    </button>
                ))}
            </CardContent>
        </Card>
    );
}
