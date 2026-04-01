'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    CoinsIcon, ArrowDownIcon, ArrowUpIcon, GiftIcon, SlidersIcon, WarningCircleIcon,
} from '@phosphor-icons/react';

interface Transaction {
    id: string;
    type: 'consumed' | 'refunded' | 'granted' | 'adjusted';
    amount: number;
    balance_after: number;
    notes: string | null;
    created_at: string;
    event: { title: string } | null;
    registration: { athlete: { full_name: string } | null } | null;
}

interface Props {
    balance: number;
    transactions: Transaction[];
}

const TYPE_CONFIG = {
    consumed: { label: 'Consumido', icon: ArrowDownIcon,  color: 'text-destructive',  bg: 'bg-destructive/10'  },
    refunded: { label: 'Estornado', icon: ArrowUpIcon,    color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    granted:  { label: 'Compra',    icon: GiftIcon,       color: 'text-blue-600',    bg: 'bg-blue-500/10'    },
    adjusted: { label: 'Ajuste',   icon: SlidersIcon,    color: 'text-amber-600',   bg: 'bg-amber-500/10'   },
};

export default function TokensClient({ balance, transactions }: Props) {
    const isLow = balance <= 20;

    const totalConsumed = transactions.filter(t => t.type === 'consumed').reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalGranted  = transactions.filter(t => t.type === 'granted' || t.type === 'adjusted').reduce((s, t) => s + t.amount, 0);
    const totalRefunded = transactions.filter(t => t.type === 'refunded').reduce((s, t) => s + t.amount, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-panel-lg font-black tracking-tight">Tokens de Inscrição</h1>
                    <p className="text-panel-sm text-muted-foreground mt-1">
                        Cada token equivale a uma inscrição em seus eventos.
                    </p>
                </div>
            </div>

            {/* Alerta de saldo baixo */}
            {isLow && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
                    <WarningCircleIcon size={18} weight="duotone" className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-ui font-medium text-amber-800 dark:text-amber-300">Saldo baixo</p>
                        <p className="text-caption text-amber-700 dark:text-amber-400">
                            Seu saldo está próximo do limite. Entre em contato com o suporte para adquirir mais tokens.
                        </p>
                    </div>
                </div>
            )}

            {/* Cards de resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className={`shadow-none ${isLow ? 'border-destructive/30' : ''}`}>
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${isLow ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                                <CoinsIcon size={20} weight="duotone" className={isLow ? 'text-destructive' : 'text-primary'} />
                            </div>
                            <div>
                                <p className="text-panel-sm text-muted-foreground">Saldo atual</p>
                                <p className={`text-panel-lg font-black tabular-nums ${isLow ? 'text-destructive' : ''}`}>
                                    {balance}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-none">
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-destructive/10">
                                <ArrowDownIcon size={20} weight="duotone" className="text-destructive" />
                            </div>
                            <div>
                                <p className="text-panel-sm text-muted-foreground">Total consumido</p>
                                <p className="text-panel-lg font-black tabular-nums">{totalConsumed}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-none">
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-emerald-500/10">
                                <ArrowUpIcon size={20} weight="duotone" className="text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-panel-sm text-muted-foreground">Total estornado</p>
                                <p className="text-panel-lg font-black tabular-nums">{totalRefunded}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Extrato */}
            <Card>
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-panel-md font-semibold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CoinsIcon size={20} weight="duotone" className="text-primary" />
                            Extrato de Tokens
                        </div>
                        <Badge variant="secondary" className="rounded-full">{transactions.length}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-6 text-panel-sm font-semibold">Tipo</TableHead>
                                <TableHead className="text-panel-sm font-semibold">Atleta / Descrição</TableHead>
                                <TableHead className="text-panel-sm font-semibold">Evento</TableHead>
                                <TableHead className="text-panel-sm font-semibold">Data</TableHead>
                                <TableHead className="text-panel-sm font-semibold text-center">Variação</TableHead>
                                <TableHead className="text-panel-sm font-semibold text-right pr-6">Saldo após</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.length > 0 ? (
                                transactions.map(tx => {
                                    const cfg = TYPE_CONFIG[tx.type] ?? TYPE_CONFIG.adjusted;
                                    const Icon = cfg.icon;
                                    const athleteName = tx.registration?.athlete?.full_name;
                                    const eventTitle = (tx.event as any)?.title;
                                    const date = new Date(tx.created_at).toLocaleDateString('pt-BR', {
                                        day: '2-digit', month: '2-digit', year: '2-digit',
                                    });
                                    const time = new Date(tx.created_at).toLocaleTimeString('pt-BR', {
                                        hour: '2-digit', minute: '2-digit',
                                    });

                                    return (
                                        <TableRow key={tx.id}>
                                            <TableCell className="pl-6">
                                                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-panel-sm font-medium ${cfg.bg} ${cfg.color}`}>
                                                    <Icon size={13} weight="duotone" />
                                                    {cfg.label}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-panel-sm font-medium">
                                                {athleteName ?? tx.notes ?? '—'}
                                            </TableCell>
                                            <TableCell className="text-panel-sm text-muted-foreground">
                                                {eventTitle ?? '—'}
                                            </TableCell>
                                            <TableCell className="text-panel-sm text-muted-foreground whitespace-nowrap">
                                                {date} <span className="opacity-60">{time}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge
                                                    variant="outline"
                                                    className={`rounded-full tabular-nums font-bold text-xs px-2.5 shadow-xs ${tx.amount < 0 ? 'text-destructive border-destructive/30' : 'text-emerald-600 border-emerald-300'}`}
                                                >
                                                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6 tabular-nums font-semibold">
                                                {tx.balance_after}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        Nenhuma movimentação registrada ainda.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
