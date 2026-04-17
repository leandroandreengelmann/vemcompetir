'use client';

import { useState, useTransition } from 'react';
import { Switch } from '@/components/ui/switch';
import { toggleFinancialModuleAction } from '../actions';
import { toast } from 'sonner';
import { CurrencyCircleDollarIcon } from '@phosphor-icons/react';

interface Props {
    tenantId: string;
    initialEnabled: boolean;
    enabledAt: string | null;
}

export default function FinancialModuleToggle({ tenantId, initialEnabled, enabledAt }: Props) {
    const [enabled, setEnabled] = useState(initialEnabled);
    const [isPending, startTransition] = useTransition();

    const handleToggle = (next: boolean) => {
        startTransition(async () => {
            const result = await toggleFinancialModuleAction(tenantId, next);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            setEnabled(next);
            toast.success(next ? 'Módulo Financeiro habilitado.' : 'Módulo Financeiro desabilitado.');
        });
    };

    return (
        <div className="flex items-center justify-between gap-4 p-4 bg-muted/40 rounded-xl border border-border/50">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                    <CurrencyCircleDollarIcon size={22} weight="duotone" className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex flex-col">
                    <span className="text-panel-sm font-semibold">Módulo Financeiro</span>
                    <span className="text-panel-sm text-muted-foreground">
                        {enabled
                            ? `Habilitado${enabledAt ? ` em ${new Date(enabledAt).toLocaleDateString('pt-BR')}` : ''}`
                            : 'Permite emitir recibos e alterar status de inscrições.'}
                    </span>
                </div>
            </div>
            <Switch checked={enabled} onCheckedChange={handleToggle} disabled={isPending} />
        </div>
    );
}
