'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CircleNotchIcon } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { SubaccountData } from './page';

interface AsaasSubaccountPanelProps {
    subaccount: SubaccountData | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; message: string }> = {
    NOT_CONNECTED: {
        label: 'Não conectada',
        color: 'bg-muted text-muted-foreground border-border',
        message: 'Crie sua subconta Asaas para começar a receber pagamentos.',
    },
    CREATED: {
        label: 'Criada',
        color: 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
        message: 'Finalize seu cadastro no Asaas. Verifique seu e-mail e envie documentos, se solicitado.',
    },
    AWAITING_ONBOARDING: {
        label: 'Aguardando ação',
        color: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
        message: 'O Asaas aguarda documentos ou ações suas. Acesse o Asaas para continuar.',
    },
    UNDER_REVIEW: {
        label: 'Em análise',
        color: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
        message: 'Sua conta está em análise pelo Asaas. Isso pode levar alguns dias.',
    },
    APPROVED: {
        label: 'Aprovada',
        color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
        message: 'Sua conta foi aprovada! Você já pode receber pagamentos.',
    },
    REJECTED: {
        label: 'Reprovada',
        color: 'bg-destructive/10 text-destructive border-destructive/20',
        message: 'Sua conta foi reprovada. Acesse o Asaas para verificar os motivos.',
    },
    BLOCKED: {
        label: 'Bloqueada',
        color: 'bg-destructive/10 text-destructive border-destructive/20',
        message: 'Sua conta está bloqueada. Acesse o Asaas para mais informações.',
    },
};

function truncate(value: string, visibleEnd = 4): string {
    if (value.length <= visibleEnd + 4) return value;
    return `${'•'.repeat(4)}${value.slice(-visibleEnd)}`;
}

export function AsaasSubaccountPanel({ subaccount }: AsaasSubaccountPanelProps) {
    const router = useRouter();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const currentStatus = subaccount?.status || 'NOT_CONNECTED';
    const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.NOT_CONNECTED;

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const res = await fetch('/api/asaas/subaccounts/refresh', { method: 'POST' });
            if (res.ok) {
                toast.success('Status atualizado com sucesso.');
                router.refresh();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Erro ao verificar o status no Asaas.');
            }
        } catch (err) {
            toast.error('Erro de conexão ao verificar o status.');
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Status da conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                    <span className="text-panel-sm font-medium">Status:</span>
                    <Badge className={config.color}>{config.label}</Badge>
                </div>

                <p className="text-panel-sm text-muted-foreground">{config.message}</p>

                {subaccount && (
                    <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center gap-3">
                            <span className="text-panel-sm font-medium">Wallet ID:</span>
                            <span className="text-panel-sm text-muted-foreground font-mono">
                                {truncate(subaccount.wallet_id)}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-panel-sm font-medium">Account ID:</span>
                            <span className="text-panel-sm text-muted-foreground font-mono">
                                {truncate(subaccount.asaas_account_id)}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-panel-sm font-medium">Atualizado em:</span>
                            <span className="text-panel-sm text-muted-foreground">
                                {new Date(subaccount.updated_at).toLocaleString('pt-BR')}
                            </span>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap gap-3 pt-2 border-t">
                    {!subaccount ? (
                        <Link href="/academia-equipe/dashboard/financeiro/asaas/criar">
                            <Button pill size="lg" className="h-10 px-6 font-medium bg-foreground text-background hover:bg-foreground/90 transition-all border-none">
                                Criar subconta Asaas
                            </Button>
                        </Link>
                    ) : (
                        <Button
                            variant="outline"
                            pill
                            size="lg"
                            className="h-10 px-6 font-medium"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                        >
                            {isRefreshing ? (
                                <>
                                    <CircleNotchIcon size={16} weight="bold" className="mr-2 animate-spin" />
                                    Verificando...
                                </>
                            ) : (
                                'Verificar status'
                            )}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
