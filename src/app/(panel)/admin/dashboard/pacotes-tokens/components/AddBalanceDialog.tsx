'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    PlusCircleIcon, SpinnerGapIcon, PackageIcon, SlidersIcon, ClockCounterClockwiseIcon,
} from '@phosphor-icons/react';
import { showToast } from '@/lib/toast';
import {
    sellTokensToAcademyAction,
    adjustAcademyTokensAction,
    getAcademyTokenHistoryAction,
} from '../actions';
import { priceReais, type AcademySummary, type TokenMovement, type TokenPackage } from './types';

const MOVEMENT_LABEL: Record<TokenMovement['type'], string> = {
    consumed: 'Consumido',
    refunded: 'Estornado',
    granted: 'Compra',
    adjusted: 'Ajuste',
};

/** Cabe sem rolagem na largura atual do diálogo. */
const HISTORY_VISIBLE = 5;

const formatMovementDate = (iso: string) => {
    const d = new Date(iso);
    return {
        date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
};

export default function AddBalanceDialog({
    academy,
    packages,
    onUpdated,
}: {
    academy: AcademySummary;
    packages: TokenPackage[];
    onUpdated: (tenantId: string, newBalance: number) => void;
}) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedPkgId, setSelectedPkgId] = useState('');
    const [amount, setAmount] = useState('');
    const [history, setHistory] = useState<TokenMovement[] | null>(null);

    // O saldo exibido acompanha os lançamentos feitos sem fechar o diálogo.
    const [balance, setBalance] = useState(academy.inscription_token_balance);

    const selectedPkg = packages.find(p => p.id === selectedPkgId);
    const parsedAmount = parseInt(amount, 10);
    const hasAmount = Number.isInteger(parsedAmount) && parsedAmount !== 0;

    const loadHistory = async () => {
        const rows = await getAcademyTokenHistoryAction(academy.id);
        setHistory(rows as TokenMovement[]);
    };

    const handleOpenChange = (next: boolean) => {
        setOpen(next);
        setError(null);
        if (next) {
            setBalance(academy.inscription_token_balance);
            setHistory(null);
            loadHistory();
        } else {
            setSelectedPkgId('');
            setAmount('');
        }
    };

    const runAction = async (
        e: React.FormEvent<HTMLFormElement>,
        action: (fd: FormData) => Promise<any>,
        successTitle: string,
    ) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const fd = new FormData(e.currentTarget);
        fd.append('tenant_id', academy.id);
        const result = await action(fd);

        if (result?.error) {
            setError(result.error);
        } else {
            const newBalance = result.newBalance as number;
            setBalance(newBalance);
            onUpdated(academy.id, newBalance);
            showToast.success(successTitle, `Novo saldo de ${academy.name}: ${newBalance} tokens.`);
            setSelectedPkgId('');
            setAmount('');
            await loadHistory();
        }
        setLoading(false);
    };

    const balanceAfter = (delta: number) => balance + delta;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    pill
                    className="gap-1.5"
                    disabled={!academy.token_management_enabled}
                    title={
                        academy.token_management_enabled
                            ? undefined
                            : 'Ative os tokens desta academia para poder adicionar saldo'
                    }
                >
                    <PlusCircleIcon size={16} weight="duotone" />
                    Adicionar saldo
                </Button>
            </DialogTrigger>
            {/* Largo e sem rolagem: mostra tudo de uma vez. A largura extra é o que
                permite ler as observações inteiras nos lançamentos, sem corte. */}
            <DialogContent className="sm:max-w-[720px] gap-4">
                <DialogHeader>
                    <DialogTitle>Adicionar saldo</DialogTitle>
                    <DialogDescription>
                        <strong>{academy.name}</strong> tem hoje{' '}
                        <span className="font-bold tabular-nums text-foreground">{balance}</span> token{balance === 1 ? '' : 's'}.
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="p-3 bg-destructive/15 text-destructive text-panel-sm rounded-lg text-center">
                        {error}
                    </div>
                )}

                <Tabs defaultValue="pacote">
                    <TabsList className="w-full">
                        <TabsTrigger value="pacote" className="gap-1.5">
                            <PackageIcon size={14} weight="duotone" />
                            Pacote
                        </TabsTrigger>
                        <TabsTrigger value="avulso" className="gap-1.5">
                            <SlidersIcon size={14} weight="duotone" />
                            Quantidade livre
                        </TabsTrigger>
                    </TabsList>

                    {/* ── Venda de pacote ─────────────────────────────────── */}
                    <TabsContent value="pacote" className="pt-3">
                        <form
                            onSubmit={e => runAction(e, sellTokensToAcademyAction, 'Venda registrada')}
                            className="space-y-3"
                        >
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-panel-sm font-semibold text-muted-foreground">Pacote</label>
                                    <Select value={selectedPkgId} onValueChange={setSelectedPkgId}>
                                        <SelectTrigger className="shadow-none">
                                            <SelectValue placeholder="Selecione o pacote" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {/* O nome do pacote já carrega a quantidade ("200 Tokens"),
                                                então aqui só o preço diferencia — a quantidade exata
                                                aparece no resumo abaixo. */}
                                            {packages.map(p => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.name} · {priceReais(p.price_cents)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <input type="hidden" name="token_package_id" value={selectedPkgId} />
                                    {packages.length === 0 && (
                                        <p className="text-caption text-muted-foreground">
                                            Nenhum pacote ativo. Crie um em &ldquo;Pacotes de venda&rdquo; ou use a
                                            aba de quantidade livre.
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-panel-sm font-semibold text-muted-foreground">
                                        Observação <span className="font-normal">(opcional)</span>
                                    </label>
                                    <Input name="notes" placeholder="Ex: Pago via PIX" className="bg-background" disabled={loading} />
                                </div>
                            </div>

                            {selectedPkg && (
                                <div className="px-3 py-2 rounded-xl bg-muted/40 border text-panel-sm space-y-0.5">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Tokens a adicionar</span>
                                        <span className="font-bold">+{selectedPkg.token_count}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Valor da venda</span>
                                        <span className="font-bold text-emerald-600">{priceReais(selectedPkg.price_cents)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Saldo depois</span>
                                        <span className="font-bold tabular-nums">{balanceAfter(selectedPkg.token_count)}</span>
                                    </div>
                                </div>
                            )}

                            <DialogFooter className="pt-1">
                                <Button pill type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={loading}>
                                    Fechar
                                </Button>
                                <Button pill type="submit" disabled={loading || !selectedPkgId} className="gap-2">
                                    {loading && <SpinnerGapIcon size={16} weight="bold" className="animate-spin" />}
                                    Confirmar venda
                                </Button>
                            </DialogFooter>
                        </form>
                    </TabsContent>

                    {/* ── Ajuste avulso ───────────────────────────────────── */}
                    <TabsContent value="avulso" className="pt-3">
                        <form
                            onSubmit={e => runAction(e, adjustAcademyTokensAction, 'Ajuste registrado')}
                            className="space-y-3"
                        >
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-panel-sm font-semibold text-muted-foreground">Quantidade</label>
                                    <Input
                                        name="amount"
                                        type="number"
                                        step="1"
                                        placeholder="Ex: 30"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        className="bg-background"
                                        disabled={loading}
                                        required
                                    />
                                    <p className="text-caption text-muted-foreground">
                                        Número negativo (ex: −30) retira tokens.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-panel-sm font-semibold text-muted-foreground">Motivo</label>
                                    <Input
                                        name="notes"
                                        placeholder="Ex: Cortesia acordada por telefone"
                                        className="bg-background"
                                        disabled={loading}
                                        required
                                    />
                                </div>
                            </div>

                            {hasAmount && (
                                <div className="px-3 py-2 rounded-xl bg-muted/40 border text-panel-sm space-y-0.5">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                            {parsedAmount > 0 ? 'Tokens a adicionar' : 'Tokens a retirar'}
                                        </span>
                                        <span className={`font-bold ${parsedAmount > 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                                            {parsedAmount > 0 ? '+' : ''}{parsedAmount}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Saldo depois</span>
                                        <span className="font-bold tabular-nums">{balanceAfter(parsedAmount)}</span>
                                    </div>
                                </div>
                            )}

                            <DialogFooter className="pt-1">
                                <Button pill type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={loading}>
                                    Fechar
                                </Button>
                                <Button pill type="submit" disabled={loading || !hasAmount} className="gap-2">
                                    {loading && <SpinnerGapIcon size={16} weight="bold" className="animate-spin" />}
                                    Confirmar ajuste
                                </Button>
                            </DialogFooter>
                        </form>
                    </TabsContent>
                </Tabs>

                {/* ── Últimos lançamentos ─────────────────────────────────── */}
                <div className="border-t pt-2.5 space-y-1.5 min-w-0">
                    <p className="text-panel-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                        <ClockCounterClockwiseIcon size={15} weight="duotone" />
                        Últimos lançamentos
                    </p>
                    {history === null ? (
                        <p className="text-caption text-muted-foreground">Carregando…</p>
                    ) : history.length === 0 ? (
                        <p className="text-caption text-muted-foreground">Nenhuma movimentação ainda.</p>
                    ) : (
                        <ul className="divide-y rounded-lg border bg-muted/20">
                            {history.slice(0, HISTORY_VISIBLE).map(mv => {
                                const { date, time } = formatMovementDate(mv.created_at);
                                return (
                                    <li key={mv.id} className="flex items-center gap-2 px-2.5 py-1.5 text-caption">
                                        <span className="text-muted-foreground tabular-nums shrink-0 whitespace-nowrap">
                                            {date} <span className="opacity-60">{time}</span>
                                        </span>
                                        {/* min-w-0 é obrigatório: sem ele o flex item usa
                                            min-width:auto, o texto sem quebra vira a largura
                                            mínima da linha e empurra o diálogo inteiro para fora. */}
                                        <span className="truncate flex-1 min-w-0" title={mv.notes ?? undefined}>
                                            <span className="font-medium">{MOVEMENT_LABEL[mv.type] ?? 'Ajuste'}</span>
                                            {mv.notes && <span className="text-muted-foreground"> — {mv.notes}</span>}
                                        </span>
                                        <span className="flex items-center gap-2 shrink-0">
                                            <Badge
                                                variant="outline"
                                                className={`rounded-full tabular-nums font-bold text-[10px] px-2 ${mv.amount < 0 ? 'text-destructive border-destructive/30' : 'text-emerald-600 border-emerald-300'}`}
                                            >
                                                {mv.amount > 0 ? '+' : ''}{mv.amount}
                                            </Badge>
                                            <span className="text-muted-foreground tabular-nums min-w-[2.25rem] text-right">
                                                {mv.balance_after}
                                            </span>
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
