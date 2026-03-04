'use client';


import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EventSummary } from '../actions/event-dashboards';
import { EventDashboardSummaryKpis } from './EventDashboardSummaryKpis';
import { EventDashboardExpanded } from './EventDashboardExpanded';

interface EventDashboardCardProps {
    event: EventSummary;
}

export function EventDashboardCard({ event }: EventDashboardCardProps) {
    const statusColors: any = {
        pendente: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30",
        aprovado: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
        publicado: "bg-blue-600 text-white hover:bg-blue-700 border-none shadow-md"
    };

    return (
        <Card className="border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden bg-background">
            {/* Header */}
            <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 bg-muted/10">
                <div className="flex items-start gap-4 flex-1">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-h3 tracking-tight">{event.title}</h3>
                            <Badge variant={event.status === 'publicado' ? 'default' : 'outline'} className={cn("text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full whitespace-nowrap", statusColors[event.status] || "bg-muted/50 text-muted-foreground border-border")}>
                                {event.status}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-caption text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <span>{event.event_date ? new Date(event.event_date).toLocaleDateString('pt-BR') : 'Sem data'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPIs Rápidos */}
            <EventDashboardSummaryKpis stats={event.stats} />

            {/* Expandido Sempre */}
            <EventDashboardExpanded eventId={event.id} />
        </Card>
    );
}
