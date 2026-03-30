'use client';

import { useState, useMemo } from 'react';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    ArrowsClockwiseIcon, UsersIcon, BuildingsIcon,
    MagnifyingGlassIcon, CalendarBlankIcon,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatFullCategoryName } from '@/lib/category-utils';

interface Registration {
    id: string;
    status: string;
    event_id: string;
    tenant_id: string;
    category_id: string;
    athlete: { full_name: string; belt_color?: string } | null;
    category: { id: string; categoria_completa: string; faixa?: string; divisao_idade?: string; categoria_peso?: string; peso_min_kg?: number; peso_max_kg?: number } | null;
    registered_by_profile: { full_name: string; gym_name?: string } | null;
}

interface Event {
    id: string;
    title: string;
    event_date: string;
    category_change_deadline_days: number;
}

interface Props {
    registrations: Registration[];
    eventMap: Record<string, Event>;
    currentTenantId: string;
    ownedEventIds: string[];
}

function BeltBadge({ belt }: { belt?: string }) {
    if (!belt) return null;
    const lower = belt.toLowerCase();
    let cls = 'bg-muted text-muted-foreground border-border';
    if (lower.includes('branca')) cls = 'bg-white text-slate-800 border-slate-200';
    else if (lower.includes('azul')) cls = 'bg-blue-500 text-white border-blue-600';
    else if (lower.includes('roxa')) cls = 'bg-purple-500 text-white border-purple-600';
    else if (lower.includes('marrom')) cls = 'bg-amber-800 text-white border-amber-900';
    else if (lower.includes('preta')) cls = 'bg-slate-900 text-white border-slate-950';
    else if (lower.includes('colorida')) cls = 'bg-gradient-to-r from-green-500 via-yellow-500 to-blue-500 text-white border-none';
    else if (lower.includes('cinza')) cls = 'bg-gray-400 text-white border-gray-500';
    else if (lower.includes('amarela')) cls = 'bg-yellow-400 text-yellow-950 border-yellow-500';
    else if (lower.includes('laranja')) cls = 'bg-orange-500 text-white border-orange-600';
    else if (lower.includes('verde')) cls = 'bg-green-600 text-white border-green-700';

    return (
        <Badge variant="outline" className={cn('text-panel-sm font-bold uppercase tracking-wider px-2 py-0.5', cls)}>
            {belt}
        </Badge>
    );
}

