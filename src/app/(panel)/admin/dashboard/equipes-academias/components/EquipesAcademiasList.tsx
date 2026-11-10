'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    MagnifyingGlassIcon,
    EyeIcon,
    CalendarDotsIcon,
    BuildingsIcon,
    UsersThreeIcon,
    WalletIcon,
} from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AsaasConfigDialog from './AsaasConfigDialog';
import DeleteAcademyButton from './DeleteAcademyButton';

export type Entidade = {
    id: string;
    full_name: string;
    email: string;
    created_at: string | null;
    master_name: string | null;
    athlete_count: number;
    use_own_asaas_api: boolean;
    asaas_api_key_last4: string | null;
};

type SortKey = 'recentes' | 'nome' | 'atletas';

function normalize(s: string) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function formatDate(d: string | null) {
    return d ? format(new Date(d), 'dd/MM/yy', { locale: ptBR }) : '-';
}

function Actions({ e }: { e: Entidade }) {
    return (
        <div className="flex items-center justify-end gap-1">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" asChild pill>
                        <Link href={`/admin/dashboard/equipes-academias/${e.id}/eventos`}>
                            <CalendarDotsIcon size={20} weight="duotone" />
                            <span className="sr-only">Eventos</span>
                        </Link>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Eventos</TooltipContent>
            </Tooltip>
            <AsaasConfigDialog
                entidadeId={e.id}
                entidadeNome={e.full_name}
                useOwnAsaas={e.use_own_asaas_api}
                last4={e.asaas_api_key_last4}
            />
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" asChild pill>
                        <Link href={`/admin/dashboard/equipes-academias/${e.id}`}>
                            <EyeIcon size={20} weight="duotone" />
                            <span className="sr-only">Visualizar detalhes</span>
                        </Link>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Detalhes</TooltipContent>
            </Tooltip>
            <DeleteAcademyButton academyId={e.id} academyName={e.full_name} />
        </div>
    );
}

export default function EquipesAcademiasList({ entidades }: { entidades: Entidade[] }) {
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<SortKey>('recentes');

    const totalAtletas = entidades.reduce((s, e) => s + e.athlete_count, 0);
    const comAsaasProprio = entidades.filter(e => e.use_own_asaas_api).length;

    const filtered = useMemo(() => {
        const q = normalize(search.trim());
        const list = q
            ? entidades.filter(e =>
                normalize(e.full_name).includes(q)
                || normalize(e.email).includes(q)
                || normalize(e.master_name ?? '').includes(q))
            : [...entidades];

        if (sort === 'nome') list.sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'));
        else if (sort === 'atletas') list.sort((a, b) => b.athlete_count - a.athlete_count);
        else list.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
        return list;
    }, [entidades, search, sort]);

    const kpis = [
        { label: 'Entidades', value: entidades.length, icon: BuildingsIcon, accent: 'text-primary bg-primary/10 border-primary/20' },
        { label: 'Atletas vinculados', value: totalAtletas, icon: UsersThreeIcon, accent: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
        { label: 'Com Asaas próprio', value: comAsaasProprio, icon: WalletIcon, accent: 'text-purple-600 bg-purple-500/10 border-purple-500/20' },
    ];

    return (
        <div className="space-y-6">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                {kpis.map(k => {
                    const Icon = k.icon;
                    return (
                        <Card key={k.label} className="shadow-none">
                            <CardContent className="p-5 flex items-center justify-between gap-3">
                                <div className="flex flex-col gap-1">
                                    <span className="text-panel-sm text-muted-foreground">{k.label}</span>
                                    <span className="text-2xl font-bold tabular-nums">{k.value}</span>
                                </div>
                                <div className={`p-2.5 rounded-xl border ${k.accent}`}>
                                    <Icon size={22} weight="duotone" />
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Card className="shadow-none overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b">
                    <div className="relative flex-1 sm:max-w-sm">
                        <MagnifyingGlassIcon size={18} weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome, e-mail ou mestre..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 h-10 rounded-xl"
                        />
                    </div>
                    <Select value={sort} onValueChange={v => setSort(v as SortKey)}>
                        <SelectTrigger className="h-10 rounded-xl sm:w-48">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="recentes">Mais recentes</SelectItem>
                            <SelectItem value="nome">Nome (A–Z)</SelectItem>
                            <SelectItem value="atletas">Mais atletas</SelectItem>
                        </SelectContent>
                    </Select>
                    <span className="text-panel-sm text-muted-foreground sm:ml-auto">
                        {filtered.length === entidades.length
                            ? `${entidades.length} entidade${entidades.length !== 1 ? 's' : ''}`
                            : `${filtered.length} de ${entidades.length} entidades`}
                    </span>
                </div>

                {filtered.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-panel-sm text-muted-foreground">
                        {entidades.length === 0 ? 'Nenhuma entidade cadastrada.' : 'Nenhuma entidade encontrada para essa busca.'}
                    </div>
                ) : (
                    <>
                        {/* Desktop: tabela sem rolagem horizontal */}
                        <div className="hidden lg:block">
                            <Table className="table-fixed">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6 w-[38%]">Equipe / Academia</TableHead>
                                        <TableHead className="w-[24%]">Mestre responsável</TableHead>
                                        <TableHead className="text-center w-[10%]">Atletas</TableHead>
                                        <TableHead className="w-[10%]">Cadastro</TableHead>
                                        <TableHead className="text-right pr-6 w-[18%]">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map(e => (
                                        <TableRow key={e.id}>
                                            <TableCell className="pl-6">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-semibold truncate" title={e.full_name}>{e.full_name}</span>
                                                    <span className="text-panel-sm text-muted-foreground truncate" title={e.email}>{e.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="truncate text-primary/80 font-medium" title={e.master_name ?? ''}>
                                                {e.master_name ?? <span className="text-muted-foreground font-normal">—</span>}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="rounded-full text-xs font-bold px-2.5 tabular-nums">
                                                    {e.athlete_count}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground tabular-nums">{formatDate(e.created_at)}</TableCell>
                                            <TableCell className="pr-6">
                                                <Actions e={e} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile / tablet: cartões */}
                        <ul className="lg:hidden divide-y">
                            {filtered.map(e => (
                                <li key={e.id} className="p-4 flex flex-col gap-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-semibold break-words">{e.full_name}</span>
                                            <span className="text-panel-sm text-muted-foreground break-all">{e.email}</span>
                                        </div>
                                        <Badge variant="outline" className="rounded-full text-xs font-bold px-2.5 shrink-0 tabular-nums">
                                            {e.athlete_count} atleta{e.athlete_count !== 1 ? 's' : ''}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-panel-sm text-muted-foreground min-w-0">
                                            <span className="text-foreground/80">{e.master_name ?? 'Sem mestre'}</span>
                                            {' · '}desde {formatDate(e.created_at)}
                                        </div>
                                        <Actions e={e} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </Card>
        </div>
    );
}
