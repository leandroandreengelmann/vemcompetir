'use client';

import { useEffect, useState, useMemo, use } from 'react';
import { getEventReportCategorias } from '../../../../actions/event-reports';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EyeIcon, KeyIcon, MagnifyingGlassIcon, XIcon, ArrowLeftIcon, FunnelIcon, UsersIcon, TagIcon } from '@phosphor-icons/react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type ParsedCategory = {
    sexo: string;
    faixa: string;
    peso: string;
    modalidade: string;
    divisao: string;
};

function parseCategorySegments(name: string): ParsedCategory {
    const parts = name.split(' • ');

    if (parts.length >= 6) {
        return {
            divisao: parts.slice(0, parts.length - 4).join(' • '),
            sexo: parts[parts.length - 4],
            faixa: parts[parts.length - 3],
            peso: parts[parts.length - 2],
            modalidade: parts[parts.length - 1],
        };
    }

    if (parts.length === 5) {
        return {
            divisao: parts[0],
            sexo: parts[1],
            faixa: parts[2],
            peso: parts[3],
            modalidade: parts[4],
        };
    }

    if (parts.length === 4) {
        return {
            divisao: '',
            sexo: parts[0],
            faixa: parts[1],
            peso: parts[2],
            modalidade: parts[3],
        };
    }

    return {
        divisao: '',
        sexo: '',
        faixa: '',
        peso: '',
        modalidade: '',
    };
}

