'use client';

import { Card, CardContent } from "@/components/ui/card";
import { motion } from 'framer-motion';
import { Eye, TrendingUp, Calendar, ArrowUp, ArrowDown } from 'lucide-react';

interface AccessKPICardsProps {
    hoje: number;
    semana: number;
    mes: number;
    variacaoMes: number;
}

export function AccessKPICards({ hoje, semana, mes, variacaoMes }: AccessKPICardsProps) {
    const cards = [
        {
            title: 'Acessos Hoje',
            value: hoje.toLocaleString('pt-BR'),
            description: 'Visualizações de página no dia',
            icon: Eye,
            color: 'text-sky-500',
            bg: 'bg-sky-50 dark:bg-sky-950/30',
        },
        {
            title: 'Últimos 7 Dias',
            value: semana.toLocaleString('pt-BR'),
            description: 'Total da semana corrente',
            icon: Calendar,
            color: 'text-indigo-500',
            bg: 'bg-indigo-50 dark:bg-indigo-950/30',
        },
        {
            title: 'Este Mês',
            value: mes.toLocaleString('pt-BR'),
            description: 'Total do mês atual',
            icon: TrendingUp,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50 dark:bg-emerald-950/30',
            badge: variacaoMes,
        },
    ];

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } },
    };
    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 },
    };

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-h2 font-bold text-foreground">Monitoramento de Acessos</h2>
                <p className="text-ui text-muted-foreground">Visão geral do tráfego da plataforma</p>
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
                                        <p className="text-ui font-medium text-muted-foreground">{card.title}</p>
                                        <h3 className="text-h2 tracking-tight">{card.value}</h3>
                                        <div className="flex items-center gap-2">
                                            <p className="text-caption text-muted-foreground">{card.description}</p>
                                            {card.badge !== undefined && (
                                                <span className={`inline-flex items-center gap-0.5 text-caption font-semibold px-1.5 py-0.5 rounded ${card.badge >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                    {card.badge >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                                    {Math.abs(card.badge)}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`p-3 rounded-2xl ${card.bg} ${card.color} group-hover:scale-110 transition-transform duration-300`}>
                                        <card.icon className="h-5 w-5" />
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
