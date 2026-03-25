'use client';

import React, { useState, useEffect } from 'react';
import { InfoIcon, TrophyIcon, CircleNotchIcon, CheckIcon } from '@phosphor-icons/react';
import { Button } from "@/components/ui/button";
import { getEligibleCategories } from '../lib/eligible-categories';
import { addToAthleteCartAction } from '../athlete-cart-actions';
import { useAthleteCart } from '@/hooks/use-athlete-cart';
import Link from 'next/link';
import { toast } from 'sonner';

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
    const [suggestions, setSuggestions] = useState<CategoryResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [isIncomplete, setIsIncomplete] = useState(false);
    const [incompleteReasons, setIncompleteReasons] = useState<string[]>([]);

    const cartItems = useAthleteCart(state => state.items);

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

    useEffect(() => {
        loadSuggestions();
    }, [loadSuggestions]);

    const isWhiteBelt = beltColor.toLowerCase().trim() === 'branca' || beltColor.toLowerCase().trim() === 'white';

    return (
        <div
            className="min-h-screen bg-background pb-20"
            style={{
                '--primary': isWhiteBelt ? '240 10% 3.9%' : undefined
            } as React.CSSProperties}
        >
            <div className="max-w-5xl mx-auto px-4 pt-1 sm:pt-4">
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

                        {isIncomplete && (
                            <Alert className="bg-amber-50/50 border-amber-200 text-amber-800 rounded-2xl p-5 shadow-sm">
                                <InfoIcon size={20} weight="duotone" className="text-amber-600" />
                                <div className="flex flex-col gap-2">
                                    <AlertTitle className="text-panel-sm font-semibold text-amber-900">Perfil Incompleto</AlertTitle>
                                    <AlertDescription className="text-panel-sm font-medium opacity-90 leading-relaxed">
                                        Complete seu perfil para encontrarmos suas categorias automaticamente.
                                        {incompleteReasons.length > 0 && (
                                            <span className="block mt-1 text-panel-sm font-bold">
                                                Faltando: {incompleteReasons.join(', ')}
                                            </span>
                                        )}
                                    </AlertDescription>
                                    <Link href="/atleta/dashboard/perfil">
                                        <Button size="sm" variant="outline" className="w-full sm:w-fit mt-2 border-amber-200 bg-white text-amber-900 hover:bg-amber-100 text-panel-sm font-bold rounded-xl px-6 h-10 transition-all active:scale-[0.98]">
                                            Completar Perfil
                                        </Button>
                                    </Link>
                                </div>
                            </Alert>
                        )}
                    </div>

                    {/* Column 2: Categories */}
                    <div className="md:col-span-7 space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-panel-md font-bold text-foreground">Categorias elegíveis</h2>
                            <p className="text-panel-sm font-medium text-muted-foreground leading-relaxed">
                                De acordo com a sua cor de faixa, peso, idade e sexo, aqui estão as categorias às quais você está apto a participar. Você pode verificar e se inscrever em mais de uma delas.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {loading && suggestions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 animate-pulse">
                                    <CircleNotchIcon size={40} weight="bold" className="text-primary/20 animate-spin mb-4" />
                                    <p className="text-panel-sm text-muted-foreground italic">Analisando elegibilidade...</p>
                                </div>
                            ) : suggestions.length === 0 ? (
                                <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border flex flex-col items-center gap-4 px-6">
                                    <TrophyIcon size={56} weight="duotone" className="text-muted-foreground/10" />
                                    <div className="space-y-1">
                                        <p className="text-panel-sm font-semibold text-foreground">Nenhuma sugestão encontrada</p>
                                        <p className="text-panel-sm text-muted-foreground max-w-[280px]">Não encontramos categorias compatíveis com seu perfil neste evento.</p>
                                    </div>
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
                                                            <CheckIcon size={24} weight="duotone" className="shrink-0" />
                                                            <p className="text-panel-md font-bold">Adicionado à cesta!</p>
                                                        </div>
                                                    ), { duration: 4000 });
                                                    useAthleteCart.getState().fetchCart();
                                                } catch (err: any) {
                                                    const msg = err.message || 'Erro ao adicionar à cesta.';
                                                    toast.custom((t) => (
                                                        <div className="flex items-center gap-3 w-[356px] bg-red-600 rounded-xl px-5 py-4 shadow-xl shadow-red-600/20 text-white animate-in slide-in-from-right-2">
                                                            <InfoIcon size={24} weight="duotone" className="shrink-0" />
                                                            <p className="text-panel-md font-bold">{msg}</p>
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
                    </div>
                </div>
            </div>
        </div>
    );
}
