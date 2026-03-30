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
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
    PlusIcon, PencilSimpleIcon, TrashIcon, SpinnerGapIcon, CoinsIcon, WarningIcon, PackageIcon,
} from '@phosphor-icons/react';
import { createTokenPackageAction, updateTokenPackageAction, deleteTokenPackageAction } from './actions';

interface TokenPackage {
    id: string;
    name: string;
    token_count: number;
    price_cents: number;
    description: string | null;
    is_active: boolean;
}

interface AcademySummary {
    id: string;
    name: string;
    inscription_token_balance: number;
    token_alert_sent_at: string | null;
}

interface Props {
    packages: TokenPackage[];
    academies: AcademySummary[];
}

function PackageFormDialog({
    pkg,
    trigger,
    onSaved,
}: {
    pkg?: TokenPackage;
    trigger: React.ReactNode;
    onSaved: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const fd = new FormData(e.currentTarget);
        if (pkg) fd.append('id', pkg.id);
        const result = pkg ? await updateTokenPackageAction(fd) : await createTokenPackageAction(fd);
        if ('error' in result && result.error) {
            setError(result.error);
        } else {
            setOpen(false);
            onSaved();
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>{pkg ? 'Editar pacote' : 'Novo pacote de tokens'}</DialogTitle>
                    <DialogDescription>
                        {pkg ? 'Atualize as informações do pacote.' : 'Defina o nome, quantidade de tokens e preço.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        {error && (
                            <div className="p-3 bg-destructive/15 text-destructive text-panel-sm rounded-lg text-center">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-panel-sm font-medium leading-none">Nome do pacote</label>
                            <Input
                                name="name"
                                placeholder="Ex: Pacote 100 Tokens"
                                defaultValue={pkg?.name}
                                required
                                disabled={loading}
                                className="bg-background"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-panel-sm font-medium leading-none">Tokens</label>
                                <Input
                                    name="token_count"
                                    type="number"
                                    min="1"
                                    placeholder="100"
                                    defaultValue={pkg?.token_count}
                                    required
                                    disabled={loading}
                                    className="bg-background"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-panel-sm font-medium leading-none">Preço (R$)</label>
                                <Input
                                    name="price_reais"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="400,00"
                                    defaultValue={pkg ? (pkg.price_cents / 100).toFixed(2) : ''}
                                    required
                                    disabled={loading}
                                    className="bg-background"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-panel-sm font-medium leading-none">Descrição <span className="text-muted-foreground font-normal">(opcional)</span></label>
                            <Input
                                name="description"
                                placeholder="Ex: Ideal para eventos médios"
                                defaultValue={pkg?.description ?? ''}
                                disabled={loading}
                                className="bg-background"
                            />
                        </div>
                        {pkg && <input type="hidden" name="is_active" value="true" />}
                    </div>
                    <DialogFooter>
                        <Button type="submit" pill disabled={loading}>
                            {loading ? (
                                <>
                                    <SpinnerGapIcon size={16} weight="bold" className="mr-2 animate-spin" />
                                    Salvando...
                                </>
                            ) : 'Salvar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function TokenPackagesClient({ packages: initialPackages, academies }: Props) {
    const [packages, setPackages] = useState(initialPackages);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Desativar o pacote "${name}"?`)) return;
        await deleteTokenPackageAction(id);
        setPackages(p => p.filter(pkg => pkg.id !== id));
    };

    const priceReais = (cents: number) =>
        (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const activePackages = packages.filter(p => p.is_active);
    const lowBalanceCount = academies.filter(a => a.inscription_token_balance <= 20).length;

    return (
        <div className="space-y-6">
            {/* Cards de resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="shadow-none">
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <PackageIcon size={20} weight="duotone" className="text-primary" />
                            </div>
                            <div>
                                <p className="text-panel-sm text-muted-foreground">Pacotes ativos</p>
                                <p className="text-panel-lg font-black tabular-nums">{activePackages.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-none">
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-blue-500/10">
                                <CoinsIcon size={20} weight="duotone" className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-panel-sm text-muted-foreground">Academias com tokens</p>
                                <p className="text-panel-lg font-black tabular-nums">{academies.length}</p>
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
                                <p className="text-panel-sm text-muted-foreground">Saldo baixo</p>
                                <p className="text-panel-lg font-black tabular-nums">{lowBalanceCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela de pacotes */}
            <Card>
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-panel-md font-semibold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <PackageIcon size={20} weight="duotone" className="text-primary" />
                            Pacotes Disponíveis
                        </div>
                        <PackageFormDialog
                            trigger={
                                <Button pill size="sm">
                                    <PlusIcon size={16} weight="bold" className="mr-1.5" />
                                    Novo pacote
                                </Button>
                            }
                            onSaved={() => window.location.reload()}
                        />
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-6 text-panel-sm font-semibold">Nome</TableHead>
                                <TableHead className="text-panel-sm font-semibold text-center">Tokens</TableHead>
                                <TableHead className="text-panel-sm font-semibold">Preço</TableHead>
                                <TableHead className="text-panel-sm font-semibold">Descrição</TableHead>
                                <TableHead className="text-panel-sm font-semibold text-right pr-6">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activePackages.length > 0 ? (
                                activePackages.map(pkg => (
                                    <TableRow key={pkg.id}>
                                        <TableCell className="pl-6 font-medium">{pkg.name}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="rounded-full text-xs font-bold px-2.5 shadow-xs tabular-nums">
                                                {pkg.token_count}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-semibold text-emerald-600">
                                            {priceReais(pkg.price_cents)}
                                        </TableCell>
                                        <TableCell className="text-panel-sm text-muted-foreground">
                                            {pkg.description ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex items-center justify-end gap-1">
                                                <PackageFormDialog
                                                    pkg={pkg}
                                                    trigger={
                                                        <Button variant="ghost" size="icon" pill>
                                                            <PencilSimpleIcon size={16} weight="duotone" />
                                                            <span className="sr-only">Editar pacote</span>
                                                        </Button>
                                                    }
                                                    onSaved={() => window.location.reload()}
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    pill
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => handleDelete(pkg.id, pkg.name)}
                                                >
                                                    <TrashIcon size={16} weight="duotone" />
                                                    <span className="sr-only">Desativar pacote</span>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        Nenhum pacote ativo. Crie o primeiro pacote.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Tabela de saldo das academias */}
            <Card>
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-panel-md font-semibold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CoinsIcon size={20} weight="duotone" className="text-primary" />
                            Saldo das Academias
                        </div>
                        <Badge variant="secondary" className="rounded-full">{academies.length}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-6 text-panel-sm font-semibold">Academia</TableHead>
                                <TableHead className="text-panel-sm font-semibold text-right pr-6">Saldo de tokens</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {academies.length > 0 ? (
                                academies.map(ac => (
                                    <TableRow key={ac.id}>
                                        <TableCell className="pl-6 font-medium">
                                            <div className="flex items-center gap-2">
                                                {ac.inscription_token_balance <= 20 && (
                                                    <WarningIcon size={15} weight="fill" className="text-amber-500 shrink-0" />
                                                )}
                                                {ac.name}
                                                {ac.inscription_token_balance <= 20 && (
                                                    <Badge variant="outline" className="rounded-full text-[10px] font-semibold text-amber-600 border-amber-300">
                                                        Saldo baixo
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <span className={`text-panel-md font-black tabular-nums ${ac.inscription_token_balance <= 20 ? 'text-destructive' : 'text-foreground'}`}>
                                                {ac.inscription_token_balance}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                                        Nenhuma academia com gestão por token ativa.
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
