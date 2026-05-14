'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AAMEP_ABSOLUTOS } from '../lib/aamep-absolutos';

type Genero = 'all' | 'masculino' | 'feminino';

const GENERO_LABEL: Record<Exclude<Genero, 'all'>, string> = {
    masculino: 'Masculino',
    feminino: 'Feminino',
};

export function AamepAbsolutosPreview() {
    const [genero, setGenero] = useState<Genero>('all');

    const visibleGroups = useMemo(
        () => (genero === 'all' ? AAMEP_ABSOLUTOS : AAMEP_ABSOLUTOS.filter((g) => g.genero === genero)),
        [genero],
    );

    const totalEntries = AAMEP_ABSOLUTOS.reduce((acc, g) => acc + g.entries.length, 0);
    const visiveis = visibleGroups.reduce((acc, g) => acc + g.entries.length, 0);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-panel-md font-semibold">Tabela própria · Absolutos AAMEP</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 md:grid-cols-3">
                        <AxisChip label="Categorias por gênero" value="Adulto · Juvenil · Master" sub="Master só Masculino" />
                        <AxisChip label="Faixas" value="Definidas no evento" sub="Organizador escolhe 1 ou várias" />
                        <AxisChip label="Modalidade" value="Gi (com kimono)" sub="Sem No-Gi" />
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                        Total de absolutos no catálogo:{' '}
                        <span className="font-semibold text-foreground">{totalEntries} absolutos</span> em {AAMEP_ABSOLUTOS.length}{' '}
                        grupos. Adulto e Master usam Absoluto Livre; Juvenil tem dois tetos por gênero.
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex rounded-full border bg-background p-1">
                        {(['all', 'masculino', 'feminino'] as const).map((g) => (
                            <button
                                key={g}
                                onClick={() => setGenero(g)}
                                className={cn(
                                    'px-4 py-1.5 text-sm font-medium rounded-full transition-colors capitalize',
                                    genero === g
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {g === 'all' ? 'Todos' : g}
                            </button>
                        ))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        Mostrando <span className="font-semibold text-foreground">{visiveis}</span> absolutos
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {visibleGroups.map((group) => (
                    <Card key={group.key} className="overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30">
                            <div className="flex items-center gap-3">
                                <span className="text-base font-semibold">{group.faixaEtaria}</span>
                                <Badge variant="outline" className="rounded-full text-[10px] px-2 py-0">
                                    {GENERO_LABEL[group.genero]}
                                </Badge>
                                <Badge variant="outline" className="rounded-full text-[10px] px-2 py-0">
                                    {group.entries.length} {group.entries.length === 1 ? 'absoluto' : 'absolutos'}
                                </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground hidden md:inline">Aberto · Gi</span>
                        </div>

                        <CardContent className="p-0">
                            <div className="grid gap-px bg-border md:grid-cols-2">
                                {group.entries.map((e) => (
                                    <div
                                        key={e.key}
                                        className="flex items-center justify-between px-5 py-3 bg-background hover:bg-muted/40 transition-colors"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{e.label}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {e.max === null ? 'Sem limite de peso' : `Limite: ${e.max} kg`} · {e.fightTime}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="bg-muted/30 border-dashed">
                <CardContent className="py-4 text-sm text-muted-foreground space-y-2">
                    <p>
                        <strong className="text-foreground">Tabela separada:</strong> os absolutos não se misturam à grade de
                        pesos. Cada atleta disputa em peso aberto (ou com teto).
                    </p>
                    <p>
                        <strong className="text-foreground">Faixas dinâmicas:</strong> no catálogo o absoluto é template — sem
                        faixa fixa. Na criação do evento o organizador define quais faixas participam de cada absoluto (ex:{' '}
                        <em>Marrom + Preta</em>) e pode mesclar grupos (ex: <em>Adulto/Master Azul + Roxa</em>).
                    </p>
                    <p>
                        <strong className="text-foreground">Sem Master Feminino:</strong> AAMEP não modela Master Feminino, e isso
                        também vale para Absolutos.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

function AxisChip({ label, value, sub }: { label: string; value: string; sub: string }) {
    return (
        <div className="rounded-xl border bg-background px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
            <p className="text-sm font-semibold mt-0.5 leading-tight">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
        </div>
    );
}
