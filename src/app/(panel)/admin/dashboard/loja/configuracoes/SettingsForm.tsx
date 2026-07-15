'use client';

import { useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { showToast } from '@/lib/toast';
import { SpinnerGapIcon } from '@phosphor-icons/react';
import { updateSettingsAction } from '../actions';
import type { StoreSettings } from '@/lib/store';

export function SettingsForm({ settings }: { settings: StoreSettings | null }) {
    const [isPending, startTransition] = useTransition();

    function handle(formData: FormData) {
        startTransition(async () => {
            const res = await updateSettingsAction(formData);
            if (res?.error) showToast.error('Erro', res.error);
            else showToast.success('Configurações salvas!');
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-panel-md font-semibold">Configurações da Loja</CardTitle>
            </CardHeader>
            <CardContent>
                <form action={handle} className="space-y-5 max-w-lg">
                    <div className="space-y-2">
                        <Label htmlFor="store_name">Nome da loja</Label>
                        <Input id="store_name" name="store_name" defaultValue={settings?.store_name || ''} placeholder="Ex: Vem Competir Store" variant="lg" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="whatsapp_number">WhatsApp para pedidos</Label>
                        <Input
                            id="whatsapp_number"
                            name="whatsapp_number"
                            defaultValue={settings?.whatsapp_number || ''}
                            placeholder="Ex: 66999999999 (com DDD)"
                            variant="lg"
                            inputMode="numeric"
                        />
                        <p className="text-xs text-muted-foreground">
                            Número que receberá os pedidos. Pode digitar com DDD; o código do país (55) é adicionado automaticamente.
                        </p>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <Label htmlFor="is_enabled" className="text-panel-sm font-medium">Loja ativa</Label>
                            <p className="text-xs text-muted-foreground">Quando desligada, os clientes não veem a loja.</p>
                        </div>
                        <Switch id="is_enabled" name="is_enabled" defaultChecked={!!settings?.is_enabled} />
                    </div>

                    <Button type="submit" pill disabled={isPending}>
                        {isPending && <SpinnerGapIcon size={18} weight="bold" className="mr-2 animate-spin" />}
                        Salvar
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
