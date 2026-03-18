'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface EventDashboardExpandedProps {
    eventId: string;
}

export function EventDashboardExpanded({ eventId }: EventDashboardExpandedProps) {
    return (
        <div className="px-4 py-3 border-t border-border/50 bg-muted/5">
            <div className="flex flex-wrap items-center justify-start xl:justify-end gap-2">
                <Link href={`/academia-equipe/dashboard/eventos/${eventId}/relatorios/atletas`}>
                    <Button variant="default" pill className="h-9 px-6 text-panel-sm font-semibold bg-foreground text-background hover:bg-foreground/90 transition-all border-none w-full sm:w-auto">Ver Atletas</Button>
                </Link>
                <Link href={`/academia-equipe/dashboard/eventos/${eventId}/relatorios/categorias`}>
                    <Button variant="outline" pill className="h-8 px-4 text-panel-sm font-semibold transition-all w-full sm:w-auto">Categorias</Button>
                </Link>
                <Link href={`/academia-equipe/dashboard/eventos/${eventId}/relatorios/inscricoes`}>
                    <Button variant="outline" pill className="h-8 px-4 text-panel-sm font-semibold transition-all w-full sm:w-auto">Inscrições</Button>
                </Link>
                <Link href={`/academia-equipe/dashboard/eventos/${eventId}/relatorios/financeiro`}>
                    <Button variant="outline" pill className="h-8 px-4 text-panel-sm font-semibold transition-all w-full sm:w-auto">Financeiro</Button>
                </Link>
                <Link href={`/academia-equipe/dashboard/eventos/${eventId}/equipes`}>
                    <Button variant="outline" pill className="h-8 px-4 text-panel-sm font-semibold transition-all w-full sm:w-auto">Equipes</Button>
                </Link>
            </div>
        </div>
    );
}