export default function CategoriasReportPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: eventId } = use(params);
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [filterSexo, setFilterSexo] = useState('todos');
    const [filterFaixa, setFilterFaixa] = useState('todos');
    const [filterPeso, setFilterPeso] = useState('todos');
    const [filterDivisao, setFilterDivisao] = useState('todos');
    const [filterModalidade, setFilterModalidade] = useState('todos');
    const [filterTipo, setFilterTipo] = useState('todos');

    useEffect(() => {
        load();
    }, [eventId]);

    async function load() {
        setLoading(true);
        try {
            const res = await getEventReportCategorias(eventId);
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const parsedData = useMemo(() =>
        data.map(cat => ({ ...cat, parsed: parseCategorySegments(cat.name) })),
        [data]
    );

    const filterOptions = useMemo(() => {
        const unique = (arr: string[]) => [...new Set(arr.filter(Boolean))].sort();
        return {
            sexo: unique(parsedData.map(p => p.parsed.sexo)),
            faixa: unique(parsedData.map(p => p.parsed.faixa)),
            peso: unique(parsedData.map(p => p.parsed.peso)),
            divisao: unique(parsedData.map(p => p.parsed.divisao)),
            modalidade: unique(parsedData.map(p => p.parsed.modalidade)),
        };
    }, [parsedData]);

    const filteredData = useMemo(() => {
        return parsedData.filter(cat => {
            if (search && !cat.name.toLowerCase().includes(search.toLowerCase())) return false;
            if (filterSexo !== 'todos' && cat.parsed.sexo !== filterSexo) return false;
            if (filterFaixa !== 'todos' && cat.parsed.faixa !== filterFaixa) return false;
            if (filterPeso !== 'todos' && cat.parsed.peso !== filterPeso) return false;
            if (filterDivisao !== 'todos' && cat.parsed.divisao !== filterDivisao) return false;
            if (filterModalidade !== 'todos' && cat.parsed.modalidade !== filterModalidade) return false;
            if (filterTipo === 'absoluto' && cat.parsed.peso !== 'Absoluto') return false;
            if (filterTipo === 'peso' && cat.parsed.peso === 'Absoluto') return false;
            return true;
        });
    }, [parsedData, search, filterSexo, filterFaixa, filterPeso, filterDivisao, filterModalidade, filterTipo]);

    const summary = useMemo(() => {
        const totalInscritos = filteredData.reduce((sum, c) => sum + (c.count ?? 0), 0);
        return {
            categorias: filteredData.length,
            totalCategorias: parsedData.length,
            inscritos: totalInscritos,
        };
    }, [filteredData, parsedData]);

    const hasActiveFilters = search || filterSexo !== 'todos' || filterFaixa !== 'todos' || filterPeso !== 'todos' || filterDivisao !== 'todos' || filterModalidade !== 'todos' || filterTipo !== 'todos';

    function clearAllFilters() {
        setSearch('');
        setFilterSexo('todos');
        setFilterFaixa('todos');
        setFilterPeso('todos');
        setFilterDivisao('todos');
        setFilterModalidade('todos');
        setFilterTipo('todos');
    }

    const activeFilterBadges: { label: string; clear: () => void }[] = [];
    if (filterSexo !== 'todos') activeFilterBadges.push({ label: `Sexo: ${filterSexo}`, clear: () => setFilterSexo('todos') });
    if (filterFaixa !== 'todos') activeFilterBadges.push({ label: `Faixa: ${filterFaixa}`, clear: () => setFilterFaixa('todos') });
    if (filterPeso !== 'todos') activeFilterBadges.push({ label: `Peso: ${filterPeso}`, clear: () => setFilterPeso('todos') });
    if (filterDivisao !== 'todos') activeFilterBadges.push({ label: `Divisão: ${filterDivisao}`, clear: () => setFilterDivisao('todos') });
    if (filterModalidade !== 'todos') activeFilterBadges.push({ label: `Modalidade: ${filterModalidade}`, clear: () => setFilterModalidade('todos') });
    if (filterTipo !== 'todos') activeFilterBadges.push({ label: `Tipo: ${filterTipo === 'absoluto' ? 'Absoluto' : 'Por Peso'}`, clear: () => setFilterTipo('todos') });
    if (search) activeFilterBadges.push({ label: `Busca: "${search}"`, clear: () => setSearch('') });

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Relatório de Categorias"
                description="Contagem de inscrições agrupadas por categoria de luta."
                rightElement={
                    <Link href="/academia-equipe/dashboard">
                        <Button variant="outline" pill className="h-12 gap-2 text-panel-sm font-semibold shadow-sm">
                            <ArrowLeftIcon size={16} weight="duotone" />
                            Voltar ao Dashboard
                        </Button>
                    </Link>
                }
            />

            {/* KPIs */}
            {!loading && data.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
                        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-foreground/10">
                            <TagIcon size={18} weight="duotone" className="text-foreground" />
                        </div>
                        <div>
                            <p className="text-panel-sm text-muted-foreground font-medium">Categorias</p>
                            <p className="text-lg font-bold">
                                {summary.categorias}
                                {hasActiveFilters && <span className="text-panel-sm font-normal text-muted-foreground"> de {summary.totalCategorias}</span>}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
                        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-foreground/10">
                            <UsersIcon size={18} weight="duotone" className="text-foreground" />
                        </div>
                        <div>
                            <p className="text-panel-sm text-muted-foreground font-medium">Inscritos</p>
                            <p className="text-lg font-bold">{summary.inscritos}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Filtros */}
            {!loading && data.length > 0 && (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Busca */}
                        <div className="relative w-full sm:w-56">
                            <MagnifyingGlassIcon size={16} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Buscar categoria..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-10 rounded-xl text-panel-sm"
                            />
                        </div>

                        {/* Tipo (Absoluto / Por Peso) */}
                        <Select value={filterTipo} onValueChange={setFilterTipo}>
                            <SelectTrigger className="h-10 w-[150px] rounded-xl text-panel-sm">
                                <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos os tipos</SelectItem>
                                <SelectItem value="absoluto">Absoluto</SelectItem>
                                <SelectItem value="peso">Por Peso</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Sexo */}
                        {filterOptions.sexo.length > 1 && (
                            <Select value={filterSexo} onValueChange={setFilterSexo}>
                                <SelectTrigger className="h-10 w-[140px] rounded-xl text-panel-sm">
                                    <SelectValue placeholder="Sexo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos os sexos</SelectItem>
                                    {filterOptions.sexo.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Faixa */}
                        {filterOptions.faixa.length > 1 && (
                            <Select value={filterFaixa} onValueChange={setFilterFaixa}>
                                <SelectTrigger className="h-10 w-[180px] rounded-xl text-panel-sm">
                                    <SelectValue placeholder="Faixa" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todas as faixas</SelectItem>
                                    {filterOptions.faixa.map(f => (
                                        <SelectItem key={f} value={f}>{f}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Peso */}
                        {filterOptions.peso.length > 1 && (
                            <Select value={filterPeso} onValueChange={setFilterPeso}>
                                <SelectTrigger className="h-10 w-[150px] rounded-xl text-panel-sm">
                                    <SelectValue placeholder="Peso" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos os pesos</SelectItem>
                                    {filterOptions.peso.map(p => (
                                        <SelectItem key={p} value={p}>{p}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Divisao */}
                        {filterOptions.divisao.length > 1 && (
                            <Select value={filterDivisao} onValueChange={setFilterDivisao}>
                                <SelectTrigger className="h-10 w-[200px] rounded-xl text-panel-sm">
                                    <SelectValue placeholder="Divisão" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todas as divisões</SelectItem>
                                    {filterOptions.divisao.map(d => (
                                        <SelectItem key={d} value={d}>{d}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Modalidade */}
                        {filterOptions.modalidade.length > 1 && (
                            <Select value={filterModalidade} onValueChange={setFilterModalidade}>
                                <SelectTrigger className="h-10 w-[150px] rounded-xl text-panel-sm">
                                    <SelectValue placeholder="Modalidade" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todas modalidades</SelectItem>
                                    {filterOptions.modalidade.map(m => (
                                        <SelectItem key={m} value={m}>{m}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* Filtros ativos */}
                    {activeFilterBadges.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            <FunnelIcon size={14} weight="duotone" className="text-muted-foreground" />
                            {activeFilterBadges.map((f, i) => (
                                <Badge
                                    key={i}
                                    variant="outline"
                                    className="text-panel-sm font-medium px-2 py-1 gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                                    onClick={f.clear}
                                >
                                    {f.label}
                                    <XIcon size={12} weight="bold" />
                                </Badge>
                            ))}
                            <button
                                onClick={clearAllFilters}
                                className="text-panel-sm text-muted-foreground hover:text-foreground font-medium underline underline-offset-2 transition-colors"
                            >
                                Limpar todos
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Tabela */}
            <div className="rounded-2xl border border-border/50 overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow className="hover:bg-transparent border-border/50">
                            <TableHead className="text-panel-sm font-semibold h-11 w-full max-w-[400px]">Categoria</TableHead>
                            <TableHead className="text-panel-sm font-semibold h-11 text-right whitespace-nowrap">Total</TableHead>
                            <TableHead className="text-panel-sm font-semibold h-11 text-center whitespace-nowrap">Detalhes</TableHead>
                            <TableHead className="text-panel-sm font-semibold h-11 text-center whitespace-nowrap">Chave</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i} className="border-border/50">
                                    <TableCell><Skeleton className="h-4 w-60" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-12 ml-auto" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-8 rounded-md mx-auto" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-8 rounded-md mx-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : filteredData.length > 0 ? (
                            filteredData.map((cat, idx) => (
                                <TableRow key={idx} className="hover:bg-muted/20 transition-colors border-border/50">
                                    <TableCell className="text-panel-sm font-medium py-4">
                                        <span className="line-clamp-2" title={cat.name}>{cat.name}</span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge className="font-bold h-7 px-3 bg-foreground text-background hover:bg-foreground/90 transition-all border-none">
                                            {cat.count}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Link href={`/academia-equipe/dashboard/eventos/${eventId}/relatorios/categorias/detalhes?categoria=${encodeURIComponent(cat.name)}`}>
                                                    <Button pill variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                                        <EyeIcon size={16} weight="duotone" />
                                                    </Button>
                                                </Link>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">Ver detalhes da categoria</TooltipContent>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Link href={`/academia-equipe/dashboard/eventos/${eventId}/relatorios/categorias/chaveamento?categoria=${encodeURIComponent(cat.name)}`}>
                                                    <Button pill variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500 transition-colors">
                                                        <KeyIcon size={16} weight="duotone" />
                                                    </Button>
                                                </Link>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">Ver chaveamento</TooltipContent>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : data.length > 0 && hasActiveFilters ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <FunnelIcon size={24} weight="duotone" className="text-muted-foreground" />
                                        <p className="text-muted-foreground text-sm">Nenhuma categoria encontrada com os filtros selecionados.</p>
                                        <button
                                            onClick={clearAllFilters}
                                            className="text-sm text-primary hover:underline font-medium"
                                        >
                                            Limpar filtros
                                        </button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground text-sm">
                                    Nenhuma categoria com inscrição.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
