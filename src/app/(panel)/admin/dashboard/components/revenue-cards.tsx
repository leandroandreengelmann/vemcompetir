'use client';

import { motion } from 'framer-motion';
import { MoneyIcon, CheckCircleIcon, ClockIcon } from '@phosphor-icons/react';
import { Card, CardContent } from "@/components/ui/card";
import type { Icon } from '@phosphor-icons/react';

interface RevenueCardsProps {
    receitaTotalBruta: number;
    receitaConfirmada: number;
    receitaPendente: number;
}

function formatBRL(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function RevenueCards({ receitaTotalBruta, receitaConfirmada, receitaPendente }: RevenueCardsProps) {
    const cards: { title: string; value: string; description: string; Icon: Icon; color: string; bg: string }[] = [
        {
            title: 'Receita Total',
            value: formatBRL(receitaTotalBruta),
            description: 'Todas as inscrições confirmadas',
            Icon: MoneyIcon,
            color: 'text-primary',
            bg: 'bg-primary/5',
        },
        {
            title: 'Receita Confirmada',
            value: formatBRL(receitaConfirmada),
            description: 'Pagamentos aprovados e confirmados',
            Icon: CheckCircleIcon,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50',
        },
        {
            title: 'Aguardando Pagamento',
            value: formatBRL(receitaPendente),
            description: 'Inscrições pendentes de pagamento',
            Icon: ClockIcon,
            color: 'text-amber-500',
            bg: 'bg-amber-50',
        },
    ];

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-panel-md font-bold text-foreground">Faturamento</h2>
                <p className="text-panel-sm text-muted-foreground">Visão geral da receita da plataforma</p>
            </div>

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
                {cards.map((card, idx) => (
                    <motion.div key={idx} variants={item}>
                        <Card className="border-none shadow-sm hover:shadow-md transition-shadow h-full overflow-hidden group">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-2">
                                        <p className="text-panel-sm font-medium text-muted-foreground">{card.title}</p>
                                        <h3 className="text-panel-lg font-black tracking-tight">{card.value}</h3>
                                        <p className="text-panel-sm text-muted-foreground">{card.description}</p>
                                    </div>
                                    <div className={`p-3 rounded-2xl ${card.bg} ${card.color} group-hover:scale-110 transition-transform duration-300`}>
                                        <card.Icon size={20} weight="duotone" />
                                    </div>
                                </div>
                            </CardContent>
                            <div className={`h-1 w-full ${card.bg} opacity-60`} />
                        </Card>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
}
