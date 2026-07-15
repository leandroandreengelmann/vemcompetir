'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { showToast } from '@/lib/toast';
import { SpinnerGapIcon, PencilSimpleIcon, TrashIcon, ImageIcon } from '@phosphor-icons/react';
import { storeImageUrl, formatBRL, effectivePrice } from '@/lib/store';
import { toggleProductAction, deleteProductAction } from '../actions';

type Row = {
    id: string;
    name: string;
    slug: string;
    price: number;
    promo_price: number | null;
    is_active: boolean;
    is_featured: boolean;
    category_name: string | null;
    primary_image: string | null;
};

export function ProductsList({ products }: { products: Row[] }) {
    const [isPending, startTransition] = useTransition();
    const [deleting, setDeleting] = useState<Row | null>(null);

    function toggle(p: Row, value: boolean) {
        startTransition(async () => {
            const res = await toggleProductAction(p.id, value);
            if (res?.error) showToast.error('Erro', res.error);
        });
    }

    function remove() {
        if (!deleting) return;
        startTransition(async () => {
            const res = await deleteProductAction(deleting.id);
            if (res?.error) showToast.error('Erro', res.error);
            else { showToast.success('Produto excluído.'); setDeleting(null); }
        });
    }

    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="pl-6">Produto</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead className="text-right">Preço</TableHead>
                            <TableHead className="text-center">Ativo</TableHead>
                            <TableHead className="text-right pr-6">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map((p) => {
                            const img = storeImageUrl(p.primary_image);
                            const eff = effectivePrice(p);
                            const hasPromo = eff < p.price;
                            return (
                                <TableRow key={p.id}>
                                    <TableCell className="pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                                                {img
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    ? <img src={img} alt={p.name} className="h-full w-full object-cover" />
                                                    : <ImageIcon size={18} className="absolute inset-0 m-auto text-muted-foreground" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-panel-sm line-clamp-1 max-w-[280px]">{p.name}</p>
                                                {p.is_featured && <span className="text-[10px] font-bold text-primary">DESTAQUE</span>}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-panel-sm">{p.category_name || '—'}</TableCell>
                                    <TableCell className="text-right text-panel-sm">
                                        {hasPromo && <span className="mr-2 text-xs text-muted-foreground line-through">{formatBRL(p.price)}</span>}
                                        <span className={hasPromo ? 'font-semibold text-primary' : ''}>{formatBRL(eff)}</span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Switch checked={p.is_active} onCheckedChange={(v) => toggle(p, v)} />
                                    </TableCell>
                                    <TableCell className="pr-6">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Editar">
                                                <Link href={`/admin/dashboard/loja/produtos/${p.id}`}><PencilSimpleIcon size={16} weight="bold" /></Link>
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Excluir" onClick={() => setDeleting(p)}>
                                                <TrashIcon size={16} weight="bold" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {products.length === 0 && (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Nenhum produto ainda.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>

            <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Excluir produto</DialogTitle></DialogHeader>
                    <p className="text-panel-sm text-muted-foreground">
                        Excluir <strong>{deleting?.name}</strong> e todas as suas fotos? Não pode ser desfeito.
                    </p>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDeleting(null)}>Cancelar</Button>
                        <Button variant="destructive" pill disabled={isPending} onClick={remove}>
                            {isPending && <SpinnerGapIcon size={18} weight="bold" className="mr-2 animate-spin" />}
                            Excluir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
