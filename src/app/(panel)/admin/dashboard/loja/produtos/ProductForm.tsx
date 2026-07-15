'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { showToast } from '@/lib/toast';
import { SpinnerGapIcon } from '@phosphor-icons/react';
import { createProductAction, updateProductAction } from '../actions';
import type { StoreCategory, StoreProduct } from '@/lib/store';

interface Props {
    categories: Pick<StoreCategory, 'id' | 'name'>[];
    product?: StoreProduct;
}

export function ProductForm({ categories, product }: Props) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const isEdit = !!product;

    function handle(formData: FormData) {
        startTransition(async () => {
            const res = isEdit
                ? await updateProductAction(product!.id, formData)
                : await createProductAction(formData);
            if (res?.error) { showToast.error('Erro', res.error); return; }
            if (isEdit) {
                showToast.success('Produto atualizado!');
            } else {
                showToast.success('Produto criado!', 'Agora adicione fotos e variações.');
                if (res.id) router.push(`/admin/dashboard/loja/produtos/${res.id}`);
            }
        });
    }

    return (
        <Card>
            <CardHeader><CardTitle className="text-panel-md font-semibold">Dados do produto</CardTitle></CardHeader>
            <CardContent>
                <form action={handle} className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome</Label>
                        <Input id="name" name="name" defaultValue={product?.name} placeholder="Ex: Kimono Trançado Branco" required maxLength={120} variant="lg" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea id="description" name="description" rows={4} defaultValue={product?.description || ''} placeholder="Material, gramatura, detalhes..." />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="price">Preço (R$)</Label>
                            <Input id="price" name="price" inputMode="decimal" defaultValue={product ? String(product.price).replace('.', ',') : ''} placeholder="299,00" required variant="lg" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="promo_price">Preço promocional (opcional)</Label>
                            <Input id="promo_price" name="promo_price" inputMode="decimal" defaultValue={product?.promo_price ? String(product.promo_price).replace('.', ',') : ''} placeholder="249,00" variant="lg" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="category_id">Categoria</Label>
                            <Select name="category_id" defaultValue={product?.category_id || undefined}>
                                <SelectTrigger id="category_id"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>
                                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sort_order">Ordem</Label>
                            <Input id="sort_order" name="sort_order" type="number" defaultValue={product?.sort_order ?? 0} variant="lg" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <Label htmlFor="is_featured" className="text-panel-sm font-medium">Produto em destaque</Label>
                            <p className="text-xs text-muted-foreground">Aparece com prioridade na vitrine.</p>
                        </div>
                        <Switch id="is_featured" name="is_featured" defaultChecked={product?.is_featured} />
                    </div>

                    <Button type="submit" pill disabled={isPending}>
                        {isPending && <SpinnerGapIcon size={18} weight="bold" className="mr-2 animate-spin" />}
                        {isEdit ? 'Salvar alterações' : 'Criar e continuar'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
