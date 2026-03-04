'use client';

import { motion } from 'framer-motion';
import { Users, Trophy, ClipboardCheck, CreditCard, HelpCircle } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
            icon: Users,
            color: "text-blue-500 dark:text-blue-400",
            bg: "bg-blue-50"
        },
        {
            title: "Participações",
            value: `${stats.totalEventosParticipando} Eventos`,
            description: `${stats.totalInscricoes} inscrições realizadas`,
            icon: Trophy,
            color: "text-amber-500 dark:text-amber-400",
            bg: "bg-amber-50"
        },
        {
            title: "Meus Eventos",
            value: stats.totalEventosOrganizados,
            description: "Eventos organizados por você",
            icon: ClipboardCheck,
            color: "text-emerald-500 dark:text-emerald-400",
            bg: "bg-emerald-50"
        },
        {
            title: "Investimento Total",
            value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalSpending),
            description: "Total em inscrições e taxas",
            icon: CreditCard,
            color: "text-primary",
            bg: "bg-primary/5",
            help: `Inclui o valor integral de inscrições em eventos de terceiros + taxa SAS (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalSasFees)}) por atleta em seus próprios eventos.`
        }
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
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            >
                {cards.map((card, idx) => (
                    <motion.div key={idx} variants={item}>
                        <Card className="border-none shadow-sm hover:shadow-md transition-shadow h-full overflow-hidden group">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-ui font-medium text-muted-foreground">{card.title}</p>
                                            {card.help && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-[250px]">
                                                        {card.help}
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </div>
                                        <h3 className="text-h2 tracking-tight">{card.value}</h3>
                                        <p className="text-caption text-muted-foreground">{card.description}</p>
                                    </div>
                                    <div className={`p-3 rounded-2xl ${card.bg} ${card.color} group-hover:scale-110 transition-transform duration-300`}>
                                        <card.icon className="h-5 w-5" />
                                    </div>
                                </div>
                            </CardContent>
                            <div className={`h-1 w-full ${card.bg.replace('/5', '')} opacity-20`} />
                        </Card>
                    </motion.div>
                ))}
            </motion.div>
        </TooltipProvider>
    );
}
