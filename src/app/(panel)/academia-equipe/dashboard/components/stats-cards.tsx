'use client';

import { motion } from 'framer-motion';
import { UsersIcon, TrophyIcon, ClipboardTextIcon } from '@phosphor-icons/react';
import { Card, CardContent } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";

interface StatsCardsProps {
    stats: {
        totalAtletas: number;
        totalInscricoes: number;
        totalEventosParticipando: number;
        totalEventosOrganizados: number;
        totalSpending: number;
        totalSasFees: number;
    };
}

export function StatsCards({ stats }: StatsCardsProps) {
    const cards = [
        {
            title: "Total de Atletas",
            value: stats.totalAtletas,
            description: "Atletas ativos na equipe",
            icon: UsersIcon,
            color: "text-blue-500 dark:text-blue-400",
            bg: "bg-blue-500/10 dark:bg-blue-400/10"
        },
        {
            title: "Participações",
            value: `${stats.totalEventosParticipando} Eventos`,
            description: `${stats.totalInscricoes} inscrições realizadas`,
            icon: TrophyIcon,
            color: "text-amber-500 dark:text-amber-400",
            bg: "bg-amber-500/10 dark:bg-amber-400/10"
        },
        {
            title: "Meus Eventos",
            value: stats.totalEventosOrganizados,
            description: "Eventos organizados por você",
            icon: ClipboardTextIcon,
            color: "text-emerald-500 dark:text-emerald-400",
            bg: "bg-emerald-500/10 dark:bg-emerald-400/10"
        },
    ];

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <TooltipProvider>
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
                {cards.map((card, idx) => (
                    <motion.div key={idx} variants={item}>
                        <Card className="border-none shadow-sm hover:shadow-md transition-shadow h-full overflow-hidden group">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1.5">
                                        <p className="text-panel-sm font-medium text-muted-foreground">{card.title}</p>
                                        <h3 className="text-panel-md font-bold tracking-tight">{card.value}</h3>
                                        <p className="text-panel-sm text-muted-foreground">{card.description}</p>
                                    </div>
                                    <div className={`p-4 rounded-2xl ${card.bg} ${card.color} group-hover:scale-110 transition-transform duration-300`}>
                                        <card.icon size={32} weight="duotone" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>
        </TooltipProvider>
    );
}
