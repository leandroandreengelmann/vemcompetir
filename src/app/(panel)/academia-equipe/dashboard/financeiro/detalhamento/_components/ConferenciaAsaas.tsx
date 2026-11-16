'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { getAsaasBalanceAction, type AsaasBalanceResult } from '../actions';
import { brl } from './DetalhamentoView';

export function ConferenciaAsaas() {
    const [result, setResult] = useState<AsaasBalanceResult | null>(null);
    const [pending, startTransition] = useTransition();

    const hora = result?.ok
        ? new Date(result.consultedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : null;

    return (
        <Card className="border-none shadow-sm">
            <CardContent className="p-6 space-y-4">
                <h2 className="font-bold text-panel-md">Conferência com o saldo do Asaas</h2>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        disabled={pending}
                        onClick={() => startTransition(async () => setResult(await getAsaasBalanceAction()))}
                        className="min-h-11 px-4 rounded-lg border bg-background text-panel-sm font-medium disabled:opacity-60"
                    >
                        {pending ? 'Consultando…' : 'Atualizar saldo do Asaas'}
                    </button>
                    <span className="text-panel-sm text-muted-foreground" aria-live="polite">
                        {hora ? `Consultado às ${hora}` : 'Só consulta quando você clica. Somente leitura.'}
                    </span>
                </div>

                {result && !result.ok && <p className="text-panel-sm text-red-600" role="alert">{result.error}</p>}

                {result?.ok && result.scope === 'own' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-xl border p-4">
                            <div className="text-panel-sm text-muted-foreground">Líquido Asaas acumulado (sistema)</div>
                            <div className="text-xl font-bold tabular-nums">{brl(result.expectedNetCents)}</div>
                        </div>
                        <div className="rounded-xl border p-4">
                            <div className="text-panel-sm text-muted-foreground">Saldo na conta Asaas (API)</div>
                            <div className="text-xl font-bold tabular-nums">{brl(result.balanceCents)}</div>
                        </div>
                        <div className="rounded-xl border p-4">
                            <div className="text-panel-sm text-muted-foreground">Diferença</div>
                            <div className="text-xl font-bold tabular-nums">{brl(result.balanceCents - result.expectedNetCents)}</div>
                            <div className="text-panel-sm text-muted-foreground">
                                {result.balanceCents === result.expectedNetCents
                                    ? 'Bate com o sistema.'
                                    : 'Pode ser saque/transferência já feitos ou pagamentos de outras origens na conta.'}
                            </div>
                        </div>
                    </div>
                )}

                {result?.ok && result.scope === 'platform' && (
                    <p className="text-panel-sm text-muted-foreground">
                        Sua academia usa a conta Asaas da plataforma, cujo saldo mistura várias academias. Líquido Asaas acumulado no
                        sistema para você conferir com o extrato: <strong className="tabular-nums">{brl(result.expectedNetCents)}</strong>.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
