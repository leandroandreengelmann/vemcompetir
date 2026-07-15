'use client';

import { useRef, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { showToast } from '@/lib/toast';
import { SpinnerGapIcon, StarIcon, TrashIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { storeImageUrl, type StoreProductImage } from '@/lib/store';
import { uploadProductImageAction, deleteProductImageAction, setPrimaryImageAction } from '../actions';

export function ProductImages({ productId, images }: { productId: string; images: StoreProductImage[] }) {
    const [isPending, startTransition] = useTransition();
    const fileRef = useRef<HTMLInputElement>(null);

    function upload(file: File) {
        const fd = new FormData();
        fd.append('product_id', productId);
        fd.append('file', file);
        startTransition(async () => {
            const res = await uploadProductImageAction(fd);
            if (res?.error) showToast.error('Erro', res.error);
            else showToast.success('Foto adicionada!');
        });
    }

    function remove(id: string) {
        startTransition(async () => {
            const res = await deleteProductImageAction(id, productId);
            if (res?.error) showToast.error('Erro', res.error);
        });
    }

    function setPrimary(id: string) {
        startTransition(async () => {
            const res = await setPrimaryImageAction(id, productId);
            if (res?.error) showToast.error('Erro', res.error);
            else showToast.success('Foto principal definida.');
        });
    }

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-panel-md font-semibold">Fotos ({images.length})</CardTitle>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
                <Button size="sm" pill variant="outline" disabled={isPending} onClick={() => fileRef.current?.click()}>
                    {isPending ? <SpinnerGapIcon size={16} weight="bold" className="mr-2 animate-spin" /> : <UploadSimpleIcon size={16} weight="bold" className="mr-2" />}
                    Enviar foto
                </Button>
            </CardHeader>
            <CardContent>
                {images.length === 0 ? (
                    <p className="text-panel-sm text-muted-foreground py-6 text-center">Nenhuma foto ainda. A primeira enviada vira a principal.</p>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {images.map((img) => (
                            <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={storeImageUrl(img.path) || ''} alt="" className="h-full w-full object-cover" />
                                {img.is_primary && (
                                    <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">Principal</span>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                    {!img.is_primary && (
                                        <Button size="icon" variant="secondary" className="h-8 w-8" title="Definir principal" onClick={() => setPrimary(img.id)}>
                                            <StarIcon size={16} weight="bold" />
                                        </Button>
                                    )}
                                    <Button size="icon" variant="destructive" className="h-8 w-8" title="Excluir" onClick={() => remove(img.id)}>
                                        <TrashIcon size={16} weight="bold" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
