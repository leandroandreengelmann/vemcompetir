'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, LibrarySquare, AlertCircle, ShoppingBag, CheckCircle2, Key } from 'lucide-react';
import { getEventCategoryDetails } from '../../../../../actions/event-reports';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function DetalhesCategoriaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: eventId } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const categoriaName = searchParams.get('categoria');

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!categoriaName) {
            router.push(`/academia-equipe/dashboard/eventos/${eventId}/relatorios/categorias`);
            return;
        }
        load();
    }, [eventId, categoriaName]);

    async function load() {
        setLoading(true);
        try {
            const res = await getEventCategoryDetails(eventId, categoriaName!);
            setData(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const pagos = data.filter(d => d.status === 'paga' || d.status === 'confirmado');
    const pendentes = data.filter(d => d.status === 'pendente' || d.status === 'aguardando_pagamento');
    const carrinho = data.filter(d => d.status === 'carrinho');

    const renderTable = (items: any[], emptyMessage: string) => {
        if (loading) {
            return (
                <div className="space-y-3 mt-4">
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-10 w-full rounded-md" />
                </div>
            );
        }

        if (items.length === 0) {
            return (
                <div className="py-8 text-center border-2 border-dashed border-border/50 rounded-xl mt-4 bg-muted/20">
                    <p className="text-muted-foreground text-sm font-medium">{emptyMessage}</p>
                </div>
            );
        }

        return (
            <div className="rounded-xl border border-border/50 overflow-hidden mt-4">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow className="hover:bg-transparent border-border/50">
                            <TableHead className="text-label h-10">Atleta</TableHead>
                            <TableHead className="text-label h-10 w-[250px]">Equipe</TableHead>
                            <TableHead className="text-label h-10 text-right w-[150px]">Data Reg.</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item, idx) => (
                            <TableRow key={idx} className="hover:bg-muted/20 transition-colors border-border/50">
                                <TableCell className="font-medium text-ui py-3">{item.athlete}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{item.gym}</TableCell>
                                <TableCell className="text-right text-muted-foreground text-sm">{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(item.created_at))}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Detalhamento da Categoria"
                description={categoriaName || ''}
                rightElement={
                    <Button variant="outline" pill className="h-12 gap-2 text-ui font-semibold shadow-sm" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                        Voltar ao Relatório
                    </Button>
                }
            />

            <div className="grid gap-6">

                {/* Pagos */}
                <Card className="border-none shadow-sm overflow-hidden bg-background/50 backdrop-blur-sm">
                    <div className="h-1 w-full bg-emerald-500/20" />
                    <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                        <div className="space-y-1">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                Inscrições Pagas
                            </CardTitle>
                            <CardDescription className="text-xs">Atletas confirmados e aptos à chave.</CardDescription>
                        </div>
                        <Badge variant="outline" className="font-semibold h-8 px-3 text-base bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                            {pagos.length}
                        </Badge>
                        <Button variant="outline" size="sm" pill className="h-8 gap-1.5 text-muted-foreground" asChild>
                            <Link href={`/academia-equipe/dashboard/eventos/${eventId}/relatorios/categorias/chaveamento?categoria=${encodeURIComponent(categoriaName || '')}`}>
                                <Key className="h-3.5 w-3.5" />
                                Ver Chave
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {renderTable(pagos, "Nenhum atleta confirmado nesta categoria.")}
                    </CardContent>
                </Card>

                {/* Pendentes */}
                <Card className="border-none shadow-sm overflow-hidden bg-background/50 backdrop-blur-sm">
                    <div className="h-1 w-full bg-amber-500/20" />
                    <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                        <div className="space-y-1">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-amber-500" />
                                Inscrições Pendentes
                            </CardTitle>
                            <CardDescription className="text-xs">Atletas aguardando liberação do pagamento.</CardDescription>
                        </div>
                        <Badge variant="outline" className="font-semibold h-8 px-3 text-base bg-amber-500/10 text-amber-700 border-amber-500/20">
                            {pendentes.length}
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        {renderTable(pendentes, "Nenhuma pendência financeira nesta categoria.")}
                    </CardContent>
                </Card>

                {/* Carrinho */}
                <Card className="border-none shadow-sm overflow-hidden bg-background/50 backdrop-blur-sm">
                    <div className="h-1 w-full bg-sky-500/20" />
                    <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                        <div className="space-y-1">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <ShoppingBag className="h-5 w-5 text-sky-500" />
                                Na Cesta de Compras
                            </CardTitle>
                            <CardDescription className="text-xs">Atletas que iniciaram a inscrição mas não finalizaram o pedido.</CardDescription>
                        </div>
                        <Badge variant="outline" className="font-semibold h-8 px-3 text-base bg-sky-500/10 text-sky-700 border-sky-500/20">
                            {carrinho.length}
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        {renderTable(carrinho, "Nenhum abandono de cesta nesta categoria.")}
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
