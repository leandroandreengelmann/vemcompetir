'use client';

import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RegistrationPassport } from './RegistrationPassport';
import { getPassportDataAction, type PassportData } from '@/app/atleta/dashboard/inscricoes/passport-actions';
import { CircleNotchIcon, DownloadSimpleIcon, ShareNetworkIcon, XIcon } from '@phosphor-icons/react';

interface PassportModalProps {
    registrationId: string;
    trigger: React.ReactNode;
}

export function PassportModal({ registrationId, trigger }: PassportModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [data, setData] = useState<PassportData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const passportRef = useRef<HTMLDivElement>(null);

    const handleOpen = useCallback(async () => {
        setOpen(true);
        if (data) return; // already loaded
        setLoading(true);
        setError(null);
        try {
            const result = await getPassportDataAction(registrationId);
            if ('error' in result) {
                setError(result.error);
            } else {
                setData(result.data);
            }
        } catch {
            setError('Erro ao carregar passaporte.');
        } finally {
            setLoading(false);
        }
    }, [registrationId, data]);

    const handleDownload = useCallback(async () => {
        if (!passportRef.current || !data) return;
        setExporting(true);
        try {
            const { toPng } = await import('html-to-image');
            const dataUrl = await toPng(passportRef.current, {
                cacheBust: true,
                pixelRatio: 2,
            });
            const link = document.createElement('a');
            link.download = `passaporte-${data.registration_code}.png`;
            link.href = dataUrl;
            link.click();
        } catch {
            // silent fail
        } finally {
            setExporting(false);
        }
    }, [data]);

    const handleShare = useCallback(async () => {
        if (!passportRef.current || !data) return;
        setExporting(true);
        try {
            const { toPng } = await import('html-to-image');
            const dataUrl = await toPng(passportRef.current, {
                cacheBust: true,
                pixelRatio: 2,
            });

            // Try Web Share API with file (mobile)
            if (navigator.canShare) {
                const res = await fetch(dataUrl);
                const blob = await res.blob();
                const file = new File([blob], `passaporte-${data.registration_code}.png`, { type: 'image/png' });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], title: 'Meu Passaporte COMPETIR' });
                    return;
                }
            }
        } catch {
            // fall through to WhatsApp link
        } finally {
            setExporting(false);
        }

        // Fallback: WhatsApp text link
        const text = encodeURIComponent(
            `Minha inscrição no ${data.event_title} está confirmada! 🥋\nCódigo: ${data.registration_code}\nwww.vemcompetir.com.br`
        );
        window.open(`https://wa.me/?text=${text}`, '_blank');
    }, [data]);

    return (
        <>
            <span onClick={handleOpen} style={{ cursor: 'pointer', display: 'inline-flex' }}>
                {trigger}
            </span>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="p-6 border-none outline-none ring-0 shadow-xl max-w-[440px] w-full bg-white rounded-2xl [&>button]:text-slate-500 [&>button]:hover:text-slate-800">
                    <DialogTitle className="sr-only">Passaporte de Inscrição</DialogTitle>

                    <div className="flex flex-col items-center gap-4">
                        {loading && (
                            <div className="flex items-center justify-center w-[390px] h-[200px]">
                                <CircleNotchIcon size={32} weight="bold" className="animate-spin text-slate-400" />
                            </div>
                        )}

                        {error && (
                            <div className="text-slate-500 text-panel-sm text-center px-6 py-8">
                                {error}
                            </div>
                        )}

                        {data && !loading && (
                            <RegistrationPassport data={data} passportRef={passportRef as React.RefObject<HTMLDivElement>} />
                        )}

                        {data && !loading && (
                            <div className="flex gap-2 w-[390px]">
                                <Button
                                    pill
                                    variant="outline"
                                    className="flex-1 h-11 font-bold text-panel-sm"
                                    onClick={handleDownload}
                                    disabled={exporting}
                                >
                                    {exporting ? (
                                        <CircleNotchIcon size={16} weight="bold" className="animate-spin mr-2" />
                                    ) : (
                                        <DownloadSimpleIcon size={16} weight="duotone" className="mr-2" />
                                    )}
                                    Baixar
                                </Button>
                                <Button
                                    pill
                                    className="flex-1 h-11 font-bold text-sm bg-[#25D366] hover:bg-[#1ebe5d] text-white"
                                    onClick={handleShare}
                                    disabled={exporting}
                                >
                                    {exporting ? (
                                        <CircleNotchIcon size={16} weight="bold" className="animate-spin mr-2" />
                                    ) : (
                                        <ShareNetworkIcon size={16} weight="duotone" className="mr-2" />
                                    )}
                                    WhatsApp
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
