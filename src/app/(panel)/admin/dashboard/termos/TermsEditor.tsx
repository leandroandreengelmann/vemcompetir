'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { saveNewTermVersionAction, activateTermVersionAction, type Term } from './actions';
import { PencilSimpleIcon, FloppyDiskIcon, XIcon, ClockCounterClockwiseIcon, CheckIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TermsEditorProps {
    activeTerm: Term | null;
    allTerms: Term[];
}

export function TermsEditor({ activeTerm, allTerms }: TermsEditorProps) {
    const [editing, setEditing] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [content, setContent] = useState(activeTerm?.content ?? '');
    const [isPending, startTransition] = useTransition();

    const handleSave = () => {
        startTransition(async () => {
            const result = await saveNewTermVersionAction(content);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Nova versão do termo salva e ativada!');
                setEditing(false);
            }
        });
    };

    const handleActivate = (termId: string) => {
        startTransition(async () => {
            const result = await activateTermVersionAction(termId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Versão ativada com sucesso!');
                setShowHistory(false);
            }
        });
    };

    const handleEdit = () => {
        setContent(activeTerm?.content ?? '');
        setEditing(true);
        setShowHistory(false);
    };

    const handleCancel = () => {
        setEditing(false);
        setContent(activeTerm?.content ?? '');
    };

    // Renderiza o termo com destaque nos placeholders
    const renderTermPreview = (text: string) => {
        return text.split('\n').map((line, i) => {
            const isTitle = /^\d+\.\s/.test(line) || line.startsWith('TERMO DE');
            const parts = line.split(/({{[A-Z_]+}})/g);
            return (
                <p key={i} className={cn('leading-relaxed', isTitle && 'font-semibold mt-4 first:mt-0', !line && 'h-2')}>
                    {parts.map((part, j) =>
                        part.match(/^{{[A-Z_]+}}$/) ? (
                            <span key={j} className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-1 rounded text-xs font-mono">
                                {part}
                            </span>
                        ) : part
                    )}
                </p>
            );
        });
    };

    return (
        <div className="space-y-6">
            {/* Cabeçalho com versão e ações */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    {activeTerm ? (
                        <>
                            <Badge variant="outline" className="text-sm font-semibold px-3 py-1">
                                Versão {activeTerm.version}
                            </Badge>
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 text-xs font-bold">
                                Ativa
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                                Criada em {new Date(activeTerm.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </span>
                        </>
                    ) : (
                        <span className="text-sm text-muted-foreground">Nenhum termo ativo</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {!editing && (
                        <>
                            {allTerms.length > 1 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowHistory(!showHistory)}
                                    className="gap-2"
                                >
                                    <ClockCounterClockwiseIcon size={16} weight="duotone" />
                                    Histórico ({allTerms.length})
                                </Button>
                            )}
                            <Button size="sm" onClick={handleEdit} className="gap-2">
                                <PencilSimpleIcon size={16} weight="duotone" />
                                Editar Termo
                            </Button>
                        </>
                    )}
                    {editing && (
                        <>
                            <Button variant="outline" size="sm" onClick={handleCancel} className="gap-2" disabled={isPending}>
                                <XIcon size={16} />
                                Cancelar
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={isPending} className="gap-2">
                                <FloppyDiskIcon size={16} weight="duotone" />
                                {isPending ? 'Salvando...' : 'Salvar Nova Versão'}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Legenda de placeholders */}
            {editing && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">Placeholders dinâmicos disponíveis:</p>
                    <div className="flex flex-wrap gap-2">
                        {['{{NOME_ATLETA}}', '{{NOME_EVENTO}}', '{{ENDERECO_EVENTO}}', '{{CIDADE_UF}}', '{{DATA_INICIAL}}', '{{DATA_FINAL}}'].map(ph => (
                            <code key={ph} className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded text-xs font-mono">
                                {ph}
                            </code>
                        ))}
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
                        Estes valores serão substituídos automaticamente pelos dados reais do atleta e do evento no momento da assinatura.
                    </p>
                </div>
            )}

            {/* Histórico de versões */}
            {showHistory && !editing && (
                <div className="rounded-xl border bg-card p-4 space-y-3">
                    <p className="text-sm font-semibold">Histórico de versões</p>
                    {allTerms.map((term) => (
                        <div key={term.id} className="flex items-center justify-between gap-4 py-2 border-b last:border-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Versão {term.version}</span>
                                {term.is_active && (
                                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 text-xs">
                                        Ativa
                                    </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                    {new Date(term.created_at).toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                            {!term.is_active && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleActivate(term.id)}
                                    disabled={isPending}
                                    className="gap-1.5 text-xs h-7"
                                >
                                    <CheckIcon size={12} />
                                    Ativar
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Editor ou visualização */}
            {editing ? (
                <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[600px] font-mono text-sm resize-y"
                    placeholder="Cole ou edite o conteúdo do termo aqui..."
                />
            ) : (
                <ScrollArea className="h-[600px]">
                    <div className="rounded-xl border bg-muted/30 p-6 text-sm text-foreground space-y-1 pr-4">
                        {activeTerm
                            ? renderTermPreview(activeTerm.content)
                            : <p className="text-muted-foreground text-center py-8">Nenhum termo cadastrado. Clique em "Editar Termo" para adicionar.</p>
                        }
                    </div>
                </ScrollArea>
            )}
        </div>
    );
}
