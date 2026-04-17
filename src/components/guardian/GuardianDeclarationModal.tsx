'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { GuardianDeclaration } from '@/types/guardian';
export type { GuardianDeclaration };

const RELATIONSHIP_LABELS: Record<string, string> = {
    pai: 'Pai',
    mae: 'Mãe',
    irmao: 'Irmão/Irmã',
    tio: 'Tio/Tia',
    padrinho: 'Padrinho/Madrinha',
    outro: 'Outro',
    academia: 'Academia/Equipe',
};

interface GuardianDeclarationModalProps {
    declaration: GuardianDeclaration;
    trigger: React.ReactNode;
}

export function GuardianDeclarationModal({ declaration, trigger }: GuardianDeclarationModalProps) {
    const [open, setOpen] = useState(false);

    const handlePrint = () => {
        const printContent = `
            <html>
            <head>
                <title>Declaração — ${declaration.athlete_name}</title>
                <style>
                    body { font-family: Arial, sans-serif; font-size: 13px; line-height: 1.7; margin: 40px; color: #111; }
                    pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; }
                </style>
            </head>
            <body>
                <pre>${declaration.content}</pre>
            </body>
            </html>
        `;
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(printContent);
        win.document.close();
        win.focus();
        win.print();
        win.close();
    };

    return (
        <>
            <span onClick={() => setOpen(true)} style={{ cursor: 'pointer', display: 'inline-flex' }}>
                {trigger}
            </span>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-panel-md font-bold">Declaração de Responsabilidade</DialogTitle>
                    </DialogHeader>

                    <div className="flex items-center justify-between gap-4 py-2 border-b">
                        <div className="text-panel-sm text-muted-foreground space-y-0.5">
                            <p><span className="font-semibold text-foreground">Atleta:</span> {declaration.athlete_name}</p>
                            <p>
                                <span className="font-semibold text-foreground">Responsável:</span>{' '}
                                {declaration.responsible_type === 'guardian'
                                    ? `${declaration.responsible_name ?? '—'} (${RELATIONSHIP_LABELS[declaration.responsible_relationship ?? ''] ?? declaration.responsible_relationship ?? 'Responsável'})`
                                    : 'Academia/Equipe'
                                }
                            </p>
                            <p>
                                <span className="font-semibold text-foreground">Gerado em:</span>{' '}
                                {format(new Date(declaration.generated_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handlePrint} className="h-9 px-4 rounded-full font-bold text-xs tracking-wide gap-1.5 shrink-0">
                            <Printer className="h-3.5 w-3.5" />
                            Imprimir
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <div className="rounded-xl bg-muted/30 border p-6 text-sm text-foreground leading-relaxed whitespace-pre-wrap font-mono">
                            {declaration.content}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
