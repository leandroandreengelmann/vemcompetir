'use client';

import { Users, LayoutGrid, CheckCircle2, AlertCircle } from 'lucide-react';
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
            label: "Pagamentos",
            value: `${stats.paid_count} / ${stats.pending_count}`,
            icon: CheckCircle2,
            color: "text-emerald-500 dark:text-emerald-400",
            bgColor: "bg-emerald-500/10 dark:bg-emerald-400/10",
            sub: "Pagas / Pendentes"
        },
        {
            label: "Financeiro",
            value: formatCurrency(stats.paid_amount),
            icon: AlertCircle,
            color: "text-amber-500 dark:text-amber-400",
            bgColor: "bg-amber-500/10 dark:bg-amber-400/10",
            sub: `Total: ${formatCurrency(stats.paid_amount + stats.pending_amount)}`
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 py-2 border-t border-border/50">
            {items.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-1 group/kpi">
                    <div className="flex items-center gap-2">
                        <div className={cn("p-2 rounded-xl transition-all duration-300", item.bgColor)}>
                            <item.icon className={cn("h-4 w-4", item.color)} />
                        </div>
                        <span className="text-label text-muted-foreground font-medium uppercase tracking-wider">{item.label}</span>
                    </div>
                    <div className="flex flex-col pl-10">
                        <span className="text-h3 font-black tabular-nums leading-none tracking-tight">{item.value}</span>
                        <span className="text-[10px] text-muted-foreground font-medium mt-1 opacity-70 group-hover/kpi:opacity-100 transition-opacity truncate">
                            {item.sub}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
