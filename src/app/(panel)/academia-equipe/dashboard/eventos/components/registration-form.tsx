'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CircleNotchIcon, CheckIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { getEligibleCategoriesAction } from '../registrations-actions';
import { useRegistrationCart } from '@/hooks/use-registration-cart';
import { CategorySearchPanel } from '@/app/atleta/dashboard/campeonatos/components/_components/CategorySearchPanel';
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
    const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
    const { items, addItem } = useRegistrationCart();

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

    const selectedAthlete = useMemo(() =>
        athletes.find(a => a.id === selectedAthleteId),
        [selectedAthleteId, athletes]);

    useEffect(() => {
        if (!selectedAthleteId) {
            setAllCategories([]);
            setEnrolledCategories([]);
            return;
        }
        setLoadingCategories(true);
        getEligibleCategoriesAction(event.id, selectedAthleteId)
            .then(data => {
                if (data.error) {
                    toast.error(data.error);
                } else {
                    setAllCategories(data.all || []);
                    setEnrolledCategories(data.enrolledCategories || []);
                }
            })
            .catch(() => toast.error("Erro ao buscar categorias."))
            .finally(() => setLoadingCategories(false));
    }, [selectedAthleteId, event.id]);

    const addToCart = async (categoryId: string) => {
        if (!selectedAthlete || !categoryId) return;

        const category = allCategories.find(c => c.id === categoryId);
        if (!category) return;

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
            price: isOwner && adminTax > 0 ? adminTax : category.registration_fee,
        });

        toast.custom(() => (
            <div className="flex items-center gap-3 w-[356px] bg-green-600 rounded-xl px-5 py-4 shadow-xl shadow-green-600/20 text-white animate-in slide-in-from-right-2">
                <CheckIcon size={32} weight="duotone" className="shrink-0" />
                <p className="text-panel-sm font-bold">Adicionado à cesta!</p>
            </div>
        ), { duration: 4000 });
    };

    const isWhiteBelt = selectedAthlete?.belt_color?.toLowerCase() === 'branca' || selectedAthlete?.belt_color?.toLowerCase() === 'white';

    const cartCategoryIds = useMemo(() => {
        if (!selectedAthleteId) return new Set<string>();
        return new Set<string>(
            items
                .filter(item => item.athleteId === selectedAthleteId)
                .map(item => item.categoryId)
        );
    }, [items, selectedAthleteId]);

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
                        <Label className="text-panel-md font-semibold">2. Escolha a Categoria</Label>

                        {loadingCategories ? (
                            <div className="flex flex-col items-center justify-center py-24 animate-pulse">
                                <CircleNotchIcon size={56} weight="bold" className="text-primary/20 animate-spin mb-4" />
                                <p className="text-muted-foreground font-medium italic">Carregando categorias...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Already enrolled */}
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

                                <CategorySearchPanel
                                    key={selectedAthleteId}
                                    eventId={event.id}
                                    categories={allCategories}
                                    isWhiteBelt={isWhiteBelt}
                                    athleteSex={selectedAthlete?.sexo ?? null}
                                    athleteAge={selectedAthlete?.birth_date ? (calculateAge(selectedAthlete.birth_date) as number) : null}
                                    onAddToCart={async (categoryId) => { await addToCart(categoryId); }}
                                    cartCategoryIds={cartCategoryIds}
                                />
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
