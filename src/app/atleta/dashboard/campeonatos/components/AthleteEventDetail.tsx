'use client';

import React, { useState, useEffect } from 'react';
import { Search, Info, Trophy, Loader2, ArrowLeft, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from '@/hooks/use-debounce';
import { searchEventCategories } from '@/app/(panel)/actions/event-categories';
import { getEligibleCategories } from '../lib/eligible-categories';
import { addToAthleteCartAction } from '../athlete-cart-actions';
import { useAthleteCart } from '@/hooks/use-athlete-cart';
import Link from 'next/link';
import { toast } from 'sonner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// New UI Components
import { EventHeader } from './_components/EventHeader';
import { EventSummary } from './_components/EventSummary';
import { CategoryCard } from './_components/CategoryCard';

interface Event {
    id: string;
    title: string;
    event_date: string;
    location?: string;
    city?: string;
    image_path?: string;
}

interface CategoryResult {
    id: string;
    categoria_completa: string;
    faixa: string;
    divisao: string;
    peso: string;
    registration_fee: number;
    match?: {
        eligible: boolean;
        reasons: { belt: boolean; age: boolean; weight: boolean; sex: boolean };
    };
}

interface AthleteEventDetailProps {
    event: Event;
    beltColor?: string;
}

export default function AthleteEventDetail({ event, beltColor = 'branca' }: AthleteEventDetailProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<CategoryResult[]>([]);
    const [suggestions, setSuggestions] = useState<CategoryResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [isIncomplete, setIsIncomplete] = useState(false);
    const [incompleteReasons, setIncompleteReasons] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState('sugestoes');
    const debouncedQuery = useDebounce(query, 300);

    const cartItems = useAthleteCart(state => state.items);

    const performSearch = React.useCallback(async (val: string) => {
        setLoading(true);
        try {
            const data = await searchEventCategories(event.id, val);
            setResults((data as CategoryResult[]) || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [event.id]);

    const loadSuggestions = React.useCallback(async () => {
        setLoading(true);
        try {
            const data = await getEligibleCategories(event.id);
            setSuggestions(data.suggestions as any);
            setIsIncomplete(data.isIncomplete);
            setIncompleteReasons(data.incompleteReasons || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [event.id]);

    // Initial load
    useEffect(() => {
        performSearch('');
        loadSuggestions();
    }, [performSearch, loadSuggestions]);

    // Debounced search
    useEffect(() => {
        if (debouncedQuery !== undefined) {
            performSearch(debouncedQuery);
        }
    }, [debouncedQuery, performSearch]);

    const isWhiteBelt = beltColor.toLowerCase().trim() === 'branca' || beltColor.toLowerCase().trim() === 'white';

    return (
        <div
            className="min-h-screen bg-background pb-20"
            style={{
                '--primary': isWhiteBelt ? '240 10% 3.9%' : undefined
            } as React.CSSProperties}
        >
            <div className="max-w-5xl mx-auto px-4 pt-1 sm:pt-4">
                {/* Back Button and Title are now handled by AthletePageHeader in the parent page */}

                {/* Main Content Grid: 2 columns on md+ */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10">

                    {/* Column 1: Header + Summary (Static) */}
                    <div className="md:col-span-5 space-y-6">
                        <EventHeader
                            title={event.title}
                            imagePath={event.image_path}
                            eventDate={event.event_date}
                        />

                        <EventSummary
                            date={event.event_date}
                            location={event.location}
                            city={event.city}
                        />

                        {/* Incomplete Profile Alert (Moved here to stay near event summary on mobile/desktop) */}
                        {isIncomplete && (
                            <Alert className="bg-amber-50/50 border-amber-200 text-amber-800 rounded-2xl p-5 shadow-sm">
                                <Info className="h-5 w-5 text-amber-600" />
                                <div className="flex flex-col gap-2">
                                    <AlertTitle className="text-h3 text-amber-900">Perfil Incompleto</AlertTitle>
                                    <AlertDescription className="text-ui font-medium opacity-90 leading-relaxed">
                                        Complete seu perfil para encontrarmos suas categorias automaticamente.
                                        {incompleteReasons.length > 0 && (
                                            <span className="block mt-1 text-ui font-bold">
                                                Faltando: {incompleteReasons.join(', ')}
                                            </span>
                                        )}
                                    </AlertDescription>
                                    <Link href="/atleta/dashboard/perfil">
                                        <Button size="sm" variant="outline" className="w-full sm:w-fit mt-2 border-amber-200 bg-white text-amber-900 hover:bg-amber-100 text-ui font-bold rounded-xl px-6 h-10 transition-all active:scale-[0.98]">
                                            Completar Perfil
                                        </Button>
                                    </Link>
                                </div>
                            </Alert>
                        )}
                    </div>

                    {/* Column 2: Search + Categories */}
                    <div className="md:col-span-7 space-y-6">
                        <Tabs defaultValue="sugestoes" value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
                            <TabsList className={`flex items-center justify-center w-full h-14 sm:h-16 p-1 rounded-full bg-muted/30 border shadow-sm overflow-hidden ${isWhiteBelt ? 'border-gray-200' : 'border-primary'}`}>
                                <TabsTrigger
                                    value="sugestoes"
                                    className="flex-1 h-full rounded-full px-4 py-2 text-ui font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                                >
                                    Sugestões para você
                                </TabsTrigger>
                                <TabsTrigger
                                    value="todas"
                                    className="flex-1 h-full rounded-full px-4 py-2 text-ui font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                                >
                                    Todas as categorias
                                </TabsTrigger>
                            </TabsList>

                            {/* Suggestions Tab */}
                            <TabsContent value="sugestoes" className="space-y-6 outline-none animate-in fade-in duration-300">
                                <div className="space-y-1">
                                    <h2 className="text-h2 text-foreground">Categorias elegíveis</h2>
                                    <p className="text-ui font-medium text-muted-foreground leading-relaxed">
                                        De acordo com a sua cor de faixa, peso, idade e sexo, aqui estão as categorias às quais você está apto a participar. Você pode verificar e se inscrever em mais de uma delas.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {loading && suggestions.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-24 animate-pulse">
                                            <Loader2 className="h-10 w-10 text-primary/20 animate-spin mb-4" />
                                            <p className="text-caption text-muted-foreground italic">Analisando elegibilidade...</p>
                                        </div>
                                    ) : suggestions.length === 0 ? (
                                        <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border flex flex-col items-center gap-4 px-6">
                                            <Trophy className="h-14 w-14 text-muted-foreground/10" />
                                            <div className="space-y-1">
                                                <p className="text-h3 text-foreground">Nenhuma sugestão encontrada</p>
                                                <p className="text-caption text-muted-foreground max-w-[280px]">Não encontramos categorias compatíveis com seu perfil neste evento.</p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                className="text-ui font-bold border-primary/20 text-primary hover:bg-primary/5 rounded-xl px-8 h-11"
                                                onClick={() => setActiveTab('todas')}
                                            >
                                                Ver todas categorias
                                            </Button>
                                        </div>
                                    ) : (
                                        suggestions.map((row) => {
                                            const isCategoryInCart = cartItems.some(item => item.categoryId === row.id && item.eventId === event.id);
                                            return (
                                                <CategoryCard
                                                    key={row.id}
                                                    eventId={event.id}
                                                    category={row}
                                                    showMatchDetails={true}
                                                    isWhiteBelt={isWhiteBelt}
                                                    isInCart={isCategoryInCart}
                                                    onAddToCart={async () => {
                                                        try {
                                                            await addToAthleteCartAction({
                                                                eventId: event.id,
                                                                categoryId: row.id,
                                                            });
                                                            toast.custom((t) => (
                                                                <div className="flex items-center gap-3 w-[356px] bg-green-600 rounded-xl px-5 py-4 shadow-xl shadow-green-600/20 text-white animate-in slide-in-from-right-2">
                                                                    <Check className="h-6 w-6 shrink-0" />
                                                                    <p className="text-base font-bold">Adicionado à cesta!</p>
                                                                </div>
                                                            ), { duration: 4000 });
                                                            useAthleteCart.getState().fetchCart();
                                                        } catch (err: any) {
                                                            const msg = err.message || 'Erro ao adicionar à cesta.';
                                                            toast.custom((t) => (
                                                                <div className="flex items-center gap-3 w-[356px] bg-red-600 rounded-xl px-5 py-4 shadow-xl shadow-red-600/20 text-white animate-in slide-in-from-right-2">
                                                                    <Info className="h-6 w-6 shrink-0" />
                                                                    <p className="text-base font-bold">{msg}</p>
                                                                </div>
                                                            ), { duration: 5000 });
                                                            throw err;
                                                        }
                                                    }}
                                                />
                                            );
                                        })
                                    )}
                                </div>
                            </TabsContent>

                            {/* All Categories Tab */}
                            <TabsContent value="todas" className="space-y-6 outline-none animate-in fade-in duration-300">
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        placeholder="Ex: Master, Meio-Pesado, Marrom..."
                                        className="pl-12 h-14 text-ui rounded-2xl border border-border shadow-sm bg-card hover:border-primary/20 focus-visible:ring-primary/10 focus-visible:border-primary/30 transition-all font-medium"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                    />
                                    {loading && (
                                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary/30" />
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {results.length === 0 && !loading ? (
                                        <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border flex flex-col items-center gap-4 px-6">
                                            <Trophy className="h-14 w-14 text-muted-foreground/10" />
                                            <p className="text-ui font-medium text-muted-foreground">Nenhuma categoria encontrada para essa busca.</p>
                                        </div>
                                    ) : (
                                        results.slice(0, 30).map((row) => {
                                            const isCategoryInCart = cartItems.some(item => item.categoryId === row.id && item.eventId === event.id);
                                            return (
                                                <CategoryCard
                                                    key={row.id}
                                                    eventId={event.id}
                                                    category={row}
                                                    isWhiteBelt={isWhiteBelt}
                                                    isInCart={isCategoryInCart}
                                                    onAddToCart={async () => {
                                                        try {
                                                            await addToAthleteCartAction({
                                                                eventId: event.id,
                                                                categoryId: row.id,
                                                            });
                                                            toast.custom((t) => (
                                                                <div className="flex items-center gap-3 w-[356px] bg-green-600 rounded-xl px-5 py-4 shadow-xl shadow-green-600/20 text-white animate-in slide-in-from-right-2">
                                                                    <Check className="h-6 w-6 shrink-0" />
                                                                    <p className="text-base font-bold">Adicionado à cesta!</p>
                                                                </div>
                                                            ), { duration: 4000 });
                                                            useAthleteCart.getState().fetchCart();
                                                        } catch (err: any) {
                                                            const msg = err.message || 'Erro ao adicionar à cesta.';
                                                            toast.custom((t) => (
                                                                <div className="flex items-center gap-3 w-[356px] bg-red-600 rounded-xl px-5 py-4 shadow-xl shadow-red-600/20 text-white animate-in slide-in-from-right-2">
                                                                    <Info className="h-6 w-6 shrink-0" />
                                                                    <p className="text-base font-bold">{msg}</p>
                                                                </div>
                                                            ), { duration: 5000 });
                                                            throw err;
                                                        }
                                                    }}
                                                />
                                            );
                                        })
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </div >
    );
}
