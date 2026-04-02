'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    PaperPlaneTiltIcon, UsersIcon, CaretRightIcon, CaretLeftIcon,
    SpinnerGapIcon, CheckCircleIcon, WarningCircleIcon, ClockIcon,
    ShoppingCartSimpleIcon, BabyIcon, BuildingsIcon, MegaphoneIcon,
    ArrowCounterClockwiseIcon,
} from '@phosphor-icons/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    getTemplates, getBroadcasts, previewBroadcast, executeBroadcast,
    getTenantsForFilter, type BroadcastFilters,
} from './actions';

const AUDIENCE_OPTIONS = [
    { value: 'todos',     label: 'Todos os atletas com telefone', icon: UsersIcon,              description: 'Todos os atletas cadastrados que possuem telefone' },
    { value: 'carrinho',  label: 'Carrinho abandonado',           icon: ShoppingCartSimpleIcon,  description: 'Atletas com inscrição parada no carrinho' },
    { value: 'aguardando',label: 'Aguardando pagamento',          icon: ClockIcon,               description: 'Atletas com pagamento pendente ou aguardando' },
    { value: 'menor',     label: 'Menores de idade',              icon: BabyIcon,                description: 'Atletas com menos de 18 anos' },
    { value: 'faixa',     label: 'Por faixa',                     icon: UsersIcon,               description: 'Filtrar por cor de faixa específica' },
    { value: 'academia',  label: 'Por academia',                  icon: BuildingsIcon,           description: 'Todos os atletas de uma academia específica' },
];

const BELTS = ['Branca','Cinza','Amarela','Laranja','Verde','Azul','Roxa','Marrom','Preta','Coral','Vermelha'];
const VARIABLES = ['{nome}', '{evento}', '{categoria}', '{valor}', '{link}'];

const STATUS_CONFIG: Record<string, { label: string; icon: any; className: string }> = {
    pendente:  { label: 'Pendente',  icon: ClockIcon,        className: 'bg-muted text-muted-foreground' },
    enviando:  { label: 'Enviando',  icon: SpinnerGapIcon,   className: 'bg-blue-500/10 text-blue-700' },
    concluido: { label: 'Concluído', icon: CheckCircleIcon,  className: 'bg-emerald-500/10 text-emerald-700' },
    cancelado: { label: 'Cancelado', icon: WarningCircleIcon,className: 'bg-destructive/10 text-destructive' },
};

