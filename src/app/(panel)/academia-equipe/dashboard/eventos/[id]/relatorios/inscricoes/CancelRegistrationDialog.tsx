'use client';

import { useEffect, useState, useTransition } from 'react';
import { UserMinusIcon, WarningIcon, CircleNotchIcon } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { showToast } from '@/lib/toast';
import { cancelRegistrationByOrganizerAction } from '../../../cancel-registration-actions';
import { downloadCancellationProof } from '@/components/registration-proof/download-cancellation-proof';

const MIN_REASON = 5;

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function CancelRegistrationDialog({
    registration,
    open,
    onOpenChange,
    onCancelled,
}: {
    registration: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCancelled: () => void;
}) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    useEffect(() => {
        if (open) { setReason(''); setError(null); }
    }, [open]);

    if (!registration) return null;

    const amount = Number(registration.manual_amount ?? registration.price ?? 0);

    const handleConfirm = () => {
        if (reason.trim().length < MIN_REASON) {
            setError('Informe o motivo do cancelamento (obrigatório).');
            return;
        }
        startTransition(async () => {
            const res = await cancelRegistrationByOrganizerAction({ registrationId: registration.id, reason });
            if ('error' in res && res.error) {
                setError(res.error);
                return;
            }
            const extra = (res as any).cancelledCount > 1 ? ' A 2ª categoria grátis vinculada também foi cancelada.' : '';
            showToast.success('Inscrição cancelada', `Baixando o comprovante de cancelamento.${extra}`);
            onOpenChange(false);
            onCancelled();
            await downloadCancellationProof(registration.id);
        });
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
            <DialogContent className="sm:max-w-[480px]" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-destructive/10 text-destructive shrink-0">
                            <UserMinusIcon size={24} weight="duotone" />
                        </div>
                        <div>
                            <DialogTitle>Cancelar inscrição?</DialogTitle>
                            <DialogDescription>O atleta sai da categoria, da chave e dos totais do evento.</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="rounded-xl bg-muted/40 p-3 grid grid-cols-[96px_1fr] gap-y-1.5 text-panel-sm">
                        <span className="text-muted-foreground">Atleta</span>
                        <span className="font-semibold">{registration.athlete?.full_name ?? '—'}</span>
                        <span className="text-muted-foreground">Equipe</span>
                        <span>{registration.athlete?.gym_name ?? '—'}</span>
                        <span className="text-muted-foreground">Categoria</span>
                        <span>{registration.category?.categoria_completa ?? '—'}</span>
                        <span className="text-muted-foreground">Valor</span>
                        <span>{formatCurrency(amount)}</span>
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="cancel-reason" className="text-panel-sm font-semibold">
                            Motivo do cancelamento <span className="text-destructive">*</span>
                        </label>
                        <Textarea
                            id="cancel-reason"
                            value={reason}
                            onChange={(e) => { setReason(e.target.value); if (error) setError(null); }}
                            placeholder="Ex.: Atleta avisou que não vai participar"
                            rows={3}
                            disabled={pending}
                            aria-invalid={!!error}
                        />
                        {error && <p className="text-panel-sm text-destructive font-medium">{error}</p>}
                    </div>

                    <div className="flex gap-2.5 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 p-3 text-panel-sm">
                        <WarningIcon size={20} weight="duotone" className="shrink-0" />
                        <div className="space-y-1">
                            <p>Nenhum valor é devolvido automaticamente. Se o atleta pagou, faça o estorno por fora.</p>
                            <p>Se for um combo, a 2ª categoria grátis vinculada também é cancelada. Se a chave já foi gerada, gere-a de novo.</p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" pill onClick={() => onOpenChange(false)} disabled={pending}>
                        Voltar
                    </Button>
                    <Button variant="destructive" pill onClick={handleConfirm} disabled={pending} className="text-white">
                        {pending && <CircleNotchIcon size={16} weight="bold" className="animate-spin mr-1" />}
                        Cancelar inscrição
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
