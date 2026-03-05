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
import { Loader2, AlertCircle, ArrowLeft, Search, Trophy, Check } from "lucide-react";
import { toast } from "sonner";
import { registerBatchAction, getEligibleCategoriesAction } from '../registrations-actions';
import { useRouter } from 'next/navigation';
import { RegistrationCategoryCard } from './registration-category-card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useDebounce } from '@/hooks/use-debounce';
import { useRegistrationCart } from '@/hooks/use-registration-cart';
import { Badge } from '@/components/ui/badge';
import { getBeltStyle } from '@/lib/belt-theme';

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

                // If no suggestions, switch to 'all' automatically
                if ((data.suggestions || []).length === 0) {
                    setViewMode('all');
                }
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

    return (
        <Card className="max-w-4xl mx-auto border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <p className="text-ui text-muted-foreground">
                    Inscreva <strong>{selectedAthlete?.full_name || 'um atleta'}</strong> no evento <span className="text-foreground font-medium">{event.title}</span>.
                </p>
            </CardHeader>
            <CardContent className="space-y-8 px-0 pb-16 md:pb-0">
                {/* 1. Athlete Selection */}
                <div className="space-y-4 bg-card p-6 rounded-3xl border shadow-sm">
                    <Label htmlFor="athlete" className="text-h3">1. Selecione o Atleta</Label>
                    <Select
                        value={selectedAthleteId}
                        onValueChange={setSelectedAthleteId}
                        disabled={submitting}
                    >
                        <SelectTrigger className="w-full h-14 rounded-xl px-4 bg-card hover:bg-muted/50 transition-colors">
                            <SelectValue placeholder="Buscar atleta...">
                                {selectedAthlete && (
                                    <div className="flex items-center justify-between w-full">
                                        <span className="text-ui font-semibold">{selectedAthlete.full_name}</span>
                                        <div className="flex items-center gap-2 mr-2">
                                            <Badge
                                                variant="outline"
                                                style={getBeltStyle(selectedAthlete.belt_color)}
                                                className="text-[10px] shadow-none uppercase font-bold px-2 py-0.5 border-border/50"
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
                                                <span className="font-semibold text-foreground truncate text-sm">{athlete.full_name}</span>
                                                <span className="text-[11px] text-muted-foreground truncate font-medium mt-0.5">
                                                    {athlete.weight}kg • {athlete.sexo} {age ? `• ${age} anos` : ''}
                                                </span>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                style={getBeltStyle(athlete.belt_color)}
                                                className="text-[10px] shadow-none uppercase font-bold whitespace-nowrap px-2 py-0.5 border-border/50 shrink-0"
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
                            <div className="bg-muted px-3 py-1.5 rounded-lg text-ui font-medium flex items-center gap-2">
                                <span className="text-label text-muted-foreground opacity-60">Perfil:</span>
                                {selectedAthlete.sexo}
                            </div>
                            <div className="bg-muted px-3 py-1.5 rounded-lg text-ui font-medium flex items-center gap-2">
                                <span className="text-label text-muted-foreground opacity-60">Faixa:</span>
                                {selectedAthlete.belt_color}
                            </div>
                            <div className="bg-muted px-3 py-1.5 rounded-lg text-ui font-medium flex items-center gap-2">
                                <span className="text-label text-muted-foreground opacity-60">Peso:</span>
                                {selectedAthlete.weight}kg
                            </div>
                            <div className="bg-muted px-3 py-1.5 rounded-lg text-ui font-medium flex items-center gap-2">
                                <span className="text-label text-muted-foreground opacity-60">Nascimento:</span>
                                {selectedAthlete.birth_date ? new Date(selectedAthlete.birth_date).toLocaleDateString('pt-BR') : '-'}
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Category Selection */}
                {selectedAthleteId && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center justify-between">
                            <Label className="text-h3">2. Escolha a Categoria</Label>
                        </div>

                        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'match' | 'all')} className="w-full">
                            <TabsList className={`flex items-center justify-center w-full h-14 p-1 rounded-full bg-muted/30 border shadow-sm overflow-hidden ${isWhiteBelt ? 'border-gray-200' : 'border-primary'}`}>
                                <TabsTrigger value="match" className="flex-1 h-full rounded-full text-ui font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                    Sugestões para você
                                </TabsTrigger>
                                <TabsTrigger value="all" className="flex-1 h-full rounded-full text-ui font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                    Todas as categorias
                                </TabsTrigger>
                            </TabsList>

                            {/* MATCH TAB */}
                            <TabsContent value="match" className="mt-6 space-y-4 min-h-[300px]">
                                {loadingCategories ? (
                                    <div className="flex flex-col items-center justify-center py-24 animate-pulse">
                                        <Loader2 className="h-10 w-10 text-primary/20 animate-spin mb-4" />
                                        <p className="text-muted-foreground font-medium italic">Analisando elegibilidade...</p>
                                    </div>
                                ) : filteredSuggestions.length === 0 ? (
                                    <div className="text-center py-16 bg-muted/20 rounded-3xl border border-dashed border-border flex flex-col items-center gap-4 px-6">
                                        <Trophy className="h-12 w-12 text-muted-foreground/20" />
                                        <div className="space-y-1">
                                            <p className="text-h3">Nenhuma sugestão exata</p>
                                            <p className="text-caption text-muted-foreground max-w-[300px]">Não encontramos categorias que correspondam exatamente ao perfil deste atleta.</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => setViewMode('all')}
                                            className="mt-2"
                                        >
                                            Ver todas as categorias
                                        </Button>
                                    </div>
                                ) : (
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
                                )}
                            </TabsContent>

                            {/* ALL TAB */}
                            <TabsContent value="all" className="mt-6 space-y-6">
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input variant="lg"
                                        placeholder="Buscar categoria (Ex: Absoluto, Master, Pesado...)"
                                        aria-label="Buscar categoria"
                                        className="pl-12 h-14 rounded-2xl border-border bg-card shadow-sm"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>

                                {loadingCategories ? (
                                    <div className="flex flex-col items-center justify-center py-24 animate-pulse">
                                        <Loader2 className="h-10 w-10 text-primary/20 animate-spin mb-4" />
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
                                            <div className="col-span-full text-center py-4 text-caption text-muted-foreground font-medium">
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
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                <AlertTitle className="text-ui font-bold">Atenção</AlertTitle>
                                <AlertDescription className="text-caption">
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
