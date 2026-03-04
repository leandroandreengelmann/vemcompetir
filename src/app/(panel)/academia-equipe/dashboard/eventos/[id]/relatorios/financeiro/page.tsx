'use client';

import { useEffect, useState, use } from 'react';
import { getEventReportFinanceiro } from '../../../../actions/event-reports';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, CheckCircle2, AlertCircle, Banknote, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function FinanceiroReportPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: eventId } = use(params);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        load();
    }, [eventId]);

    async function load() {
        setLoading(true);
        try {
            const res = await getEventReportFinanceiro(eventId);
            setData(res);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="space-y-8">
            <SectionHeader
                title="Relatório Financeiro"
                description="Resumo de valores confirmados e pendentes para este evento."
                rightElement={
                    <Link href="/academia-equipe/dashboard">
                        <Button variant="outline" pill className="h-12 gap-2 text-ui font-semibold shadow-sm">
                            <ArrowLeft className="h-4 w-4" />
                            Voltar ao Dashboard
                        </Button>
                    </Link>
                }
            />

            {/* KPIs Financeiros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none bg-emerald-500/10 border border-emerald-500/20 shadow-none overflow-hidden group">
                    <CardContent className="p-8 flex items-center justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-emerald-500 dark:text-emerald-400">
                                <CheckCircle2 className="h-5 w-5" />
                                <span className="text-label">Confirmado / Recebido</span>
                            </div>
                            <h2 className="text-4xl font-black tracking-tighter text-emerald-600 dark:text-emerald-300">
                                {loading ? <Skeleton className="h-10 w-48" /> : formatCurrency(data?.summary.paid_amount || 0)}
                            </h2>
                            <p className="text-caption font-medium text-emerald-500/80">{data?.summary.paid_count || 0} inscrições pagas</p>
                        </div>
                        <Banknote className="h-16 w-16 text-emerald-500/20 -rotate-12 group-hover:scale-110 transition-transform duration-500" />
                    </CardContent>
                </Card>

                <Card className="border-none bg-amber-500/10 border border-amber-500/20 shadow-none overflow-hidden group">
                    <CardContent className="p-8 flex items-center justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400">
                                <AlertCircle className="h-5 w-5" />
                                <span className="text-label">Aguardando Pagamento</span>
                            </div>
                            <h2 className="text-4xl font-black tracking-tighter text-amber-600 dark:text-amber-300">
                                {loading ? <Skeleton className="h-10 w-48" /> : formatCurrency(data?.summary.pending_amount || 0)}
                            </h2>
                            <p className="text-caption font-medium text-amber-500/80">{data?.summary.pending_count || 0} inscrições pendentes</p>
                        </div>
                        <Wallet className="h-16 w-16 text-amber-500/20 rotate-12 group-hover:scale-110 transition-transform duration-500" />
                    </CardContent>
                </Card>

                <Card className="border-none bg-sky-500/10 border border-sky-500/20 shadow-none overflow-hidden group">
                    <CardContent className="p-8 flex items-center justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sky-500 dark:text-sky-400">
                                <ShoppingBag className="h-5 w-5" />
                                <span className="text-label">Na Cesta de Compras</span>
                            </div>
                            <h2 className="text-4xl font-black tracking-tighter text-sky-600 dark:text-sky-300">
                                {loading ? <Skeleton className="h-10 w-48" /> : formatCurrency(data?.summary.cart_amount || 0)}
                            </h2>
                            <p className="text-caption font-medium text-sky-500/80">{data?.summary.cart_count || 0} inscrições na cesta de compras</p>
                        </div>
                        <ShoppingBag className="h-16 w-16 text-sky-500/20 rotate-12 group-hover:scale-110 transition-transform duration-500" />
                    </CardContent>
                </Card>
            </div>

            {/* Listagem de Transações (Simplificada) */}
            <Card className="border-none shadow-sm bg-background/50 backdrop-blur-sm">
                <CardContent className="p-6">
                    <h3 className="text-h3 mb-6">Fluxo de Inscrições</h3>
                    <div className="rounded-2xl border border-border/50 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent border-border/50">
                                    <TableHead className="text-label h-11">Data Criação</TableHead>
                                    <TableHead className="text-label h-11">Atleta</TableHead>
                                    <TableHead className="text-label h-11">Categoria</TableHead>
                                    <TableHead className="text-label h-11">Status</TableHead>
                                    <TableHead className="text-label h-11 text-right">Valor Bruto</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <TableRow key={i} className="border-border/50">
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : data?.data.length > 0 ? (
                                    data.data.slice(0, 50).map((reg: any, idx: number) => (
                                        <TableRow key={idx} className="hover:bg-muted/20 transition-colors border-border/50">
                                            <TableCell className="text-ui font-medium py-4">
                                                {new Date(reg.created_at).toLocaleString('pt-BR')}
                                            </TableCell>
                                            <TableCell className="text-sm font-medium">
                                                {reg.athlete}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground w-[300px]">
                                                {reg.category}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn(
                                                    "text-label px-2 font-semibold uppercase tracking-wider",
                                                    (reg.status === 'paga' || reg.status === 'pago' || reg.status === 'confirmado')
                                                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
                                                        : reg.status === 'carrinho'
                                                            ? "bg-sky-500/10 text-sky-700 border-sky-500/20 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30"
                                                            : "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30"
                                                )}>
                                                    {reg.status === 'carrinho' ? 'Na Cesta de Compras' : reg.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-ui whitespace-nowrap">
                                                {formatCurrency(Number(reg.price || 0))}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm">
                                            Nenhuma transação encontrada.
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
