'use client';

import { cn } from '@/lib/utils';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { PlusIcon, IdentificationCardIcon, ArrowsClockwiseIcon } from '@phosphor-icons/react';
import { formatFullCategoryName } from '@/lib/category-utils';
import Link from 'next/link';
import { PassportModal } from '@/components/passport/PassportModal';

interface Registration {
    id: string;
    status: string;
    created_at: string;
    registered_by: string;
    registration_number?: number | null;
    athlete: {
        id: string;
        full_name: string;
        belt_color: string;
        sexo: string;
        weight: number | null;
        birth_date: string;
    };
    category: {
        id: string;
        divisao_idade: string;
        categoria_peso: string;
        sexo: string;
        faixa: string;
        categoria_completa?: string;
        peso_min_kg?: number;
        peso_max_kg?: number;
    };
    registered_by_profile: {
        full_name: string;
    } | null;
}

interface Event {
    id: string;
    title: string;
    tenant_id: string;
    category_change_deadline_days?: number;
    event_date?: string;
}

interface RegistrationListProps {
    event: Event;
    registrations: Registration[];
    athletes: any[]; // List of my athletes is not needed anymore for this component specifically, but kept for compatibility if needed or removed
    currentUserId: string;
    currentUserTenantId: string;
}

function canChangeCategory(event: Event): boolean {
    const days = event.category_change_deadline_days ?? 0;
    if (days === 0 || !event.event_date) return false;
    const eventDate = new Date(event.event_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(eventDate);
    deadline.setDate(deadline.getDate() - days);
    return today <= deadline;
}

export function RegistrationList({ event, registrations, athletes, currentUserId, currentUserTenantId }: RegistrationListProps) {
    const renderStatusBadge = (status: string) => {
        if (status === 'paga' || status === 'pago' || status === 'confirmado') {
            return (
                <Badge variant="outline" className="text-panel-sm font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                    PAGO
                </Badge>
            );
        }
        if (status === 'pendente' || status === 'aguardando_pagamento') {
            return (
                <Badge variant="outline" className="text-panel-sm font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                    PENDENTE
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="text-panel-sm font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-700 border-sky-500/20 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30">
                {status.replace('_', ' ')}
            </Badge>
        );
    };

    const renderBeltBadge = (belt: string) => {
        if (!belt) return null;

        const lowerBelt = belt.toLowerCase();
        let bgClass = "bg-muted text-muted-foreground border-border";

        if (lowerBelt.includes('branca')) bgClass = "bg-white text-slate-800 border-slate-200 shadow-sm";
        else if (lowerBelt.includes('azul')) bgClass = "bg-blue-500 text-white border-blue-600 shadow-sm";
        else if (lowerBelt.includes('roxa')) bgClass = "bg-purple-500 text-white border-purple-600 shadow-sm";
        else if (lowerBelt.includes('marrom')) bgClass = "bg-amber-800 text-white border-amber-900 shadow-sm";
        else if (lowerBelt.includes('preta')) bgClass = "bg-slate-900 text-white border-slate-950 shadow-sm dark:bg-black dark:border-slate-800";
        else if (lowerBelt.includes('colorida')) bgClass = "bg-gradient-to-r from-green-500 via-yellow-500 to-blue-500 text-white border-none shadow-sm";
        else if (lowerBelt.includes('cinza')) bgClass = "bg-gray-400 text-white border-gray-500 shadow-sm";
        else if (lowerBelt.includes('amarela')) bgClass = "bg-yellow-400 text-yellow-950 border-yellow-500 shadow-sm";
        else if (lowerBelt.includes('laranja')) bgClass = "bg-orange-500 text-white border-orange-600 shadow-sm";
        else if (lowerBelt.includes('verde')) bgClass = "bg-green-600 text-white border-green-700 shadow-sm";

        return (
            <Badge variant="outline" className={cn("text-panel-sm font-bold uppercase tracking-wider px-2 py-0.5", bgClass)}>
                {belt}
            </Badge>
        );
    };

    return (
        <>
            <div className="flex justify-end mb-4">
                <Button asChild pill>
                    <Link href={`/academia-equipe/dashboard/eventos/${event.id}/inscrever`}>
                        <PlusIcon size={16} weight="duotone" className="mr-2" />
                        Nova Inscrição
                    </Link>
                </Button>
            </div>

            <Card className="border-none shadow-premium rounded-3xl overflow-hidden">
                <CardHeader className="pb-4">
                    <CardTitle className="text-panel-md">Inscrições Realizadas ({registrations.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table className="min-w-[600px] md:min-w-full">
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="pl-6 w-[60px]">Nº</TableHead>
                                    <TableHead>Atleta</TableHead>
                                    <TableHead className="hidden sm:table-cell">Faixa</TableHead>
                                    <TableHead>Categoria</TableHead>
                                    <TableHead className="hidden md:table-cell">Inscrito Por</TableHead>
                                    <TableHead className="hidden md:table-cell text-center">Passaporte</TableHead>
                                    <TableHead className="text-right pr-6">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!registrations || registrations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            Nenhuma inscrição encontrada.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    registrations.map((reg) => (
                                        <TableRow key={reg.id} className="hover:bg-muted/10 transition-colors">
                                            <TableCell className="pl-6 py-4 font-mono text-panel-sm font-bold text-muted-foreground">
                                                {reg.registration_number != null ? `#${String(reg.registration_number).padStart(3, '0')}` : '—'}
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className="font-bold text-foreground text-panel-sm">{reg.athlete?.full_name}</span>
                                                    <span className="sm:hidden block mt-0.5">
                                                        {renderBeltBadge(reg.athlete?.belt_color)}
                                                    </span>
                                                    {['pago', 'paga', 'confirmado', 'isento'].includes(reg.status) && canChangeCategory(event) && (
                                                        <Link
                                                            href={`/academia-equipe/dashboard/eventos/${event.id}/inscricoes/${reg.id}/trocar-categoria`}
                                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors mt-0.5"
                                                        >
                                                            <ArrowsClockwiseIcon size={12} weight="duotone" />
                                                            Trocar categoria
                                                        </Link>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">
                                                {renderBeltBadge(reg.athlete?.belt_color)}
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-panel-sm font-bold text-foreground">{reg.category ? formatFullCategoryName(reg.category) : '—'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-panel-sm font-medium hidden md:table-cell">
                                                {reg.registered_by_profile?.full_name || '-'}
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-center py-4">
                                                {['pago', 'paga', 'confirmado', 'isento'].includes(reg.status) && (
                                                    <PassportModal
                                                        registrationId={reg.id}
                                                        trigger={
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-9 px-4 rounded-full font-bold text-xs tracking-wide text-primary border-primary/20 hover:bg-primary hover:text-white transition-colors"
                                                                title="Ver Passaporte"
                                                            >
                                                                <IdentificationCardIcon size={16} weight="duotone" className="mr-1.5" />
                                                                Passaporte
                                                            </Button>
                                                        }
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right pr-6 py-4">
                                                {renderStatusBadge(reg.status)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
