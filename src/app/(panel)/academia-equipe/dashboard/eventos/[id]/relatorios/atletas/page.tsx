'use client';

import { useEffect, useState, use } from 'react';
import { getEventReportAtletas } from '../../../../actions/event-reports';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UsersIcon, MagnifyingGlassIcon, ArrowLeftIcon, EyeIcon } from '@phosphor-icons/react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from '@/components/ui/input';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AthleteDetailsDialog } from './AthleteDetailsDialog';

function formatCPF(cpf?: string) {
    if (!cpf) return '';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export default function AtletasReportPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: eventId } = use(params);
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAthlete, setSelectedAthlete] = useState<any>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        load();
    }, [eventId]);

    async function load() {
        setLoading(true);
        try {
            const res = await getEventReportAtletas(eventId);
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const filteredData = data.filter((athlete) =>
        athlete.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        athlete.cpf?.includes(searchTerm)
    );

    const getBeltBadgeStyle = (beltName: string) => {
        const bdg = beltName?.toLowerCase() || '';
        if (bdg.includes('branca')) return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600';
        if (bdg.includes('azul')) return 'bg-blue-500 text-white border-blue-600 dark:bg-blue-600 dark:border-blue-500';
        if (bdg.includes('roxa')) return 'bg-purple-600 text-white border-purple-700 dark:bg-purple-700 dark:border-purple-600';
        if (bdg.includes('marrom')) return 'bg-amber-800 text-white border-amber-900 dark:bg-amber-900 dark:border-amber-800';
        if (bdg.includes('preta')) return 'bg-black text-white border-zinc-800 dark:bg-zinc-950 dark:border-zinc-800';
        if (bdg.includes('coral')) return 'bg-gradient-to-r from-red-600 to-black text-white border-red-900';
        if (bdg.includes('vermelha')) return 'bg-red-600 text-white border-red-700 dark:bg-red-700 dark:border-red-600';
        if (bdg.includes('cinza')) return 'bg-zinc-400 text-zinc-950 border-zinc-500 dark:bg-zinc-500 dark:text-zinc-50 dark:border-zinc-400';
        if (bdg.includes('amarela')) return 'bg-yellow-400 text-yellow-950 border-yellow-500 dark:bg-yellow-500 dark:text-yellow-50 dark:border-yellow-400';
        if (bdg.includes('laranja')) return 'bg-orange-500 text-white border-orange-600 dark:bg-orange-600 dark:border-orange-500';
        if (bdg.includes('verde')) return 'bg-green-600 text-white border-green-700 dark:bg-green-700 dark:border-green-600';
        return 'bg-accent/5 text-muted-foreground';
    };

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Relatório de Atletas"
                description="Listagem de atletas únicos inscritos e suas respectivas participaçōes."
                rightElement={
                    <Link href="/academia-equipe/dashboard">
                        <Button variant="outline" pill className="h-12 gap-2 text-panel-sm font-semibold shadow-sm">
                            <ArrowLeftIcon size={16} weight="duotone" />
                            Voltar ao Dashboard
                        </Button>
                    </Link>
                }
            />

            <div className="relative w-full md:w-[400px]">
                <MagnifyingGlassIcon size={16} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input variant="lg"
                    placeholder="Buscar por nome ou CPF..."
                    className="pl-11 w-full bg-background shadow-sm border-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <Card className="border shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent border-border/50">
                                    <TableHead className="text-panel-sm font-semibold h-11 px-6">Atleta</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11">CPF</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11">Faixa</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11">Categorias Inscritas</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11 text-center w-[80px]">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <TableRow key={i} className="border-border/50">
                                            <TableCell className="px-6"><Skeleton className="h-4 w-40" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                                            <TableCell className="text-center"><Skeleton className="h-8 w-8 rounded-md mx-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredData.length > 0 ? (
                                    filteredData.map((athlete, idx) => (
                                        <TableRow
                                            key={idx}
                                            className="hover:bg-muted/30 transition-colors border-border/50 cursor-pointer"
                                            onClick={() => {
                                                setSelectedAthlete(athlete);
                                                setIsDialogOpen(true);
                                            }}
                                        >
                                            <TableCell className="text-panel-sm font-bold py-4 px-6">{athlete.full_name}</TableCell>
                                            <TableCell className="text-panel-sm text-muted-foreground">{formatCPF(athlete.cpf)}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`text-panel-sm font-semibold px-2.5 py-0.5 font-bold uppercase tracking-wider ${getBeltBadgeStyle(athlete.belt_color)}`}>
                                                    {athlete.belt_color || 'N/A'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="pr-6">
                                                <div className="flex flex-col gap-0.5">
                                                    {athlete.categories && athlete.categories.length > 0 ? (
                                                        <>
                                                            <span className="text-xs font-semibold text-foreground tracking-tight truncate max-w-[400px]" title={athlete.categories[0]}>
                                                                {athlete.categories[0]}
                                                            </span>
                                                            {athlete.categories.length > 1 && (
                                                                <span className="text-panel-sm font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                                                                    + {athlete.categories.length - 1} {athlete.categories.length - 1 === 1 ? 'categoria' : 'categorias'}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-xs font-medium text-muted-foreground">-</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mx-auto">
                                                            <EyeIcon size={16} weight="duotone" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">Ver detalhes do atleta</TooltipContent>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-3 text-muted-foreground">
                                                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                                                    <UsersIcon size={24} weight="duotone" />
                                                </div>
                                                <div className="text-sm font-medium">Nenhum atleta encontrado</div>
                                                {searchTerm && (
                                                    <div className="text-xs">Não encontramos resultados para "{searchTerm}"</div>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <AthleteDetailsDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                athlete={selectedAthlete}
            />
        </div>
    );
}
