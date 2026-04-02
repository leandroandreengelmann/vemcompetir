'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { GearIcon, WifiHighIcon, WifiSlashIcon, QrCodeIcon, CopyIcon, SpinnerGapIcon, WarningCircleIcon, CheckCircleIcon } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { saveWhatsAppConfig, getWhatsAppConfig, checkConnectionStatus } from './actions';

export function WhatsAppConfig() {
    const [instanceId, setInstanceId] = useState('');
    const [token, setToken] = useState('');
    const [clientToken, setClientToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);
    const [config, setConfig] = useState<any>(null);
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');

    const webhookUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/api/whatsapp/webhook`
        : '/api/whatsapp/webhook';

    useEffect(() => {
        loadConfig();
    }, []);

    async function loadConfig() {
        const data = await getWhatsAppConfig();
        if (data) {
            setConfig(data);
            setInstanceId(data.instance_id);
            setToken(data.token);
            setClientToken(data.client_token ?? '');
            setStatus(data.connected ? 'connected' : 'disconnected');
        }
    }

    async function handleSave() {
        if (!instanceId.trim() || !token.trim() || !clientToken.trim()) {
            toast.error('Preencha o Instance ID, Token e Client-Token.');
            return;
        }
        setLoading(true);
        try {
            await saveWhatsAppConfig(instanceId.trim(), token.trim(), clientToken.trim());
            toast.success('Configurações salvas!');
            await loadConfig();
        } catch {
            toast.error('Erro ao salvar configurações.');
        } finally {
            setLoading(false);
        }
    }

    async function handleCheckStatus() {
        if (!config) return;
        setChecking(true);
        try {
            const result = await checkConnectionStatus();
            setStatus(result.connected ? 'connected' : 'disconnected');
            if (result.connected) {
                toast.success(`Conectado! Número: ${result.phone ?? '—'}`);
            } else {
                toast.error('Instância desconectada. Escaneie o QR Code.');
            }
        } catch {
            toast.error('Erro ao verificar status.');
        } finally {
            setChecking(false);
        }
    }

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Status */}
            <Card className="shadow-none">
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-panel-md font-semibold flex items-center gap-2">
                        <GearIcon size={20} weight="duotone" className="text-muted-foreground" />
                        Instância Z-API
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-5 space-y-5">
                    {/* Status badge */}
                    <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
                        <div className="flex items-center gap-3">
                            {status === 'connected'
                                ? <WifiHighIcon size={20} weight="duotone" className="text-emerald-600" />
                                : <WifiSlashIcon size={20} weight="duotone" className="text-destructive" />
                            }
                            <div>
                                <p className="text-panel-sm font-semibold">
                                    {status === 'connected' ? 'Conectado' : status === 'disconnected' ? 'Desconectado' : 'Status desconhecido'}
                                </p>
                                {config?.phone_number && (
                                    <p className="text-panel-sm text-muted-foreground">{config.phone_number}</p>
                                )}
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            pill
                            onClick={handleCheckStatus}
                            disabled={checking || !config}
                        >
                            {checking && <SpinnerGapIcon size={14} weight="bold" className="animate-spin mr-1.5" />}
                            Verificar
                        </Button>
                    </div>

                    {/* Credenciais */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-panel-sm font-medium text-muted-foreground">Instance ID</Label>
                            <Input
                                variant="lg"
                                placeholder="Ex: 3ABC12..."
                                value={instanceId}
                                onChange={e => setInstanceId(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-panel-sm font-medium text-muted-foreground">Token</Label>
                            <Input
                                variant="lg"
                                type="password"
                                placeholder="Token da instância"
                                value={token}
                                onChange={e => setToken(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-panel-sm font-medium text-muted-foreground">Client-Token</Label>
                            <Input
                                variant="lg"
                                type="password"
                                placeholder="Security → Client Token no painel Z-API"
                                value={clientToken}
                                onChange={e => setClientToken(e.target.value)}
                            />
                        </div>
                    </div>

                    <Button onClick={handleSave} disabled={loading} pill className="w-full h-12 font-semibold">
                        {loading && <SpinnerGapIcon size={16} weight="bold" className="animate-spin mr-2" />}
                        Salvar Configurações
                    </Button>
                </CardContent>
            </Card>

            {/* Webhook */}
            <Card className="shadow-none">
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-panel-md font-semibold flex items-center gap-2">
                        <QrCodeIcon size={20} weight="duotone" className="text-muted-foreground" />
                        Webhook
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-5 space-y-3">
                    <p className="text-panel-sm text-muted-foreground">
                        Configure esta URL no painel da Z-API para receber mensagens em tempo real.
                    </p>
                    <div className="flex items-center gap-2">
                        <Input
                            variant="lg"
                            readOnly
                            value={webhookUrl}
                            className="font-mono text-panel-sm bg-muted/30"
                        />
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-12 w-12 shrink-0 rounded-xl"
                            onClick={() => {
                                navigator.clipboard.writeText(webhookUrl);
                                toast.success('URL copiada!');
                            }}
                        >
                            <CopyIcon size={18} weight="duotone" />
                        </Button>
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                        <WarningCircleIcon size={18} weight="duotone" className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-panel-sm text-amber-800 dark:text-amber-300">
                            No painel da Z-API, vá em <strong>Webhooks → On Message Received</strong> e cole esta URL.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
