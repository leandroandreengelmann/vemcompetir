'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ReceiptIcon } from '@phosphor-icons/react';
import { gerarRecibosEventoProprioPendentesAction } from '../actions';
import { toast } from 'sonner';

export function GenerateOwnEventReceiptsButton() {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleClick = () => {
        startTransition(async () => {
            const res = await gerarRecibosEventoProprioPendentesAction();
            if (res.error) {
                toast.error(res.error);
                return;
            }
            if (res.created > 0) {
                toast.success(
                    res.created === 1
                        ? '1 recibo gerado.'
                        : `${res.created} recibos gerados.`,
                );
                router.refresh();
            } else {
                toast.info('Nenhum recibo pendente para gerar.');
            }
        });
    };

    return (
        <Button
            variant="outline"
            pill
            onClick={handleClick}
            disabled={isPending}
            className="h-12 gap-2 text-panel-sm font-semibold shadow-sm"
        >
            <ReceiptIcon size={16} weight="duotone" />
            {isPending ? 'Gerando...' : 'Gerar recibos pendentes'}
        </Button>
    );
}
