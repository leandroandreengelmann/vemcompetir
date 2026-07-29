'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
    PlusIcon, PencilSimpleIcon, TrashIcon, SpinnerGapIcon, PackageIcon,
} from '@phosphor-icons/react';
import { confirmAsync } from '@/components/panel/ConfirmDialog';
import { showToast } from '@/lib/toast';
import { createTokenPackageAction, updateTokenPackageAction, deleteTokenPackageAction } from '../actions';
import { priceReais, type TokenPackage } from './types';

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
            showToast.success(pkg ? 'Pacote atualizado' : 'Pacote criado');
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
                        {pkg
                            ? 'Atualize as informações do pacote.'
                            : 'Um pacote é um valor pronto que aparece na hora de adicionar saldo.'}
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
                            <label className="text-panel-sm font-medium leading-none">
                                Descrição <span className="text-muted-foreground font-normal">(opcional)</span>
                            </label>
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

export default function PackagesCard({ packages }: { packages: TokenPackage[] }) {
    const router = useRouter();

    const handleDelete = async (id: string, name: string) => {
        const ok = await confirmAsync({
            variant: 'destructive',
            title: 'Desativar pacote?',
            description: `"${name}" deixará de aparecer na hora de adicionar saldo. Vendas já feitas continuam válidas.`,
            confirmLabel: 'Desativar',
        });
        if (!ok) return;
        const result = await deleteTokenPackageAction(id);
        if (result?.error) {
            showToast.error('Não foi possível desativar', result.error);
            return;
        }
        showToast.success('Pacote desativado');
        router.refresh();
    };

    return (
        <Card>
            <CardHeader className="pb-3 border-b">
                <CardTitle className="text-panel-md font-semibold flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <PackageIcon size={20} weight="duotone" className="text-muted-foreground" />
                        Pacotes de venda
                    </div>
                    <PackageFormDialog
                        trigger={
                            <Button pill size="sm" variant="outline">
                                <PlusIcon size={16} weight="bold" className="mr-1.5" />
                                Novo pacote
                            </Button>
                        }
                        onSaved={() => router.refresh()}
                    />
                </CardTitle>
                <p className="text-panel-sm text-muted-foreground">
                    Valores prontos que aparecem na aba &ldquo;Pacote&rdquo; ao adicionar saldo. Para uma
                    quantidade diferente, use a aba &ldquo;Quantidade livre&rdquo; — não precisa criar pacote.
                </p>
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
                        {packages.length > 0 ? (
                            packages.map(pkg => (
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
                                                    <Button variant="ghost" size="icon" pill title="Editar pacote">
                                                        <PencilSimpleIcon size={16} weight="duotone" />
                                                        <span className="sr-only">Editar pacote</span>
                                                    </Button>
                                                }
                                                onSaved={() => router.refresh()}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                pill
                                                title="Desativar pacote"
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
    );
}
