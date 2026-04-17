'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import { CircleNotchIcon, ReceiptIcon } from '@phosphor-icons/react';
import { issueReceiptForRegistrationAction } from '../../actions';
import { ReceiptPDF } from '../ReceiptPDF';

interface Props {
    prefill: {
        registrationId: string;
        payerName: string;
        payerDocument: string;
        amount: number;
        description: string;
        eventTitle: string;
        paymentMethodDefault: string;
    };
}

const METHODS = [
    { value: 'pix', label: 'PIX' },
    { value: 'pix_direto', label: 'PIX Direto' },
    { value: 'credit_card', label: 'Cartão de Crédito' },
    { value: 'boleto', label: 'Boleto' },
    { value: 'pago_em_mao', label: 'Pago em Mão' },
    { value: 'dinheiro', label: 'Dinheiro' },
];

export function IssueReceiptForm({ prefill }: Props) {
    const router = useRouter();
    const [payerName, setPayerName] = useState(prefill.payerName);
    const [payerDocument, setPayerDocument] = useState(prefill.payerDocument);
    const [amount, setAmount] = useState(String(prefill.amount));
    const [description, setDescription] = useState(prefill.description);
    const [paymentMethod, setPaymentMethod] = useState(prefill.paymentMethodDefault);
    const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const value = Number(amount);
        if (!(value > 0)) {
            toast.error('O valor deve ser maior que zero.');
            return;
        }

        startTransition(async () => {
            const res = await issueReceiptForRegistrationAction({
                registrationId: prefill.registrationId,
                payerName,
                payerDocument,
                paymentMethod,
                paidAt: paidAt ? new Date(paidAt + 'T00:00:00').toISOString() : undefined,
                description,
                amountOverride: value,
            });

            if (res.error || !res.receipt) {
                toast.error(res.error ?? 'Falha ao emitir recibo.');
                return;
            }

            try {
                const blob = await pdf(<ReceiptPDF receipt={res.receipt} />).toBlob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `recibo-${res.receipt.receipt_number}-${res.receipt.receipt_year}.pdf`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            } catch (err) {
                console.error(err);
            }

            toast.success(`Recibo ${res.receipt.receipt_number}/${res.receipt.receipt_year} emitido.`);
            router.push('/academia-equipe/dashboard/financeiro/recibos');
            router.refresh();
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-panel-sm font-semibold text-muted-foreground">Nome do pagador</label>
                    <Input
                        variant="lg"
                        value={payerName}
                        onChange={(e) => setPayerName(e.target.value)}
                        placeholder="Nome completo"
                        className="bg-background"
                        required
                        disabled={isPending}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-panel-sm font-semibold text-muted-foreground">CPF / Documento</label>
                    <Input
                        variant="lg"
                        value={payerDocument}
                        onChange={(e) => setPayerDocument(e.target.value)}
                        placeholder="000.000.000-00"
                        className="bg-background"
                        disabled={isPending}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-panel-sm font-semibold text-muted-foreground">Valor (R$)</label>
                    <Input
                        variant="lg"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="bg-background"
                        required
                        disabled={isPending}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-panel-sm font-semibold text-muted-foreground">Forma de pagamento</label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={isPending}>
                        <SelectTrigger className="h-12 rounded-xl border-input bg-background font-medium">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {METHODS.map((m) => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-panel-sm font-semibold text-muted-foreground">Data do pagamento</label>
                <Input
                    variant="lg"
                    type="date"
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                    className="bg-background w-full md:w-64"
                    disabled={isPending}
                />
            </div>

            <div className="space-y-2">
                <label className="text-panel-sm font-semibold text-muted-foreground">Descrição</label>
                <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Descrição do recibo"
                    className="bg-background rounded-xl"
                    disabled={isPending}
                />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                    type="submit"
                    pill
                    className="h-12 gap-2 text-panel-sm font-semibold shadow-sm"
                    disabled={isPending}
                >
                    {isPending ? (
                        <>
                            <CircleNotchIcon size={16} weight="duotone" className="animate-spin" />
                            Emitindo...
                        </>
                    ) : (
                        <>
                            <ReceiptIcon size={16} weight="duotone" />
                            Emitir e baixar PDF
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
