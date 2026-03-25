'use client';

import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowSquareOutIcon, MagnifyingGlassIcon, CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { getManagementAuthorizationsAction, type ManagementAuthorization } from './actions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ManagementAuthorizationsListProps {
    initialData: ManagementAuthorization[];
    initialTotal: number;
}

const PAGE_SIZE = 25;

export function ManagementAuthorizationsList({ initialData, initialTotal }: ManagementAuthorizationsListProps) {
    const [data, setData] = useState(initialData);
    const [total, setTotal] = useState(initialTotal);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [isPending, startTransition] = useTransition();

    const totalPages = Math.ceil(total / PAGE_SIZE);

    const fetchPage = (p: number, s: string) => {
        startTransition(async () => {
            const result = await getManagementAuthorizationsAction(p, s);
            setData(result.data);
            setTotal(result.total);
            setPage(p);
        });
    };

    const handleSearch = (value: string) => { setSearch(value); fetchPage(1, value); };

    if (initialTotal === 0 && !search) {
        return (
            <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum documento de autorização de gerenciamento enviado ainda.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative w-full md:w-80 group">
                    <MagnifyingGlassIcon size={20} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        variant="lg"
                        placeholder="Buscar por atleta ou academia..."
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-11 bg-background border-input shadow-sm"
                    />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-muted-foreground px-2">
                        {isPending ? '...' : `${total} documento${total !== 1 ? 's' : ''}`}
                    </span>
                    <Button variant="outline" size="sm" pill onClick={() => fetchPage(page - 1, search)} disabled={page <= 1 || isPending}>
                        <CaretLeftIcon size={20} weight="duotone" />
                    </Button>
                    <span className="text-xs font-bold text-muted-foreground px-1">{page} / {totalPages || 1}</span>
                    <Button variant="outline" size="sm" pill onClick={() => fetchPage(page + 1, search)} disabled={page >= totalPages || isPending}>
                        <CaretRightIcon size={20} weight="duotone" />
                    </Button>
                </div>
            </div>

            <div className="divide-y divide-border rounded-xl border overflow-hidden">
                {data.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum resultado encontrado.</p>
                ) : data.map((row) => (
                    <div key={row.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{row.athlete_name}</p>
                            <p className="text-xs text-muted-foreground truncate">Academia: {row.academy_name}</p>
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0">
                            {format(new Date(row.uploaded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs shrink-0" asChild>
                            <a href={row.document_url} target="_blank" rel="noopener noreferrer">
                                <ArrowSquareOutIcon size={20} weight="duotone" />
                                Ver documento
                            </a>
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
