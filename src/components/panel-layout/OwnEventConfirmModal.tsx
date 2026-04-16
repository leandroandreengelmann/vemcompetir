'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CircleNotchIcon, CheckCircleIcon, UserIcon, CurrencyDollarIcon } from "@phosphor-icons/react";

type PaymentMethod = 'pago_em_mao' | 'pix_direto' | 'isento';

interface CartItem {
    id: string;
    athleteName: string;
    categoryTitle: string;
    price: number;
}

export interface OwnEventCheckoutItem {
    registrationId: string;
    paymentMethod: PaymentMethod;
    amount: number;
    notes?: string;
}

interface OwnEventConfirmModalProps {
    open: boolean;
    eventTitle: string;
    items: CartItem[];
    submitting: boolean;
    onConfirm: (items: OwnEventCheckoutItem[]) => void;
    onCancel: () => void;
}

export function OwnEventConfirmModal({
    open,
    eventTitle,
    items,
    submitting,
    onConfirm,
    onCancel,
}: OwnEventConfirmModalProps) {
    const [itemData, setItemData] = useState<Record<string, { method: PaymentMethod; amount: string; notes: string }>>({});
    const [batchMethod, setBatchMethod] = useState<PaymentMethod | ''>('');

    function getData(item: CartItem) {
        return itemData[item.id] ?? { method: 'pago_em_mao' as PaymentMethod, amount: String(item.price), notes: '' };
    }

    function updateItem(id: string, field: string, value: string) {
        setItemData(prev => ({
            ...prev,
            [id]: { ...getData(items.find(i => i.id === id)!), [field]: value },
        }));
    }

    function applyBatch() {
        if (!batchMethod) return;
        const updated: typeof itemData = {};
        items.forEach(item => {
            const current = getData(item);
            updated[item.id] = {
                ...current,
                method: batchMethod,
                amount: batchMethod === 'isento' ? '0' : current.amount || String(item.price),
            };
        });
        setItemData(updated);
    }

    function handleMethodChange(id: string, method: PaymentMethod, price: number) {
        const current = getData(items.find(i => i.id === id)!);
        setItemData(prev => ({
            ...prev,
            [id]: {
                ...current,
                method,
                amount: method === 'isento' ? '0' : (current.amount === '0' ? String(price) : current.amount),
            },
        }));
    }

    const total = items.reduce((sum, item) => {
        const d = getData(item);
        return sum + (parseFloat(d.amount) || 0);
    }, 0);

    function handleConfirm() {
        const result: OwnEventCheckoutItem[] = items.map(item => {
            const d = getData(item);
            return {
                registrationId: item.id,
                paymentMethod: d.method,
                amount: parseFloat(d.amount) || 0,
                notes: d.notes || undefined,
            };
        });
        onConfirm(result);
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o && !submitting) onCancel(); }}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col gap-0 p-0 rounded-2xl overflow-hidden">
                <DialogHeader className="px-5 pt-5 pb-4">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                            <CheckCircleIcon size={22} weight="duotone" className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-panel-md font-bold">Confirmar inscricoes</DialogTitle>
                            <DialogDescription className="text-panel-sm mt-0.5">
                                Selecione a forma de pagamento e confirme o valor.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Batch apply */}
                {items.length > 1 && (
                    <div className="flex items-center gap-2 px-5 pb-3 border-b border-border/50">
                        <span className="text-panel-sm text-muted-foreground font-semibold shrink-0">Aplicar a todos:</span>
                        <Select value={batchMethod} onValueChange={(v) => setBatchMethod(v as PaymentMethod)}>
                            <SelectTrigger className="h-10 text-panel-sm rounded-xl flex-1 bg-background">
                                <SelectValue placeholder="Selecionar..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="pago_em_mao" className="text-panel-sm font-medium">Pago em mao</SelectItem>
                                <SelectItem value="pix_direto" className="text-panel-sm font-medium">PIX direto</SelectItem>
                                <SelectItem value="isento" className="text-panel-sm font-medium">Isento (gratuito)</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            pill
                            variant="outline"
                            onClick={applyBatch}
                            disabled={!batchMethod}
                            className="text-panel-sm font-bold h-10 px-4 shrink-0"
                        >
                            Aplicar
                        </Button>
                    </div>
                )}

                {/* Items list */}
                <div className="space-y-3 overflow-y-auto flex-1 px-5 py-4">
                    {items.map((item) => {
                        const d = getData(item);
                        return (
                            <div key={item.id} className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-3">
                                {/* Athlete info */}
                                <div className="flex items-start gap-3">
                                    <div className="p-1.5 rounded-full bg-muted border border-border shrink-0 mt-0.5">
                                        <UserIcon size={14} weight="duotone" className="text-muted-foreground" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-panel-sm font-bold leading-tight truncate">{item.athleteName}</p>
                                        <p className="text-panel-sm text-muted-foreground font-medium line-clamp-2">{item.categoryTitle}</p>
                                    </div>
                                </div>

                                {/* Payment method + Amount */}
                                <div className="grid grid-cols-2 gap-2">
                                    <Select value={d.method} onValueChange={(v) => handleMethodChange(item.id, v as PaymentMethod, item.price)}>
                                        <SelectTrigger className="h-10 text-panel-sm font-semibold rounded-xl bg-background">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="pago_em_mao" className="text-panel-sm font-medium">Pago em mao</SelectItem>
                                            <SelectItem value="pix_direto" className="text-panel-sm font-medium">PIX direto</SelectItem>
                                            <SelectItem value="isento" className="text-panel-sm font-medium">Isento</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-panel-sm font-bold text-muted-foreground">R$</span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={d.amount}
                                            onChange={(e) => updateItem(item.id, 'amount', e.target.value)}
                                            disabled={d.method === 'isento'}
                                            className="h-10 text-panel-sm font-bold rounded-xl pl-10 bg-background tabular-nums"
                                        />
                                    </div>
                                </div>

                                {/* Notes */}
                                <Input
                                    value={d.notes}
                                    onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                                    className="h-10 text-panel-sm rounded-xl bg-background"
                                    placeholder="Observacao (opcional)"
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Total + Footer */}
                <div className="border-t border-border/50 bg-muted/30 px-5 py-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CurrencyDollarIcon size={18} weight="duotone" className="text-muted-foreground" />
                            <span className="text-panel-sm font-bold text-muted-foreground uppercase tracking-wide">Total recebido</span>
                        </div>
                        <span className="text-lg font-black tabular-nums text-foreground">
                            R$ {total.toFixed(2)}
                        </span>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            pill
                            variant="outline"
                            onClick={onCancel}
                            disabled={submitting}
                            className="flex-1 h-12 text-panel-sm font-bold"
                        >
                            Cancelar
                        </Button>
                        <Button
                            pill
                            onClick={handleConfirm}
                            disabled={submitting}
                            className="flex-1 h-12 text-panel-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                        >
                            {submitting
                                ? <CircleNotchIcon size={16} weight="bold" className="animate-spin mr-2" />
                                : <CheckCircleIcon size={16} weight="duotone" className="mr-2" />
                            }
                            Confirmar
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
