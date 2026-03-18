'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CopyIcon, CheckIcon, ClockIcon, QrCodeIcon, CheckCircleIcon } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';

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
        const paymentId = pixData.payment_id;

        // --- Realtime WebSocket (primary) ---
        const channel = supabase
            .channel(`payment-${paymentId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'payments',
                    filter: `id=eq.${paymentId}`,
                },
                (payload) => {
                    if (payload.new.status === 'PAID' || payload.new.status === 'CONFIRMED') {
                        setPaymentStatus('PAID');
                    }
                }
            )
            .subscribe();

        // --- Polling fallback (every 5s) ---
        const poll = setInterval(async () => {
            const { data } = await supabase
                .from('payments')
                .select('status')
                .eq('id', paymentId)
                .single();

            if (data?.status === 'PAID' || data?.status === 'CONFIRMED') {
                setPaymentStatus('PAID');
                clearInterval(poll);
            }
        }, 5000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(poll);
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
                        <QrCodeIcon size={20} weight="duotone" />
                        Pagamento via Pix
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center gap-4 py-4">
                    {paymentStatus === 'PAID' ? (
                        <div className="flex flex-col items-center gap-6 py-8 w-full">
                            {/* Animated icon: pulsing halo + bounce + rotate */}
                            <div className="relative flex items-center justify-center">
                                {/* Pulsing outer halo */}
                                <motion.div
                                    className="absolute h-40 w-40 rounded-full bg-green-100"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                />
                                {/* Main circle */}
                                <motion.div
                                    className="relative h-32 w-32 rounded-full bg-green-100 flex items-center justify-center z-10"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
                                >
                                    {/* Rotating check icon */}
                                    <motion.div
                                        initial={{ rotate: -90, opacity: 0 }}
                                        animate={{ rotate: 0, opacity: 1 }}
                                        transition={{ duration: 0.45, delay: 0.3, ease: 'easeOut' }}
                                    >
                                        <CheckCircleIcon size={64} weight="duotone" className="text-green-600" />
                                    </motion.div>
                                </motion.div>
                            </div>

                            {/* Animated text */}
                            <motion.div
                                className="space-y-2 text-center"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.5 }}
                            >
                                <h3 className="text-2xl font-bold text-green-700">Pagamento Confirmado!</h3>
                                <p className="text-sm text-muted-foreground">Sua inscrição foi efetivada com sucesso.</p>
                            </motion.div>

                            {/* Pill button — project standard */}
                            <motion.div
                                className="w-full"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, delay: 0.7 }}
                            >
                                <Button
                                    pill
                                    size="lg"
                                    className="w-full h-12 font-bold bg-green-600 hover:bg-green-700 text-white"
                                    onClick={onClose}
                                >
                                    Concluir
                                </Button>
                            </motion.div>
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
                                    <ClockIcon size={16} weight="duotone" />
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
                                            <CheckIcon size={16} weight="duotone" className="text-green-500" />
                                            Copiado!
                                        </>
                                    ) : (
                                        <>
                                            <CopyIcon size={16} weight="duotone" />
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
