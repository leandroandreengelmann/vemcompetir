'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check, Clock, QrCode } from 'lucide-react';

interface PixModalProps {
    open: boolean;
    onClose: () => void;
    pixData: {
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
                </div>
            </DialogContent>
        </Dialog>
    );
}
