'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    QrCodeIcon,
    ArrowClockwiseIcon,
    CheckCircleIcon,
    XCircleIcon,
    SignOutIcon,
    SpinnerGapIcon,
} from '@phosphor-icons/react';
import { getInstanceStatusAction, logoutInstanceAction } from '../actions';

type Status = {
    state: 'open' | 'connecting' | 'close' | 'unknown';
    ownerJid: string | null;
    profileName: string | null;
    qrBase64: string | null;
    error?: string;
};

export function ConectarClient() {
    const [status, setStatus] = useState<Status | null>(null);
    const [loading, setLoading] = useState(false);
    const [pendingLogout, setPendingLogout] = useState(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    async function refresh() {
        if (!mountedRef.current) return;
        setLoading(true);
        try {
            const r = await getInstanceStatusAction();
            if (!mountedRef.current) return;
            setStatus(r);
            if (r.error) toast.error(r.error);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (status?.state === 'connecting') {
            const t = setInterval(refresh, 5000);
            return () => clearInterval(t);
        }
        if (status?.state === 'open') {
            const t = setInterval(refresh, 30000);
            return () => clearInterval(t);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status?.state]);

    async function handleLogout() {
        if (!confirm('Desconectar a instância? Será preciso escanear o QR de novo.')) return;
        setPendingLogout(true);
        try {
            const r = await logoutInstanceAction();
            if (!mountedRef.current) return;
            if ('error' in r && r.error) toast.error(r.error);
            else {
                toast.success('Instância desconectada.');
                refresh();
            }
        } finally {
            if (mountedRef.current) setPendingLogout(false);
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <QrCodeIcon size={20} weight="duotone" />
                        Conectar WhatsApp
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {status?.state === 'open' && (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                <CheckCircleIcon size={14} className="mr-1" weight="fill" /> Conectado
                            </Badge>
                        )}
                        {status?.state === 'connecting' && (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                <SpinnerGapIcon size={14} className="mr-1 animate-spin" weight="bold" /> Aguardando QR
                            </Badge>
                        )}
                        {(status?.state === 'close' || status?.state === 'unknown') && (
                            <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                <XCircleIcon size={14} className="mr-1" weight="fill" /> Desconectado
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {status?.state === 'open' ? (
                        <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-900/10 p-6 space-y-2">
                            <p className="text-panel-sm font-semibold text-emerald-900 dark:text-emerald-300">
                                ✅ WhatsApp conectado e pronto
                            </p>
                            {status.profileName && (
                                <p className="text-panel-sm text-emerald-800 dark:text-emerald-400">
                                    Perfil: <strong>{status.profileName}</strong>
                                </p>
                            )}
                            {status.ownerJid && (
                                <p className="text-panel-sm text-emerald-800 dark:text-emerald-400 font-mono">
                                    {status.ownerJid.replace('@s.whatsapp.net', '')}
                                </p>
                            )}
                        </div>
                    ) : status?.qrBase64 ? (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <p className="text-panel-sm text-center max-w-md">
                                Abra o WhatsApp no celular →{' '}
                                <strong>Aparelhos conectados</strong> → <strong>Conectar um aparelho</strong> e escaneie o QR Code abaixo.
                            </p>
                            <div className="rounded-xl border bg-white p-4 shadow-sm">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={status.qrBase64} alt="QR Code" className="size-72" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                O código atualiza automaticamente. Se expirar, clique em "Atualizar".
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                            {loading ? 'Carregando…' : 'Clique em "Atualizar" para gerar o QR Code.'}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            pill
                            className="h-12 text-panel-sm font-semibold"
                            onClick={refresh}
                            disabled={loading}
                        >
                            <ArrowClockwiseIcon size={18} weight="duotone" className="mr-2" />
                            {loading ? 'Atualizando…' : 'Atualizar'}
                        </Button>
                        {status?.state === 'open' && (
                            <Button
                                type="button"
                                variant="outline"
                                pill
                                className="h-12 text-panel-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={handleLogout}
                                disabled={pendingLogout}
                            >
                                <SignOutIcon size={18} weight="duotone" className="mr-2" />
                                {pendingLogout ? 'Desconectando…' : 'Desconectar'}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Como conectar</CardTitle>
                </CardHeader>
                <CardContent className="text-panel-sm text-muted-foreground space-y-2">
                    <p><strong>1.</strong> Use um chip dedicado para o VemCompetir (recomendado).</p>
                    <p><strong>2.</strong> No celular: WhatsApp → menu → Aparelhos conectados → Conectar um aparelho.</p>
                    <p><strong>3.</strong> Aponte a câmera para o QR Code acima.</p>
                    <p><strong>4.</strong> Aguarde o status ficar "Conectado".</p>
                </CardContent>
            </Card>
        </div>
    );
}
