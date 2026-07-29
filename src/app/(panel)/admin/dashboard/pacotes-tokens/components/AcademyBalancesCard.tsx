'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    CoinsIcon, MagnifyingGlassIcon, WarningIcon, PowerIcon, SpinnerGapIcon,
} from '@phosphor-icons/react';
import { EmptyState } from '@/components/panel/EmptyState';
import { confirmAsync } from '@/components/panel/ConfirmDialog';
import { showToast } from '@/lib/toast';
import { toggleTokenManagementAction } from '../actions';
import AddBalanceDialog from './AddBalanceDialog';
import { LOW_BALANCE_THRESHOLD, type AcademySummary, type TokenPackage } from './types';

type Filter = 'todas' | 'precisando' | 'sem-modulo';

const FILTERS: { value: Filter; label: string }[] = [
    { value: 'todas', label: 'Todas' },
    { value: 'precisando', label: 'Precisando de saldo' },
    { value: 'sem-modulo', label: 'Sem o módulo' },
];

export default function AcademyBalancesCard({
    academies,
    packages,
    onUpdated,
    onToggled,
}: {
    academies: AcademySummary[];
    packages: TokenPackage[];
    onUpdated: (tenantId: string, newBalance: number) => void;
    onToggled: (tenantId: string, enabled: boolean) => void;
}) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<Filter>('todas');
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const term = search.trim().toLowerCase();

    const visible = academies
        .filter(a => (term ? a.name.toLowerCase().includes(term) : true))
        .filter(a => {
            if (filter === 'precisando') {
                return a.token_management_enabled && a.inscription_token_balance <= LOW_BALANCE_THRESHOLD;
            }
            if (filter === 'sem-modulo') return !a.token_management_enabled;
            return true;
        })
        // Ativas primeiro, e dentro delas quem está com menos saldo no topo.
        .sort((a, b) => {
            if (a.token_management_enabled !== b.token_management_enabled) {
                return a.token_management_enabled ? -1 : 1;
            }
            if (!a.token_management_enabled) return a.name.localeCompare(b.name, 'pt-BR');
            return a.inscription_token_balance - b.inscription_token_balance;
        });

    const handleToggle = async (academy: AcademySummary) => {
        const enabling = !academy.token_management_enabled;

        if (!enabling) {
            const ok = await confirmAsync({
                variant: 'destructive',
                title: 'Desativar tokens?',
                description: `${academy.name} deixará de consumir tokens nas inscrições. O saldo atual é mantido.`,
                confirmLabel: 'Desativar',
            });
            if (!ok) return;
        }

        setTogglingId(academy.id);
        const result = await toggleTokenManagementAction(academy.id, enabling);
        setTogglingId(null);

        if (result?.error) {
            showToast.error('Não foi possível alterar', result.error);
            return;
        }

        onToggled(academy.id, enabling);
        showToast.success(
            enabling ? 'Tokens ativados' : 'Tokens desativados',
            enabling
                ? `${academy.name} já pode receber saldo.`
                : `${academy.name} não consome mais tokens.`,
        );
    };

    return (
        <Card>
            <CardHeader className="pb-3 border-b space-y-3">
                <CardTitle className="text-panel-md font-semibold flex items-center gap-2">
                    <CoinsIcon size={20} weight="duotone" className="text-primary" />
                    Academias e saldos
                </CardTitle>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-xs">
                        <MagnifyingGlassIcon
                            size={16}
                            weight="bold"
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar academia..."
                            className="pl-9 bg-background"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        {FILTERS.map(f => (
                            <Button
                                key={f.value}
                                type="button"
                                pill
                                size="sm"
                                variant={filter === f.value ? 'default' : 'outline'}
                                onClick={() => setFilter(f.value)}
                            >
                                {f.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {visible.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            title="Nenhuma academia encontrada"
                            description={
                                term
                                    ? `Nada corresponde a "${search}". Tente outro nome ou troque o filtro.`
                                    : 'Nenhuma academia neste filtro.'
                            }
                        />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-6 text-panel-sm font-semibold">Academia</TableHead>
                                <TableHead className="text-panel-sm font-semibold text-right">Saldo</TableHead>
                                <TableHead className="text-panel-sm font-semibold text-right pr-6">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map(ac => {
                                const enabled = ac.token_management_enabled;
                                const balance = ac.inscription_token_balance;
                                const isNegative = balance < 0;
                                const isLow = enabled && balance <= LOW_BALANCE_THRESHOLD;

                                return (
                                    <TableRow key={ac.id} className={enabled ? undefined : 'opacity-60'}>
                                        <TableCell className="pl-6 font-medium">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {isLow && (
                                                    <WarningIcon size={15} weight="fill" className="text-amber-500 shrink-0" />
                                                )}
                                                {ac.name}
                                                {!enabled && (
                                                    <Badge variant="outline" className="rounded-full text-[10px] font-semibold text-muted-foreground">
                                                        Tokens desativados
                                                    </Badge>
                                                )}
                                                {isLow && !isNegative && (
                                                    <Badge variant="outline" className="rounded-full text-[10px] font-semibold text-amber-600 border-amber-300">
                                                        Precisa de saldo
                                                    </Badge>
                                                )}
                                                {enabled && isNegative && (
                                                    <Badge variant="outline" className="rounded-full text-[10px] font-semibold text-destructive border-destructive/40">
                                                        Usando o limite de −20
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums font-black">
                                            {enabled ? (
                                                <span className={isLow ? 'text-destructive' : 'text-foreground'}>{balance}</span>
                                            ) : (
                                                <span className="text-muted-foreground font-normal text-panel-sm">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {enabled ? (
                                                    <>
                                                        <AddBalanceDialog
                                                            academy={ac}
                                                            packages={packages}
                                                            onUpdated={onUpdated}
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            pill
                                                            title="Desativar tokens desta academia"
                                                            disabled={togglingId === ac.id}
                                                            onClick={() => handleToggle(ac)}
                                                        >
                                                            {togglingId === ac.id ? (
                                                                <SpinnerGapIcon size={16} weight="bold" className="animate-spin" />
                                                            ) : (
                                                                <PowerIcon size={16} weight="duotone" />
                                                            )}
                                                            <span className="sr-only">Desativar tokens</span>
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        pill
                                                        className="gap-1.5"
                                                        disabled={togglingId === ac.id}
                                                        onClick={() => handleToggle(ac)}
                                                    >
                                                        {togglingId === ac.id ? (
                                                            <SpinnerGapIcon size={16} weight="bold" className="animate-spin" />
                                                        ) : (
                                                            <PowerIcon size={16} weight="duotone" />
                                                        )}
                                                        Ativar tokens
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
