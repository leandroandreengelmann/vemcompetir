'use client';

import { useState, useTransition } from 'react';
import { getTermAcceptancesAction, type TermAcceptance } from './actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MagnifyingGlassIcon, CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { Loader2 } from 'lucide-react';

interface Props {
    initialData: TermAcceptance[];
    initialTotal: number;
}

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
    const [page, setPage] = useState(1);
    const [isPending, startTransition] = useTransition();

    const pageSize = 25;
    const totalPages = Math.ceil(total / pageSize);

    const fetch = (nextPage: number, nextSearch: string) => {
        startTransition(async () => {
            const result = await getTermAcceptancesAction(nextPage, nextSearch);
            setData(result.data);
            setTotal(result.total);
        });
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        setPage(1);
        fetch(1, value);
    };

    const handlePage = (next: number) => {
        setPage(next);
        fetch(next, search);
    };

    return (
        <div className="space-y-4">
            {/* Busca + contagem */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <MagnifyingGlassIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome do atleta..."
                        className="pl-9 h-10"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
                <span className="text-sm text-muted-foreground shrink-0">
                    {total} aceite{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}
                </span>
                {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            {/* Tabela */}
            <div className="rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/40 border-b">
                                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Atleta</th>
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
                                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                                        {search ? 'Nenhum resultado para esta busca.' : 'Nenhum aceite registrado ainda.'}
                                    </td>
                                </tr>
                            )}
                            {data.map((row, i) => (
                                <tr key={row.id} className={`border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                                    <td className="px-4 py-3 font-medium">{row.athlete_name_snapshot}</td>
                                    <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{row.event_title_snapshot}</td>
                                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{row.event_city_snapshot ?? '—'}</td>
                                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{row.event_start_date_snapshot ?? '—'}</td>
                                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(row.accepted_at)}</td>
                                    <td className="px-4 py-3">
                                        <Badge variant="outline" className="text-xs font-mono">
                                            v{row.term_version}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-muted-foreground">
                        Página {page} de {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePage(page - 1)}
                            disabled={page <= 1 || isPending}
                            className="gap-1"
                        >
                            <CaretLeftIcon size={14} />
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePage(page + 1)}
                            disabled={page >= totalPages || isPending}
                            className="gap-1"
                        >
                            Próxima
                            <CaretRightIcon size={14} />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
