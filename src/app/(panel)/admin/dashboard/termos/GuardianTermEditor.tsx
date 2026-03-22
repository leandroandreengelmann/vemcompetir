'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { saveGuardianTemplateAction, activateGuardianTemplateAction, type GuardianTemplate } from './actions';
import { PencilSimpleIcon, FloppyDiskIcon, XIcon, ClockCounterClockwiseIcon, CheckIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const GUARDIAN_PLACEHOLDERS = [
    '{{atleta_nome}}',
    '{{responsavel_nome}}',
    '{{responsavel_cpf}}',
    '{{responsavel_vinculo}}',
    '{{responsavel_telefone}}',
    '{{academia_nome}}',
    '{{data}}',
];

interface GuardianTermEditorProps {
    activeTemplate: GuardianTemplate | null;
    allTemplates: GuardianTemplate[];
}

export function GuardianTermEditor({ activeTemplate, allTemplates }: GuardianTermEditorProps) {
    const [editing, setEditing] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [content, setContent] = useState(activeTemplate?.content ?? '');
    const [isPending, startTransition] = useTransition();

    const handleSave = () => {
        startTransition(async () => {
            const result = await saveGuardianTemplateAction(content);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Nova versão do modelo salva e ativada!');
                setEditing(false);
            }
        });
    };

    const handleActivate = (templateId: string) => {
        startTransition(async () => {
            const result = await activateGuardianTemplateAction(templateId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Versão ativada com sucesso!');
                setShowHistory(false);
            }
        });
    };

    const handleEdit = () => {
        setContent(activeTemplate?.content ?? '');
        setEditing(true);
        setShowHistory(false);
    };

    const handleCancel = () => {
        setEditing(false);
        setContent(activeTemplate?.content ?? '');
    };

    const renderPreview = (text: string) => {
        return text.split('\n').map((line, i) => {
            const isTitle = /^\d+\.\s/.test(line) || line.startsWith('TERMO DE');
            const parts = line.split(/({{[a-z_]+}})/g);
            return (
                <p key={i} className={cn('leading-relaxed', isTitle && 'font-semibold mt-4 first:mt-0', !line && 'h-2')}>
                    {parts.map((part, j) =>
                        part.match(/^{{[a-z_]+}}$/) ? (
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
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    {activeTemplate ? (
                        <>
                            <Badge variant="outline" className="text-sm font-semibold px-3 py-1">
                                Versão {activeTemplate.version}
                            </Badge>
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 text-xs font-bold">
                                Ativa
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                                Criada em {new Date(activeTemplate.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </span>
                        </>
                    ) : (
                        <span className="text-sm text-muted-foreground">Nenhum modelo ativo</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {!editing && (
                        <>
                            {allTemplates.length > 1 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowHistory(!showHistory)}
                                    className="gap-2"
                                >
                                    <ClockCounterClockwiseIcon size={16} weight="duotone" />
                                    Histórico ({allTemplates.length})
                                </Button>
                            )}
                            <Button size="sm" onClick={handleEdit} className="gap-2">
                                <PencilSimpleIcon size={16} weight="duotone" />
                                Editar Modelo
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

            {editing && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">Placeholders dinâmicos disponíveis:</p>
                    <div className="flex flex-wrap gap-2">
                        {GUARDIAN_PLACEHOLDERS.map(ph => (
                            <code key={ph} className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded text-xs font-mono">
                                {ph}
                            </code>
                        ))}
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
                        Estes valores serão substituídos automaticamente pelos dados do atleta e do responsável no momento do cadastro.
                    </p>
                </div>
            )}

            {showHistory && !editing && (
                <div className="rounded-xl border bg-card p-4 space-y-3">
                    <p className="text-sm font-semibold">Histórico de versões</p>
                    {allTemplates.map((tpl) => (
                        <div key={tpl.id} className="flex items-center justify-between gap-4 py-2 border-b last:border-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Versão {tpl.version}</span>
                                {tpl.is_active && (
                                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 text-xs">
                                        Ativa
                                    </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                    {new Date(tpl.created_at).toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                            {!tpl.is_active && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleActivate(tpl.id)}
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

            {editing ? (
                <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[600px] font-mono text-sm resize-y"
                    placeholder="Cole ou edite o conteúdo do modelo de termo aqui..."
                />
            ) : (
                <ScrollArea className="h-[600px]">
                    <div className="rounded-xl border bg-muted/30 p-6 text-sm text-foreground space-y-1 pr-4">
                        {activeTemplate
                            ? renderPreview(activeTemplate.content)
                            : <p className="text-muted-foreground text-center py-8">Nenhum modelo cadastrado. Clique em "Editar Modelo" para adicionar.</p>
                        }
                    </div>
                </ScrollArea>
            )}
        </div>
    );
}
