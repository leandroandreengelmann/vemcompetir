'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircleIcon, XCircleIcon, PlugsConnectedIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react';
import { updateEvolutionConfigAction, testConnectionAction, sendTestMessageAction } from '../actions';

type Config = {
    base_url: string | null;
    api_key: string | null;
    instance_name: string | null;
    sender_phone: string | null;
    admin_notify_phone: string;
    dry_run: boolean;
    rate_limit_per_hour: number;
    connected: boolean;
    last_test_at: string | null;
} | null;

export function ConfigForm({ initialConfig }: { initialConfig: Config }) {
    const [pending, startTransition] = useTransition();
    const [testing, startTest] = useTransition();
    const [sending, startSend] = useTransition();
    const [testPhone, setTestPhone] = useState('');
    const [connected, setConnected] = useState(initialConfig?.connected ?? false);

    function handleSubmit(formData: FormData) {
        startTransition(async () => {
            const result = await updateEvolutionConfigAction(formData);
            if ('error' in result && result.error) toast.error(result.error);
            else toast.success('Configuração salva.');
        });
    }

    function handleTest() {
        startTest(async () => {
            const r = await testConnectionAction();
            setConnected(r.ok);
            if (r.ok) toast.success(`Conectado. ${r.message}`);
            else toast.error(`Falha: ${r.message}`);
        });
    }

    function handleSendTest() {
        if (!testPhone.trim()) {
            toast.error('Informe um número.');
            return;
        }
        startSend(async () => {
            const r = await sendTestMessageAction(testPhone, '');
            if ('error' in r && r.error) toast.error(r.error);
            else toast.success(`Status: ${r.status}`);
        });
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <PlugsConnectedIcon size={20} weight="duotone" />
                        Status da conexão
                    </CardTitle>
                    {connected ? (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <CheckCircleIcon size={14} className="mr-1" weight="fill" /> Conectado
                        </Badge>
                    ) : (
                        <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            <XCircleIcon size={14} className="mr-1" weight="fill" /> Desconectado
                        </Badge>
                    )}
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-3">
                    <Button type="button" variant="outline" pill className="h-12 text-panel-sm font-semibold" onClick={handleTest} disabled={testing}>
                        {testing ? 'Testando…' : 'Testar conexão'}
                    </Button>
                    <div className="flex gap-2 flex-1">
                        <Input
                            variant="lg"
                            placeholder="Número para teste (ex: 6699999999)"
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                        />
                        <Button type="button" variant="default" pill className="h-12 text-panel-sm font-bold text-primary-foreground" onClick={handleSendTest} disabled={sending}>
                            <PaperPlaneTiltIcon size={18} weight="duotone" className="mr-2" />
                            {sending ? 'Enviando…' : 'Mensagem teste'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <form action={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Credenciais Evolution API</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="base_url" className="text-panel-sm font-medium">Base URL</Label>
                            <Input
                                variant="lg"
                                id="base_url"
                                name="base_url"
                                defaultValue={initialConfig?.base_url ?? ''}
                                placeholder="https://evolution.exemplo.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="api_key" className="text-panel-sm font-medium">API Key</Label>
                            <Input
                                variant="lg"
                                id="api_key"
                                name="api_key"
                                type="password"
                                placeholder={initialConfig?.api_key ? '••••••••••• (deixe vazio para manter)' : ''}
                            />
                            <p className="text-xs text-muted-foreground">
                                Não exibimos a chave atual. Preencha apenas para alterar.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="instance_name" className="text-panel-sm font-medium">Nome da instância</Label>
                            <Input
                                variant="lg"
                                id="instance_name"
                                name="instance_name"
                                defaultValue={initialConfig?.instance_name ?? ''}
                                placeholder="vemcompetir"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sender_phone" className="text-panel-sm font-medium">Número remetente (opcional)</Label>
                            <Input
                                variant="lg"
                                id="sender_phone"
                                name="sender_phone"
                                defaultValue={initialConfig?.sender_phone ?? ''}
                                placeholder="556699999999"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Comportamento</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="admin_notify_phone" className="text-panel-sm font-medium">Seu número (cópia admin)</Label>
                            <Input
                                variant="lg"
                                id="admin_notify_phone"
                                name="admin_notify_phone"
                                defaultValue={initialConfig?.admin_notify_phone ?? ''}
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Recebe cópia de toda inscrição confirmada.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rate_limit_per_hour" className="text-panel-sm font-medium">Limite por hora (por número)</Label>
                            <Input
                                variant="lg"
                                id="rate_limit_per_hour"
                                name="rate_limit_per_hour"
                                type="number"
                                min={1}
                                max={1000}
                                defaultValue={initialConfig?.rate_limit_per_hour ?? 30}
                            />
                            <p className="text-xs text-muted-foreground">
                                Anti-spam. Bloqueia envios após N mensagens enviadas para o mesmo número em 1h.
                            </p>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border p-4">
                            <div className="space-y-1">
                                <Label htmlFor="dry_run" className="text-panel-sm font-medium">Modo dry-run</Label>
                                <p className="text-xs text-muted-foreground">
                                    Registra logs mas não envia nada via Evolution. Útil para testar templates.
                                </p>
                            </div>
                            <Switch id="dry_run" name="dry_run" defaultChecked={initialConfig?.dry_run ?? false} />
                        </div>
                    </CardContent>
                </Card>

                <div className="mt-6">
                    <Button type="submit" variant="default" pill className="h-12 text-panel-sm font-bold text-primary-foreground" disabled={pending}>
                        {pending ? 'Salvando…' : 'Salvar configuração'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
