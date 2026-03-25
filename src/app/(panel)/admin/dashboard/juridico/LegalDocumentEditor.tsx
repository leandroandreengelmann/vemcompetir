'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { PencilSimpleIcon, FloppyDiskIcon, XIcon, ClockCounterClockwiseIcon, CheckIcon } from '@phosphor-icons/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { LegalDocument } from './actions';

interface LegalDocumentEditorProps {
    activeDoc: LegalDocument | null;
    allDocs: LegalDocument[];
    onSave: (content: string) => Promise<{ error?: string }>;
    onActivate: (id: string) => Promise<{ error?: string }>;
    emptyLabel: string;
}

export function LegalDocumentEditor({ activeDoc, allDocs, onSave, onActivate, emptyLabel }: LegalDocumentEditorProps) {
    const [editing, setEditing] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [content, setContent] = useState(activeDoc?.content ?? '');
    const [isPending, startTransition] = useTransition();

    const handleSave = () => {
        startTransition(async () => {
            const result = await onSave(content);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Nova versão salva e ativada!');
                setEditing(false);
            }
        });
    };

    const handleActivate = (id: string) => {
        startTransition(async () => {
            const result = await onActivate(id);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Versão ativada com sucesso!');
                setShowHistory(false);
            }
        });
    };

    const handleEdit = () => {
        setContent(activeDoc?.content ?? '');
        setEditing(true);
        setShowHistory(false);
    };

    const handleCancel = () => {
        setEditing(false);
        setContent(activeDoc?.content ?? '');
    };

    const renderPreview = (text: string) =>
        text.split('\n').map((line, i) => {
            const isTitle = /^\d+\./.test(line) || /^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s—]{5,}$/.test(line.trim());
            return (
                <p key={i} className={cn('leading-relaxed', isTitle && 'font-semibold mt-4 first:mt-0', !line && 'h-2')}>
                    {line}
                </p>
            );
        });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    {activeDoc ? (
                        <>
                            <Badge variant="outline" className="text-sm font-semibold px-3 py-1">
                                Versão {activeDoc.version}
                            </Badge>
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 text-xs font-bold">
                                Ativa
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                                Criada em {new Date(activeDoc.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </span>
                        </>
                    ) : (
                        <span className="text-sm text-muted-foreground">Nenhuma versão ativa</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {!editing && (
                        <>
                            {allDocs.length > 1 && (
                                <Button variant="outline" pill onClick={() => setShowHistory(!showHistory)}>
                                    <ClockCounterClockwiseIcon size={20} weight="duotone" className="mr-2" />
                                    Histórico ({allDocs.length})
                                </Button>
                            )}
                            <Button pill onClick={handleEdit}>
                                <PencilSimpleIcon size={20} weight="duotone" className="mr-2" />
                                Editar
                            </Button>
                        </>
                    )}
                    {editing && (
                        <>
                            <Button variant="outline" pill onClick={handleCancel} disabled={isPending}>
                                <XIcon size={20} weight="duotone" className="mr-2" />
                                Cancelar
                            </Button>
                            <Button pill onClick={handleSave} disabled={isPending}>
                                <FloppyDiskIcon size={20} weight="duotone" className="mr-2" />
                                {isPending ? 'Salvando...' : 'Salvar Nova Versão'}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {showHistory && !editing && (
                <div className="rounded-xl border bg-card p-4 space-y-3">
                    <p className="text-sm font-semibold">Histórico de versões</p>
                    {allDocs.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between gap-4 py-2 border-b last:border-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Versão {doc.version}</span>
                                {doc.is_active && (
                                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 text-xs">
                                        Ativa
                                    </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                    {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                            {!doc.is_active && (
                                <Button variant="outline" pill size="sm" onClick={() => handleActivate(doc.id)} disabled={isPending}>
                                    <CheckIcon size={20} weight="duotone" className="mr-1.5" />
                                    Ativar
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {editing ? (
                <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[600px] font-mono text-sm resize-y"
                    placeholder={`Cole ou edite o conteúdo aqui...`}
                />
            ) : (
                <ScrollArea className="h-[600px]">
                    <div className="rounded-xl border bg-muted/30 p-6 text-sm text-foreground space-y-1 pr-4">
                        {activeDoc
                            ? renderPreview(activeDoc.content)
                            : <p className="text-muted-foreground text-center py-8">{emptyLabel}</p>
                        }
                    </div>
                </ScrollArea>
            )}
        </div>
    );
}
