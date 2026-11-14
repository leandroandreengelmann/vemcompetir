'use client';

import { pdf } from '@react-pdf/renderer';
import { showToast } from '@/lib/toast';
import { getCancellationProofDataAction } from '@/app/(panel)/academia-equipe/dashboard/eventos/cancel-registration-actions';
import { CancellationProofPDF } from './CancellationProofPDF';

function slugify(text: string) {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Gera e baixa o PDF do comprovante de cancelamento de uma inscrição. */
export async function downloadCancellationProof(registrationId: string): Promise<boolean> {
    const res = await getCancellationProofDataAction(registrationId);
    if ('error' in res) {
        showToast.error('Não foi possível emitir o comprovante', res.error);
        return false;
    }
    try {
        const blob = await pdf(<CancellationProofPDF data={res.data} />).toBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `comprovante-cancelamento-${slugify(res.data.athlete.name)}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return true;
    } catch (err) {
        console.error(err);
        showToast.error('Falha ao gerar o PDF', 'Não foi possível montar o comprovante.');
        return false;
    }
}
