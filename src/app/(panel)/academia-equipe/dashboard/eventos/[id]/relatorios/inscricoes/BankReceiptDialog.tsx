'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { BankIcon, ArrowSquareOutIcon } from '@phosphor-icons/react';
import type { PaymentReceiptDetails } from '../../../payment-receipt-actions';

interface BankReceiptDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    data: PaymentReceiptDetails | null;
}

function Field({ label, value }: { label: string; value: string | null }) {
    return (
        <div>
            <span className="text-panel-sm font-bold text-muted-foreground uppercase tracking-widest block mb-1">{label}</span>
            <p className="text-base font-semibold text-foreground tracking-tight">{value || 'Não informado'}</p>
        </div>
    );
}

export function BankReceiptDialog({ isOpen, onOpenChange, data }: BankReceiptDialogProps) {
    if (!data) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] bg-background/95 backdrop-blur-xl border-border/50">
                <DialogHeader className="mb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                        <BankIcon size={22} weight="duotone" className="text-emerald-500" />
                        Comprovante bancário
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Dados oficiais do pagamento, consultados diretamente na Asaas.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 pb-2">
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                        <Field label="Valor pago" value={data.value} />
                        <Field label="Data do pagamento" value={data.paymentDate} />
                    </div>

                    <Field label="Código da transação (Pix)" value={data.transactionCode} />

                    <div className="h-px bg-border/40 w-full" />

                    <div>
                        <h4 className="text-panel-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
                            Dados de quem pagou
                        </h4>
                        <div className="space-y-6">
                            <Field label="Nome" value={data.payerName} />
                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                <Field label="CPF/CNPJ" value={data.payerDocument} />
                                <Field label="Banco" value={data.payerBank} />
                            </div>
                        </div>
                    </div>

                    <a
                        href={data.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-panel-sm font-semibold text-muted-foreground hover:text-foreground transition-colors pt-2 border-t border-border/40"
                    >
                        <ArrowSquareOutIcon size={14} weight="duotone" />
                        Ver comprovante original na Asaas
                    </a>
                </div>
            </DialogContent>
        </Dialog>
    );
}
