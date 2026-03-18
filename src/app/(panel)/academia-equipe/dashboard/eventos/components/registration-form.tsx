'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CircleNotchIcon, WarningCircleIcon, MagnifyingGlassIcon, TrophyIcon, CheckIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { registerBatchAction, getEligibleCategoriesAction } from '../registrations-actions';
import { useRouter } from 'next/navigation';
import { RegistrationCategoryCard } from './registration-category-card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useDebounce } from '@/hooks/use-debounce';
import { useRegistrationCart } from '@/hooks/use-registration-cart';
import { Badge } from '@/components/ui/badge';
import { getBeltStyle } from '@/lib/belt-theme';
import { formatFullCategoryName } from '@/lib/category-utils';

function getStatusLabel(status: string): { label: string; className: string } {
    const map: Record<string, { label: string; className: string }> = {
        pago: { label: 'Pago', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
        isento: { label: 'Isento', className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' },
        confirmado: { label: 'Confirmado', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
        aguardando_pagamento: { label: 'Aguard. pagamento', className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
        pendente: { label: 'Pendente', className: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400' },
    };
    return map[status] || { label: status, className: 'bg-gray-100 text-gray-600' };
}

function calculateAge(birthDateStr: string) {
    if (!birthDateStr) return '';
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

interface Athlete {
    id: string;
    full_name: string;
    sexo: string;
    belt_color: string;
    birth_date: string;
    weight: number;
}

interface Event {
    id: string;
    title: string;
}

interface RegistrationFormProps {
    event: Event;
    athletes: Athlete[];
    isOwner: boolean;
    adminTax: number;
}

export function RegistrationForm({ event, athletes, isOwner, adminTax }: RegistrationFormProps) {
    const router = useRouter();
    const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
    const { items, addItem } = useRegistrationCart();

    // Data states
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [allCategories, setAllCategories] = useState<any[]>([]);
    const [enrolledCategories, setEnrolledCategories] = useState<{
        id: string;
        categoria_completa: string;
        faixa: string;
        status: string;
        divisao?: string;
        peso?: string;
        categoria_peso?: string;
        peso_min_kg?: number | null;
        peso_max_kg?: number | null;
    }[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [viewMode, setViewMode] = useState<'match' | 'all'>('match');
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedQuery = useDebounce(searchQuery, 300);

    const selectedAthlete = useMemo(() =>
        athletes.find(a => a.id === selectedAthleteId),
        [selectedAthleteId, athletes]);

    // Fetch categories when athlete changes
    useEffect(() => {
        if (selectedAthleteId) {
            fetchCategories(selectedAthleteId);
            setViewMode('match'); // Reset to match view
        } else {
            setSuggestions([]);
            setAllCategories([]);
        }
    }, [selectedAthleteId]);

    const fetchCategories = async (athleteId: string) => {
        setLoadingCategories(true);
        try {
            const data = await getEligibleCategoriesAction(event.id, athleteId);
            if (data.error) {
                toast.error(data.error);
            } else {
                setSuggestions(data.suggestions || []);
                setAllCategories(data.all || []);
                setEnrolledCategories(data.enrolledCategories || []);
            }
        } catch (error) {
            console.error("Error fetching categories", error);
            toast.error("Erro ao buscar categorias.");
        } finally {
            setLoadingCategories(false);
        }
    };

    const addToCart = async (categoryId: string) => {
        if (!selectedAthlete || !categoryId) return;

        const category = suggestions.find(c => c.id === categoryId) || allCategories.find(c => c.id === categoryId);
        if (!category) return;

        // Check for duplicates
        const exists = items.some(
            item => item.athleteId === selectedAthleteId && item.categoryId === categoryId
        );

        if (exists) {
            toast.error("Este atleta já está no carrinho para esta categoria.");
            return;
        }

        await addItem({
            eventId: event.id,
            athleteId: selectedAthleteId,
            categoryId: categoryId,
            athleteName: selectedAthlete.full_name,
            categoryTitle: category.categoria_completa,
            price: isOwner && adminTax > 0 ? adminTax : category.registration_fee
        });

        toast.custom((t) => (
            <div className="flex items-center gap-3 w-[356px] bg-green-600 rounded-xl px-5 py-4 shadow-xl shadow-green-600/20 text-white animate-in slide-in-from-right-2">
                <CheckIcon size={32} weight="duotone" className="shrink-0" />
                <p className="text-panel-sm font-bold">Adicionado à cesta!</p>
            </div>
        ), { duration: 4000 });
    };

    const isWhiteBelt = selectedAthlete?.belt_color?.toLowerCase() === 'branca' || selectedAthlete?.belt_color?.toLowerCase() === 'white';

    // Get categories already in cart for this athlete
    const cartCategoryIds = useMemo(() => {
        if (!selectedAthleteId) return new Set();
        return new Set(
            items
                .filter(item => item.athleteId === selectedAthleteId)
                .map(item => item.categoryId)
        );
    }, [items, selectedAthleteId]);

    // Filter suggestions excluding cart items
    const filteredSuggestions = useMemo(() => {
        return suggestions;
    }, [suggestions]);

    // Filter "All" categories based on search AND cart items
    const filteredAllCategories = useMemo(() => {
        let cats = allCategories;

        if (!debouncedQuery) return cats;
        const lower = debouncedQuery.toLowerCase();
        return cats.filter(cat =>
            cat.categoria_completa?.toLowerCase().includes(lower) ||
            cat.faixa?.toLowerCase().includes(lower) ||
            cat.divisao_idade?.toLowerCase().includes(lower) ||
            cat.peso?.toLowerCase().includes(lower)
        );
    }, [allCategories, debouncedQuery]);

    // Diagnose why there are no suggestions
    const noSuggestionDiagnosis = useMemo(() => {
        if (filteredSuggestions.length > 0 || loadingCategories || !selectedAthleteId) return null;
        const mismatches = { belt: 0, age: 0, weight: 0, sex: 0 };
        allCategories.forEach(cat => {
            if (cat.match?.reasons) {
                if (!cat.match.reasons.belt) mismatches.belt++;
                if (!cat.match.reasons.age) mismatches.age++;
                if (!cat.match.reasons.weight) mismatches.weight++;
                if (!cat.match.reasons.sex) mismatches.sex++;
            }
        });
        return { mismatches, hasEnrolled: enrolledCategories.length > 0, hasCategories: allCategories.length > 0 };
    }, [filteredSuggestions, loadingCategories, selectedAthleteId, allCategories, enrolledCategories]);

    return (
        <Card className="max-w-4xl mx-auto border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <p className="text-panel-sm text-muted-foreground">
                    Inscreva{' '}
                    <span className="text-foreground font-bold">({selectedAthlete?.full_name || 'um atleta'})</span>
                    {' '}no evento{' '}
                    <span className="inline-flex items-center text-primary font-black">({event.title})</span>.
                </p>
            </CardHeader>
            <CardContent className="space-y-8 px-0 pb-16 md:pb-0">
                {/* 1. Athlete Selection */}
                <div className="space-y-4 bg-card p-6 rounded-3xl border shadow-sm">
                    <Label htmlFor="athlete" className="text-panel-md font-semibold">1. Selecione o Atleta</Label>
                    <Select
                        value={selectedAthleteId}
                        onValueChange={setSelectedAthleteId}
                        disabled={submitting}
                    >
                        <SelectTrigger className="w-full h-12 rounded-xl px-4 bg-background hover:bg-muted/50 transition-colors focus:ring-0 focus:ring-offset-0">
                            <SelectValue placeholder="Buscar atleta...">
                                {selectedAthlete && (
                                    <div className="flex items-center justify-between w-full">
                                        <span className="text-panel-sm font-semibold">{selectedAthlete.full_name}</span>
                                        <div className="flex items-center gap-2 mr-2">
                                            <Badge
                                                variant="outline"
                                                style={getBeltStyle(selectedAthlete.belt_color)}
                                                className="text-panel-sm shadow-none uppercase font-bold px-2 py-0.5 border-border/50"
                                            >
                                                {selectedAthlete.belt_color}
                                            </Badge>
                                        </div>
                                    </div>
                                )}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[350px] p-2 rounded-xl">
                            {athletes.map((athlete) => {
                                const age = calculateAge(athlete.birth_date);
                                return (
                                    <SelectItem key={athlete.id} value={athlete.id} className="py-2.5 px-3 mb-1 rounded-lg focus:bg-muted/60 cursor-pointer">
                                        <div className="flex items-center justify-between w-full gap-3">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-panel-sm font-semibold text-foreground truncate">{athlete.full_name}</span>
                                                <span className="text-panel-sm text-muted-foreground truncate font-medium mt-0.5">
                                                    {athlete.weight}kg • {athlete.sexo} {age ? `• ${age} anos` : ''}
                                                </span>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                style={getBeltStyle(athlete.belt_color)}
                                                className="text-panel-sm shadow-none uppercase font-bold whitespace-nowrap px-2 py-0.5 border-border/50 shrink-0"
                                            >
                                                {athlete.belt_color}
                                            </Badge>
                                        </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>

                    {selectedAthlete && (
                        <div className="mt-4 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
                            <div className="bg-muted px-3 py-1.5 rounded-lg text-panel-sm font-medium flex items-center gap-2">
                                <span className="text-panel-sm font-semibold text-muted-foreground opacity-60">Perfil:</span>
                                {selectedAthlete.sexo}
                            </div>
                            <div className="bg-muted px-3 py-1.5 rounded-lg text-panel-sm font-medium flex items-center gap-2">
                                <span className="text-panel-sm font-semibold text-muted-foreground opacity-60">Faixa:</span>
                                {selectedAthlete.belt_color}
                            </div>
                            <div className="bg-muted px-3 py-1.5 rounded-lg text-panel-sm font-medium flex items-center gap-2">
                                <span className="text-panel-sm font-semibold text-muted-foreground opacity-60">Peso:</span>
                                {selectedAthlete.weight}kg
                            </div>
                            <div className="bg-muted px-3 py-1.5 rounded-lg text-panel-sm font-medium flex items-center gap-2">
                                <span className="text-panel-sm font-semibold text-muted-foreground opacity-60">Nascimento:</span>
                                {selectedAthlete.birth_date ? (
                                    <>
                                        {new Date(selectedAthlete.birth_date).toLocaleDateString('pt-BR')}
                                        {calculateAge(selectedAthlete.birth_date)
                                            ? <span>• {calculateAge(selectedAthlete.birth_date)} anos</span>
                                            : null}
                                    </>
                                ) : '-'}
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Category Selection */}
                {selectedAthleteId && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center justify-between">
                            <Label className="text-panel-md font-semibold">2. Escolha a Categoria</Label>
                        </div>

                        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'match' | 'all')} className="w-full">
                            <TabsList className={`flex items-center justify-center w-full h-14 p-1 rounded-full bg-muted/30 border shadow-sm overflow-hidden ${isWhiteBelt ? 'border-gray-200' : 'border-primary'}`}>
                                <TabsTrigger value="match" className="flex-1 h-full rounded-full text-panel-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                    Sugestões para você
                                </TabsTrigger>
                                <TabsTrigger value="all" className="flex-1 h-full rounded-full text-panel-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                    Todas as categorias
                                </TabsTrigger>
                            </TabsList>

                            {/* MATCH TAB */}
                            <TabsContent value="match" className="mt-6 space-y-4 min-h-[300px]">
                                {loadingCategories ? (
                                    <div className="flex flex-col items-center justify-center py-24 animate-pulse">
                                        <CircleNotchIcon size={56} weight="bold" className="text-primary/20 animate-spin mb-4" />
                                        <p className="text-muted-foreground font-medium italic">Analisando elegibilidade...</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-4">
                                        {/* Always show enrolled categories when present */}
                                        {enrolledCategories.length > 0 && (
                                            <div className="bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-6">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="p-2 bg-emerald-500/10 rounded-xl shrink-0">
                                                        <CheckCircleIcon size={28} weight="duotone" className="text-emerald-500" />
                                                    </div>
                                                    <p className="text-panel-md font-semibold text-emerald-700 dark:text-emerald-400">
                                                        {enrolledCategories.length === 1 ? 'Já inscrito nesta categoria' : `Já inscrito em ${enrolledCategories.length} categorias`}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    {enrolledCategories.map(ec => {
                                                        const s = getStatusLabel(ec.status);
                                                        const formattedTitle = formatFullCategoryName(ec);
                                                        return (
                                                            <div key={ec.id} className="flex items-center justify-between bg-white/70 dark:bg-card rounded-xl px-4 py-3 border border-emerald-500/20 gap-3">
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="text-panel-sm font-bold truncate text-emerald-900 dark:text-emerald-100">{formattedTitle}</span>
                                                                </div>
                                                                <span className={`text-panel-sm font-bold px-4 py-1.5 rounded-full shadow-sm shrink-0 ${s.className}`}>{s.label}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Suggestions grid or no-match reasons */}
                                        {enrolledCategories.length > 0 && filteredSuggestions.length > 0 && (
                                            <div className="flex flex-col gap-2 mb-2 animate-in fade-in slide-in-from-top-1 duration-500">
                                                <p className="text-panel-sm font-semibold text-muted-foreground">
                                                    Você também pode inscrever este atleta {filteredSuggestions.length === 1 ? 'nesta categoria' : 'nestas categorias'}:
                                                </p>
                                            </div>
                                        )}

                                        {filteredSuggestions.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {filteredSuggestions.map((cat) => (
                                                    <RegistrationCategoryCard
                                                        key={cat.id}
                                                        eventId={event.id}
                                                        category={cat}
                                                        isInCart={cartCategoryIds.has(cat.id)}
                                                        onAddToCart={() => addToCart(cat.id)}
                                                        isWhiteBelt={isWhiteBelt}
                                                    />
                                                ))}
                                            </div>
                                        ) : noSuggestionDiagnosis?.hasCategories ? (
                                            <div className="bg-muted/20 rounded-3xl border border-dashed border-border p-6 flex flex-col gap-4">
                                                <div className="flex items-center gap-3">
                                                    <TrophyIcon size={40} weight="duotone" className="text-muted-foreground/30 shrink-0" />
                                                    <p className="text-panel-md font-semibold">
                                                        {enrolledCategories.length > 0 ? 'Sem outras sugestões' : 'Nenhuma sugestão exata'}
                                                    </p>
                                                </div>
                                                {(() => {
                                                    const { mismatches } = noSuggestionDiagnosis;
                                                    const reasons: string[] = [];
                                                    if (mismatches.belt > 0) reasons.push('Faixa não compatível com as categorias disponíveis');
                                                    if (mismatches.sex > 0) reasons.push('Sexo não compatível com as categorias disponíveis');
                                                    if (mismatches.age > 0) reasons.push('Idade fora das faixas etárias disponíveis');
                                                    if (mismatches.weight > 0) reasons.push('Peso fora das categorias disponíveis');
                                                    if (reasons.length === 0) return <p className="text-panel-sm text-muted-foreground">Não encontramos categorias compatíveis com o perfil deste atleta.</p>;
                                                    return (
                                                        <ul className="flex flex-col gap-1.5">
                                                            {reasons.map((r, i) => (
                                                                <li key={i} className="text-panel-sm text-muted-foreground">— {r}</li>
                                                            ))}
                                                        </ul>
                                                    );
                                                })()}
                                                <Button variant="outline" pill onClick={() => setViewMode('all')} className="h-9 px-5 text-panel-sm font-semibold mt-2 self-start">
                                                    Ver todas as categorias
                                                </Button>
                                            </div>
                                        ) : enrolledCategories.length === 0 ? (
                                            <div className="text-center py-16 bg-muted/20 rounded-3xl border border-dashed border-border flex flex-col items-center gap-4 px-6">
                                                <TrophyIcon size={64} weight="duotone" className="text-muted-foreground/20" />
                                                <p className="text-panel-md font-semibold">Este evento não possui categorias cadastradas</p>
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                            </TabsContent>

                            {/* ALL TAB */}
                            <TabsContent value="all" className="mt-6 space-y-6">
                                <div className="relative group">
                                    <MagnifyingGlassIcon size={24} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input variant="lg"
                                        placeholder="Buscar categoria (Ex: Absoluto, Master, Pesado...)"
                                        aria-label="Buscar categoria"
                                        className="pl-12 h-12 rounded-xl border-border bg-background"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>

                                {loadingCategories ? (
                                    <div className="flex flex-col items-center justify-center py-24 animate-pulse">
                                        <CircleNotchIcon size={56} weight="bold" className="text-primary/20 animate-spin mb-4" />
                                        <p className="text-muted-foreground font-medium italic">Carregando categorias...</p>
                                    </div>
                                ) : filteredAllCategories.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-muted-foreground">Nenhuma categoria encontrada.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {filteredAllCategories.slice(0, 50).map((cat) => (
                                            <RegistrationCategoryCard
                                                key={cat.id}
                                                eventId={event.id}
                                                category={cat}
                                                isInCart={cartCategoryIds.has(cat.id)}
                                                onAddToCart={() => addToCart(cat.id)}
                                                isWhiteBelt={isWhiteBelt}
                                            />
                                        ))}
                                        {filteredAllCategories.length > 50 && (
                                            <div className="col-span-full text-center py-4 text-panel-sm text-muted-foreground font-medium">
                                                Mostrando 50 de <span className="text-foreground font-bold">{filteredAllCategories.length}</span> categorias. Refine sua busca para encontrar mais.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>

                        {/* Warnings */}
                        {viewMode === 'all' && (
                            <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-300 rounded-2xl">
                                <WarningCircleIcon size={20} weight="duotone" className="text-amber-500" />
                                <AlertTitle className="text-panel-sm font-bold">Atenção</AlertTitle>
                                <AlertDescription className="text-panel-sm">
                                    Você está inscrevendo o atleta através da lista manual de categorias. Verifique se ele cumpre os requisitos de idade e peso antes de adicionar à cesta.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
