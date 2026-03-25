'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
    MagnifyingGlassIcon,
    GearSixIcon,
    PlusIcon,
    TrashIcon,
    EyeIcon,
    HandCoinsIcon,
    LightningIcon,
    CalendarIcon,
    CaretDownIcon,
    CaretUpIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { upsertNoSplitRule, getNoSplitPayments, getEventPaidCount } from '../actions';
import { getNextIntegralPositions } from '@/lib/no-split-logic';
import { toast } from 'sonner';

interface EventWithRule {
    id: string;
    title: string;
    event_date: string;
    status: string;
    organizer: string;
    noSplitRule: {
        id: string;
        is_enabled: boolean;
        start_after_paid: number;
        offsets: number[];
    } | null;
}

interface NoSplitPaymentDetail {
    id: string;
    qtd_inscricoes: number;
    total: number;
    status: string;
    created_at: string;
    registrations: {
        id: string;
        athlete: string;
        cpf: string;
        category: string;
        price: number;
        status: string;
    }[];
}

export function NoSplitManager({ initialEvents }: { initialEvents: EventWithRule[] }) {
    const [events, setEvents] = useState(initialEvents);
    const [search, setSearch] = useState('');
    const [selectedEvent, setSelectedEvent] = useState<EventWithRule | null>(null);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Config form state
    const [isEnabled, setIsEnabled] = useState(false);
    const [startAfterPaid, setStartAfterPaid] = useState(0);
    const [offsets, setOffsets] = useState<number[]>([10]);
    const [isPending, startTransition] = useTransition();

    // Detail state
    const [detailPayments, setDetailPayments] = useState<NoSplitPaymentDetail[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [paidCount, setPaidCount] = useState(0);
    const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set());

    const filtered = events.filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.organizer.toLowerCase().includes(search.toLowerCase())
    );

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    function openConfig(event: EventWithRule) {
        setSelectedEvent(event);
        setIsEnabled(event.noSplitRule?.is_enabled ?? false);
        setStartAfterPaid(event.noSplitRule?.start_after_paid ?? 0);
        setOffsets(event.noSplitRule?.offsets ?? [10]);
        setIsConfigOpen(true);

        // Fetch paid count for preview
        getEventPaidCount(event.id).then(setPaidCount);
    }

    async function openDetail(event: EventWithRule) {
        setSelectedEvent(event);
        setIsDetailOpen(true);
        setDetailLoading(true);
        try {
            const payments = await getNoSplitPayments(event.id);
            setDetailPayments(payments);
        } catch (e) {
            console.error(e);
        } finally {
            setDetailLoading(false);
        }
    }

    function handleSave() {
        if (!selectedEvent) return;
        const validOffsets = offsets.filter(o => o > 0);
        if (validOffsets.length === 0) {
            toast.error('Defina pelo menos um intervalo válido.');
            return;
        }

        startTransition(async () => {
            const res = await upsertNoSplitRule(selectedEvent.id, {
                is_enabled: isEnabled,
                start_after_paid: startAfterPaid,
                offsets: validOffsets,
            });

            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success('Regra salva com sucesso!');
                // Update local state
                setEvents(prev => prev.map(e =>
                    e.id === selectedEvent.id ? {
                        ...e,
                        noSplitRule: {
                            id: e.noSplitRule?.id || '',
                            is_enabled: isEnabled,
                            start_after_paid: startAfterPaid,
                            offsets: validOffsets,
                        }
                    } : e
                ));
                setIsConfigOpen(false);
            }
        });
    }

    function addOffset() {
        setOffsets([...offsets, 10]);
    }

    function removeOffset(index: number) {
        if (offsets.length <= 1) return;
        setOffsets(offsets.filter((_, i) => i !== index));
    }

    function updateOffset(index: number, value: number) {
        const next = [...offsets];
        next[index] = value;
        setOffsets(next);
    }

    function togglePaymentExpand(paymentId: string) {
        setExpandedPayments(prev => {
            const next = new Set(prev);
            if (next.has(paymentId)) next.delete(paymentId);
            else next.add(paymentId);
            return next;
        });
    }

    // Preview positions
    const previewPositions = offsets.some(o => o > 0)
        ? getNextIntegralPositions(startAfterPaid, offsets.filter(o => o > 0), 20)
        : [];

    return (
        <div className="space-y-6">
            {/* Search */}
            <div className="relative max-w-sm group">
                <MagnifyingGlassIcon size={20} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                    placeholder="Buscar por evento ou organizador..."
                    variant="lg"
                    className="pl-11 bg-background border-input shadow-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Events Table */}
            <Card className="border-none shadow-sm bg-background/50 backdrop-blur-sm">
                <CardContent className="p-6">
                    <div className="rounded-2xl border border-border/50 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent border-border/50">
                                    <TableHead className="text-panel-sm h-11">Evento</TableHead>
                                    <TableHead className="text-panel-sm h-11">Organizador</TableHead>
                                    <TableHead className="text-panel-sm h-11 text-center">Status</TableHead>
                                    <TableHead className="text-panel-sm h-11 text-center">Regra</TableHead>
                                    <TableHead className="text-panel-sm h-11 text-center w-[180px]">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length > 0 ? filtered.map(event => (
                                    <TableRow key={event.id} className="hover:bg-muted/20 transition-colors border-border/50">
                                        <TableCell className="font-bold text-panel-sm py-4">
                                            <div className="flex flex-col">
                                                <span>{event.title}</span>
                                                <span className="text-panel-sm text-muted-foreground">
                                                    {event.event_date ? new Date(event.event_date).toLocaleDateString('pt-BR') : '—'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-panel-sm">{event.organizer}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className={cn(
                                                "text-panel-sm px-2 font-semibold uppercase tracking-wider",
                                                event.status === 'published'
                                                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300"
                                                    : "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300"
                                            )}>
                                                {event.status === 'published' ? 'Publicado' : event.status === 'draft' ? 'Rascunho' : event.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {event.noSplitRule?.is_enabled ? (
                                                <Badge className="bg-primary/10 text-primary border-primary/20 text-panel-sm font-semibold">
                                                    <LightningIcon size={20} weight="duotone" className="mr-1" /> Ativo
                                                </Badge>
                                            ) : (
                                                <span className="text-panel-sm text-muted-foreground">Inativo</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    pill
                                                    className="h-8 w-8"
                                                    onClick={() => openConfig(event)}
                                                    title="Configurar regra"
                                                >
                                                    <GearSixIcon size={20} weight="duotone" />
                                                </Button>
                                                {event.noSplitRule?.is_enabled && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        pill
                                                        className="h-8 w-8"
                                                        onClick={() => openDetail(event)}
                                                        title="Ver cobranças integrais"
                                                    >
                                                        <EyeIcon size={20} weight="duotone" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm">
                                            Nenhum evento encontrado.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Config Dialog */}
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <HandCoinsIcon size={20} weight="duotone" className="text-primary" />
                            Cobrança Integral
                        </DialogTitle>
                        <DialogDescription>
                            {selectedEvent?.title}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold">Ativar regra</p>
                                <p className="text-xs text-muted-foreground">Cobranças integrais serão aplicadas nas posições definidas</p>
                            </div>
                            <Checkbox checked={isEnabled} onCheckedChange={(v) => setIsEnabled(!!v)} />
                        </div>

                        {isEnabled && (
                            <>
                                {/* Start After */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">A partir da inscrição paga nº</label>
                                    <Input
                                        type="number"
                                        variant="lg"
                                        className="bg-background"
                                        min={0}
                                        value={startAfterPaid}
                                        onChange={e => setStartAfterPaid(parseInt(e.target.value) || 0)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        A regra começa a valer após essa quantidade de inscrições pagas.
                                        Atualmente: <strong>{paidCount}</strong> inscrições pagas neste evento.
                                    </p>
                                </div>

                                {/* Offsets */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-semibold">Intervalos (offsets)</label>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            pill
                                            className="h-8 text-xs gap-1"
                                            onClick={addOffset}
                                        >
                                            <PlusIcon size={20} weight="bold" /> Adicionar
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Os intervalos ciclam: após cada cobrança integral, o próximo intervalo é aplicado.
                                    </p>
                                    <div className="space-y-2">
                                        {offsets.map((offset, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground w-6 text-center font-mono">{i + 1}.</span>
                                                <Input
                                                    type="number"
                                                    variant="lg"
                                                    className="bg-background flex-1"
                                                    min={1}
                                                    value={offset}
                                                    onChange={e => updateOffset(i, parseInt(e.target.value) || 1)}
                                                />
                                                {offsets.length > 1 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                        onClick={() => removeOffset(i)}
                                                    >
                                                        <TrashIcon size={20} weight="duotone" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Preview */}
                                {previewPositions.length > 0 && (
                                    <div className="space-y-2 rounded-xl bg-muted/30 p-4 border border-border/50">
                                        <p className="text-panel-sm font-semibold flex items-center gap-2">
                                            <LightningIcon size={20} weight="duotone" className="text-primary" /> Próximas posições integrais
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {previewPositions.map((pos, i) => (
                                                <Badge
                                                    key={i}
                                                    variant="outline"
                                                    className={cn(
                                                        "text-xs font-bold px-2.5 py-1",
                                                        pos <= paidCount
                                                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300"
                                                            : "bg-primary/10 text-primary border-primary/20"
                                                    )}
                                                >
                                                    #{pos}
                                                    {pos <= paidCount && " ✓"}
                                                </Badge>
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            As posições marcadas com ✓ já foram alcançadas ({paidCount} pagas). A regra continuará sendo aplicada infinitamente aos próximos pagamentos seguindo esse padrão cíclico.
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" pill onClick={() => setIsConfigOpen(false)}>Cancelar</Button>
                        <Button pill onClick={handleSave} disabled={isPending}>
                            {isPending ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Detail Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <EyeIcon size={20} weight="duotone" className="text-primary" />
                            Cobranças Integrais
                        </DialogTitle>
                        <DialogDescription>
                            {selectedEvent?.title} — pagamentos processados sem split
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {detailLoading ? (
                            <div className="space-y-4">
                                {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                                ))}
                            </div>
                        ) : detailPayments.length > 0 ? (
                            <>
                                {/* Summary */}
                                <div className="grid grid-cols-2 gap-4">
                                    <Card className="border-none bg-primary/5 border border-primary/10 shadow-none">
                                        <CardContent className="p-4 text-center">
                                            <p className="text-2xl font-black text-primary">
                                                {detailPayments.reduce((sum, p) => sum + p.registrations.length, 0)}
                                            </p>
                                            <p className="text-xs text-muted-foreground font-medium">Inscrições integrais</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-none bg-emerald-500/5 border border-emerald-500/10 shadow-none">
                                        <CardContent className="p-4 text-center">
                                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(detailPayments.reduce((sum, p) => sum + p.total, 0))}
                                            </p>
                                            <p className="text-xs text-muted-foreground font-medium">Valor total capturado</p>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Payments list */}
                                <div className="space-y-3">
                                    {detailPayments.map(payment => (
                                        <Card key={payment.id} className="border border-border/50 shadow-none">
                                            <CardContent className="p-4">
                                                <div
                                                    className="flex items-center justify-between cursor-pointer"
                                                    onClick={() => togglePaymentExpand(payment.id)}
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <HandCoinsIcon size={20} weight="duotone" className="text-primary" />
                                                            <span className="font-bold text-sm">
                                                                {formatCurrency(payment.total)}
                                                            </span>
                                                            <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300">
                                                                {payment.status}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(payment.created_at).toLocaleString('pt-BR')} • {payment.registrations.length} inscrição(ões)
                                                        </p>
                                                    </div>
                                                    {expandedPayments.has(payment.id) ? (
                                                        <CaretUpIcon size={20} weight="bold" className="text-muted-foreground" />
                                                    ) : (
                                                        <CaretDownIcon size={20} weight="bold" className="text-muted-foreground" />
                                                    )}
                                                </div>

                                                {expandedPayments.has(payment.id) && (
                                                    <div className="mt-4 rounded-xl border border-border/50 overflow-hidden">
                                                        <Table>
                                                            <TableHeader className="bg-muted/20">
                                                                <TableRow className="hover:bg-transparent">
                                                                    <TableHead className="text-panel-sm text-[10px] h-8">Atleta</TableHead>
                                                                    <TableHead className="text-panel-sm text-[10px] h-8">Categoria</TableHead>
                                                                    <TableHead className="text-panel-sm text-[10px] h-8 text-right">Valor</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {payment.registrations.map(reg => (
                                                                    <TableRow key={reg.id} className="border-border/30">
                                                                        <TableCell className="text-xs font-medium py-2">{reg.athlete}</TableCell>
                                                                        <TableCell className="text-xs text-muted-foreground py-2 max-w-[200px] truncate">{reg.category}</TableCell>
                                                                        <TableCell className="text-xs font-bold text-right py-2">{formatCurrency(reg.price)}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <HandCoinsIcon size={48} weight="duotone" className="mx-auto mb-4 opacity-30" />
                                <p className="text-sm">Nenhuma cobrança integral processada para este evento.</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
