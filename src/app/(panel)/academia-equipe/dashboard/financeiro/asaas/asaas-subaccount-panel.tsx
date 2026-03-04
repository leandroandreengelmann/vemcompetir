'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { SubaccountData } from './page';

interface AsaasSubaccountPanelProps {
    subaccount: SubaccountData | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; message: string }> = {
    NOT_CONNECTED: {
        label: 'Não conectada',
        color: 'bg-gray-100 text-gray-700 border-gray-300',
        message: 'Crie sua subconta Asaas para começar a receber pagamentos.',
    },
    CREATED: {
        label: 'Criada',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        message: 'Finalize seu cadastro no Asaas. Verifique seu e-mail e envie documentos, se solicitado.',
    },
    AWAITING_ONBOARDING: {
        label: 'Aguardando ação',
        color: 'bg-amber-100 text-amber-800 border-amber-300',
        message: 'O Asaas aguarda documentos ou ações suas. Acesse o Asaas para continuar.',
    },
    UNDER_REVIEW: {
        label: 'Em análise',
        color: 'bg-amber-100 text-amber-800 border-amber-300',
        message: 'Sua conta está em análise pelo Asaas. Isso pode levar alguns dias.',
    },
    APPROVED: {
        label: 'Aprovada',
        color: 'bg-green-100 text-green-800 border-green-300',
        message: 'Sua conta foi aprovada! Você já pode receber pagamentos.',
    },
    REJECTED: {
        label: 'Reprovada',
        color: 'bg-red-100 text-red-800 border-red-300',
        message: 'Sua conta foi reprovada. Acesse o Asaas para verificar os motivos.',
    },
    BLOCKED: {
        label: 'Bloqueada',
        color: 'bg-red-100 text-red-800 border-red-300',
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
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Status da conta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge className={config.color}>{config.label}</Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">{config.message}</p>

                    {subaccount && (
                        <div className="space-y-2 pt-2 border-t">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium">Wallet ID:</span>
                                <span className="text-sm text-muted-foreground font-mono">
                                    {truncate(subaccount.wallet_id)}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium">Account ID:</span>
                                <span className="text-sm text-muted-foreground font-mono">
                                    {truncate(subaccount.asaas_account_id)}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium">Atualizado em:</span>
                                <span className="text-sm text-muted-foreground">
                                    {new Date(subaccount.updated_at).toLocaleString('pt-BR')}
                                </span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-3">
                        {!subaccount ? (
                            <Link href="/academia-equipe/dashboard/financeiro/asaas/criar">
                                <Button pill size="lg" className="h-12 px-8 font-medium bg-foreground text-background hover:bg-foreground/90 transition-all border-none">
                                    Criar subconta Asaas
                                </Button>
                            </Link>
                        ) : (
                            <Button
                                variant="outline"
                                pill
                                size="lg"
                                className="h-12 px-8 font-medium"
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                            >
                                {isRefreshing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
        </>
    );
}
