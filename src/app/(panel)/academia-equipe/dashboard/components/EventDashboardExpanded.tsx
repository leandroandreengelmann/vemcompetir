'use client';

import { useEffect, useState } from 'react';
import { getEventDashboardDetails } from '../actions/event-dashboards';
import { Skeleton } from '@/components/ui/skeleton';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { Users, TrendingUp, Trophy, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface EventDashboardExpandedProps {
    eventId: string;
}

const chartConfig = {
    count: {
        label: "Inscrições",
        color: "hsl(var(--primary))", // Maintaining primary but ensuring it's the premium dark navy
    },
} satisfies ChartConfig;

export function EventDashboardExpanded({ eventId }: EventDashboardExpandedProps) {
    const [details, setDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const data = await getEventDashboardDetails(eventId);
                setDetails(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [eventId]);

    if (loading) {
        return (
            <div className="p-6 space-y-6 border-t border-border/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-[200px] rounded-xl" />
                    <Skeleton className="h-[200px] rounded-xl col-span-2" />
                </div>
            </div>
        );
    }

    if (!details) return null;

    return (
        <div className="p-6 border-t border-border/50 animate-in fade-in slide-in-from-top-4 duration-500 bg-muted/5">
            {/* Botões de Ação */}
            <div className="flex flex-wrap items-center justify-start xl:justify-end gap-3">
                <Link href={`/academia-equipe/dashboard/eventos/${eventId}/relatorios/atletas`}>
                    <Button variant="default" pill className="h-11 px-8 text-ui font-semibold bg-foreground text-background hover:bg-foreground/90 transition-all border-none w-full sm:w-auto">Ver Atletas</Button>
                </Link>
                <Link href={`/academia-equipe/dashboard/eventos/${eventId}/relatorios/categorias`}>
                    <Button variant="default" pill className="h-11 px-8 text-ui font-semibold bg-foreground text-background hover:bg-foreground/90 transition-all border-none w-full sm:w-auto">Categorias</Button>
                </Link>
                <Link href={`/academia-equipe/dashboard/eventos/${eventId}/relatorios/inscricoes`}>
                    <Button variant="default" pill className="h-11 px-8 text-ui font-semibold bg-foreground text-background hover:bg-foreground/90 transition-all border-none w-full sm:w-auto">Inscrições</Button>
                </Link>
                <Link href={`/academia-equipe/dashboard/eventos/${eventId}/relatorios/financeiro`}>
                    <Button variant="default" pill className="h-11 px-8 text-ui font-semibold bg-foreground text-background hover:bg-foreground/90 transition-all border-none w-full sm:w-auto">Financeiro</Button>
                </Link>
                <Link href={`/academia-equipe/dashboard/eventos/${eventId}/equipes`}>
                    <Button variant="default" pill className="h-11 px-8 text-ui font-semibold bg-foreground text-background hover:bg-foreground/90 transition-all border-none w-full sm:w-auto">Equipes</Button>
                </Link>
            </div>
        </div>
    );
}
