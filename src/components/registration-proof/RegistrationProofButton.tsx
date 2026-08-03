'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { FileTextIcon, CircleNotchIcon } from '@phosphor-icons/react';
import { pdf } from '@react-pdf/renderer';
import { showToast } from '@/lib/toast';
import { getRegistrationProofDataAction } from '@/app/(panel)/academia-equipe/dashboard/eventos/registration-proof-actions';
import { RegistrationProofPDF } from './RegistrationProofPDF';

interface Props {
    /** Inscrições de um mesmo atleta em um mesmo evento. */
    registrationIds: string[];
    label?: string;
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'default' | 'sm';
    className?: string;
}

function slugify(text: string) {
    return text
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function RegistrationProofButton({
    registrationIds,
    label = 'Comprovante',
    variant = 'outline',
    size = 'sm',
    className,
}: Props) {
    const [isPending, startTransition] = useTransition();

    const handleDownload = () => {
        startTransition(async () => {
            const res = await getRegistrationProofDataAction(registrationIds);
            if ('error' in res) {
                showToast.error('Não foi possível emitir o comprovante', res.error);
                return;
            }
            try {
                const blob = await pdf(<RegistrationProofPDF data={res.data} />).toBlob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `comprovante-inscricao-${slugify(res.data.athlete.name)}.pdf`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            } catch (err) {
                console.error(err);
                showToast.error('Falha ao gerar o PDF', 'Não foi possível montar o comprovante.');
            }
        });
    };

    return (
        <Button
            type="button"
            size={size}
            variant={variant}
            pill
            className={className ?? 'gap-1.5 font-semibold'}
            onClick={handleDownload}
            disabled={isPending || registrationIds.length === 0}
        >
            {isPending
                ? <CircleNotchIcon size={15} className="animate-spin" />
                : <FileTextIcon size={15} weight="duotone" />}
            {isPending ? 'Gerando...' : label}
        </Button>
    );
}
