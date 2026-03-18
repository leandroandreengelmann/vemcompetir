'use client';

import { useEffect, useState, use } from 'react';
import { getEventReportCategorias } from '../../../../actions/event-reports';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EyeIcon, KeyIcon } from '@phosphor-icons/react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@phosphor-icons/react';

export default function CategoriasReportPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: eventId } = use(params);
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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

            <Card className="border-none shadow-sm bg-background/50 backdrop-blur-sm">
                <CardContent className="p-6">
                    <div className="rounded-2xl border border-border/50 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent border-border/50">
                                    <TableHead className="text-panel-sm font-semibold h-11 w-full max-w-[400px]">Categoria</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11 text-center whitespace-nowrap hidden sm:table-cell">Na Cesta de Compras</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11 text-center whitespace-nowrap">Pendentes</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11 text-center whitespace-nowrap">Pagos</TableHead>
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
                                            <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-12 mx-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-12 mx-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-12 mx-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-12 ml-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-8 rounded-md mx-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : data.length > 0 ? (
                                    data.map((cat, idx) => (
                                        <TableRow key={idx} className="hover:bg-muted/20 transition-colors border-border/50">
                                            <TableCell className="text-panel-sm font-medium py-4">
                                                <span className="line-clamp-2" title={cat.name}>{cat.name}</span>
                                            </TableCell>
                                            <TableCell className="text-center hidden sm:table-cell">
                                                <Badge variant="secondary" className="font-semibold h-7 px-3 bg-muted/60 text-muted-foreground hover:bg-muted/80 transition-all border-none">
                                                    {cat.cart}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="font-semibold h-7 px-3 bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                                                    {cat.pending}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="font-semibold h-7 px-3 bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                                                    {cat.paid}
                                                </Badge>
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
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-sm">
                                            Nenhuma categoria com inscrição.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
