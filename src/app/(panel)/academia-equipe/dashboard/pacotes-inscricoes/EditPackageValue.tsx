'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PencilSimpleIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { showToast } from '@/lib/toast';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { updateInscriptionPackageValueAction } from '../academias-afiliadas/package-actions';

interface EditPackageValueProps {
    packageId: string;
    price: number;
}

export function EditPackageValue({ packageId, price }: EditPackageValueProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [value, setValue] = useState(price > 0 ? String(price) : '');

    const handleOpenChange = (v: boolean) => {
        setOpen(v);
        setError(null);
        setValue(price > 0 ? String(price) : '');
    };

    const handleSave = async () => {
        setLoading(true);
        setError(null);

        const result = await updateInscriptionPackageValueAction(packageId, parseFloat(value) || 0);
        if (result?.error) {
            setError(result.error);
            setLoading(false);
            return;
        }

        setOpen(false);
        setLoading(false);
        showToast.success('Valor atualizado');
        router.refresh();
    };

    return (
        <div className="flex items-center justify-end gap-1.5">
            {price > 0
                ? <span className="font-semibold text-emerald-600">R$ {Number(price).toFixed(2)}</span>
                : <span className="text-muted-foreground">Grátis</span>}

            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={() => handleOpenChange(true)}
                aria-label="Editar valor"
            >
                <PencilSimpleIcon size={14} weight="bold" />
            </Button>

            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-[380px]">
                    <DialogHeader>
                        <DialogTitle>Editar valor do pacote</DialogTitle>
                        <DialogDescription>
                            Informe o valor cobrado por este pacote. Use 0 para deixar como grátis.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 py-2">
                        <label className="text-panel-sm font-semibold text-muted-foreground">
                            Valor cobrado (R$)
                        </label>
                        <Input
                            variant="lg"
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="0 = grátis"
                            className="bg-background"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            disabled={loading}
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-destructive/15 text-destructive text-panel-sm rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0 pt-2">
                        <Button pill type="button" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button pill type="button" onClick={handleSave} disabled={loading} className="gap-2">
                            {loading && <SpinnerGapIcon size={16} weight="bold" className="animate-spin" />}
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
