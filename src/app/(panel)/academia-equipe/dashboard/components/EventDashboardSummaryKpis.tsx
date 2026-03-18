'use client';

import { CheckCircleIcon, TrendUpIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface EventDashboardSummaryKpisProps {
    stats: {
        athletes_total: number;
        categories_active: number;
        paid_count: number;
        pending_count: number;
        paid_amount: number;
        pending_amount: number;
    };
}

export function EventDashboardSummaryKpis({ stats }: EventDashboardSummaryKpisProps) {
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const items = [
        {
            label: "Inscrições Pagas",
            value: stats.paid_count,
            icon: CheckCircleIcon,
            color: "text-emerald-500 dark:text-emerald-400",
            bgColor: "bg-emerald-500/10 dark:bg-emerald-400/10",
            sub: `${stats.pending_count} pendente${stats.pending_count !== 1 ? 's' : ''}`
        },
        {
            label: "Receita Confirmada",
            value: formatCurrency(stats.paid_amount),
            icon: TrendUpIcon,
            color: "text-amber-500 dark:text-amber-400",
            bgColor: "bg-amber-500/10 dark:bg-amber-400/10",
            sub: `Total potencial: ${formatCurrency(stats.paid_amount + stats.pending_amount)}`
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-4 py-3">
            {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 group/kpi">
                    <div className={cn("p-2.5 rounded-xl shrink-0 transition-all duration-300", item.bgColor)}>
                        <item.icon size={24} weight="duotone" className={cn(item.color)} />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-panel-sm text-muted-foreground font-medium uppercase tracking-wide">{item.label}</span>
                        <span className="text-panel-md font-black tabular-nums leading-none tracking-tight">{item.value}</span>
                        <span className="text-panel-sm text-muted-foreground font-medium mt-0.5 opacity-70 group-hover/kpi:opacity-100 transition-opacity truncate">
                            {item.sub}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