export default function CheckagemClient({ registrations, eventMap, currentTenantId, ownedEventIds }: Props) {
    const ownedSet = useMemo(() => new Set(ownedEventIds), [ownedEventIds]);
    const [filter, setFilter] = useState<'todos' | 'minha'>('todos');
    const [search, setSearch] = useState('');
    const [modalCat, setModalCat] = useState<{ cat: Registration['category']; athletes: { full_name: string; belt_color?: string }[] } | null>(null);

    // Group all registrations by category_id for the athletes modal
    const athletesByCategory = useMemo(() => {
        return registrations.reduce<Record<string, { full_name: string; belt_color?: string }[]>>((acc, reg) => {
            if (!reg.category_id || !reg.athlete) return acc;
            if (!acc[reg.category_id]) acc[reg.category_id] = [];
            acc[reg.category_id].push(reg.athlete);
            return acc;
        }, {});
    }, [registrations]);

    const filtered = useMemo(() => {
        let list = registrations.filter((r) => {
            // Para eventos não próprios, sempre mostrar apenas da academia
            if (!ownedSet.has(r.event_id)) return true; // já vem filtrado do servidor
            // Para eventos próprios, aplicar filtro do usuário
            if (filter === 'minha') return r.tenant_id === currentTenantId;
            return true;
        });

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((r) =>
                r.athlete?.full_name?.toLowerCase().includes(q) ||
                r.category?.categoria_completa?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [registrations, filter, search, currentTenantId, ownedSet]);

    const grouped = useMemo(() => filtered.reduce<Record<string, Registration[]>>((acc, reg) => {
        if (!acc[reg.event_id]) acc[reg.event_id] = [];
        acc[reg.event_id].push(reg);
        return acc;
    }, {}), [filtered]);

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Checagem"
                description="Visualize e troque a categoria dos atletas inscritos em eventos com prazo de troca ativo."
            />

            {/* Filtros e busca */}
            <div className="flex flex-col sm:flex-row gap-3">
                {ownedSet.size > 0 && (
                    <div className="flex gap-2">
                        <Button
                            variant={filter === 'todos' ? 'default' : 'outline'}
                            pill size="sm"
                            onClick={() => setFilter('todos')}
                            className={cn('gap-2', filter === 'todos' && 'bg-brand-800 hover:bg-brand-900 text-white')}
                        >
                            <UsersIcon size={15} weight="duotone" />
                            Todos os atletas
                        </Button>
                        <Button
                            variant={filter === 'minha' ? 'default' : 'outline'}
                            pill size="sm"
                            onClick={() => setFilter('minha')}
                            className={cn('gap-2', filter === 'minha' && 'bg-brand-800 hover:bg-brand-900 text-white')}
                        >
                            <BuildingsIcon size={15} weight="duotone" />
                            Minha academia
                        </Button>
                    </div>
                )}
                <div className="relative flex-1 max-w-xs">
                    <MagnifyingGlassIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar atleta ou categoria..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9 rounded-full text-sm"
                    />
                </div>
            </div>

            {/* Lista por evento */}
            {Object.keys(grouped).length === 0 ? (
                <Card className="border-none shadow-sm">
                    <CardContent className="py-16 text-center text-muted-foreground">
                        <ArrowsClockwiseIcon size={40} weight="duotone" className="mx-auto mb-3 opacity-30" />
                        <p className="text-ui font-medium">Nenhuma inscrição encontrada.</p>
                        <p className="text-caption mt-1">
                            {search ? 'Tente outro termo de busca.' : 'Nenhum evento com prazo de troca ativo.'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                Object.entries(grouped).map(([eventId, regs]) => {
                    const ev = eventMap[eventId];
                    if (!ev) return null;

                    const isOwnEvent = ownedSet.has(eventId);
                    const eventDate = new Date(ev.event_date);
                    const deadline = new Date(eventDate);
                    deadline.setDate(deadline.getDate() - ev.category_change_deadline_days);

                    return (
                        <Card key={eventId} className="border-none shadow-premium rounded-3xl overflow-hidden">
                            <CardContent className="p-0">
                                {/* Cabeçalho do evento */}
                                <div className="px-6 py-4 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <p className="text-panel-md font-black">{ev.title}</p>
                                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                                            <span className="flex items-center gap-1 text-caption text-muted-foreground">
                                                <CalendarBlankIcon size={20} weight="duotone" />
                                                Evento: {eventDate.toLocaleDateString('pt-BR')}
                                            </span>
                                            <span className="flex items-center gap-1 text-caption text-amber-600 dark:text-amber-400 font-medium">
                                                <ArrowsClockwiseIcon size={20} weight="duotone" />
                                                Prazo troca: {deadline.toLocaleDateString('pt-BR')}
                                            </span>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-caption font-semibold w-fit">
                                        {regs.length} atleta{regs.length !== 1 ? 's' : ''}
                                    </Badge>
                                </div>

                                {/* Tabela de atletas */}
                                <div className="overflow-x-auto">
                                    <Table className="min-w-[500px]">
                                        <TableHeader className="bg-muted/10">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="pl-6 text-caption font-semibold">Atleta</TableHead>
                                                <TableHead className="text-caption font-semibold">Faixa</TableHead>
                                                <TableHead className="text-caption font-semibold">Categoria atual</TableHead>
                                                {isOwnEvent && filter === 'todos' && (
                                                    <TableHead className="text-caption font-semibold">Academia</TableHead>
                                                )}
                                                <TableHead className="text-caption font-semibold text-right pr-6">Ação</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {regs.map((reg) => {
                                                const catAthletes = reg.category_id ? (athletesByCategory[reg.category_id] || []) : [];
                                                return (
                                                    <TableRow key={reg.id} className="hover:bg-muted/10 transition-colors">
                                                        <TableCell className="pl-6 py-3.5 font-bold text-ui">
                                                            {reg.athlete?.full_name}
                                                        </TableCell>
                                                        <TableCell className="py-3.5">
                                                            <BeltBadge belt={reg.athlete?.belt_color} />
                                                        </TableCell>
                                                        <TableCell className="py-3.5">
                                                            <div className="flex flex-col gap-1.5">
                                                                <p className="text-ui font-semibold text-foreground">
                                                                    {reg.category ? formatFullCategoryName(reg.category) : '—'}
                                                                </p>
                                                                {isOwnEvent && reg.category && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setModalCat({ cat: reg.category, athletes: catAthletes })}
                                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background text-caption font-semibold text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-150 w-fit cursor-pointer"
                                                                    >
                                                                        <UsersIcon size={24} weight="duotone" />
                                                                        Ver atletas ({catAthletes.length})
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        {isOwnEvent && filter === 'todos' && (
                                                            <TableCell className="py-3.5 text-caption text-muted-foreground">
                                                                {reg.registered_by_profile?.gym_name || reg.registered_by_profile?.full_name || '—'}
                                                            </TableCell>
                                                        )}
                                                        <TableCell className="py-3.5 text-right pr-6">
                                                            <Button asChild size="sm" variant="outline" pill className="gap-1.5 font-semibold text-xs h-8">
                                                                <Link href={`/academia-equipe/dashboard/eventos/${eventId}/inscricoes/${reg.id}/trocar-categoria`}>
                                                                    <ArrowsClockwiseIcon size={14} weight="duotone" />
                                                                    Trocar
                                                                </Link>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })
            )}

            {/* Modal de atletas da categoria */}
            <Dialog open={!!modalCat} onOpenChange={(open) => !open && setModalCat(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-panel-md font-bold flex items-center gap-2">
                            <UsersIcon size={18} weight="duotone" className="text-primary" />
                            Atletas confirmados
                        </DialogTitle>
                        {modalCat?.cat && (
                            <p className="text-caption text-muted-foreground">
                                {formatFullCategoryName(modalCat.cat)}
                            </p>
                        )}
                    </DialogHeader>

                    {(modalCat?.athletes.length ?? 0) === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            <UsersIcon size={32} weight="duotone" className="mx-auto mb-2 opacity-30" />
                            <p className="text-ui">Nenhum atleta confirmado ainda.</p>
                        </div>
                    ) : (
                        <div className="space-y-2 mt-2">
                            {modalCat?.athletes.map((ath, i) => (
                                <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl border bg-muted/20">
                                    <span className="text-ui font-semibold">{ath.full_name}</span>
                                    <BeltBadge belt={ath.belt_color} />
                                </div>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
