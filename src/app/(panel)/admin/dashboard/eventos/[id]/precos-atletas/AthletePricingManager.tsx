'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, Loader2, Pencil, Check, X } from 'lucide-react';
import {
    upsertAthletePricing,
    updateAthletePricing,
    toggleAthletePricing,
    deleteAthletePricing,
    type AthletePricing,
} from './actions';

export function AthletePricingManager({
    eventId,
    initialPricings,
}: {
    eventId: string;
    initialPricings: AthletePricing[];
}) {
    const [pricings, setPricings] = useState<AthletePricing[]>(initialPricings);
    const [isPending, startTransition] = useTransition();

    // Form state
    const [gymName, setGymName] = useState('');
    const [masterName, setMasterName] = useState('');
    const [fee, setFee] = useState('');
    const [notes, setNotes] = useState('');

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editFee, setEditFee] = useState('');
    const [editNotes, setEditNotes] = useState('');

    function handleSave() {
        if (!fee || (!gymName.trim() && !masterName.trim())) return;

        startTransition(async () => {
            const result = await upsertAthletePricing(
                eventId,
                gymName.trim() || null,
                masterName.trim() || null,
                parseFloat(fee),
                notes.trim() || null,
            );

            if (result.success) {
                setPricings(prev => [
                    {
                        id: crypto.randomUUID(),
                        event_id: eventId,
                        gym_name: gymName.trim() || null,
                        master_name: masterName.trim() || null,
                        registration_fee: parseFloat(fee),
                        active: true,
                        notes: notes.trim() || null,
                        created_at: new Date().toISOString(),
                    },
                    ...prev,
                ]);
                setGymName('');
                setMasterName('');
                setFee('');
                setNotes('');
            }
        });
    }

    function startEdit(pricing: AthletePricing) {
        setEditingId(pricing.id);
        setEditFee(String(pricing.registration_fee));
        setEditNotes(pricing.notes || '');
    }

    function cancelEdit() {
        setEditingId(null);
        setEditFee('');
        setEditNotes('');
    }

    function handleUpdate(pricing: AthletePricing) {
        if (!editFee) return;

        startTransition(async () => {
            const result = await updateAthletePricing(
                pricing.id,
                eventId,
                parseFloat(editFee),
                editNotes.trim() || null,
            );

            if (result.success) {
                setPricings(prev =>
                    prev.map(p => p.id === pricing.id
                        ? { ...p, registration_fee: parseFloat(editFee), notes: editNotes.trim() || null }
                        : p
                    )
                );
                cancelEdit();
            }
        });
    }

    function handleToggle(pricing: AthletePricing) {
        startTransition(async () => {
            const result = await toggleAthletePricing(pricing.id, !pricing.active, eventId);
            if (result.success) {
                setPricings(prev =>
                    prev.map(p => p.id === pricing.id ? { ...p, active: !p.active } : p)
                );
            }
        });
    }

    function handleDelete(pricing: AthletePricing) {
        const label = [pricing.gym_name, pricing.master_name].filter(Boolean).join(' / ');
        if (!confirm(`Remover preço diferenciado de "${label}"?`)) return;

        startTransition(async () => {
            const result = await deleteAthletePricing(pricing.id, eventId);
            if (result.success) {
                setPricings(prev => prev.filter(p => p.id !== pricing.id));
            }
        });
    }

    return (
        <div className="space-y-8">
            {/* Add new pricing */}
            <div className="rounded-xl border bg-card p-6 space-y-5">
                <h3 className="text-panel-base font-semibold">Adicionar Regra de Preço</h3>
                <p className="text-panel-sm text-muted-foreground -mt-3">
                    Atletas cujo perfil contenha a academia e/ou mestre informados receberao o preco diferenciado.
                    Categorias absolutas nao sao afetadas.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-panel-sm font-medium text-muted-foreground">
                            Nome da Academia
                        </label>
                        <Input
                            placeholder="Ex: PROJETO SOCIAL SDC"
                            value={gymName}
                            onChange={(e) => setGymName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-panel-sm font-medium text-muted-foreground">
                            Nome do Mestre
                        </label>
                        <Input
                            placeholder="Ex: NEI ARMONDES DE JESUS"
                            value={masterName}
                            onChange={(e) => setMasterName(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-panel-sm font-medium text-muted-foreground">
                            Preco por Categoria (R$)
                        </label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Ex: 50.00"
                            value={fee}
                            onChange={(e) => setFee(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-panel-sm font-medium text-muted-foreground">
                            Observacao (opcional)
                        </label>
                        <Input
                            placeholder="Ex: Projeto social - desconto especial"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <Button
                    onClick={handleSave}
                    disabled={!fee || (!gymName.trim() && !masterName.trim()) || isPending}
                    className="w-full sm:w-auto"
                >
                    {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                        <Plus className="h-4 w-4 mr-2" />
                    )}
                    Adicionar
                </Button>
            </div>

            {/* Existing pricings list */}
            {pricings.length > 0 ? (
                <div className="space-y-3">
                    <h3 className="text-panel-base font-semibold">
                        Regras Ativas ({pricings.length})
                    </h3>

                    <div className="space-y-2">
                        {pricings.map(pricing => (
                            <div
                                key={pricing.id}
                                className={`rounded-xl border p-5 transition-colors ${
                                    pricing.active
                                        ? 'bg-card border-border'
                                        : 'bg-muted/30 border-border/50 opacity-70'
                                }`}
                            >
                                {editingId === pricing.id ? (
                                    /* Edit mode */
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap gap-2 text-panel-sm">
                                            {pricing.gym_name && (
                                                <span className="bg-muted px-2 py-1 rounded-lg font-medium">
                                                    Academia: {pricing.gym_name}
                                                </span>
                                            )}
                                            {pricing.master_name && (
                                                <span className="bg-muted px-2 py-1 rounded-lg font-medium">
                                                    Mestre: {pricing.master_name}
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[11px] text-muted-foreground font-medium">Preco (R$)</label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={editFee}
                                                    onChange={(e) => setEditFee(e.target.value)}
                                                    className="h-9"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[11px] text-muted-foreground font-medium">Observacao</label>
                                                <Input
                                                    value={editNotes}
                                                    onChange={(e) => setEditNotes(e.target.value)}
                                                    className="h-9"
                                                    placeholder="Opcional"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => handleUpdate(pricing)}
                                                disabled={!editFee || isPending}
                                            >
                                                {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                                                Salvar
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                                <X className="h-3 w-3 mr-1" />
                                                Cancelar
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    /* View mode */
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap gap-2 text-panel-sm mb-1">
                                                {pricing.gym_name && (
                                                    <span className="bg-muted px-2 py-0.5 rounded-lg font-semibold">
                                                        {pricing.gym_name}
                                                    </span>
                                                )}
                                                {pricing.master_name && (
                                                    <span className="bg-muted px-2 py-0.5 rounded-lg font-semibold">
                                                        {pricing.master_name}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-panel-sm text-muted-foreground">
                                                Preco: <span className="font-bold text-foreground">R$ {Number(pricing.registration_fee).toFixed(2)}</span>
                                            </span>
                                            {pricing.notes && (
                                                <p className="text-[11px] text-muted-foreground mt-1">{pricing.notes}</p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => startEdit(pricing)}
                                                disabled={isPending}
                                                className="text-muted-foreground hover:text-foreground"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] text-muted-foreground font-medium">
                                                    {pricing.active ? 'Ativo' : 'Inativo'}
                                                </span>
                                                <Switch
                                                    checked={pricing.active}
                                                    onCheckedChange={() => handleToggle(pricing)}
                                                    disabled={isPending}
                                                />
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => handleDelete(pricing)}
                                                disabled={isPending}
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                    <p className="text-panel-sm text-muted-foreground">
                        Nenhuma regra de preco para atletas configurada.
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                        Todos os atletas pagam o preco padrao do evento.
                    </p>
                </div>
            )}
        </div>
    );
}
