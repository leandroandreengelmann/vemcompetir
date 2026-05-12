'use client';

import { useEffect, useState, useTransition } from 'react';
import { getAcademyInscriptions, getAcademyEventsList, exportAcademyInscriptions } from '../actions/academy-inscriptions';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MagnifyingGlassIcon, CaretLeftIcon, CaretRightIcon, FilePdfIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { pdf } from '@react-pdf/renderer';
import { InscricoesPDF } from './InscricoesPDF';
import { toast } from 'sonner';

function formatCPF(cpf?: string) {
    if (!cpf) return '';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatDate(dateStr?: string) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR');
}

export default function AcademyInscricoesPage() {
    const [data, setData] = useState<any[]>([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('todas');
    const [eventId, setEventId] = useState('todos');
    const [page, setPage] = useState(1);
    const [events, setEvents] = useState<any[]>([]);
    const [isExporting, startExport] = useTransition();

    const handleExportPDF = () => {
        startExport(async () => {
            try {
                const res = await exportAcademyInscriptions({
                    search,
                    eventId: eventId === 'todos' ? undefined : eventId,
                });
                if (!res.inscricoes || res.inscricoes.length === 0) {
                    toast.error('Nenhuma inscrição confirmada para exportar.');
                    return;
                }
                const eventoFiltrado = eventId !== 'todos'
                    ? (() => {
                        const ev = events.find(e => e.id === eventId);
                        return ev ? { title: ev.title, event_date: ev.event_date } : null;
                    })()
                    : null;
                const blob = await pdf(
                    <InscricoesPDF
                        academia={res.academia}
                        inscricoes={res.inscricoes}
                        totals={res.totals}
                        eventoFiltrado={eventoFiltrado}
                    />
                ).toBlob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const dataStr = new Date().toISOString().slice(0, 10);
                const slug = eventoFiltrado
                    ? eventoFiltrado.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
                    : 'geral';
                a.href = url;
                a.download = `inscricoes-${slug}-${dataStr}.pdf`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                toast.success('PDF gerado.');
            } catch (err: any) {
                console.error(err);
                toast.error('Falha ao gerar PDF.');
            }
        });
    };

    useEffect(() => {
        getAcademyEventsList().then((list: any) => setEvents(list));
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => { load(); }, 300);
        return () => clearTimeout(timer);
    }, [search, status, eventId, page]);

    async function load() {
        setLoading(true);
        try {
            const res = await getAcademyInscriptions({
                search,
                status,
                eventId: eventId === 'todos' ? undefined : eventId,
                page,
            });
            setData(res.data);
            setCount(res.count ?? 0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const totalPages = Math.ceil(count / 20);

    const renderStatusBadge = (reg: any) => {
        const tipo = reg.tipo;
        const payerType = reg.payer_type;

        if (tipo === 'cortesia') {
            return (
                <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-pink-500/10 text-pink-700 border-pink-500/20 dark:bg-pink-500/20 dark:text-pink-300 dark:border-pink-500/30">
                    CORTESIA
                </Badge>
            );
        }
        if (tipo === 'pacote') {
            return (
                <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-purple-500/10 text-purple-700 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30">
                    PACOTE DE INSCRIÇÕES
                </Badge>
            );
        }
        if (tipo === 'evento_proprio' || tipo === 'isento_evento_proprio') {
            return (
                <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-slate-500/10 text-slate-700 border-slate-500/20 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30">
                    ISENTO - EVENTO PROPRIO
                </Badge>
            );
        }
        if (tipo === 'pago_em_mao') {
            const amount = reg.manual_amount ? `R$ ${Number(reg.manual_amount).toFixed(2)}` : null;
            return (
                <div className="flex flex-col items-start gap-0.5">
                    <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                        PAGO EM MAO
                    </Badge>
                    <span className="text-panel-sm text-muted-foreground font-medium">
                        evento proprio{amount ? ` - ${amount}` : ''}
                    </span>
                </div>
            );
        }
        if (tipo === 'pix_direto') {
            const amount = reg.manual_amount ? `R$ ${Number(reg.manual_amount).toFixed(2)}` : null;
            return (
                <div className="flex flex-col items-start gap-0.5">
                    <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-blue-500/10 text-blue-700 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30">
                        PIX DIRETO
                    </Badge>
                    <span className="text-panel-sm text-muted-foreground font-medium">
                        evento proprio{amount ? ` - ${amount}` : ''}
                    </span>
                </div>
            );
        }
        if (tipo === 'agendado') {
            return (
                <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-blue-500/10 text-blue-700 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30">
                    AGENDADO
                </Badge>
            );
        }
        if (tipo === 'pago') {
            const manualMethod = reg.manual_method;
            let subLabel = payerType === 'ACADEMY' ? 'pela academia' : payerType === 'ATHLETE' ? 'pelo atleta' : null;
            if (manualMethod === 'pago_em_mao') subLabel = 'pago em mao';
            if (manualMethod === 'pix_direto') subLabel = 'PIX direto';
            return (
                <div className="flex flex-col items-start gap-0.5">
                    <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                        PAGO
                    </Badge>
                    {subLabel && (
                        <span className="text-panel-sm text-muted-foreground font-medium">
                            {subLabel}
                        </span>
                    )}
                </div>
            );
        }
        if (tipo === 'pendente') {
            return (
                <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                    PENDENTE
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="text-panel-sm font-semibold px-2 uppercase tracking-wider bg-sky-500/10 text-sky-700 border-sky-500/20 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30">
                NA CESTA
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
            <Badge variant="outline" className={cn("text-panel-sm font-bold uppercase tracking-wider px-2 py-0.5 mt-1", bgClass)}>
                {belt}
            </Badge>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <SectionHeader
                    title="Inscrições dos Atletas"
                    description="Consulte todas as inscrições dos atletas da sua academia em todos os eventos."
                />
                <Button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    pill
                    className="h-10 gap-2 self-start md:self-auto text-panel-sm font-semibold bg-primary text-white hover:bg-primary/90"
                >
                    <FilePdfIcon size={16} weight="duotone" />
                    {isExporting ? 'Gerando PDF...' : 'Exportar PDF'}
                </Button>
            </div>

            <Card className="border-none shadow-sm bg-background/50 backdrop-blur-sm">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative w-full md:w-72 group">
                                <MagnifyingGlassIcon size={16} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    placeholder="Buscar por nome ou CPF..."
                                    variant="lg"
                                    className="pl-11 bg-background border-input shadow-sm"
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                />
                            </div>
                            <Select value={status} onValueChange={(val) => { setStatus(val); setPage(1); }}>
                                <SelectTrigger className="h-12 w-[180px] rounded-xl border-input bg-background font-medium">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todas">Todos os Status</SelectItem>
                                    <SelectItem value="paga">Pagas</SelectItem>
                                    <SelectItem value="pendente">Pendentes</SelectItem>
                                    <SelectItem value="agendado">Pagamento Agendado</SelectItem>
                                    <SelectItem value="cortesia">Cortesia</SelectItem>
                                    <SelectItem value="pacote">Pacote de Inscrições</SelectItem>
                                    <SelectItem value="evento_proprio">Evento Próprio</SelectItem>
                                    <SelectItem value="carrinho">Na Cesta</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={eventId} onValueChange={(val) => { setEventId(val); setPage(1); }}>
                                <SelectTrigger className="h-12 w-[220px] rounded-xl border-input bg-background font-medium">
                                    <SelectValue placeholder="Evento" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos os Eventos</SelectItem>
                                    {events.map((ev: any) => (
                                        <SelectItem key={ev.id} value={ev.id}>
                                            {ev.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="h-9 pill" disabled={page === 1} onClick={() => setPage(page - 1)}>
                                <CaretLeftIcon size={16} weight="duotone" />
                            </Button>
                            <span className="text-xs font-bold text-muted-foreground px-2">
                                Página {page} de {totalPages || 1}
                            </span>
                            <Button variant="outline" size="sm" className="h-9 pill" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                                <CaretRightIcon size={16} weight="duotone" />
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/50 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent border-border/50">
                                    <TableHead className="text-panel-sm font-semibold h-11">Atleta</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11 hidden md:table-cell">CPF</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11">Evento</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11 hidden lg:table-cell">Categoria / Faixa</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11">Status</TableHead>
                                    <TableHead className="text-panel-sm font-semibold h-11 text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <TableRow key={i} className="border-border/50">
                                            <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                                            <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                            <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : data.length > 0 ? (
                                    data.map((reg) => (
                                        <TableRow key={reg.id} className="hover:bg-muted/30 transition-colors border-border/50">
                                            <TableCell className="text-panel-sm font-bold py-4">{reg.athlete?.full_name}</TableCell>
                                            <TableCell className="text-panel-sm text-muted-foreground hidden md:table-cell">{formatCPF(reg.athlete?.cpf)}</TableCell>
                                            <TableCell className="py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-panel-sm font-semibold">{reg.event?.title}</span>
                                                    <span className="text-panel-sm text-muted-foreground">{formatDate(reg.event?.event_date)}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell">
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className="text-panel-sm font-medium truncate max-w-[300px]" title={reg.category?.categoria_completa}>{reg.category?.categoria_completa}</span>
                                                    {renderBeltBadge(reg.athlete?.belt_color)}
                                                </div>
                                            </TableCell>
                                            <TableCell>{renderStatusBadge(reg)}</TableCell>
                                            <TableCell className="text-right text-panel-sm font-bold">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(reg.price || 0))}
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
        </div>
    );
}
