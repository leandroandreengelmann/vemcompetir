'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ListChecksIcon, SpinnerGapIcon, ArrowSquareOutIcon } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAthleteRegistrationsAction } from './actions';

interface AthleteRegistrationsSheetProps {
    athleteId: string;
    athleteName: string;
    counts?: { total: number; pago: number; pendente: number };
}

type Registration = {
    id: string;
    status: string;
    created_at: string;
    event?: { id: string; title: string } | null;
    category?: { id: string; categoria_completa: string } | null;
};

const STATUS_STYLES: Record<string, string> = {
    pago: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    confirmado: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    agendado: 'bg-red-500/10 text-red-600 border-red-500/20',
    isento: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    pendente: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    carrinho: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    cancelado: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
};

const STATUS_LABELS: Record<string, string> = {
    pago: 'Pago',
    agendado: 'Pagamento Agendado',
    isento: 'Pago pela Academia',
    confirmado: 'Confirmado',
    pendente: 'Pendente',
    carrinho: 'No Carrinho',
    cancelado: 'Cancelado',
};

export function AthleteRegistrationsSheet({ athleteId, athleteName, counts }: AthleteRegistrationsSheetProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [registrations, setRegistrations] = useState<Registration[] | null>(null);

    const total = counts?.total ?? 0;
    const hasPendente = (counts?.pendente ?? 0) > 0;
    const allPago = total > 0 && !hasPendente;

    const badgeColor = hasPendente
        ? 'bg-amber-500 text-white'
        : allPago
            ? 'bg-emerald-500 text-white'
            : 'bg-slate-500 text-white';

    const tooltipLabel = total === 0
        ? 'Ver inscrições do atleta'
        : `${total} ${total === 1 ? 'inscrição' : 'inscrições'}${hasPendente ? ` (${counts?.pendente} pendente${counts!.pendente === 1 ? '' : 's'})` : allPago ? ' (todas pagas)' : ''}`;

    const handleOpenChange = async (next: boolean) => {
        setOpen(next);
        if (!next) return;
        if (registrations !== null) return;

        setLoading(true);
        setError(null);
        const result = await getAthleteRegistrationsAction(athleteId);
        if ('error' in result) {
            setError(result.error ?? 'Erro ao carregar inscrições.');
        } else {
            setRegistrations(result.registrations as unknown as Registration[]);
        }
        setLoading(false);
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <SheetTrigger asChild>
                        <Button
                            pill
                            variant="ghost"
                            size="icon"
                            className={`relative transition-colors ${total > 0 ? 'text-primary hover:bg-primary/10 hover:text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                        >
                            <ListChecksIcon size={24} weight="duotone" />
                            {total > 0 && (
                                <span
                                    className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center leading-none shadow-sm ring-2 ring-background ${badgeColor}`}
                                >
                                    {total > 99 ? '99+' : total}
                                </span>
                            )}
                            <span className="sr-only">Ver inscrições</span>
                        </Button>
                    </SheetTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">{tooltipLabel}</TooltipContent>
            </Tooltip>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-6 sm:p-8">
                <SheetHeader className="p-0 pr-8">
                    <SheetTitle className="text-panel-md">Inscrições de {athleteName}</SheetTitle>
                    <SheetDescription>Histórico de campeonatos deste atleta.</SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-3">
                    {loading && (
                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                            <SpinnerGapIcon size={24} weight="bold" className="animate-spin mr-2" />
                            Carregando inscrições...
                        </div>
                    )}

                    {!loading && error && (
                        <div className="p-3 bg-destructive/15 text-destructive text-panel-sm rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    {!loading && !error && registrations && registrations.length === 0 && (
                        <div className="py-12 text-center text-muted-foreground text-panel-sm">
                            Este atleta ainda não possui inscrições.
                        </div>
                    )}

                    {!loading && !error && registrations && registrations.length > 0 && (
                        <ul className="space-y-2">
                            {registrations.map((reg) => (
                                <li
                                    key={reg.id}
                                    className="border border-border/60 rounded-xl p-4 hover:bg-muted/40 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-foreground truncate">
                                                {reg.event?.title || 'Evento desconhecido'}
                                            </p>
                                            <p className="text-panel-sm text-muted-foreground mt-0.5 truncate">
                                                {reg.category?.categoria_completa || 'Categoria não informada'}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Inscrito em {format(new Date(reg.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                                            </p>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={`font-semibold border uppercase text-xs tracking-wider px-2 py-0.5 shrink-0 ${STATUS_STYLES[reg.status] || STATUS_STYLES.carrinho}`}
                                        >
                                            {STATUS_LABELS[reg.status] || reg.status}
                                        </Badge>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    {!loading && !error && registrations && registrations.length > 0 && (
                        <div className="pt-2">
                            <Button pill variant="outline" asChild className="w-full gap-2">
                                <Link href={`/academia-equipe/dashboard/atletas/${athleteId}/perfil`}>
                                    <ArrowSquareOutIcon size={18} weight="duotone" />
                                    Abrir perfil completo
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
