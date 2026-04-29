'use client';

import { useState, useTransition, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CaretDownIcon, CaretRightIcon } from '@phosphor-icons/react';
import { updateTemplateAction, toggleTemplateAction } from '../actions';

type Template = {
    id: string;
    key: string;
    title: string;
    description: string | null;
    body: string;
    variables: string[];
    enabled: boolean;
};

const SAMPLE_VARS: Record<string, string> = {
    nome: 'João da Silva',
    valor: '120,00',
    evento: 'Copa Norte 2026',
    data_evento: '15/06/2026',
    atleta: 'João da Silva',
    organizador: 'Academia Tatame Forte',
    total_inscricoes: '47',
    local: 'Ginásio Municipal — Cuiabá/MT',
    link: 'https://vemcompetir.com.br/atleta/dashboard/inscricoes',
};

function renderPreview(body: string, vars: Record<string, string>): string {
    return body.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export function TemplatesClient({ templates }: { templates: Template[] }) {
    const [open, setOpen] = useState<string | null>(templates[0]?.id ?? null);

    return (
        <div className="space-y-3">
            {templates.map((t) => (
                <TemplateCard
                    key={t.id}
                    template={t}
                    expanded={open === t.id}
                    onToggleExpand={() => setOpen(open === t.id ? null : t.id)}
                />
            ))}
        </div>
    );
}

function TemplateCard({
    template,
    expanded,
    onToggleExpand,
}: {
    template: Template;
    expanded: boolean;
    onToggleExpand: () => void;
}) {
    const [pending, startTransition] = useTransition();
    const [body, setBody] = useState(template.body);

    const preview = useMemo(() => renderPreview(body, SAMPLE_VARS), [body]);

    function handleToggle(checked: boolean) {
        startTransition(async () => {
            const r = await toggleTemplateAction(template.id, checked);
            if ('error' in r && r.error) toast.error(r.error);
            else toast.success(checked ? 'Template ativado.' : 'Template desativado.');
        });
    }

    function handleSave(formData: FormData) {
        formData.set('id', template.id);
        formData.set('enabled', template.enabled ? 'on' : 'off');
        startTransition(async () => {
            const r = await updateTemplateAction(formData);
            if ('error' in r && r.error) toast.error(r.error);
            else toast.success('Template salvo.');
        });
    }

    return (
        <Card>
            <CardHeader className="cursor-pointer" onClick={onToggleExpand}>
                <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                        {expanded ? <CaretDownIcon size={16} /> : <CaretRightIcon size={16} />}
                        {template.title}
                        <Badge variant="secondary" className="text-xs font-mono">{template.key}</Badge>
                    </span>
                    <span onClick={(e) => e.stopPropagation()}>
                        <Switch checked={template.enabled} onCheckedChange={handleToggle} disabled={pending} />
                    </span>
                </CardTitle>
                {template.description && (
                    <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                )}
            </CardHeader>

            {expanded && (
                <CardContent>
                    <form action={handleSave} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor={`title-${template.id}`} className="text-panel-sm font-medium">Título interno</Label>
                            <Input variant="lg" id={`title-${template.id}`} name="title" defaultValue={template.title} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`description-${template.id}`} className="text-panel-sm font-medium">Descrição</Label>
                            <Input variant="lg" id={`description-${template.id}`} name="description" defaultValue={template.description ?? ''} />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor={`body-${template.id}`} className="text-panel-sm font-medium">Mensagem</Label>
                                <div className="flex flex-wrap gap-1">
                                    {template.variables.map((v) => (
                                        <code
                                            key={v}
                                            className="text-xs bg-muted px-1.5 py-0.5 rounded cursor-pointer hover:bg-muted-foreground/10"
                                            onClick={() => setBody((b) => b + `{${v}}`)}
                                            title={`Inserir {${v}}`}
                                        >
                                            {`{${v}}`}
                                        </code>
                                    ))}
                                </div>
                            </div>
                            <Textarea
                                id={`body-${template.id}`}
                                name="body"
                                rows={8}
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                required
                                className="font-mono text-sm rounded-xl"
                            />
                        </div>

                        <div className="rounded-xl border bg-muted/30 p-4">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Pré-visualização</p>
                            <pre className="whitespace-pre-wrap text-sm font-sans">{preview}</pre>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" variant="default" pill className="h-12 text-panel-sm font-bold text-primary-foreground" disabled={pending}>
                                {pending ? 'Salvando…' : 'Salvar template'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            )}
        </Card>
    );
}
