'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Search,
    DollarSign,
    Save,
    Loader2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Check,
    AlertCircle,
    Info,
    RefreshCcw
} from "lucide-react";
import { toast } from "sonner";
import {
    getEventCategoriesWithPrices,
    updateEventCategoryTablePrice,
    updateEventCategoryIndividualPrice
} from '@/app/(panel)/actions/event-categories';
import { useDebounce } from '@/hooks/use-debounce';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { getBeltStyle } from '@/lib/belt-theme';

interface PricingManagerProps {
    eventId: string;
    tableId: string;
    tableName: string;
}

export function PricingManager({ eventId, tableId, tableName }: PricingManagerProps) {
    const [loading, setLoading] = useState(true);
    const [savingBulk, setSavingBulk] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [overridesCount, setOverridesCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(50);
    const [searchTerm, setSearchTerm] = useState('');
    const [bulkPrice, setBulkPrice] = useState<string>('');
    const [individualPrices, setIndividualPrices] = useState<Record<string, string>>({});

    const debouncedSearch = useSimpleDebounce(searchTerm, 500);

    const loadData = useCallback(async (page: number, search: string) => {
        setLoading(true);
        try {
            const result = await getEventCategoriesWithPrices(eventId, tableId, page, itemsPerPage, search);
            setCategories(result.categories);
            setTotalCount(result.totalCount);
            setOverridesCount(result.overridesCount);
            setBulkPrice(result.defaultPrice.toString());

            const initialOverrides: Record<string, string> = {};
            result.categories.forEach((cat: any) => {
                if (cat.override_price !== null) {
                    initialOverrides[cat.id] = cat.override_price.toString();
                }
            });
            setIndividualPrices(initialOverrides);
        } catch (error) {
            toast.error("Erro ao carregar dados.");
        } finally {
            setLoading(false);
        }
    }, [eventId, tableId, itemsPerPage]);

    useEffect(() => {
        loadData(currentPage, debouncedSearch);
    }, [currentPage, debouncedSearch, loadData]);

    const handleBulkSave = async () => {
        setSavingBulk(true);
        const priceNum = parseFloat(bulkPrice.replace(',', '.'));
        if (isNaN(priceNum)) {
            toast.error("Preço inválido.");
            setSavingBulk(false);
            return;
        }

        const result = await updateEventCategoryTablePrice(eventId, tableId, priceNum);
        if (result.success) {
            toast.success("Preço base do grupo atualizado!");
            loadData(currentPage, debouncedSearch);
        } else {
            toast.error(result.error);
        }
        setSavingBulk(false);
    };

    const handleIndividualSave = async (categoryId: string) => {
        const priceStr = individualPrices[categoryId];
        const priceNum = (priceStr === undefined || priceStr === '') ? null : parseFloat(priceStr.replace(',', '.'));

        const result = await updateEventCategoryIndividualPrice(eventId, categoryId, priceNum);
        if (result.success) {
            if (result.reset) {
                toast.success("Preço resetado para o padrão.");
            } else {
                toast.success("Preço individual atualizado.");
            }

            // Reload to update the summary counts (total overrides)
            loadData(currentPage, debouncedSearch);
        } else {
            toast.error(result.error);
        }
    };

    // Pagination logic
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium animate-pulse text-sm uppercase tracking-widest">Carregando categorias...</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Left Column: Bulk Management & Summary */}
            <div className="lg:col-span-1 h-fit sticky top-6 space-y-6">
                <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
                    <CardHeader className="bg-primary flex flex-col p-6">
                        <CardTitle className="text-white text-h3 flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Preço Global do Grupo
                        </CardTitle>
                        <p className="text-primary-foreground/70 text-caption mt-1">Este valor será aplicado a TODAS as categorias, exceto as que possuem sobrescrito.</p>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="bulk-price" className="text-label text-muted-foreground">Valor Padrão (R$)</Label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-ui">R$</span>
                                    <Input
                                        id="bulk-price"
                                        value={bulkPrice}
                                        onChange={(e) => setBulkPrice(e.target.value)}
                                        className="pl-10 h-12 rounded-2xl border-primary/10 bg-muted/30 font-bold text-h2"
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>
                            <Button
                                onClick={handleBulkSave}
                                disabled={savingBulk}
                                pill
                                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg shadow-emerald-100/20 flex items-center justify-center gap-2"
                            >
                                {savingBulk ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    "Salvar preço global"
                                )}
                            </Button>
                        </div>

                        <div className="pt-4 bg-muted/30 p-4 rounded-2xl space-y-3">
                            <div className="flex justify-between items-center text-ui">
                                <span className="text-muted-foreground">Total de Categorias:</span>
                                <span className="font-bold">{totalCount}</span>
                            </div>
                            <Separator className="bg-primary/5" />
                            <div className="flex justify-between items-center text-ui">
                                <span className="text-muted-foreground">Com Preço Específico:</span>
                                <span className="font-bold text-amber-600">{overridesCount}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl bg-white rounded-3xl p-6">
                    <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                            <h4 className="text-ui font-bold">Como funciona?</h4>
                            <p className="text-caption text-muted-foreground mt-1 leading-relaxed">
                                1. O **Preço Global** define o valor base.<br />
                                2. Para mudar uma categoria específica, use o campo ao lado dela.<br />
                                3. Apague o valor individual para exibir o valor padrão novamente.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Right Column: Individual Table */}
            <div className="lg:col-span-2 space-y-4">
                <Card className="border-none shadow-2xl bg-white rounded-3xl overflow-hidden flex flex-col min-h-[600px]">
                    <CardHeader className="p-6 border-b border-primary/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-h1">Lista de Categorias</CardTitle>
                            <p className="text-caption text-muted-foreground mt-0.5">Editando {categories.length} resultados filtrados.</p>
                        </div>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar categoria..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-10 rounded-full border-primary/5 bg-muted/30 text-sm focus:bg-white transition-all"
                            />
                        </div>
                    </CardHeader>

                    <CardContent className="p-0 flex-1">
                        <div className="divide-y divide-primary/5">
                            {categories.length > 0 ? (
                                categories.map((cat) => (
                                    <div
                                        key={cat.id}
                                        className="group p-4 flex items-center justify-between hover:bg-primary/[0.02] transition-colors"
                                    >
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h5 className="text-ui font-bold truncate">{cat.categoria_completa}</h5>
                                                {cat.override_price !== null && (
                                                    <span className="text-label px-1.5 py-0.5 bg-amber-100 text-amber-700 font-bold rounded">Específico</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <Badge
                                                    variant="outline"
                                                    style={getBeltStyle(cat.faixa)}
                                                    className="text-[9px] px-1.5 py-0 font-bold uppercase tracking-wider h-4 flex items-center"
                                                >
                                                    {cat.faixa}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="text-right flex flex-col">
                                                <span className="text-label text-muted-foreground mb-1 leading-none">Preço (R$)</span>
                                                <div className="relative w-28">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">R$</span>
                                                    <Input
                                                        value={individualPrices[cat.id] ?? ''}
                                                        onChange={(e) => setIndividualPrices(prev => ({ ...prev, [cat.id]: e.target.value }))}
                                                        onBlur={() => handleIndividualSave(cat.id)}
                                                        className="pl-8 h-9 rounded-xl border-primary/5 bg-muted/20 text-sm focus:border-primary/20 focus:bg-white text-right font-semibold"
                                                        placeholder={cat.base_price.toString()}
                                                    />
                                                </div>
                                            </div>
                                            <Button pill size="sm"
                                                variant="ghost"
                                                className="h-9 w-9 p-0  text-emerald-600 hover:bg-emerald-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all active:scale-95"
                                                onClick={() => handleIndividualSave(cat.id)}
                                            >
                                                <Check className="h-4 w-4" strokeWidth={3} />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center p-20 text-center space-y-3">
                                    <AlertCircle className="h-10 w-10 text-muted-foreground/30" />
                                    <p className="text-muted-foreground font-medium">Nenhuma categoria encontrada.</p>
                                    <Button variant="outline" size="sm" pill onClick={() => setSearchTerm('')}>
                                        Limpar busca
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>

                    {/* Pagination Footer */}
                    {totalPages > 1 && (
                        <div className="p-4 bg-muted/10 border-t border-primary/5 flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                                Mostrando <span className="font-bold text-primary">{startIndex + 1}</span> a <span className="font-bold text-primary">{Math.min(startIndex + itemsPerPage, totalCount)}</span> de <span className="font-bold text-primary">{totalCount}</span>
                            </p>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    pill
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="h-8 w-8"
                                >
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    pill
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="h-8 w-8"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="text-xs font-bold text-primary px-4 uppercase tracking-tighter">
                                    Página {currentPage} de {totalPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    pill
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="h-8 w-8"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    pill
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="h-8 w-8"
                                >
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

// Simple internal debounce if needed
function useSimpleDebounce(value: string, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}
