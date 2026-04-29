'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
    ArrowClockwiseIcon,
    CaretLeftIcon,
    CaretRightIcon,
    FunnelIcon,
    EyeIcon,
} from '@phosphor-icons/react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { resendLogAction } from '../actions';

type LogRow = {
    id: string;
    template_key: string;
    recipient_phone: string;
    recipient_role: string | null;
    rendered_message: string | null;
    status: string;
    error: string | null;
    evolution_message_id: string | null;
    related_entity_type: string | null;
    related_entity_id: string | null;
    created_at: string;
    sent_at: string | null;
};

type Filters = {
    template?: string;
    status?: string;
    phone?: string;
    from?: string;
    to?: string;
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
    queued: { label: 'Na fila', cls: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300' },
    sent: { label: 'Enviado', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
    delivered: { label: 'Entregue', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    read: { label: 'Lido', cls: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400' },
    failed: { label: 'Falhou', cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    skipped: { label: 'Ignorado', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
};

function formatDateBr(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });
}

export function HistoricoClient({
    rows,
    total,
    page,
    pageSize,
    templates,
    filters,
}: {
    rows: LogRow[];
    total: number;
    page: number;
    pageSize: number;
    templates: { key: string; title: string }[];
    filters: Filters;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [pending, startTransition] = useTransition();

    const [template, setTemplate] = useState(filters.template ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [phone, setPhone] = useState(filters.phone ?? '');
    const [from, setFrom] = useState(filters.from ?? '');
    const [to, setTo] = useState(filters.to ?? '');
    const [viewLog, setViewLog] = useState<LogRow | null>(null);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    function applyFilters(nextPage = 1) {
        const params = new URLSearchParams();
        if (template) params.set('template', template);
        if (status) params.set('status', status);
        if (phone) params.set('phone', phone);
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        if (nextPage > 1) params.set('page', String(nextPage));
        const qs = params.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname);
    }

    function clearFilters() {
        setTemplate('');
        setStatus('');
        setPhone('');
        setFrom('');
        setTo('');
        router.push(pathname);
    }

    function handleResend(id: string) {
        startTransition(async () => {
            const r = await resendLogAction(id);
            if ('error' in r && r.error) toast.error(r.error);
            else toast.success('Reenviado.');
        });
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
                        <FunnelIcon size={16} weight="duotone" /> Filtros
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div className="space-y-2">
                            <Label className="text-panel-sm font-medium">Template</Label>
                            <Select value={template || 'all'} onValueChange={(v) => setTemplate(v === 'all' ? '' : v)}>
                                <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Todos" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {templates.map((t) => (
                                        <SelectItem key={t.key} value={t.key}>{t.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-panel-sm font-medium">Status</Label>
                            <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
                                <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Todos" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="queued">Na fila</SelectItem>
                                    <SelectItem value="sent">Enviado</SelectItem>
                                    <SelectItem value="delivered">Entregue</SelectItem>
                                    <SelectItem value="read">Lido</SelectItem>
                                    <SelectItem value="failed">Falhou</SelectItem>
                                    <SelectItem value="skipped">Ignorado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-panel-sm font-medium">Telefone</Label>
                            <Input variant="lg" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="6699999999" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-panel-sm font-medium">De</Label>
                            <Input variant="lg" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-panel-sm font-medium">Até</Label>
                            <Input variant="lg" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" pill className="h-12 text-panel-sm font-semibold" type="button" onClick={clearFilters}>Limpar</Button>
                        <Button type="button" variant="default" pill className="h-12 text-panel-sm font-bold text-primary-foreground" onClick={() => applyFilters(1)}>Aplicar</Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="min-w-0 max-w-full">
                <CardContent className="p-0 min-w-0 max-w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Data</TableHead>
                                <TableHead>Template</TableHead>
                                <TableHead>Telefone</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Mensagem</TableHead>
                                <TableHead>Erro</TableHead>
                                <TableHead className="text-right pr-6 w-[100px]">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        Nenhum registro encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                            {rows.map((r) => {
                                const st = STATUS_LABEL[r.status] ?? { label: r.status, cls: 'bg-zinc-100 text-zinc-700' };
                                return (
                                    <TableRow key={r.id}>
                                        <TableCell className="pl-6 align-middle text-panel-sm text-muted-foreground">
                                            {formatDateBr(r.sent_at ?? r.created_at)}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs align-middle">
                                            {r.template_key}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs align-middle">
                                            {r.recipient_phone}
                                        </TableCell>
                                        <TableCell className="align-middle">
                                            <Badge className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', st.cls)}>
                                                {st.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="align-middle !whitespace-normal max-w-[280px]">
                                            {r.rendered_message ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setViewLog(r)}
                                                    className="text-panel-sm text-left hover:text-primary transition-colors flex items-start gap-2 group w-full"
                                                    title="Ver mensagem completa"
                                                >
                                                    <EyeIcon size={20} weight="duotone" className="shrink-0 mt-0.5 text-muted-foreground group-hover:text-primary" />
                                                    <span className="break-words line-clamp-2 group-hover:underline">
                                                        {r.rendered_message}
                                                    </span>
                                                </button>
                                            ) : (
                                                <span className="text-panel-sm text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="align-middle !whitespace-normal max-w-[200px]">
                                            {r.error ? (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="text-xs text-red-600 line-clamp-2 cursor-help">
                                                            {r.error}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-xs">
                                                        <p className="break-words">{r.error}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            ) : (
                                                <span className="text-panel-sm text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right pr-6 align-middle">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleResend(r.id)}
                                                        disabled={pending}
                                                        className="h-9 w-9 rounded-full"
                                                    >
                                                        <ArrowClockwiseIcon size={18} weight="duotone" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Reenviar</TooltipContent>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={!!viewLog} onOpenChange={(o) => !o && setViewLog(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <EyeIcon size={20} weight="duotone" className="text-primary" />
                            Mensagem completa
                        </DialogTitle>
                        {viewLog && (
                            <DialogDescription>
                                <span className="font-mono">{viewLog.template_key}</span>
                                {' • '}
                                <span className="font-mono">{viewLog.recipient_phone}</span>
                                {' • '}
                                {formatDateBr(viewLog.sent_at ?? viewLog.created_at)}
                            </DialogDescription>
                        )}
                    </DialogHeader>
                    {viewLog && (
                        <div className="space-y-3">
                            <div className="rounded-xl border bg-muted/30 p-4 max-h-[60vh] overflow-y-auto">
                                <pre className="text-sm whitespace-pre-wrap break-words font-sans">
                                    {viewLog.rendered_message}
                                </pre>
                            </div>
                            {viewLog.error && (
                                <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 p-3">
                                    <div className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Erro</div>
                                    <div className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap break-words">{viewLog.error}</div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div>
                    {total > 0 ? (
                        <>Página {page} de {totalPages} — {total} registro{total === 1 ? '' : 's'}</>
                    ) : 'Sem registros'}
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        pill
                        className="h-10 text-panel-sm font-semibold"
                        disabled={page <= 1}
                        onClick={() => applyFilters(page - 1)}
                    >
                        <CaretLeftIcon size={14} /> Anterior
                    </Button>
                    <Button
                        variant="outline"
                        pill
                        className="h-10 text-panel-sm font-semibold"
                        disabled={page >= totalPages}
                        onClick={() => applyFilters(page + 1)}
                    >
                        Próxima <CaretRightIcon size={14} />
                    </Button>
                </div>
            </div>
        </div>
    );
}
