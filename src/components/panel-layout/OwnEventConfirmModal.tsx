'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, User, DollarSign, Download, FileText } from "lucide-react";
import { pdf } from '@react-pdf/renderer';
import { ReceiptPDF } from '@/app/(panel)/academia-equipe/dashboard/financeiro/recibos/ReceiptPDF';
import type { EventRegistrationReceipt } from '@/lib/receipts/event-registration-receipt';
import { toast } from 'sonner';

interface CartItem {
    id: string;
    athleteName: string;
    categoryTitle: string;
    price: number;
}

export interface OwnEventCheckoutItem {
    registrationId: string;
    amount: number;
    notes?: string;
}

interface OwnEventConfirmModalProps {
    open: boolean;
    eventTitle: string;
    items: CartItem[];
    submitting: boolean;
    successReceipts: EventRegistrationReceipt[] | null;
    onConfirm: (items: OwnEventCheckoutItem[]) => void;
    onCancel: () => void;
    onDone: () => void;
}

function formatCurrency(val: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

export function OwnEventConfirmModal({
    open,
    items,
    submitting,
    successReceipts,
    onConfirm,
    onCancel,
    onDone,
}: OwnEventConfirmModalProps) {
    const [itemData, setItemData] = useState<Record<string, { amount: string; notes: string }>>({});
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const isSuccess = !!successReceipts;

    async function downloadReceipt(receipt: EventRegistrationReceipt) {
        setDownloadingId(receipt.id);
        try {
            const blob = await pdf(<ReceiptPDF receipt={receipt} />).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `recibo-${receipt.receipt_number}-${receipt.receipt_year}.pdf`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
            console.error(err);
            toast.error('Falha ao gerar o PDF do recibo.');
        } finally {
            setDownloadingId(null);
        }
    }

    function getData(item: CartItem) {
        return itemData[item.id] ?? { amount: String(item.price), notes: '' };
    }

    function updateItem(id: string, field: 'amount' | 'notes', value: string) {
        setItemData(prev => ({
            ...prev,
            [id]: { ...getData(items.find(i => i.id === id)!), [field]: value },
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
                amount: parseFloat(d.amount) || 0,
                notes: d.notes || undefined,
            };
        });
        onConfirm(result);
    }

    if (isSuccess) {
        const receipts = successReceipts!;
        const totalRecebido = receipts.reduce((sum, r) => sum + Number(r.amount || 0), 0);
        return (
            <Dialog open={open} onOpenChange={(o) => { if (!o) onDone(); }}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col gap-0 p-0 rounded-2xl overflow-hidden">
                    <DialogHeader className="px-5 pt-5 pb-4">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2.5 rounded-full bg-success/10">
                                <CheckCircle2 className="h-5 w-5 text-success" />
                            </div>
                            <div>
                                <DialogTitle className="text-panel-md font-bold">Inscricoes confirmadas</DialogTitle>
                                <DialogDescription className="text-panel-sm mt-0.5">
                                    {receipts.length === 1
                                        ? '1 recibo emitido. Baixe o PDF abaixo.'
                                        : `${receipts.length} recibos emitidos. Baixe os PDFs abaixo.`}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-3 overflow-y-auto flex-1 px-5 py-4">
                        {receipts.map((r) => (
                            <div key={r.id} className="p-4 rounded-2xl border border-border bg-card shadow-sm flex items-center gap-3">
                                <div className="p-2 rounded-full bg-muted border border-border shrink-0">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-panel-sm font-bold leading-tight truncate">{r.payer_name ?? 'Atleta'}</p>
                                    <p className="text-panel-sm text-muted-foreground font-medium">
                                        Recibo {r.receipt_number}/{r.receipt_year} · {formatCurrency(Number(r.amount))}
                                    </p>
                                </div>
                                <Button
                                    pill
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadReceipt(r)}
                                    disabled={downloadingId === r.id}
                                    className="shrink-0 gap-1.5 h-9 text-panel-sm font-bold"
                                >
                                    {downloadingId === r.id
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <Download className="h-3.5 w-3.5" />}
                                    PDF
                                </Button>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-border/50 bg-muted/30 px-5 py-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-panel-sm font-bold text-muted-foreground uppercase tracking-wide">Total recebido</span>
                            <span className="text-lg font-black tabular-nums text-foreground">{formatCurrency(totalRecebido)}</span>
                        </div>
                        <Button
                            pill
                            onClick={onDone}
                            className="w-full h-12 text-panel-sm font-bold"
                        >
                            Concluir
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o && !submitting) onCancel(); }}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col gap-0 p-0 rounded-2xl overflow-hidden">
                <DialogHeader className="px-5 pt-5 pb-4">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2.5 rounded-full bg-success/10">
                            <CheckCircle2 className="h-5 w-5 text-success" />
                        </div>
                        <div>
                            <DialogTitle className="text-panel-md font-bold">Confirmar inscricoes</DialogTitle>
                            <DialogDescription className="text-panel-sm mt-0.5">
                                Pagamento via PIX. Confirme o valor recebido de cada atleta.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Items list */}
                <div className="space-y-3 overflow-y-auto flex-1 px-5 py-4">
                    {items.map((item) => {
                        const d = getData(item);
                        return (
                            <div key={item.id} className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-3">
                                {/* Athlete info */}
                                <div className="flex items-start gap-3">
                                    <div className="p-1.5 rounded-full bg-muted border border-border shrink-0 mt-0.5">
                                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-panel-sm font-bold leading-tight truncate">{item.athleteName}</p>
                                        <p className="text-panel-sm text-muted-foreground font-medium line-clamp-2">{item.categoryTitle}</p>
                                    </div>
                                </div>

                                {/* Amount (PIX) */}
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-panel-sm font-bold text-muted-foreground">R$</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={d.amount}
                                        onChange={(e) => updateItem(item.id, 'amount', e.target.value)}
                                        className="h-10 text-panel-sm font-bold rounded-xl pl-10 bg-background tabular-nums"
                                    />
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
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
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
                            className="flex-1 h-12 text-panel-sm font-bold"
                        >
                            {submitting
                                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                : <CheckCircle2 className="h-4 w-4 mr-2" />
                            }
                            Confirmar
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
