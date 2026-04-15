'use client';

import React, { useState, useEffect, useRef } from 'react';
import { InfoIcon, CircleNotchIcon, PackageIcon, HeartIcon } from '@phosphor-icons/react';
import { Button } from "@/components/ui/button";
import { getEligibleCategories } from '../lib/eligible-categories';
import { useAthleteCart } from '@/hooks/use-athlete-cart';
import Link from 'next/link';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// New UI Components
import { EventHeader } from './_components/EventHeader';
import { EventSummary } from './_components/EventSummary';
import { CategorySearchPanel } from './_components/CategorySearchPanel';
import { AthleteProfileCard } from './_components/AthleteProfileCard';

interface Event {
    id: string;
    title: string;
    event_date: string;
    event_end_date?: string | null;
    location?: string;
    city?: string;
    image_path?: string;
}

interface AthleteEventDetailProps {
    event: Event;
    beltColor?: string;
}

export default function AthleteEventDetail({ event, beltColor = 'branca' }: AthleteEventDetailProps) {
    const [allCategories, setAllCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isIncomplete, setIsIncomplete] = useState(false);
    const [incompleteReasons, setIncompleteReasons] = useState<string[]>([]);
    const [comboBundle, setComboBundle] = useState<{ bundle_total: number } | null>(null);
    const [athleteProfile, setAthleteProfile] = useState<{ belt_color: string | null; weight: number | null; birth_date: string | null; sexo: string | null } | null>(null);
    const [showPricingBanner, setShowPricingBanner] = useState(false);
    const pricingBannerShown = useRef(false);

    useAthleteCart(state => state.items);

    const loadCategories = React.useCallback(async () => {
        setLoading(true);
        try {
            const data = await getEligibleCategories(event.id);
            setAllCategories((data as any).allWithMeta ?? (data as any).all ?? []);
            setIsIncomplete(data.isIncomplete);
            setIncompleteReasons(data.incompleteReasons || []);
            setComboBundle((data as any).comboBundle ?? null);
            setAthleteProfile((data as any).profile ?? null);
            if ((data as any).hasAthletePricing && !pricingBannerShown.current) {
                pricingBannerShown.current = true;
                setShowPricingBanner(true);
                setTimeout(() => setShowPricingBanner(false), 7000);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [event.id]);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    const isWhiteBelt = beltColor.toLowerCase().trim() === 'branca' || beltColor.toLowerCase().trim() === 'white';

    return (
        <div
            className="min-h-screen bg-background pb-20"
            style={{
                '--primary': isWhiteBelt ? '240 10% 3.9%' : undefined
            } as React.CSSProperties}
        >
            {/* Banner de preco diferenciado */}
            {showPricingBanner && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
                    <div className="bg-black text-white px-8 py-6 rounded-3xl shadow-2xl shadow-black/50 max-w-sm mx-4 text-center animate-in zoom-in-50 fade-in duration-300 pointer-events-auto">
                        <HeartIcon size={40} weight="duotone" className="mx-auto mb-3 text-red-400 animate-bounce" />
                        <p className="text-lg font-black leading-snug">
                            Aproveita, nao perde tempo!
                        </p>
                        <p className="text-base font-semibold mt-2 text-white/90 leading-snug">
                            Reservei esse valor especial pra voce, meu atleta. OSS!
                        </p>
                    </div>
                </div>
            )}

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
                            endDate={event.event_end_date}
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

                        {athleteProfile && (
                            <AthleteProfileCard profile={athleteProfile} />
                        )}
                    </div>

                    {/* Column 2: Categories */}
                    <div className="md:col-span-7 space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-panel-md font-bold text-foreground">Categorias</h2>
                            <p className="text-panel-sm font-medium text-muted-foreground leading-relaxed">
                                Encontre e inscreva-se nas categorias deste evento.
                            </p>
                        </div>

                        {comboBundle && (
                            <div className="flex items-start gap-2.5 rounded-2xl bg-indigo-50 border border-indigo-200 px-4 py-3 text-indigo-800">
                                <PackageIcon size={18} weight="duotone" className="shrink-0 mt-0.5 text-indigo-500" />
                                <p className="text-panel-sm font-semibold leading-relaxed">
                                    <strong>Combo disponível!</strong> Inscreva-se nas 4 categorias (Absoluto Gi, Regular Gi, Absoluto No-Gi e Regular No-Gi) e pague apenas <strong>R$ {Number(comboBundle.bundle_total).toFixed(2)}</strong> no total.
                                </p>
                            </div>
                        )}

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-24 animate-pulse">
                                <CircleNotchIcon size={40} weight="bold" className="text-primary/20 animate-spin mb-4" />
                                <p className="text-panel-sm text-muted-foreground italic">Carregando categorias...</p>
                            </div>
                        ) : (
                            <CategorySearchPanel
                                eventId={event.id}
                                categories={allCategories}
                                isWhiteBelt={isWhiteBelt}
                                athleteSex={athleteProfile?.sexo ?? null}
                                athleteAge={athleteProfile?.birth_date
                                    ? (() => {
                                        const today = new Date();
                                        const birth = new Date(athleteProfile.birth_date!);
                                        return today.getFullYear() - birth.getFullYear() -
                                            (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
                                    })()
                                    : null
                                }
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
