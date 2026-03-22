'use client';

import { useState, useTransition } from 'react';
import { getTermAcceptancesAction, type TermAcceptance } from './actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MagnifyingGlassIcon, CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';

interface Props {
    initialData: TermAcceptance[];
    initialTotal: number;
}

type TermTypeFilter = 'all' | 'standard' | 'minor';

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
    });
}

export function TermAcceptancesList({ initialData, initialTotal }: Props) {
    const [data, setData] = useState<TermAcceptance[]>(initialData);
    const [total, setTotal] = useState(initialTotal);
    const [search, setSearch] = useState('');
    const [eventSearch, setEventSearch] = useState('');
    const [termType, setTermType] = useState<TermTypeFilter>('all');
    const [page, setPage] = useState(1);
    const [isPending, startTransition] = useTransition();

    const pageSize = 25;
    const totalPages = Math.ceil(total / pageSize);

    const fetch = (nextPage: number, s: string, es: string, tt: TermTypeFilter) => {
        startTransition(async () => {
            const result = await getTermAcceptancesAction(nextPage, s, tt, es);
            setData(result.data);
            setTotal(result.total);
        });
    };

    const handleSearch = (value: string) => { setSearch(value); setPage(1); fetch(1, value, eventSearch, termType); };
    const handleEventSearch = (value: string) => { setEventSearch(value); setPage(1); fetch(1, search, value, termType); };
    const handleTypeFilter = (tt: TermTypeFilter) => { setTermType(tt); setPage(1); fetch(1, search, eventSearch, tt); };
    const handlePage = (next: number) => { setPage(next); fetch(next, search, eventSearch, termType); };

    return (
        <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full md:w-64 group">
                        <MagnifyingGlassIcon size={16} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            variant="lg"
                            placeholder="Buscar atleta..."
                            className="pl-11 bg-background border-input shadow-sm"
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>
                    <div className="relative w-full md:w-64 group">
                        <MagnifyingGlassIcon size={16} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            variant="lg"
                            placeholder="Buscar evento..."
                            className="pl-11 bg-background border-input shadow-sm"
                            value={eventSearch}
                            onChange={(e) => handleEventSearch(e.target.value)}
                        />
                    </div>
                    <Select value={termType} onValueChange={(v) => handleTypeFilter(v as TermTypeFilter)}>
                        <SelectTrigger className="h-12 w-[180px] rounded-xl border-input bg-background font-medium">
                            <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="standard">Adulto</SelectItem>
                            <SelectItem value="minor">Menor de idade</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-muted-foreground px-2">
                        {isPending ? '...' : `${total} aceite${total !== 1 ? 's' : ''}`}
                    </span>
                    <Button variant="outline" size="sm" pill onClick={() => handlePage(page - 1)} disabled={page <= 1 || isPending}>
                        <CaretLeftIcon size={16} weight="duotone" />
                    </Button>
                    <span className="text-xs font-bold text-muted-foreground px-1">{page} / {totalPages || 1}</span>
                    <Button variant="outline" size="sm" pill onClick={() => handlePage(page + 1)} disabled={page >= totalPages || isPending}>
                        <CaretRightIcon size={16} weight="duotone" />
                    </Button>
                </div>
            </div>

            {/* Tabela */}
            <div className="rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/40 border-b">
                                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Atleta</th>
                                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tipo</th>
                                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Evento</th>
                                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Cidade</th>
                                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">Data Evento</th>
                                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Aceito em</th>
                                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Versão</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                                        Nenhum resultado encontrado.
                                    </td>
                                </tr>
                            )}
                            {data.map((row, i) => (
                                <tr key={row.id} className={`border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                                    <td className="px-4 py-3 font-medium">{row.athlete_name_snapshot}</td>
                                    <td className="px-4 py-3">
                                        {row.term_type === 'minor' ? (
                                            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 border-amber-500/20">Menor</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-700 border-blue-500/20">Adulto</Badge>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">{row.event_title_snapshot}</td>
                                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{row.event_city_snapshot ?? '—'}</td>
                                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{row.event_start_date_snapshot ?? '—'}</td>
                                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(row.accepted_at)}</td>
                                    <td className="px-4 py-3">
                                        <Badge variant="outline" className="text-xs font-mono">v{row.term_version}</Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
