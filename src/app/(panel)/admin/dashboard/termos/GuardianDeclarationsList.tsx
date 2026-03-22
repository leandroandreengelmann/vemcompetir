'use client';

import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MagnifyingGlassIcon, CaretLeftIcon, CaretRightIcon, EyeIcon } from '@phosphor-icons/react';
import { getGuardianDeclarationsAction } from './actions';
import type { GuardianDeclaration } from '@/types/guardian';
import { GuardianDeclarationModal } from '@/components/guardian/GuardianDeclarationModal';

interface GuardianDeclarationsListProps {
    initialData: GuardianDeclaration[];
    initialTotal: number;
}

const RELATIONSHIP_LABELS: Record<string, string> = {
    pai: 'Pai',
    mae: 'Mãe',
    irmao: 'Irmão/Irmã',
    tio: 'Tio/Tia',
    padrinho: 'Padrinho/Madrinha',
    outro: 'Outro',
    academia: 'Academia/Equipe',
};

export function GuardianDeclarationsList({ initialData, initialTotal }: GuardianDeclarationsListProps) {
    const [data, setData] = useState(initialData);
    const [total, setTotal] = useState(initialTotal);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [isPending, startTransition] = useTransition();

    const pageSize = 25;
    const totalPages = Math.ceil(total / pageSize);

    const fetchPage = (newPage: number, newSearch: string) => {
        startTransition(async () => {
            const result = await getGuardianDeclarationsAction(newPage, newSearch);
            setData(result.data);
            setTotal(result.total);
            setPage(newPage);
        });
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        fetchPage(1, value);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <MagnifyingGlassIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por atleta ou responsável..."
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <span className="text-sm text-muted-foreground shrink-0">{total} declaração{total !== 1 ? 'ões' : ''}</span>
            </div>

            {data.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                    Nenhuma declaração encontrada.
                </div>
            ) : (
                <div className="space-y-2">
                    {data.map((decl) => (
                        <div key={decl.id} className="flex items-center justify-between gap-4 p-4 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors">
                            <div className="flex flex-col gap-1 min-w-0">
                                <span className="text-sm font-semibold truncate">{decl.athlete_name}</span>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {decl.responsible_type === 'guardian' ? (
                                        <>
                                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                                {RELATIONSHIP_LABELS[decl.responsible_relationship ?? ''] ?? 'Responsável'}
                                            </Badge>
                                            {decl.responsible_name && (
                                                <span className="text-xs text-muted-foreground">{decl.responsible_name}</span>
                                            )}
                                        </>
                                    ) : (
                                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                            Academia como responsável
                                        </Badge>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                        {format(new Date(decl.generated_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                                    </span>
                                </div>
                            </div>
                            <GuardianDeclarationModal
                                declaration={decl}
                                trigger={
                                    <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                                        <EyeIcon size={14} weight="duotone" />
                                        Ver
                                    </Button>
                                }
                            />
                        </div>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                        Página {page} de {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchPage(page - 1, search)}
                            disabled={page <= 1 || isPending}
                            className="gap-1"
                        >
                            <CaretLeftIcon size={14} />
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchPage(page + 1, search)}
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
