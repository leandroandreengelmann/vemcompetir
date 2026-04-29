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

function truncate(s: string | null, n = 80): string {
    if (!s) return '—';
    return s.length > n ? s.slice(0, n) + '…' : s;
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

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                                <tr>
                                    <th className="text-left px-3 py-2">Data</th>
                                    <th className="text-left px-3 py-2">Template</th>
                                    <th className="text-left px-3 py-2">Telefone</th>
                                    <th className="text-left px-3 py-2">Status</th>
                                    <th className="text-left px-3 py-2">Mensagem</th>
                                    <th className="text-left px-3 py-2">Erro</th>
                                    <th className="text-right px-3 py-2">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="text-center py-8 text-muted-foreground">
                                            Nenhum registro encontrado.
                                        </td>
                                    </tr>
                                )}
                                {rows.map((r) => {
                                    const st = STATUS_LABEL[r.status] ?? { label: r.status, cls: 'bg-zinc-100 text-zinc-700' };
                                    return (
                                        <tr key={r.id} className="border-t">
                                            <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDateBr(r.sent_at ?? r.created_at)}</td>
                                            <td className="px-3 py-2 font-mono text-xs">{r.template_key}</td>
                                            <td className="px-3 py-2 font-mono text-xs">{r.recipient_phone}</td>
                                            <td className="px-3 py-2">
                                                <Badge className={st.cls}>{st.label}</Badge>
                                            </td>
                                            <td className="px-3 py-2 max-w-xs">
                                                {r.rendered_message ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewLog(r)}
                                                        className="text-xs text-left hover:text-primary hover:underline transition-colors flex items-start gap-1.5 group"
                                                        title="Ver mensagem completa"
                                                    >
                                                        <EyeIcon size={14} weight="duotone" className="shrink-0 mt-0.5 text-muted-foreground group-hover:text-primary" />
                                                        <span>{truncate(r.rendered_message, 80)}</span>
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 max-w-xs">
                                                {r.error ? (
                                                    <span title={r.error} className="text-xs text-red-600">
                                                        {truncate(r.error, 60)}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleResend(r.id)}
                                                    disabled={pending}
                                                    title="Reenviar"
                                                >
                                                    <ArrowClockwiseIcon size={14} />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
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
