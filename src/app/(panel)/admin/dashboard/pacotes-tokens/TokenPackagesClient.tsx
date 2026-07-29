'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CoinsIcon, WarningIcon, TrendDownIcon, InfoIcon } from '@phosphor-icons/react';
import AcademyBalancesCard from './components/AcademyBalancesCard';
import PackagesCard from './components/PackagesCard';
import { LOW_BALANCE_THRESHOLD, type AcademySummary, type TokenPackage } from './components/types';

interface Props {
    packages: TokenPackage[];
    academies: AcademySummary[];
}

export default function TokenPackagesClient({ packages: initialPackages, academies: initialAcademies }: Props) {
    const [packages, setPackages] = useState(initialPackages);
    const [academies, setAcademies] = useState(initialAcademies);

    // Mantém o estado local em sincronia após um router.refresh() (criar/editar pacote).
    useEffect(() => setPackages(initialPackages), [initialPackages]);
    useEffect(() => setAcademies(initialAcademies), [initialAcademies]);

    const handleUpdated = (tenantId: string, newBalance: number) => {
        setAcademies(prev =>
            prev.map(a => (a.id === tenantId ? { ...a, inscription_token_balance: newBalance } : a)),
        );
    };

    const handleToggled = (tenantId: string, enabled: boolean) => {
        setAcademies(prev =>
            prev.map(a => (a.id === tenantId ? { ...a, token_management_enabled: enabled } : a)),
        );
    };

    const activePackages = packages.filter(p => p.is_active);
    const managed = academies.filter(a => a.token_management_enabled);
    const lowBalanceCount = managed.filter(
        a => a.inscription_token_balance >= 0 && a.inscription_token_balance <= LOW_BALANCE_THRESHOLD,
    ).length;
    const negativeCount = managed.filter(a => a.inscription_token_balance < 0).length;

    return (
        <div className="space-y-6">
            {/* Cards de resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="shadow-none">
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-blue-500/10">
                                <CoinsIcon size={20} weight="duotone" className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-panel-sm text-muted-foreground">Academias com tokens</p>
                                <p className="text-panel-lg font-black tabular-nums">{managed.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-none">
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${lowBalanceCount > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
                                <WarningIcon size={20} weight="duotone" className={lowBalanceCount > 0 ? 'text-amber-600' : 'text-emerald-600'} />
                            </div>
                            <div>
                                <p className="text-panel-sm text-muted-foreground">Precisando de saldo</p>
                                <p className="text-panel-lg font-black tabular-nums">{lowBalanceCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-none">
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${negativeCount > 0 ? 'bg-destructive/10' : 'bg-emerald-500/10'}`}>
                                <TrendDownIcon size={20} weight="duotone" className={negativeCount > 0 ? 'text-destructive' : 'text-emerald-600'} />
                            </div>
                            <div>
                                <p className="text-panel-sm text-muted-foreground">Saldo negativo</p>
                                <p className="text-panel-lg font-black tabular-nums">{negativeCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Como o token funciona */}
            <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4">
                <InfoIcon size={18} weight="duotone" className="text-primary shrink-0 mt-0.5" />
                <div className="space-y-1 text-panel-sm">
                    <p className="font-semibold">Como funciona</p>
                    <p className="text-muted-foreground">
                        1 token = 1 inscrição confirmada. O saldo é da academia e vale para todos os eventos
                        dela — não existe saldo por evento. O token é debitado quando a inscrição é
                        confirmada e devolvido se ela for cancelada. A academia pode chegar a −20 tokens
                        antes de precisar repor.
                    </p>
                </div>
            </div>

            <AcademyBalancesCard
                academies={academies}
                packages={activePackages}
                onUpdated={handleUpdated}
                onToggled={handleToggled}
            />

            <PackagesCard packages={activePackages} />
        </div>
    );
}
