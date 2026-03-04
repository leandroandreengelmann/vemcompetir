'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, DollarSign, List, Check } from "lucide-react";
import { toast } from "sonner";
import { getEventCategoriesWithPrices, updateEventCategoryTablePrice, updateEventCategoryIndividualPrice } from '@/app/(panel)/actions/event-categories';
import { Separator } from "@/components/ui/separator";

interface EventPricingDialogProps {
    eventId: string;
    tableId: string;
    tableName: string;
    trigger?: React.ReactNode;
}

export function EventPricingDialog({ eventId, tableId, tableName, trigger }: EventPricingDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [bulkPrice, setBulkPrice] = useState<string>('');
    const [individualPrices, setIndividualPrices] = useState<Record<string, string>>({});

    useEffect(() => {
        if (open) {
            loadCategories();
        }
    }, [open]);

    async function loadCategories() {
        setLoading(true);
        try {
            const result = await getEventCategoriesWithPrices(eventId, tableId);
            setCategories(result.categories);
            if (result.categories.length > 0) {
                setBulkPrice(result.defaultPrice.toString());
                const initialOverrides: Record<string, string> = {};
                result.categories.forEach((cat: any) => {
                    if (cat.override_price !== null) {
                        initialOverrides[cat.id] = cat.override_price.toString();
                    }
                });
                setIndividualPrices(initialOverrides);
            }
        } catch (error) {
            toast.error("Erro ao carregar preços.");
        } finally {
            setLoading(false);
        }
    }

    const handleBulkSave = async () => {
        setSaving(true);
        const priceNum = parseFloat(bulkPrice.replace(',', '.'));
        if (isNaN(priceNum)) {
            toast.error("Preço inválido.");
            setSaving(false);
            return;
        }

        const result = await updateEventCategoryTablePrice(eventId, tableId, priceNum);
        if (result.success) {
            toast.success("Preço base atualizado para o grupo.");
            loadCategories();
        } else {
            toast.error(result.error || "Erro ao salvar.");
        }
        setSaving(false);
    };

    const handleIndividualSave = async (categoryId: string) => {
        const priceStr = individualPrices[categoryId];
        const priceNum = priceStr ? parseFloat(priceStr.replace(',', '.')) : null;

        const result = await updateEventCategoryIndividualPrice(eventId, categoryId, priceNum);
        if (result.success) {
            toast.success("Preço individual atualizado.");
            loadCategories();
        } else {
            toast.error(result.error || "Erro ao salvar.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" pill className="h-8 text-[10px] font-bold uppercase tracking-wider">
                        Editar Valores
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl bg-white rounded-3xl">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="text-h2 flex items-center gap-2">
                        <DollarSign className="h-6 w-6 text-primary" />
                        Precificação: {tableName}
                    </DialogTitle>
                    <DialogDescription className="text-caption">
                        Defina o valor da inscrição para este grupo de categorias.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 pt-4 space-y-6 flex-1 overflow-hidden flex flex-col">
                    {/* Bulk Pricing Area */}
                    <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                        <Label htmlFor="bulk-price" className="text-label mb-2 block">
                            Valor do Lote (Padrão para todo o grupo)
                        </Label>
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                                <Input
                                    id="bulk-price"
                                    value={bulkPrice}
                                    onChange={(e) => setBulkPrice(e.target.value)}
                                    className="pl-9 h-12 rounded-xl border-primary/10 bg-white"
                                    placeholder="0,00"
                                    disabled={saving}
                                />
                            </div>
                            <Button onClick={handleBulkSave} disabled={saving} pill className="h-12 px-6">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Lote"}
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    {/* Individual Overrides Area */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-label flex items-center gap-2 text-muted-foreground">
                                <List className="h-4 w-4" />
                                Exceções Individuais
                            </h3>
                        </div>

                        {loading ? (
                            <div className="flex-1 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="flex-1 pr-4 overflow-y-auto max-h-[400px]">
                                <div className="space-y-3">
                                    {categories.map((cat) => (
                                        <div key={cat.id} className="group flex items-center justify-between p-3 rounded-2xl border border-transparent hover:border-primary/10 hover:bg-muted/30 transition-all">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-ui font-medium">{cat.categoria_completa}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-caption text-muted-foreground">{cat.divisao} • {cat.peso}</span>
                                                    {cat.override_price !== null && (
                                                        <Badge variant="outline" className="text-[8px] h-4 px-1 bg-amber-50 text-amber-700 border-amber-200 uppercase font-bold">Sobrescrito</Badge>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="relative w-24">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">R$</span>
                                                    <Input
                                                        value={individualPrices[cat.id] ?? ''}
                                                        onChange={(e) => setIndividualPrices(prev => ({ ...prev, [cat.id]: e.target.value }))}
                                                        className="pl-7 h-8 text-xs rounded-lg bg-white border-primary/5 focus:border-primary/20"
                                                        placeholder={cat.base_price.toString()}
                                                    />
                                                </div>
                                                <Button pill size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8  hover:bg-emerald-50 hover:text-emerald-700"
                                                    onClick={() => handleIndividualSave(cat.id)}
                                                >
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-muted/20 flex justify-end">
                    <Button variant="ghost" pill onClick={() => setOpen(false)}>
                        Fechar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function Badge({ children, variant, className }: any) {
    return (
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variant === 'outline' ? 'border-transparent' : ''} ${className}`}>
            {children}
        </span>
    );
}
