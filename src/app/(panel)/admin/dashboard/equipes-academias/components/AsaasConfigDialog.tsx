'use client';

import React, { useState } from 'react';
import {
    PlugIcon, SpinnerGapIcon, CheckCircleIcon, CopyIcon,
    ArrowClockwiseIcon, WarningCircleIcon, CheckIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { updateAsaasConfigAction, getAsaasWebhookDetailsAction } from '../actions';

interface AsaasConfigDialogProps {
    entidadeId: string;
    entidadeNome: string;
    useOwnAsaas: boolean;
    last4: string | null;
}

type WebhookData = {
    ours: any[];
    others: any[];
    total: number;
    environment: string;
    webhookEndpoint: string;
};

const EVENT_LABELS: Record<string, string> = {
    PAYMENT_CONFIRMED: 'Pagamento confirmado',
    PAYMENT_RECEIVED: 'Pagamento recebido',
    PAYMENT_OVERDUE: 'Pagamento vencido',
    PAYMENT_DELETED: 'Pagamento excluído',
    PAYMENT_REFUNDED: 'Pagamento estornado',
    PAYMENT_CREATED: 'Pagamento criado',
    PAYMENT_UPDATED: 'Pagamento atualizado',
    PAYMENT_RESTORED: 'Pagamento restaurado',
    PAYMENT_REFUND_IN_PROGRESS: 'Estorno em andamento',
    PAYMENT_CHARGEBACK_REQUESTED: 'Chargeback solicitado',
    PAYMENT_CHARGEBACK_DISPUTE: 'Chargeback em disputa',
    PAYMENT_AWAITING_CHARGEBACK_REVERSAL: 'Aguardando reversão chargeback',
    PAYMENT_DUNNING_RECEIVED: 'Negativação recebida',
    PAYMENT_DUNNING_REQUESTED: 'Negativação solicitada',
    PAYMENT_BANK_SLIP_VIEWED: 'Boleto visualizado',
    PAYMENT_CHECKOUT_VIEWED: 'Checkout visualizado',
};

export default function AsaasConfigDialog({
    entidadeId,
    entidadeNome,
    useOwnAsaas,
    last4,
}: AsaasConfigDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [webhookWarning, setWebhookWarning] = useState<string | null>(null);
    const [useOwn, setUseOwn] = useState(useOwnAsaas);
    const [copied, setCopied] = useState(false);

    const [webhookData, setWebhookData] = useState<WebhookData | null>(null);
    const [webhookLoading, setWebhookLoading] = useState(false);
    const [webhookError, setWebhookError] = useState<string | null>(null);

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/asaas`;

    function handleCopy(text: string) {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    async function loadWebhookDetails() {
        setWebhookLoading(true);
        setWebhookError(null);
        const result = await getAsaasWebhookDetailsAction(entidadeId);
        if (result?.error) {
            setWebhookError(result.error);
        } else if (result?.success) {
            setWebhookData(result as WebhookData);
        }
        setWebhookLoading(false);
    }

    async function handleOpenChange(val: boolean) {
        setOpen(val);
        if (val && useOwnAsaas && last4) {
            loadWebhookDetails();
        }
        if (!val) {
            setWebhookData(null);
            setWebhookError(null);
            setSuccess(false);
            setError(null);
            setWebhookWarning(null);
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        const formData = new FormData(e.currentTarget);
        formData.set('id', entidadeId);

        const result = await updateAsaasConfigAction(formData);

        if ('error' in result && result.error) {
            setError(result.error);
        } else {
            const warning = 'webhookWarning' in result ? result.webhookWarning : undefined;
            if (warning) {
                setWebhookWarning(warning);
            } else {
                setSuccess(true);
                setTimeout(() => setOpen(false), 1200);
            }
        }
        setLoading(false);
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    pill
                    title="Configurar Asaas"
                    className={useOwnAsaas && last4 ? 'text-green-500 hover:text-green-600' : 'text-muted-foreground'}
                >
                    <PlugIcon size={20} weight={useOwnAsaas && last4 ? 'fill' : 'duotone'} />
                    <span className="sr-only">Configurar Asaas</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-panel-md font-semibold flex items-center gap-2">
                        <PlugIcon size={18} weight="duotone" className={useOwnAsaas && last4 ? 'text-green-500' : 'text-muted-foreground'} />
                        Integração Asaas
                    </DialogTitle>
                    <p className="text-panel-sm text-muted-foreground">{entidadeNome}</p>
                </DialogHeader>

                {success ? (
                    <div className="flex flex-col items-center gap-3 py-6 text-center">
                        <CheckCircleIcon size={40} weight="duotone" className="text-green-500" />
                        <p className="text-ui font-medium">Configuração salva!</p>
                    </div>
                ) : webhookWarning ? (
                    <div className="space-y-4 pt-2">
                        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
                            <WarningCircleIcon size={18} weight="duotone" className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-ui font-medium text-amber-800 dark:text-amber-300">Chave salva — webhook pendente</p>
                                <p className="text-caption text-amber-700 dark:text-amber-400">{webhookWarning}</p>
                            </div>
                        </div>
                        <Button type="button" variant="outline" className="w-full" onClick={() => setWebhookWarning(null)}>
                            Tentar registrar novamente
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        {/* Toggle */}
                        <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
                            <div className="space-y-0.5">
                                <p className="text-ui font-medium">Usar conta Asaas própria</p>
                                <p className="text-caption text-muted-foreground">
                                    Pagamentos vão direto para a academia
                                </p>
                            </div>
                            <Switch
                                checked={useOwn}
                                onCheckedChange={setUseOwn}
                                disabled={loading}
                            />
                            <input type="hidden" name="use_own_asaas_api" value={useOwn ? 'true' : 'false'} />
                        </div>

                        {useOwn && (
                            <>
                                {/* API Key */}
                                <div className="space-y-1.5">
                                    <label htmlFor="asaas_api_key" className="text-ui font-medium leading-none">
                                        API Key Asaas
                                    </label>
                                    <Input
                                        id="asaas_api_key"
                                        name="asaas_api_key"
                                        type="text"
                                        placeholder={last4
                                            ? `Atual: ••••••••${last4} — deixe em branco para manter`
                                            : 'Cole a API Key da academia aqui'
                                        }
                                        className="bg-background font-mono"
                                        disabled={loading}
                                    />
                                </div>

                                {/* Detalhes do webhook */}
                                <div className="rounded-xl border overflow-hidden">
                                    <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b">
                                        <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">
                                            Webhook registrado
                                        </span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            pill
                                            className="h-6 px-2 text-caption gap-1"
                                            onClick={loadWebhookDetails}
                                            disabled={webhookLoading || !last4}
                                        >
                                            <ArrowClockwiseIcon size={12} weight="bold" className={webhookLoading ? 'animate-spin' : ''} />
                                            Atualizar
                                        </Button>
                                    </div>

                                    <div className="p-3 space-y-3">
                                        {/* Endpoint URL */}
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 text-[11px] text-muted-foreground bg-muted rounded-md px-2 py-1.5 truncate font-mono">
                                                {webhookUrl}
                                            </code>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                pill
                                                className="shrink-0 h-7 w-7"
                                                onClick={() => handleCopy(webhookUrl)}
                                                title="Copiar URL"
                                            >
                                                {copied
                                                    ? <CheckIcon size={13} weight="bold" className="text-green-500" />
                                                    : <CopyIcon size={13} weight="duotone" />
                                                }
                                            </Button>
                                        </div>

                                        {webhookLoading && (
                                            <div className="flex items-center gap-2 text-caption text-muted-foreground py-2">
                                                <SpinnerGapIcon size={14} className="animate-spin" />
                                                Buscando dados no Asaas...
                                            </div>
                                        )}

                                        {webhookError && (
                                            <div className="flex items-center gap-2 text-caption text-destructive">
                                                <WarningCircleIcon size={14} weight="duotone" />
                                                {webhookError}
                                            </div>
                                        )}

                                        {webhookData && !webhookLoading && (
                                            <>
                                                {/* Badge ambiente */}
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant={webhookData.environment === 'production' ? 'success' : 'secondary'}
                                                        className="text-[10px] uppercase font-bold tracking-wider"
                                                    >
                                                        {webhookData.environment === 'production' ? 'Produção' : 'Sandbox'}
                                                    </Badge>
                                                    <span className="text-caption text-muted-foreground">
                                                        {webhookData.total} webhook{webhookData.total !== 1 ? 's' : ''} na conta
                                                    </span>
                                                </div>

                                                {webhookData.ours.length > 0 ? (
                                                    webhookData.ours.map((wh: any) => (
                                                        <div key={wh.id} className="space-y-2 rounded-lg border bg-green-50 dark:bg-green-950/20 p-3">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-caption font-semibold text-green-700 dark:text-green-400">
                                                                    Nosso webhook
                                                                </span>
                                                                <div className="flex items-center gap-1.5">
                                                                    {wh.enabled
                                                                        ? <Badge variant="success" className="text-[10px] uppercase font-bold tracking-wider">Ativo</Badge>
                                                                        : <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider">Inativo</Badge>
                                                                    }
                                                                    {wh.interrupted && (
                                                                        <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider">Interrompido</Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-caption">
                                                                <span className="text-muted-foreground">ID</span>
                                                                <span className="font-mono text-[10px]">{wh.id}</span>
                                                                <span className="text-muted-foreground">E-mail</span>
                                                                <span>{wh.email || '-'}</span>
                                                            </div>
                                                            {wh.events?.length > 0 && (
                                                                <div className="space-y-1">
                                                                    <p className="text-caption text-muted-foreground font-medium">Eventos monitorados:</p>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {wh.events.map((ev: string) => (
                                                                            <span key={ev} className="inline-flex items-center gap-1 text-[10px] bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-1.5 py-0.5 rounded-md font-medium">
                                                                                <CheckIcon size={10} weight="bold" />
                                                                                {EVENT_LABELS[ev] ?? ev}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="flex items-center gap-2 text-caption text-amber-600 dark:text-amber-400">
                                                        <WarningCircleIcon size={14} weight="duotone" />
                                                        Webhook não encontrado na conta Asaas. Tente salvar novamente.
                                                    </div>
                                                )}

                                                {webhookData.others.length > 0 && (
                                                    <div className="space-y-1.5">
                                                        <p className="text-caption text-muted-foreground font-medium">
                                                            Outros webhooks na conta ({webhookData.others.length}):
                                                        </p>
                                                        {webhookData.others.map((wh: any) => (
                                                            <div key={wh.id} className="flex items-center justify-between rounded-lg border px-3 py-2 bg-muted/20">
                                                                <code className="text-[10px] font-mono text-muted-foreground truncate max-w-[200px]">{wh.url}</code>
                                                                <Badge
                                                                    variant={wh.enabled ? 'secondary' : 'outline'}
                                                                    className="text-[10px] uppercase shrink-0"
                                                                >
                                                                    {wh.enabled ? 'Ativo' : 'Inativo'}
                                                                </Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {!webhookData && !webhookLoading && !webhookError && !last4 && (
                                            <p className="text-caption text-muted-foreground">
                                                O webhook será registrado ao salvar a API Key.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {error && (
                            <p className="text-caption text-destructive">{error}</p>
                        )}

                        <Button pill type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <SpinnerGapIcon size={16} weight="bold" className="mr-2 animate-spin" />
                                    Salvando...
                                </>
                            ) : 'Salvar'}
                        </Button>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
