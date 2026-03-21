'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getTermsModalDataAction, acceptTermAction, type TermsModalData } from '@/app/atleta/components/terms-actions';
import { cn } from '@/lib/utils';

interface TermsAcceptanceModalProps {
    open: boolean;
    eventId: string;
    onAccepted: () => void;
    onCancel: () => void;
}

function replacePlaceholders(content: string, data: TermsModalData): string {
    return content
        .replace(/{{NOME_ATLETA}}/g, data.athleteName)
        .replace(/{{NOME_EVENTO}}/g, data.event.title)
        .replace(/{{ENDERECO_EVENTO}}/g, data.event.address)
        .replace(/{{CIDADE_UF}}/g, data.event.cityState)
        .replace(/{{DATA_INICIAL}}/g, data.event.startDate)
        .replace(/{{DATA_FINAL}}/g, data.event.endDate);
}

function TermContent({ text }: { text: string }) {
    return (
        <div className="text-sm text-foreground space-y-1">
            {text.split('\n').map((line, i) => {
                const isSectionTitle = /^\d+\.\s/.test(line) || line.startsWith('TERMO DE');
                return (
                    <p
                        key={i}
                        className={cn(
                            'leading-relaxed',
                            isSectionTitle && 'font-bold mt-5 first:mt-0 text-base',
                            !line && 'h-2'
                        )}
                    >
                        {line}
                    </p>
                );
            })}
        </div>
    );
}

export function TermsAcceptanceModal({ open, eventId, onAccepted, onCancel }: TermsAcceptanceModalProps) {
    const [data, setData] = useState<TermsModalData | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [scrolledToBottom, setScrolledToBottom] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [isPending, startTransition] = useTransition();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            setData(null);
            setLoadError(null);
            setScrolledToBottom(false);
            setAccepted(false);
            return;
        }
        setLoading(true);
        getTermsModalDataAction(eventId).then((result) => {
            if ('error' in result) {
                setLoadError(result.error);
            } else {
                setData(result);
            }
            setLoading(false);
        });
    }, [open, eventId]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (scrolledToBottom) return;
        const el = e.currentTarget;
        const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
        if (nearBottom) setScrolledToBottom(true);
    };

    const handleConfirm = () => {
        if (!data || !accepted) return;

        startTransition(async () => {
            const result = await acceptTermAction(data.term.id, eventId, {
                athleteName: data.athleteName,
                eventTitle: data.event.title,
                eventAddress: data.event.address,
                eventCity: data.event.cityState,
                startDate: data.event.startDate,
                endDate: data.event.endDate,
            });

            if (result.error) {
                toast.error(result.error);
                return;
            }

            onAccepted();
        });
    };

    const renderedContent = data ? replacePlaceholders(data.term.content, data) : '';

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
            <DialogContent className="max-w-2xl w-full gap-0 p-0 overflow-hidden">
                {/* Wrapper interno resolve o conflito com o "grid" padrão do DialogContent */}
                <div className="flex flex-col max-h-[90vh]">
                    <DialogHeader className="px-6 py-4 border-b flex-none">
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <FileText className="h-5 w-5 text-primary shrink-0" />
                            Termo de Responsabilidade e Ciência
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground pt-1">
                            Leia o termo completo até o final para habilitar o aceite.
                        </p>
                    </DialogHeader>

                    {/* Corpo do modal — rola diretamente aqui, sem h-full aninhado */}
                    <div
                        ref={scrollRef}
                        className="flex-1 min-h-0 overflow-y-auto relative px-6 py-4"
                        onScroll={handleScroll}
                    >
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        )}

                        {loadError && (
                            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                                <AlertTriangle className="h-8 w-8 text-destructive" />
                                <p className="text-sm font-medium text-destructive">{loadError}</p>
                                <Button variant="outline" size="sm" onClick={onCancel}>Fechar</Button>
                            </div>
                        )}

                        {data && !loading && (
                            <>
                                <TermContent text={renderedContent} />
                                <div className="h-8" />
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    {data && !loading && (
                        <div className="flex-none border-t px-6 py-4 space-y-4 bg-background">
                            {!scrolledToBottom && (
                                <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-center font-medium">
                                    Role até o final do documento para habilitar o aceite.
                                </p>
                            )}

                            <div className={cn(
                                'flex items-start gap-3 transition-opacity duration-300',
                                !scrolledToBottom && 'opacity-40 pointer-events-none'
                            )}>
                                <Checkbox
                                    id="accept-terms"
                                    checked={accepted}
                                    onCheckedChange={(v) => setAccepted(!!v)}
                                    className="mt-0.5"
                                />
                                <label htmlFor="accept-terms" className="text-sm leading-snug cursor-pointer select-none">
                                    Li e compreendi todos os {data.term.version > 1 ? `(v${data.term.version})` : ''} termos acima e aceito integralmente as condições estabelecidas.
                                </label>
                            </div>

                            <DialogFooter className="gap-2">
                                <Button
                                    pill
                                    variant="outline"
                                    className="h-12 font-semibold"
                                    onClick={onCancel}
                                    disabled={isPending}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    pill
                                    onClick={handleConfirm}
                                    disabled={!accepted || !scrolledToBottom || isPending}
                                    className="h-12 font-bold gap-2"
                                >
                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    {isPending ? 'Registrando...' : 'Aceitar e Continuar'}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
