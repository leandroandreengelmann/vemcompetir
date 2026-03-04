'use client';

import { useEffect, useState, use } from 'react';
import { getEventReportInscricoes } from '../../../../actions/event-reports';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Receipt, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { RegistrationDetailsDialog } from './RegistrationDetailsDialog';

function formatCPF(cpf?: string) {
    if (!cpf) return '';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export default function InscricoesReportPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: eventId } = use(params);
    const [data, setData] = useState<any[]>([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('todas');
    const [page, setPage] = useState(1);
    const [selectedRegistration, setSelectedRegistration] = useState<any>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            load();
        }, 300);
        return () => clearTimeout(timer);
    }, [search, status, page]);

    async function load() {
        setLoading(true);
        try {
            const res = await getEventReportInscricoes(eventId, { search, status, page });
            setData(res.data);
            setCount(res.count ?? 0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const totalPages = Math.ceil(count / 20);

    const renderStatusBadge = (status: string) => {
        if (status === 'paga' || status === 'pago' || status === 'confirmado') {
            return (
                <Badge variant="outline" className="text-label px-2 font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                    PAGO
                </Badge>
            );
        }
        if (status === 'pendente' || status === 'aguardando_pagamento') {
            return (
                <Badge variant="outline" className="text-label px-2 font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                    PENDENTE
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="text-label px-2 font-semibold uppercase tracking-wider bg-sky-500/10 text-sky-700 border-sky-500/20 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30">
                NA CESTA DE COMPRAS
            </Badge>
        );
    };

    const renderBeltBadge = (belt: string) => {
        if (!belt) return null;

        const lowerBelt = belt.toLowerCase();
        let bgClass = "bg-muted text-muted-foreground border-border";

        if (lowerBelt.includes('branca')) bgClass = "bg-white text-slate-800 border-slate-200 shadow-sm";
        else if (lowerBelt.includes('azul')) bgClass = "bg-blue-500 text-white border-blue-600 shadow-sm";
        else if (lowerBelt.includes('roxa')) bgClass = "bg-purple-500 text-white border-purple-600 shadow-sm";
        else if (lowerBelt.includes('marrom')) bgClass = "bg-amber-800 text-white border-amber-900 shadow-sm";
        else if (lowerBelt.includes('preta')) bgClass = "bg-slate-900 text-white border-slate-950 shadow-sm dark:bg-black dark:border-slate-800";
        else if (lowerBelt.includes('colorida')) bgClass = "bg-gradient-to-r from-green-500 via-yellow-500 to-blue-500 text-white border-none shadow-sm";
        else if (lowerBelt.includes('cinza')) bgClass = "bg-gray-400 text-white border-gray-500 shadow-sm";
        else if (lowerBelt.includes('amarela')) bgClass = "bg-yellow-400 text-yellow-950 border-yellow-500 shadow-sm";
        else if (lowerBelt.includes('laranja')) bgClass = "bg-orange-500 text-white border-orange-600 shadow-sm";
        else if (lowerBelt.includes('verde')) bgClass = "bg-green-600 text-white border-green-700 shadow-sm";

        return (
            <Badge variant="outline" className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 mt-1", bgClass)}>
                {belt}
            </Badge>
        );
    };

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Relatório de Inscrições"
                description="Consulte todos os registros de atletas neste evento."
                rightElement={
                    <Link href="/academia-equipe/dashboard">
                        <Button variant="outline" pill className="h-12 gap-2 text-ui font-semibold shadow-sm">
                            <ArrowLeft className="h-4 w-4" />
                            Voltar ao Dashboard
                        </Button>
                    </Link>
                }
            />

            <Card className="border-none shadow-sm bg-background/50 backdrop-blur-sm">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative w-full md:w-80 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    placeholder="Buscar por nome ou CPF..."
                                    variant="lg"
                                    className="pl-11 bg-background border-input shadow-sm"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <Select value={status} onValueChange={(val) => { setStatus(val); setPage(1); }}>
                                <SelectTrigger className="h-12 w-[160px] rounded-xl border-input bg-background font-medium">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todas">Todas</SelectItem>
                                    <SelectItem value="paga">Pagas</SelectItem>
                                    <SelectItem value="pendente">Pendentes</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 pill"
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-xs font-bold text-muted-foreground px-2">
                                Página {page} de {totalPages || 1}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 pill"
                                disabled={page >= totalPages}
                                onClick={() => setPage(page + 1)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/50 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent border-border/50">
                                    <TableHead className="text-label h-11">Atleta</TableHead>
                                    <TableHead className="text-label h-11">CPF</TableHead>
                                    <TableHead className="text-label h-11">Categoria / Faixa</TableHead>
                                    <TableHead className="text-label h-11">Status</TableHead>
                                    <TableHead className="text-label h-11 text-right">Valor</TableHead>
                                    <TableHead className="text-label h-11 text-center w-[80px]">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <TableRow key={i} className="border-border/50">
                                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                                            <TableCell className="text-center"><Skeleton className="h-8 w-8 rounded-md mx-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : data.length > 0 ? (
                                    data.map((reg) => (
                                        <TableRow
                                            key={reg.id}
                                            className="group hover:bg-muted/30 transition-colors border-border/50 cursor-pointer"
                                            onClick={() => {
                                                setSelectedRegistration(reg);
                                                setIsDialogOpen(true);
                                            }}
                                        >
                                            <TableCell className="text-ui font-bold py-4">{reg.athlete?.full_name}</TableCell>
                                            <TableCell className="text-caption text-muted-foreground">{formatCPF(reg.athlete?.cpf)}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className="text-ui font-medium truncate max-w-[300px]" title={reg.category?.categoria_completa}>{reg.category?.categoria_completa}</span>
                                                    {renderBeltBadge(reg.athlete?.belt_color)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {renderStatusBadge(reg.status)}
                                            </TableCell>
                                            <TableCell className="text-right text-ui font-bold">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(reg.price || 0))}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mx-auto">
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-sm">
                                            Nenhuma inscrição encontrada.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <RegistrationDetailsDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                registration={selectedRegistration}
            />
        </div>
    );
}
