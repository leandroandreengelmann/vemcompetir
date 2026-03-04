'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Copy, Check, Eye, EyeOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    saveAsaasSettings,
    testAsaasConnection,
    generateWebhookTokenAction,
    toggleAsaasIntegration,
    type AsaasSettingsView,
} from './actions';

interface AsaasConfigFormProps {
    sandboxSettings: AsaasSettingsView | null;
    productionSettings: AsaasSettingsView | null;
}

const BASE_URLS: Record<string, string> = {
    sandbox: 'https://api-sandbox.asaas.com',
    production: 'https://api.asaas.com',
};

export function AsaasConfigForm({ sandboxSettings, productionSettings }: AsaasConfigFormProps) {
    const [environment, setEnvironment] = useState<'sandbox' | 'production'>(
        productionSettings?.is_enabled ? 'production' : 'sandbox'
    );
    const currentSettings = environment === 'sandbox' ? sandboxSettings : productionSettings;

    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [generatedToken, setGeneratedToken] = useState<string | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const [isPending, startTransition] = useTransition();
    const [isTesting, setIsTesting] = useState(false);
    const [isGeneratingToken, setIsGeneratingToken] = useState(false);

    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const webhookUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/api/webhooks/asaas`
        : '/api/webhooks/asaas';

    const copyToClipboard = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        } catch {
            console.error('Failed to copy');
        }
    };

    const handleSave = () => {
        if (!apiKey.trim()) {
            setMessage({ type: 'error', text: 'Informe a API Key.' });
            return;
        }

        startTransition(async () => {
            setMessage(null);
            const result = await saveAsaasSettings({
                environment,
                apiKey,
                webhookToken: generatedToken || undefined,
            });

            if (result.error) {
                setMessage({ type: 'error', text: result.error });
            } else {
                setMessage({ type: 'success', text: result.message || 'Salvo!' });
                setApiKey('');
                setGeneratedToken(null);
            }
        });
    };

    const handleTest = async () => {
        setIsTesting(true);
        setMessage(null);
        try {
            const result = await testAsaasConnection(environment);
            if (result.error) {
                setMessage({ type: 'error', text: result.error });
            } else {
                setMessage({ type: 'success', text: result.message || 'Conexão OK!' });
            }
        } finally {
            setIsTesting(false);
        }
    };

    const handleGenerateToken = async () => {
        setIsGeneratingToken(true);
        setMessage(null);
        try {
            const result = await generateWebhookTokenAction(environment);
            if (result.error) {
                setMessage({ type: 'error', text: result.error });
            } else if (result.token) {
                setGeneratedToken(result.token);
                setMessage({ type: 'success', text: result.message || 'Token gerado!' });
            }
        } finally {
            setIsGeneratingToken(false);
        }
    };

    const handleToggle = () => {
        if (!currentSettings) return;
        startTransition(async () => {
            setMessage(null);
            const result = await toggleAsaasIntegration(environment, !currentSettings.is_enabled);
            if (result.error) {
                setMessage({ type: 'error', text: result.error });
            } else {
                setMessage({ type: 'success', text: result.message || 'Status alterado!' });
            }
        });
    };

    return (
        <div className="grid gap-6">
            {/* Message */}
            {message && (
                <Alert
                    variant={message.type === 'error' ? 'destructive' : 'default'}
                    className={cn(
                        "rounded-xl border shadow-sm transition-all animate-in fade-in slide-in-from-top-2",
                        message.type === 'success'
                            ? 'border-green-500/30 text-green-700 bg-green-50/50 [&>svg]:text-green-600'
                            : ''
                    )}
                >
                    <AlertDescription className="text-ui font-medium">
                        {message.text}
                    </AlertDescription>
                </Alert>
            )}

            {/* Section A — Environment */}
            <Card>
                <CardHeader>
                    <CardTitle>Ambiente</CardTitle>
                    <CardDescription>Selecione o ambiente da integração Asaas.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <Button
                            variant={environment === 'sandbox' ? 'default' : 'outline'}
                            onClick={() => {
                                setEnvironment('sandbox');
                                setApiKey('');
                                setGeneratedToken(null);
                                setMessage(null);
                            }}
                            pill
                            className={cn(
                                "flex-1 h-12 relative overflow-hidden text-ui font-semibold",
                                environment === 'sandbox' ? "text-white" : "text-foreground"
                            )}
                        >
                            Sandbox
                            {sandboxSettings?.is_enabled && (
                                <span className="absolute top-1 right-1 bg-green-500 text-[8px] text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Ativo</span>
                            )}
                        </Button>
                        <Button
                            variant={environment === 'production' ? 'default' : 'outline'}
                            onClick={() => {
                                setEnvironment('production');
                                setApiKey('');
                                setGeneratedToken(null);
                                setMessage(null);
                            }}
                            pill
                            className={cn(
                                "flex-1 h-12 relative overflow-hidden text-ui font-semibold",
                                environment === 'production' ? "text-white" : "text-foreground"
                            )}
                        >
                            Produção
                            {productionSettings?.is_enabled && (
                                <span className="absolute top-1 right-1 bg-green-500 text-[8px] text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Ativo</span>
                            )}
                        </Button>
                    </div>

                    {environment === 'production' && (
                        <Alert className="mt-4 border-amber-500 bg-amber-50 text-amber-800 [&>svg]:text-amber-600">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                Você está configurando o ambiente de <strong>PRODUÇÃO</strong>. Cobranças reais serão processadas.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Section B — API Key */}
            <Card>
                <CardHeader>
                    <CardTitle>Credenciais Asaas</CardTitle>
                    <CardDescription>
                        {currentSettings?.has_api_key
                            ? `Chave cadastrada (••••••${currentSettings.api_key_last4}). Insira uma nova para substituir.`
                            : 'Informe a API Key do Asaas para este ambiente.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="apiKey" className="text-ui font-medium">API Key</Label>
                        <div className="relative">
                            <Input variant="lg"
                                id="apiKey"
                                type={showApiKey ? 'text' : 'password'}
                                placeholder="asaas_xxx..."
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                
                                className="pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                            >
                                {showApiKey ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-ui font-medium">Base URL</Label>
                        <Input
                            value={BASE_URLS[environment]}
                            readOnly
                            
                            className="bg-muted/50 text-muted-foreground cursor-default border-dashed"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Section C — Webhooks */}
            <Card>
                <CardHeader>
                    <CardTitle>Webhooks</CardTitle>
                    <CardDescription>
                        Configure a URL de callback e o token de validação.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-ui font-medium">Webhook URL</Label>
                        <div className="flex gap-2">
                            <Input
                                value={webhookUrl}
                                readOnly
                                variant="lg"
                                className="bg-muted/50 text-muted-foreground cursor-default flex-1 border-dashed"
                            />
                            <Button
                                variant="outline"
                                size="icon-lg"
                                onClick={() => copyToClipboard(webhookUrl, 'webhook-url')}
                                pill
                                className="shrink-0 h-12 w-12"
                            >
                                {copiedField === 'webhook-url' ? (
                                    <Check className="size-5 text-green-600" />
                                ) : (
                                    <Copy className="size-5" />
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Webhook Token</Label>
                        {generatedToken ? (
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <Input
                                        value={generatedToken}
                                        readOnly
                                        variant="lg"
                                        className="bg-green-50/50 border-green-300/50 text-green-800 font-mono text-xs flex-1"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon-lg"
                                        onClick={() => copyToClipboard(generatedToken, 'webhook-token')}
                                        pill
                                        className="shrink-0 h-12 w-12"
                                    >
                                        {copiedField === 'webhook-token' ? (
                                            <Check className="size-5 text-green-600" />
                                        ) : (
                                            <Copy className="size-5" />
                                        )}
                                    </Button>
                                </div>
                                <p className="text-xs text-amber-600">
                                    Copie este token agora. Ele não será mostrado novamente.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {currentSettings?.webhook_token_hash ? (
                                    <p className="text-sm text-muted-foreground">
                                        Token configurado (hash armazenado).
                                    </p>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Nenhum token gerado ainda.
                                    </p>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={handleGenerateToken}
                                    disabled={isGeneratingToken || !currentSettings}
                                >
                                    {isGeneratingToken ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Gerando...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="mr-2 h-4 w-4" />
                                            Gerar novo token
                                        </>
                                    )}
                                </Button>
                                {currentSettings?.webhook_token_hash && (
                                    <p className="text-xs text-amber-600">
                                        Ao regenerar, webhooks configurados com o token antigo pararão de funcionar.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Section D — Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Ações</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <Button
                            variant="outline"
                            onClick={handleTest}
                            disabled={isTesting || !currentSettings?.has_api_key}
                            pill
                            className="h-12 text-ui font-semibold transition-all hover:bg-accent"
                        >
                            {isTesting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Testando...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="mr-2 h-5 w-5" />
                                    Testar Conexão
                                </>
                            )}
                        </Button>

                        <Button
                            onClick={handleSave}
                            disabled={isPending || !apiKey.trim()}
                            pill
                            className={cn(
                                "h-12 text-ui font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98]",
                                !apiKey.trim() || isPending ? "opacity-40" : "bg-primary text-white hover:bg-primary/90"
                            )}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Check className="mr-2 h-5 w-5" />
                                    Salvar Configuração
                                </>
                            )}
                        </Button>

                        {currentSettings && (
                            <Button
                                variant="secondary"
                                onClick={handleToggle}
                                disabled={isPending}
                                pill
                                className="h-12 text-ui font-semibold"
                            >
                                {currentSettings.is_enabled ? 'Desativar Integração' : 'Ativar Integração'}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Section E — Status */}
            <Card>
                <CardHeader>
                    <CardTitle>Status da Conexão</CardTitle>
                </CardHeader>
                <CardContent>
                    {currentSettings ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="text-ui font-medium">Status:</span>
                                {currentSettings.is_enabled ? (
                                    <Badge className="bg-green-100 text-green-800 border-green-300 rounded-full px-3">
                                        Ativada
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="rounded-full px-3">Desativada</Badge>
                                )}
                            </div>

                            {currentSettings.last_test_status && (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium">Último teste:</span>
                                    <Badge
                                        className={
                                            currentSettings.last_test_status === 'ok'
                                                ? 'bg-green-100 text-green-800 border-green-300'
                                                : 'bg-red-100 text-red-800 border-red-300'
                                        }
                                    >
                                        {currentSettings.last_test_status === 'ok' ? 'Conectado' : 'Falha'}
                                    </Badge>
                                </div>
                            )}

                            {currentSettings.last_test_at && (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium">Data do teste:</span>
                                    <span className="text-sm text-muted-foreground">
                                        {new Date(currentSettings.last_test_at).toLocaleString('pt-BR')}
                                    </span>
                                </div>
                            )}

                            {currentSettings.last_test_message && currentSettings.last_test_status === 'error' && (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium">Mensagem:</span>
                                    <span className="text-sm text-red-600">{currentSettings.last_test_message}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            Nenhuma configuração salva para o ambiente <strong>{environment}</strong>.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
