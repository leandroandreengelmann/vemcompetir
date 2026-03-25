'use client';

import { useState, useRef, useTransition } from 'react';
import { DownloadSimpleIcon, UploadSimpleIcon, ClockIcon, CheckCircleIcon, WarningIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { submitSignedTermAction } from '@/app/register/actions';

interface GuardianTermBannerProps {
    athleteId: string;
    termContent: string;
    signedTermStatus: 'pending' | 'under_review' | 'approved';
}

export function GuardianTermBanner({ athleteId, termContent, signedTermStatus }: GuardianTermBannerProps) {
    const [status, setStatus] = useState(signedTermStatus);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [, startTransition] = useTransition();

    const handleDownload = () => {
        const printContent = `
            <html>
            <head>
                <title>Declaração de Responsabilidade</title>
                <style>
                    body { font-family: Arial, sans-serif; font-size: 13px; line-height: 1.7; margin: 40px; color: #111; }
                    pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; }
                </style>
            </head>
            <body>
                <pre>${termContent}</pre>
            </body>
            </html>
        `;
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(printContent);
        win.document.close();
        win.focus();
        win.print();
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        try {
            const supabase = createClient();
            const ext = file.name.split('.').pop() ?? 'jpg';
            const path = `${athleteId}/signed-term-${Date.now()}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('signed-terms')
                .upload(path, file, { upsert: true });

            if (uploadError) {
                setError('Erro ao enviar o arquivo. Tente novamente.');
                setUploading(false);
                return;
            }

            const formData = new FormData();
            formData.set('file_path', path);

            startTransition(async () => {
                const result = await submitSignedTermAction(formData);
                if (result.error) {
                    setError(result.error);
                } else {
                    setStatus('under_review');
                }
                setUploading(false);
            });
        } catch {
            setError('Erro inesperado. Tente novamente.');
            setUploading(false);
        }
    };

    if (status === 'approved') return null;

    if (status === 'under_review') {
        return (
            <div className="mx-4 mt-4 md:mx-6 md:mt-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <ClockIcon size={20} weight="duotone" className="text-amber-600 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-800">Termo enviado — em análise</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                        Seu termo assinado foi recebido e está sendo analisado. Você será notificado quando for aprovado.
                    </p>
                </div>
                <CheckCircleIcon size={20} className="text-amber-500 shrink-0" />
            </div>
        );
    }

    // pending
    return (
        <div className="mx-4 mt-4 md:mx-6 md:mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3">
            <div className="flex items-start gap-3">
                <WarningIcon size={20} weight="duotone" className="text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-rose-800">Termo de responsabilidade pendente</p>
                    <p className="text-xs text-rose-700 mt-0.5">
                        Como atleta menor de idade, é necessário assinar o termo de responsabilidade e enviar uma foto do documento assinado para validação.
                    </p>
                </div>
            </div>
            <div className="flex flex-wrap gap-2 pl-7">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="gap-1.5 text-xs border-rose-300 text-rose-700 hover:bg-rose-100"
                >
                    <DownloadSimpleIcon size={14} weight="duotone" />
                    Baixar / Imprimir Termo
                </Button>
                <Button
                    variant="default"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                >
                    <UploadSimpleIcon size={14} weight="duotone" />
                    {uploading ? 'Enviando...' : 'Enviar Foto do Termo Assinado'}
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={handleUpload}
                />
            </div>
            {error && (
                <p className="text-xs text-rose-600 pl-7">{error}</p>
            )}
        </div>
    );
}
