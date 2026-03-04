'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, MousePointerClick } from "lucide-react";

interface TopEvent {
    eventId: string;
    title: string;
    views: number;
    clicks: number;
}

interface TopEventsTableProps {
    data: TopEvent[];
}

export function TopEventsTable({ data }: TopEventsTableProps) {
    const maxViews = Math.max(...data.map((e) => e.views), 1);

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-h3">Eventos Mais Acessados</CardTitle>
                <CardDescription>Ranking de eventos com maior tráfego na plataforma.</CardDescription>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <div className="h-40 flex items-center justify-center text-muted-foreground text-ui">
                        Nenhum evento acessado ainda.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {data.map((event, idx) => (
                            <div key={event.eventId} className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-caption font-bold text-muted-foreground w-5 shrink-0">
                                            {idx + 1}.
                                        </span>
                                        <span className="text-ui font-medium truncate">{event.title}</span>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0 text-caption">
                                        <span className="flex items-center gap-1 text-sky-500">
                                            <Eye className="h-3 w-3" />
                                            {event.views.toLocaleString('pt-BR')}
                                        </span>
                                        <span className="flex items-center gap-1 text-indigo-500">
                                            <MousePointerClick className="h-3 w-3" />
                                            {event.clicks.toLocaleString('pt-BR')}
                                        </span>
                                    </div>
                                </div>
                                {/* Barra de progresso proporcional */}
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-sky-500 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.round((event.views / maxViews) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
