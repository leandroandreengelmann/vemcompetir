'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, Search, Loader2 } from 'lucide-react';
import { confirmAsync } from '@/components/panel/ConfirmDialog';
import { showToast } from '@/lib/toast';
import {
    searchAcademies,
    upsertTenantPricing,
    toggleTenantPricing,
    deleteTenantPricing,
} from './actions';

interface TenantPricing {
    id: string;
    event_id: string;
    tenant_id: string;
    tenant_name: string;
    registration_fee: number;
    promo_registration_fee: number | null;
    active: boolean;
    notes: string | null;
}

interface Academy {
    tenant_id: string;
    name: string;
}

export function TenantPricingManager({
    eventId,
    initialPricings,
    hasPromoCategories,
}: {
    eventId: string;
    initialPricings: TenantPricing[];
    hasPromoCategories: boolean;
}) {
    const [pricings, setPricings] = useState<TenantPricing[]>(initialPricings);
    const [isPending, startTransition] = useTransition();

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Academy[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Form state
    const [selectedAcademy, setSelectedAcademy] = useState<Academy | null>(null);
    const [fee, setFee] = useState('');
    const [promoFee, setPromoFee] = useState('');
    const [notes, setNotes] = useState('');

    async function handleSearch(query: string) {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        const results = await searchAcademies(query);
        // Filter out academies that already have pricing
        const existingTenantIds = new Set(pricings.map(p => p.tenant_id));
        setSearchResults(results.filter(r => !existingTenantIds.has(r.tenant_id)));
        setIsSearching(false);
    }

    function selectAcademy(academy: Academy) {
        setSelectedAcademy(academy);
        setSearchQuery(academy.name);
        setSearchResults([]);
    }

    function handleSave() {
        if (!selectedAcademy || !fee) return;

        startTransition(async () => {
            const result = await upsertTenantPricing(
                eventId,
                selectedAcademy.tenant_id,
                parseFloat(fee),
                promoFee ? parseFloat(promoFee) : null,
                notes || null,
            );

            if (result.success) {
                // Add to local state
                setPricings(prev => [
                    {
                        id: crypto.randomUUID(), // temp ID until revalidation
                        event_id: eventId,
                        tenant_id: selectedAcademy.tenant_id,
                        tenant_name: selectedAcademy.name,
                        registration_fee: parseFloat(fee),
                        promo_registration_fee: promoFee ? parseFloat(promoFee) : null,
                        active: true,
                        notes: notes || null,
                    },
                    ...prev,
                ]);
                // Reset form
                setSelectedAcademy(null);
                setSearchQuery('');
                setFee('');
                setPromoFee('');
                setNotes('');
            }
        });
    }

    function handleToggle(pricing: TenantPricing) {
        startTransition(async () => {
            const result = await toggleTenantPricing(pricing.id, !pricing.active, eventId);
            if (result.success) {
                setPricings(prev =>
                    prev.map(p => p.id === pricing.id ? { ...p, active: !p.active } : p)
                );
            }
        });
    }

    async function handleDelete(pricing: TenantPricing) {
        const ok = await confirmAsync({
            variant: 'destructive',
            title: 'Remover preço diferenciado?',
            description: `O preço para "${pricing.tenant_name}" voltará ao padrão do evento.`,
            confirmLabel: 'Remover',
        });
        if (!ok) return;

        startTransition(async () => {
            const result = await deleteTenantPricing(pricing.id, eventId);
            if (result.success) {
                setPricings(prev => prev.filter(p => p.id !== pricing.id));
                showToast.success('Preço diferenciado removido');
            }
        });
    }

    return (
        <div className="space-y-8">
            {/* Add new pricing */}
            <div className="rounded-xl border bg-card p-6 space-y-5">
                <h3 className="text-panel-base font-semibold">Adicionar Preço Diferenciado</h3>

                {/* Academy search */}
                <div className="space-y-2">
                    <label className="text-panel-sm font-medium text-muted-foreground">Academia</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar academia por nome..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="pl-10"
                        />
                        {isSearching && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                    </div>

                    {/* Search results dropdown */}
                    {searchResults.length > 0 && (
                        <div className="border rounded-lg bg-popover shadow-md max-h-48 overflow-y-auto">
                            {searchResults.map(academy => (
                                <button
                                    key={academy.tenant_id}
                                    onClick={() => selectAcademy(academy)}
                                    className="w-full text-left px-4 py-2.5 text-panel-sm hover:bg-muted/50 transition-colors border-b last:border-b-0"
                                >
                                    {academy.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {selectedAcademy && (
                        <p className="text-panel-sm text-primary font-medium">
                            Selecionada: {selectedAcademy.name}
                        </p>
                    )}
                </div>

                {/* Price fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-panel-sm font-medium text-muted-foreground">
                            Preço por Categoria (R$)
                        </label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Ex: 80.00"
                            value={fee}
                            onChange={(e) => setFee(e.target.value)}
                        />
                    </div>

                    {hasPromoCategories && (
                        <div className="space-y-2">
                            <label className="text-panel-sm font-medium text-muted-foreground">
                                Preço Promo/Absoluto (R$)
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Ex: 100.00 (opcional)"
                                value={promoFee}
                                onChange={(e) => setPromoFee(e.target.value)}
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Aplicado em categorias com promoção (ex: Absoluto). Deixe vazio para usar o preço de categoria.
                            </p>
                        </div>
                    )}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                    <label className="text-panel-sm font-medium text-muted-foreground">
                        Observação (opcional)
                    </label>
                    <Input
                        placeholder="Ex: Desconto parceria 2026"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                <Button
                    onClick={handleSave}
                    disabled={!selectedAcademy || !fee || isPending}
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
                        Academias com Preço Diferenciado ({pricings.length})
                    </h3>

                    <div className="space-y-2">
                        {pricings.map(pricing => (
                            <div
                                key={pricing.id}
                                className={`rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors ${
                                    pricing.active
                                        ? 'bg-card border-border'
                                        : 'bg-muted/30 border-border/50 opacity-70'
                                }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-panel-base font-semibold truncate">
                                        {pricing.tenant_name}
                                    </p>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                        <span className="text-panel-sm text-muted-foreground">
                                            Categoria: <span className="font-semibold text-foreground">R$ {Number(pricing.registration_fee).toFixed(2)}</span>
                                        </span>
                                        {pricing.promo_registration_fee !== null && (
                                            <span className="text-panel-sm text-muted-foreground">
                                                Promo/Absoluto: <span className="font-semibold text-foreground">R$ {Number(pricing.promo_registration_fee).toFixed(2)}</span>
                                            </span>
                                        )}
                                    </div>
                                    {pricing.notes && (
                                        <p className="text-[11px] text-muted-foreground mt-1">{pricing.notes}</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
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
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                    <p className="text-panel-sm text-muted-foreground">
                        Nenhum preço diferenciado configurado.
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                        Todas as academias pagam o preço padrão do evento.
                    </p>
                </div>
            )}
        </div>
    );
}
