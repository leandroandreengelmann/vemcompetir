'use client';

import { useEffect, useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CircleNotchIcon, ArrowsClockwiseIcon } from '@phosphor-icons/react';
import { changeRegistrationStatusAction } from '../actions';
import { toast } from 'sonner';

interface Props {
    target: any | null;
    onClose: () => void;
    onUpdated: () => void;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: 'pago', label: 'Pago' },
    { value: 'agendado', label: 'Agendado' },
    { value: 'pendente', label: 'Pendente' },
    { value: 'pago_em_mao', label: 'Pago em Mão (evento próprio)' },
    { value: 'pix_direto', label: 'PIX Direto (evento próprio)' },
    { value: 'isento_evento_proprio', label: 'Isento (evento próprio)' },
    { value: 'isento', label: 'Isento (genérico)' },
    { value: 'cancelada', label: 'Cancelada' },
];

export function StatusChangeDialog({ target, onClose, onUpdated }: Props) {
    const [newStatus, setNewStatus] = useState('pago');
    const [newPrice, setNewPrice] = useState<string>('');
    const [reason, setReason] = useState('');
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (target) {
            setNewStatus(target.status ?? 'pago');
            setNewPrice(String(target.price ?? 0));
            setReason('');
        }
    }, [target]);

    if (!target) return null;

    const handleSubmit = () => {
        const price = Number(newPrice);
        if (Number.isNaN(price) || price < 0) {
            toast.error('Valor inválido.');
            return;
        }
        startTransition(async () => {
            const result = await changeRegistrationStatusAction({
                registrationId: target.registration_id,
                newStatus,
                newPrice: price,
                reason: reason.trim() || undefined,
            });
            if (result?.error) {
                toast.error(result.error);
                return;
            }
            toast.success('Status atualizado.');
            onUpdated();
        });
    };

    return (
        <Dialog open={!!target} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Alterar status da inscrição</DialogTitle>
                    <DialogDescription>
                        {target.athlete_name} · {target.event_title}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    <div className="space-y-2">
                        <label className="text-panel-sm font-semibold text-muted-foreground">Novo status</label>
                        <Select value={newStatus} onValueChange={setNewStatus} disabled={isPending}>
                            <SelectTrigger className="h-12 rounded-xl border-input bg-background font-medium">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-panel-sm font-semibold text-muted-foreground">Valor (R$)</label>
                        <Input
                            variant="lg"
                            type="number"
                            step="0.01"
                            min="0"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            className="bg-background"
                            disabled={isPending}
                        />
                        <p className="text-panel-sm text-muted-foreground">
                            Valor atual: R$ {Number(target.price || 0).toFixed(2)}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-panel-sm font-semibold text-muted-foreground">Motivo (opcional)</label>
                        <Textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Por que o status está sendo alterado?"
                            rows={3}
                            className="bg-background rounded-xl"
                            disabled={isPending}
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        pill
                        className="h-12 text-panel-sm font-semibold"
                        onClick={onClose}
                        disabled={isPending}
                    >
                        Cancelar
                    </Button>
                    <Button
                        pill
                        className="h-12 gap-2 text-panel-sm font-semibold shadow-sm"
                        onClick={handleSubmit}
                        disabled={isPending}
                    >
                        {isPending ? (
                            <>
                                <CircleNotchIcon size={16} weight="duotone" className="animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <ArrowsClockwiseIcon size={16} weight="duotone" />
                                Confirmar alteração
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
