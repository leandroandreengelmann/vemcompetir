'use client';

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getEventStatusClasses, getEventStatusVariant, EVENT_STATUS_BASE_CLASSES } from '@/lib/event-status';
import { EventSummary } from '../actions/event-dashboards';
import { EventDashboardSummaryKpis } from './EventDashboardSummaryKpis';
import { EventDashboardExpanded } from './EventDashboardExpanded';

interface EventDashboardCardProps {
    event: EventSummary;
}

export function EventDashboardCard({ event }: EventDashboardCardProps) {
    return (
        <Card className="border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden bg-background">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between gap-4 border-b border-border/50">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-panel-md font-semibold tracking-tight">{event.title}</h3>
                    <Badge
                        variant={getEventStatusVariant(event.status)}
                        className={cn(EVENT_STATUS_BASE_CLASSES, getEventStatusClasses(event.status))}
                    >
                        {event.status}
                    </Badge>
                </div>
                <span className="text-panel-sm text-muted-foreground shrink-0">
                    {event.event_date ? new Date(event.event_date).toLocaleDateString('pt-BR') : 'Sem data'}
                </span>
            </div>

            {/* KPIs Rápidos */}
            <EventDashboardSummaryKpis eventId={event.id} stats={event.stats} />

            {/* Expandido Sempre */}
            <EventDashboardExpanded eventId={event.id} />
        </Card>
    );
}
