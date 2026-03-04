'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check, Clock, QrCode, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PixModalProps {
    open: boolean;
    onClose: () => void;
    pixData: {
        payment_id?: string;
        pix_qr_code: string | null;
        pix_payload: string | null;
        pix_expiration: string | null;
        total_inscricoes: number;
        fee_saas_bruta: number;
    } | null;
}

export function PixModal({ open, onClose, pixData }: PixModalProps) {
    const [copied, setCopied] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'PAID' | 'CONFIRMED'>('PENDING');

    useEffect(() => {
        if (open) {
            setPaymentStatus('PENDING');
        }
    }, [open]);

    useEffect(() => {
        if (!pixData?.payment_id || !open) return;

        const supabase = createClient();

        const channel = supabase
            .channel(`payment-${pixData.payment_id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'payments',
                    filter: `id=eq.${pixData.payment_id}`,
                },
                (payload) => {
                    if (payload.new.status === 'PAID' || payload.new.status === 'CONFIRMED') {
                        setPaymentStatus('PAID');
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [pixData?.payment_id, open]);

    useEffect(() => {
        if (!pixData?.pix_expiration) return;

        const target = new Date(pixData.pix_expiration).getTime();

        const interval = setInterval(() => {
            const now = Date.now();
            const diff = target - now;

            if (diff <= 0) {
                setTimeLeft('Expirado');
                clearInterval(interval);
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            if (hours > 0) {
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
            } else {
                setTimeLeft(`${minutes}m ${seconds}s`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [pixData?.pix_expiration]);

    const handleCopy = async () => {
        if (!pixData?.pix_payload) return;
        await navigator.clipboard.writeText(pixData.pix_payload);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    if (!pixData) return null;

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <QrCode className="h-5 w-5" />
                        Pagamento via Pix
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center gap-4 py-4">
                    {paymentStatus === 'PAID' ? (
                        <div className="flex flex-col items-center gap-6 py-6 animate-in fade-in zoom-in-95 duration-500">
                            <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle2 className="h-12 w-12 text-green-600" />
                            </div>
                            <div className="space-y-2 text-center">
                                <h3 className="text-xl font-bold text-green-700">Pagamento Confirmado!</h3>
                                <p className="text-sm text-muted-foreground">Sua inscrição foi efetivada com sucesso.</p>
                            </div>
                            <Button
                                className="w-full h-12 font-bold bg-green-600 hover:bg-green-700 text-white mt-4"
                                onClick={onClose}
                            >
                                Concluir
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* QR Code */}
                            {pixData.pix_qr_code && (
                                <div className="p-3 bg-white rounded-xl border">
                                    <img
                                        src={`data:image/png;base64,${pixData.pix_qr_code}`}
                                        alt="QR Code Pix"
                                        className="w-56 h-56"
                                    />
                                </div>
                            )}

                            {/* Value */}
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">Valor total</p>
                                <p className="text-2xl font-bold tabular-nums">
                                    R$ {pixData.total_inscricoes.toFixed(2)}
                                </p>
                            </div>

                            {/* Timer */}
                            {pixData.pix_expiration && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    <span>Expira em: <strong className="text-foreground">{timeLeft}</strong></span>
                                </div>
                            )}

                            {/* Copy payload */}
                            {pixData.pix_payload && (
                                <Button
                                    variant="outline"
                                    className="w-full gap-2"
                                    onClick={handleCopy}
                                >
                                    {copied ? (
                                        <>
                                            <Check className="h-4 w-4 text-green-500" />
                                            Copiado!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4" />
                                            Copiar código Pix
                                        </>
                                    )}
                                </Button>
                            )}

                            {/* Status */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
                                </span>
                                Aguardando pagamento...
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
