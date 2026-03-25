'use client';

import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

type ResponsibleTypeFilter = 'all' | 'guardian' | 'academy';

const RELATIONSHIP_LABELS: Record<string, string> = {
    pai: 'Pai', mae: 'Mãe', irmao: 'Irmão/Irmã', tio: 'Tio/Tia',
    padrinho: 'Padrinho/Madrinha', outro: 'Outro', academia: 'Academia/Equipe',
};

export function GuardianDeclarationsList({ initialData, initialTotal }: GuardianDeclarationsListProps) {
    const [data, setData] = useState(initialData);
    const [total, setTotal] = useState(initialTotal);
    const [search, setSearch] = useState('');
    const [responsibleType, setResponsibleType] = useState<ResponsibleTypeFilter>('all');
    const [page, setPage] = useState(1);
    const [isPending, startTransition] = useTransition();

    const pageSize = 25;
    const totalPages = Math.ceil(total / pageSize);

    const fetchPage = (newPage: number, s: string, rt: ResponsibleTypeFilter) => {
        startTransition(async () => {
            const result = await getGuardianDeclarationsAction(newPage, s, rt);
            setData(result.data);
            setTotal(result.total);
            setPage(newPage);
        });
    };

    const handleSearch = (value: string) => { setSearch(value); fetchPage(1, value, responsibleType); };
    const handleTypeFilter = (rt: ResponsibleTypeFilter) => { setResponsibleType(rt); fetchPage(1, search, rt); };

    return (
        <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full md:w-72 group">
                        <MagnifyingGlassIcon size={20} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            variant="lg"
                            placeholder="Buscar por atleta ou responsável..."
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="pl-11 bg-background border-input shadow-sm"
                        />
                    </div>
                    <Select value={responsibleType} onValueChange={(v) => handleTypeFilter(v as ResponsibleTypeFilter)}>
                        <SelectTrigger className="h-12 w-[180px] rounded-xl border-input bg-background font-medium">
                            <SelectValue placeholder="Responsável" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="guardian">Responsável Legal</SelectItem>
                            <SelectItem value="academy">Academia</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-muted-foreground px-2">
                        {isPending ? '...' : `${total} declaraç${total !== 1 ? 'ões' : 'ão'}`}
                    </span>
                    <Button variant="outline" size="sm" pill onClick={() => fetchPage(page - 1, search, responsibleType)} disabled={page <= 1 || isPending}>
                        <CaretLeftIcon size={20} weight="duotone" />
                    </Button>
                    <span className="text-xs font-bold text-muted-foreground px-1">{page} / {totalPages || 1}</span>
                    <Button variant="outline" size="sm" pill onClick={() => fetchPage(page + 1, search, responsibleType)} disabled={page >= totalPages || isPending}>
                        <CaretRightIcon size={20} weight="duotone" />
                    </Button>
                </div>
            </div>

            {data.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma declaração encontrada.</div>
            ) : (
                <div className="space-y-2">
                    {data.map((decl) => (
                        <div key={decl.id} className="flex items-center justify-between gap-4 p-4 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors">
                            <div className="flex flex-col gap-1 min-w-0">
                                <span className="text-sm font-semibold truncate">{decl.athlete_name}</span>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {decl.responsible_type === 'guardian' ? (
                                        <>
                                            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 border-amber-500/20">
                                                {RELATIONSHIP_LABELS[decl.responsible_relationship ?? ''] ?? 'Responsável Legal'}
                                            </Badge>
                                            {decl.responsible_name && (
                                                <span className="text-xs text-muted-foreground">{decl.responsible_name}</span>
                                            )}
                                        </>
                                    ) : (
                                        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-700 border-blue-500/20">
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
                                        <EyeIcon size={20} weight="duotone" />
                                        Ver
                                    </Button>
                                }
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
