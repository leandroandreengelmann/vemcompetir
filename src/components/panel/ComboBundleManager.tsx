'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Package, Trash2, Info } from 'lucide-react';
import {
    getEventComboBundle,
    upsertEventComboBundle,
    deleteEventComboBundle,
} from '@/app/(panel)/actions/event-combo-bundle';

interface ComboBundleManagerProps {
    eventId: string;
}

export function ComboBundleManager({ eventId }: ComboBundleManagerProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [combo, setCombo] = useState<{ id: string; bundle_total: number; is_active: boolean } | null>(null);
    const [bundleTotal, setBundleTotal] = useState('');

    const loadCombo = async () => {
        setLoading(true);
        try {
            const data = await getEventComboBundle(eventId);
            setCombo(data);
            if (data) setBundleTotal(data.bundle_total.toString());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCombo();
    }, [eventId]);

    const handleSave = async () => {
        const total = parseFloat(bundleTotal.replace(',', '.'));
        if (isNaN(total) || total <= 0) {
            toast.error('Informe um valor total válido.');
            return;
        }
        setSaving(true);
        const result = await upsertEventComboBundle(eventId, total);
        if (result.success) {
            toast.success(combo ? 'Combo atualizado.' : 'Combo ativado!');
            await loadCombo();
        } else {
            toast.error(result.error ?? 'Erro ao salvar combo.');
        }
        setSaving(false);
    };

    const handleDelete = async () => {
        setDeleting(true);
        const result = await deleteEventComboBundle(eventId);
        if (result.success) {
            toast.success('Combo removido.');
            setCombo(null);
            setBundleTotal('');
        } else {
            toast.error(result.error ?? 'Erro ao remover combo.');
        }
        setDeleting(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const pricePerSlot = bundleTotal
        ? (parseFloat(bundleTotal.replace(',', '.')) / 4).toFixed(2)
        : null;

    return (
        <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
            <CardHeader className="bg-indigo-600 flex flex-col p-6">
                <CardTitle className="text-white text-h3 flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Combo 4 Categorias
                </CardTitle>
                <p className="text-indigo-100/80 text-caption mt-1">
                    Atleta paga um valor fixo ao se inscrever nas 4 categorias: Absoluto Gi, Regular Gi, Absoluto No-Gi e Regular No-Gi.
                </p>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
                {combo && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200">
                        <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                        <p className="text-panel-sm font-semibold text-indigo-700">
                            Combo ativo — R$ {combo.bundle_total.toFixed(2)} no total
                        </p>
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="bundle-total" className="text-label text-muted-foreground">
                        Valor Total do Combo (R$)
                    </Label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-ui">R$</span>
                        <Input
                            id="bundle-total"
                            value={bundleTotal}
                            onChange={(e) => setBundleTotal(e.target.value)}
                            className="pl-10 h-12 rounded-2xl border-primary/10 bg-muted/30 font-bold text-h2"
                            placeholder="240,00"
                        />
                    </div>
                    {pricePerSlot && !isNaN(parseFloat(pricePerSlot)) && parseFloat(pricePerSlot) > 0 && (
                        <p className="text-panel-sm text-muted-foreground pl-1">
                            = <strong>R$ {pricePerSlot}</strong> por categoria (÷ 4)
                        </p>
                    )}
                </div>

                <div className="flex gap-3">
                    <Button
                        onClick={handleSave}
                        disabled={saving || deleting}
                        pill
                        className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                    >
                        {saving ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</>
                        ) : combo ? 'Atualizar Combo' : 'Ativar Combo'}
                    </Button>
                    {combo && (
                        <Button
                            onClick={handleDelete}
                            disabled={saving || deleting}
                            pill
                            variant="outline"
                            className="h-11 px-4 text-destructive border-destructive/30 hover:bg-destructive/5"
                        >
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                    )}
                </div>

                <div className="flex items-start gap-3 bg-muted/30 rounded-2xl p-4">
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-caption text-muted-foreground leading-relaxed">
                        O combo é detectado automaticamente. Quando o atleta adicionar as 4 categorias correspondentes ao seu perfil (Gi e No-Gi, Absoluto e Regular), o desconto é aplicado. Infantis não são afetados.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
