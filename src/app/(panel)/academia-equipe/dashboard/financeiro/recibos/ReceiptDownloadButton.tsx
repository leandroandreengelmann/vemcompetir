'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { DownloadSimpleIcon } from '@phosphor-icons/react';
import { pdf } from '@react-pdf/renderer';
import { getReceiptForDownload } from '../actions';
import { ReceiptPDF } from './ReceiptPDF';
import { toast } from 'sonner';

export function ReceiptDownloadButton({ receiptId }: { receiptId: string }) {
    const [isPending, startTransition] = useTransition();

    const handleDownload = () => {
        startTransition(async () => {
            const res = await getReceiptForDownload(receiptId);
            if (res.error || !res.receipt) {
                toast.error(res.error ?? 'Falha ao carregar recibo.');
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
                toast.error('Falha ao gerar PDF.');
            }
        });
    };

    return (
        <Button
            size="sm"
            variant="outline"
            pill
            className="h-9 gap-1 text-panel-sm font-semibold"
            onClick={handleDownload}
            disabled={isPending}
        >
            <DownloadSimpleIcon size={14} weight="duotone" />
            {isPending ? 'Gerando...' : 'PDF'}
        </Button>
    );
}
