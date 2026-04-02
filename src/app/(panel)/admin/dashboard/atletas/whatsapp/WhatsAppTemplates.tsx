'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileTextIcon, PlusIcon, PencilSimpleIcon, TrashIcon, SpinnerGapIcon, FloppyDiskIcon } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getTemplates, saveTemplate, deleteTemplate } from './actions';

const CATEGORIES = [
    { value: 'inscricao', label: 'Inscrição' },
    { value: 'pagamento', label: 'Pagamento' },
    { value: 'evento',    label: 'Evento' },
    { value: 'suporte',   label: 'Suporte' },
    { value: 'outro',     label: 'Outro' },
];

const VARIABLES = ['{nome}', '{evento}', '{categoria}', '{valor}', '{link}'];

export function WhatsAppTemplates() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [editing, setEditing] = useState<any | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ name: '', category: 'outro', body: '' });

    useEffect(() => { load(); }, []);

    async function load() {
        const data = await getTemplates();
        setTemplates(data);
    }

    function startNew() {
        setEditing(null);
        setIsNew(true);
        setForm({ name: '', category: 'outro', body: '' });
    }

    function startEdit(t: any) {
        setEditing(t);
        setIsNew(true);
        setForm({ name: t.name, category: t.category, body: t.body });
    }

    function cancel() {
        setIsNew(false);
        setEditing(null);
    }

    async function handleSave() {
        if (!form.name.trim() || !form.body.trim()) {
            toast.error('Preencha o nome e o corpo do template.');
            return;
        }
        setLoading(true);
        try {
            await saveTemplate(editing?.id ?? null, form.name, form.category, form.body);
            toast.success(editing ? 'Template atualizado!' : 'Template criado!');
            await load();
            cancel();
        } catch {
            toast.error('Erro ao salvar template.');
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Remover este template?')) return;
        await deleteTemplate(id);
        toast.success('Template removido.');
        await load();
    }

    const byCategory = CATEGORIES.map(cat => ({
        ...cat,
        items: templates.filter(t => t.category === cat.value),
    })).filter(c => c.items.length > 0 || isNew);

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center justify-between">
                <p className="text-panel-sm text-muted-foreground">
                    Templates com variáveis dinâmicas: <span className="font-mono font-semibold text-foreground">{VARIABLES.join(' ')}</span>
                </p>
                {!isNew && (
                    <Button onClick={startNew} pill size="sm" className="gap-2">
                        <PlusIcon size={16} weight="bold" />
                        Novo template
                    </Button>
                )}
            </div>

            {/* Formulário */}
            {isNew && (
                <Card className="shadow-none border-primary/30 bg-primary/5">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-panel-md font-semibold">
                            {editing ? 'Editar Template' : 'Novo Template'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-panel-sm font-medium text-muted-foreground">Nome</Label>
                                <Input variant="lg" placeholder="Ex: Carrinho abandonado" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-panel-sm font-medium text-muted-foreground">Categoria</Label>
                                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                                    <SelectTrigger className="h-12 rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map(c => (
                                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-panel-sm font-medium text-muted-foreground">Mensagem</Label>
                            <textarea
                                rows={4}
                                className="w-full px-4 py-3 rounded-xl border bg-background text-panel-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Oi {nome}! Você tem uma inscrição pendente para {evento}..."
                                value={form.body}
                                onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                            />
                            <div className="flex flex-wrap gap-1.5">
                                {VARIABLES.map(v => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => setForm(p => ({ ...p, body: p.body + v }))}
                                        className="px-2 py-0.5 rounded-full bg-muted text-panel-sm font-mono font-semibold hover:bg-muted/80 transition-colors"
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" pill onClick={cancel} className="h-11">Cancelar</Button>
                            <Button pill onClick={handleSave} disabled={loading} className="h-11 flex-1 font-semibold">
                                {loading && <SpinnerGapIcon size={16} weight="bold" className="animate-spin mr-2" />}
                                <FloppyDiskIcon size={16} weight="duotone" className="mr-2" />
                                Salvar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Lista por categoria */}
            {CATEGORIES.map(cat => {
                const items = templates.filter(t => t.category === cat.value);
                if (items.length === 0) return null;
                return (
                    <div key={cat.value} className="space-y-3">
                        <h3 className="text-panel-sm font-semibold text-muted-foreground uppercase tracking-wider">{cat.label}</h3>
                        <div className="space-y-2">
                            {items.map(t => (
                                <Card key={t.id} className="shadow-none">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-panel-sm font-semibold">{t.name}</p>
                                                <p className="text-panel-sm text-muted-foreground mt-1 leading-relaxed">{t.body}</p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={() => startEdit(t)}>
                                                    <PencilSimpleIcon size={16} weight="duotone" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="size-8 rounded-lg text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)}>
                                                    <TrashIcon size={16} weight="duotone" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
