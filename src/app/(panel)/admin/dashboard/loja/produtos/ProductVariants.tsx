'use client';

import { useRef, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { showToast } from '@/lib/toast';
import { SpinnerGapIcon, PlusIcon, XIcon } from '@phosphor-icons/react';
import type { StoreProductVariant } from '@/lib/store';
import { addVariantAction, deleteVariantAction } from '../actions';

export function ProductVariants({ productId, variants }: { productId: string; variants: StoreProductVariant[] }) {
    const [isPending, startTransition] = useTransition();
    const formRef = useRef<HTMLFormElement>(null);

    function add(formData: FormData) {
        startTransition(async () => {
            const res = await addVariantAction(formData);
            if (res?.error) showToast.error('Erro', res.error);
            else { showToast.success('Variação adicionada!'); formRef.current?.reset(); }
        });
    }

    function remove(id: string) {
        startTransition(async () => {
            const res = await deleteVariantAction(id, productId);
            if (res?.error) showToast.error('Erro', res.error);
        });
    }

    return (
        <Card>
            <CardHeader><CardTitle className="text-panel-md font-semibold">Variações (tamanho / cor)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <form ref={formRef} action={add} className="flex flex-wrap items-end gap-3">
                    <input type="hidden" name="product_id" value={productId} />
                    <div className="space-y-1">
                        <Label htmlFor="v-size" className="text-xs">Tamanho</Label>
                        <Input id="v-size" name="size" placeholder="A2" className="w-24" />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="v-color" className="text-xs">Cor</Label>
                        <Input id="v-color" name="color" placeholder="Branco" className="w-32" />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="v-sku" className="text-xs">SKU (opcional)</Label>
                        <Input id="v-sku" name="sku" placeholder="KIM-A2-BRC" className="w-36" />
                    </div>
                    <Button type="submit" pill disabled={isPending}>
                        {isPending ? <SpinnerGapIcon size={16} weight="bold" className="mr-1 animate-spin" /> : <PlusIcon size={16} weight="bold" className="mr-1" />}
                        Adicionar
                    </Button>
                </form>

                {variants.length === 0 ? (
                    <p className="text-panel-sm text-muted-foreground">Nenhuma variação. Adicione ao menos tamanho ou cor.</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {variants.map((v) => (
                            <Badge key={v.id} variant="secondary" className="gap-2 py-1.5 pl-3 pr-1.5 text-panel-sm">
                                {[v.size, v.color].filter(Boolean).join(' · ') || '—'}
                                <button type="button" onClick={() => remove(v.id)} className="rounded-full p-0.5 hover:bg-destructive/20" title="Remover">
                                    <XIcon size={14} weight="bold" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
