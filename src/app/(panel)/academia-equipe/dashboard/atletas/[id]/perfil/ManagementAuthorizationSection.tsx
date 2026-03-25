'use client';

import { useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowSquareOutIcon, UploadSimpleIcon, CheckCircleIcon, FileIcon } from '@phosphor-icons/react';
import { getAcademyManagementTemplateAction, uploadManagementAuthorizationAction, type ManagementAuthorizationStatus } from './management-authorization-actions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ManagementAuthorizationSectionProps {
    athleteId: string;
    athleteName: string;
    academyName: string;
    initialStatus: ManagementAuthorizationStatus;
}

export function ManagementAuthorizationSection({
    athleteId,
    athleteName,
    academyName,
    initialStatus,
}: ManagementAuthorizationSectionProps) {
    const [status, setStatus] = useState(initialStatus);
    const [isPending, startTransition] = useTransition();
    const fileRef = useRef<HTMLInputElement>(null);

    const handleDownloadTemplate = () => {
        startTransition(async () => {
            const result = await getAcademyManagementTemplateAction();
            if ('error' in result) {
                toast.error(result.error);
                return;
            }

            const today = new Date().toLocaleDateString('pt-BR');
            const content = result.content
                .replace(/{{atleta_nome}}/g, athleteName)
                .replace(/{{academia_nome}}/g, academyName)
                .replace(/{{data}}/g, today);

            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `termo-gerenciamento-${athleteName.replace(/\s+/g, '-').toLowerCase()}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        startTransition(async () => {
            const formData = new FormData();
            formData.append('file', file);
            const result = await uploadManagementAuthorizationAction(athleteId, formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Documento enviado com sucesso!');
                // Refresh status by re-fetching would require server, so optimistically update
                setStatus({
                    id: 'new',
                    document_url: '',
                    uploaded_at: new Date().toISOString(),
                });
            }
            if (fileRef.current) fileRef.current.value = '';
        });
    };

    return (
        <div className="px-8 sm:px-10 pb-8 border-t border-border/40 pt-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <p className="text-panel-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">
                        Autorização de Gerenciamento de Conta
                    </p>
                    <p className="text-xs text-muted-foreground max-w-md">
                        Documento opcional assinado pelo atleta ou responsável autorizando a academia a gerenciar a conta e aceitar termos em seu nome.
                    </p>
                </div>

                {status ? (
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                            <CheckCircleIcon size={14} weight="fill" />
                            Enviado em {format(new Date(status.uploaded_at), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                        {status.document_url && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-3 rounded-full text-xs font-semibold gap-1.5"
                                asChild
                            >
                                <a href={status.document_url} target="_blank" rel="noopener noreferrer">
                                    <ArrowSquareOutIcon size={20} weight="duotone" />
                                    Ver doc.
                                </a>
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 rounded-full text-xs font-semibold gap-1.5"
                            onClick={() => fileRef.current?.click()}
                            disabled={isPending}
                        >
                            <UploadSimpleIcon size={20} weight="duotone" />
                            Substituir
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 rounded-full text-xs font-semibold gap-1.5"
                            onClick={handleDownloadTemplate}
                            disabled={isPending}
                        >
                            <FileIcon size={20} weight="duotone" />
                            Baixar Modelo
                        </Button>
                        <Button
                            size="sm"
                            className="h-8 px-3 rounded-full text-xs font-semibold gap-1.5"
                            onClick={() => fileRef.current?.click()}
                            disabled={isPending}
                        >
                            <UploadSimpleIcon size={20} weight="duotone" />
                            {isPending ? 'Enviando...' : 'Enviar Assinado'}
                        </Button>
                    </div>
                )}
            </div>

            <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleFileChange}
            />
        </div>
    );
}