export function WhatsAppDisparos() {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [templates, setTemplates] = useState<any[]>([]);
    const [tenants, setTenants] = useState<any[]>([]);
    const [broadcasts, setBroadcasts] = useState<any[]>([]);
    const [previewing, setPreviewing] = useState(false);
    const [sending, setSending] = useState(false);
    const [previewData, setPreviewData] = useState<{ total: number; athletes: any[] } | null>(null);
    const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

    const [filters, setFilters] = useState<BroadcastFilters>({ audience: 'todos' });
    const [templateId, setTemplateId] = useState<string>('custom');
    const [messageBody, setMessageBody] = useState('');

    useEffect(() => {
        Promise.all([getTemplates(), getBroadcasts(), getTenantsForFilter()]).then(([t, b, ten]) => {
            setTemplates(t);
            setBroadcasts(b);
            setTenants(ten);
        });
    }, []);

    function handleSelectTemplate(id: string) {
        setTemplateId(id);
        if (id !== 'custom') {
            const t = templates.find(t => t.id === id);
            if (t) setMessageBody(t.body);
        }
    }

    async function handlePreview() {
        setPreviewing(true);
        try {
            const data = await previewBroadcast(filters);
            setPreviewData(data);
            setStep(2);
        } catch (e: any) {
            toast.error(e.message ?? 'Erro ao carregar público.');
        } finally {
            setPreviewing(false);
        }
    }

    async function handleSend() {
        if (!messageBody.trim()) { toast.error('Escreva a mensagem antes de enviar.'); return; }
        if (!previewData?.athletes.length) { toast.error('Nenhum destinatário encontrado.'); return; }
        setSending(true);
        try {
            const res = await executeBroadcast(
                templateId !== 'custom' ? templateId : null,
                messageBody,
                filters,
                previewData.athletes
            );
            setResult({ sent: res.sent, failed: res.failed });
            setStep(3);
            const updated = await getBroadcasts();
            setBroadcasts(updated);
        } catch (e: any) {
            toast.error(e.message ?? 'Erro ao enviar disparo.');
        } finally {
            setSending(false);
        }
    }

    function reset() {
        setStep(1);
        setFilters({ audience: 'todos' });
        setTemplateId('custom');
        setMessageBody('');
        setPreviewData(null);
        setResult(null);
    }

    const selectedAudience = AUDIENCE_OPTIONS.find(a => a.value === filters.audience);

    return (
        <div className="space-y-6">
            {/* Wizard */}
            <Card className="shadow-none">
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-panel-md font-semibold flex items-center gap-2">
                        <MegaphoneIcon size={20} weight="duotone" className="text-muted-foreground" />
                        Novo Disparo
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                    {/* Steps indicator */}
                    <div className="flex items-center gap-2 mb-6">
                        {[
                            { n: 1, label: 'Público' },
                            { n: 2, label: 'Mensagem' },
                            { n: 3, label: 'Resultado' },
                        ].map(({ n, label }, idx) => (
                            <div key={n} className="flex items-center gap-2">
                                {idx > 0 && <div className={cn('h-px flex-1 w-8', step > idx ? 'bg-foreground' : 'bg-muted')} />}
                                <div className={cn(
                                    'size-7 rounded-full flex items-center justify-center text-panel-sm font-bold transition-all',
                                    step === n ? 'bg-foreground text-background' :
                                    step > n ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                                )}>{step > n ? '✓' : n}</div>
                                <span className={cn('text-panel-sm font-semibold', step === n ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* STEP 1 — Público */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {AUDIENCE_OPTIONS.map(opt => {
                                    const Icon = opt.icon;
                                    const isActive = filters.audience === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => setFilters({ audience: opt.value as BroadcastFilters['audience'] })}
                                            className={cn(
                                                'flex items-start gap-3 p-4 rounded-xl border text-left transition-all',
                                                isActive ? 'border-foreground bg-muted/30' : 'border-border hover:border-foreground/30 hover:bg-muted/10'
                                            )}
                                        >
                                            <div className={cn('p-2 rounded-lg shrink-0', isActive ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')}>
                                                <Icon size={16} weight="duotone" />
                                            </div>
                                            <div>
                                                <p className="text-panel-sm font-semibold">{opt.label}</p>
                                                <p className="text-panel-sm text-muted-foreground mt-0.5">{opt.description}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {filters.audience === 'faixa' && (
                                <div className="space-y-2">
                                    <Label className="text-panel-sm font-medium text-muted-foreground">Faixa</Label>
                                    <Select value={filters.beltColor ?? ''} onValueChange={v => setFilters(p => ({ ...p, beltColor: v }))}>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Selecione a faixa..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {BELTS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {filters.audience === 'academia' && (
                                <div className="space-y-2">
                                    <Label className="text-panel-sm font-medium text-muted-foreground">Academia</Label>
                                    <Select value={filters.tenantId ?? ''} onValueChange={v => setFilters(p => ({ ...p, tenantId: v }))}>
                                        <SelectTrigger className="h-12 rounded-xl">
                                            <SelectValue placeholder="Selecione a academia..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <Button
                                pill
                                onClick={handlePreview}
                                disabled={previewing || (filters.audience === 'faixa' && !filters.beltColor) || (filters.audience === 'academia' && !filters.tenantId)}
                                className="w-full h-12 font-semibold"
                            >
                                {previewing
                                    ? <><SpinnerGapIcon size={16} weight="bold" className="animate-spin mr-2" />Calculando público...</>
                                    : <><CaretRightIcon size={16} weight="bold" className="mr-2" />Continuar</>
                                }
                            </Button>
                        </div>
                    )}

                    {/* STEP 2 — Mensagem */}
                    {step === 2 && previewData && (
                        <div className="space-y-5">
                            {/* Resumo do público */}
                            <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/30">
                                <UsersIcon size={20} weight="duotone" className="text-muted-foreground shrink-0" />
                                <div>
                                    <p className="text-panel-sm font-semibold">{previewData.total} destinatários encontrados</p>
                                    <p className="text-panel-sm text-muted-foreground">{selectedAudience?.label}</p>
                                </div>
                                <button onClick={() => setStep(1)} className="ml-auto text-panel-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
                                    Alterar
                                </button>
                            </div>

                            {previewData.total === 0 && (
                                <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                                    <WarningCircleIcon size={20} weight="duotone" className="text-amber-600 shrink-0" />
                                    <p className="text-panel-sm text-amber-800 dark:text-amber-300">Nenhum atleta encontrado com esses filtros. Volte e ajuste o público.</p>
                                </div>
                            )}

                            {/* Template */}
                            <div className="space-y-2">
                                <Label className="text-panel-sm font-medium text-muted-foreground">Template</Label>
                                <Select value={templateId} onValueChange={handleSelectTemplate}>
                                    <SelectTrigger className="h-12 rounded-xl">
                                        <SelectValue placeholder="Selecione um template ou escreva..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="custom">✏️ Mensagem personalizada</SelectItem>
                                        {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Mensagem */}
                            <div className="space-y-2">
                                <Label className="text-panel-sm font-medium text-muted-foreground">Mensagem</Label>
                                <textarea
                                    rows={5}
                                    className="w-full px-4 py-3 rounded-xl border bg-background text-panel-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="Oi {nome}! ..."
                                    value={messageBody}
                                    onChange={e => setMessageBody(e.target.value)}
                                />
                                <div className="flex flex-wrap gap-1.5">
                                    {VARIABLES.map(v => (
                                        <button key={v} type="button" onClick={() => setMessageBody(p => p + v)}
                                            className="px-2 py-0.5 rounded-full bg-muted text-panel-sm font-mono font-semibold hover:bg-muted/80 transition-colors">
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Preview da mensagem */}
                            {messageBody && previewData.athletes[0] && (
                                <div className="space-y-2">
                                    <Label className="text-panel-sm font-medium text-muted-foreground">Preview (primeiro destinatário)</Label>
                                    <div className="p-4 rounded-xl border bg-muted/20">
                                        <div className="flex justify-end">
                                            <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-green-600 text-white text-panel-sm leading-relaxed">
                                                {messageBody
                                                    .replace(/{nome}/g, previewData.athletes[0].full_name)
                                                    .replace(/{evento}/g, previewData.athletes[0].event_title ?? '')
                                                    .replace(/{categoria}/g, previewData.athletes[0].category ?? '')
                                                    .replace(/{valor}/g, previewData.athletes[0].price ? `R$ ${Number(previewData.athletes[0].price).toFixed(2)}` : '')
                                                    .replace(/{link}/g, 'competir.com')
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <Button variant="outline" pill onClick={() => setStep(1)} className="h-12 gap-2">
                                    <CaretLeftIcon size={16} weight="bold" /> Voltar
                                </Button>
                                <Button
                                    pill
                                    onClick={handleSend}
                                    disabled={sending || !messageBody.trim() || previewData.total === 0}
                                    className="h-12 flex-1 font-semibold"
                                >
                                    {sending
                                        ? <><SpinnerGapIcon size={16} weight="bold" className="animate-spin mr-2" />Enviando {previewData.total} mensagens...</>
                                        : <><PaperPlaneTiltIcon size={16} weight="duotone" className="mr-2" />Enviar para {previewData.total} atletas</>
                                    }
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3 — Resultado */}
                    {step === 3 && result && (
                        <div className="space-y-5">
                            <div className="flex flex-col items-center py-6 gap-4">
                                <div className="size-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                                    <CheckCircleIcon size={32} weight="duotone" className="text-emerald-600" />
                                </div>
                                <div className="text-center">
                                    <p className="text-panel-lg font-black">Disparo concluído!</p>
                                    <p className="text-panel-sm text-muted-foreground mt-1">As mensagens foram enviadas.</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-center px-6 py-3 rounded-xl bg-emerald-500/10">
                                        <p className="text-panel-lg font-black text-emerald-700">{result.sent}</p>
                                        <p className="text-panel-sm text-emerald-600">Enviados</p>
                                    </div>
                                    {result.failed > 0 && (
                                        <div className="text-center px-6 py-3 rounded-xl bg-destructive/10">
                                            <p className="text-panel-lg font-black text-destructive">{result.failed}</p>
                                            <p className="text-panel-sm text-destructive">Falhas</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Button pill onClick={reset} variant="outline" className="w-full h-12 gap-2 font-semibold">
                                <ArrowCounterClockwiseIcon size={16} weight="bold" />
                                Novo Disparo
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Histórico */}
            {broadcasts.length > 0 && (
                <Card className="shadow-none">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-panel-md font-semibold flex items-center gap-2">
                            <ClockIcon size={20} weight="duotone" className="text-muted-foreground" />
                            Histórico de Disparos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {broadcasts.map(b => {
                                const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pendente;
                                const StatusIcon = cfg.icon;
                                return (
                                    <div key={b.id} className="flex items-center justify-between px-5 py-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-panel-sm font-semibold truncate">
                                                {(b.whatsapp_templates as any)?.name ?? 'Mensagem personalizada'}
                                            </p>
                                            <p className="text-panel-sm text-muted-foreground mt-0.5 line-clamp-1">{b.body}</p>
                                            <p className="text-panel-sm text-muted-foreground mt-1">
                                                {format(new Date(b.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 ml-4 shrink-0">
                                            <div className="text-right">
                                                <p className="text-panel-sm font-semibold tabular-nums">{b.sent}/{b.total}</p>
                                                <p className="text-panel-sm text-muted-foreground">enviados</p>
                                            </div>
                                            <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-panel-sm font-semibold', cfg.className)}>
                                                <StatusIcon size={14} weight="duotone" className={b.status === 'enviando' ? 'animate-spin' : ''} />
                                                {cfg.label}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
