'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    CircleNotchIcon, TicketIcon, WarningCircleIcon, CheckCircleIcon,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { getBeltStyle } from '@/lib/belt-theme';
import { CategorySearchPanel } from '@/app/atleta/dashboard/campeonatos/components/_components/CategorySearchPanel';
import { getEligibleCategoriesAction } from '@/app/(panel)/academia-equipe/dashboard/eventos/registrations-actions';
import { registerWithCreditAction } from '../../actions';
import { formatFullCategoryName } from '@/lib/category-utils';

interface Athlete {
    id: string;
    full_name: string;
    sexo: string;
    belt_color: string;
    birth_date: string;
    weight: number;
}

interface Props {
    pkg: {
        id: string;
        excluded_divisions: string[];
        notes: string | null;
    };
    event: { id: string; title: string };
    athletes: Athlete[];
    creditsLeft: number;
}

function calculateAge(birthDateStr: string) {
    if (!birthDateStr) return null;
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
}

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

export function CreditInscreverForm({ pkg, event, athletes, creditsLeft }: Props) {
    const router = useRouter();
    const [selectedAthleteId, setSelectedAthleteId] = useState('');
    const [allCategories, setAllCategories] = useState<any[]>([]);
    const [enrolledCategories, setEnrolledCategories] = useState<any[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(false);

    const selectedAthlete = useMemo(
        () => athletes.find(a => a.id === selectedAthleteId),
        [selectedAthleteId, athletes]
    );

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
                    const excluded = pkg.excluded_divisions ?? [];
                    const filter = (cats: any[]) => excluded.length === 0 ? cats : cats.filter((cat: any) => {
                        const div = cat.divisao_idade ?? '';
                        return !excluded.some((ex: string) => ex.toLowerCase() === div.toLowerCase());
                    });
                    setAllCategories(filter(data.all ?? []));
                    setEnrolledCategories(data.enrolledCategories ?? []);
                }
            })
            .catch(() => toast.error('Erro ao buscar categorias.'))
            .finally(() => setLoadingCategories(false));
    }, [selectedAthleteId, event.id, pkg.excluded_divisions]);

    const enrolledCategoryIds = useMemo(
        () => new Set<string>(enrolledCategories.map((e: any) => e.id)),
        [enrolledCategories]
    );

    const handleRegister = async (categoryId: string) => {
        if (!selectedAthleteId) return;
        const result = await registerWithCreditAction(pkg.id, event.id, selectedAthleteId, categoryId);
        if (result?.error) {
            toast.error(result.error);
            return;
        }
        toast.success('Atleta inscrito com sucesso!');
        const data = await getEligibleCategoriesAction(event.id, selectedAthleteId);
        if (!data.error) {
            const excluded = pkg.excluded_divisions ?? [];
            const filter = (cats: any[]) => excluded.length === 0 ? cats : cats.filter((cat: any) => {
                const div = cat.divisao_idade ?? '';
                return !excluded.some((ex: string) => ex.toLowerCase() === div.toLowerCase());
            });
            setAllCategories(filter(data.all ?? []));
            setEnrolledCategories(data.enrolledCategories ?? []);
        }
        router.refresh();
    };

    const isWhiteBelt = selectedAthlete?.belt_color?.toLowerCase() === 'branca' || selectedAthlete?.belt_color?.toLowerCase() === 'white';

    return (
        <Card className="max-w-4xl mx-auto border-none shadow-none bg-transparent">
            <div className="space-y-8 pb-16 md:pb-0">
                {/* Observação do pacote */}
                {pkg.notes && (
                    <div className="flex items-start gap-2 px-4 py-3 rounded-xl border bg-muted/40 text-panel-sm text-muted-foreground">
                        <TicketIcon size={16} weight="duotone" className="text-blue-500 shrink-0 mt-0.5" />
                        <span>{pkg.notes}</span>
                    </div>
                )}

                {/* Divisões bloqueadas */}
                {pkg.excluded_divisions?.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl border bg-destructive/5 text-panel-sm text-muted-foreground">
                        <WarningCircleIcon size={16} weight="duotone" className="text-destructive shrink-0" />
                        <span>Divisões não permitidas neste pacote: <strong className="text-foreground">{pkg.excluded_divisions.join(', ')}</strong></span>
                    </div>
                )}

                {/* 1. Seleção de atleta */}
                <div className="space-y-4 bg-card p-6 rounded-3xl border shadow-sm">
                    <Label className="text-panel-md font-semibold">1. Selecione o Atleta</Label>
                    <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                        <SelectTrigger className="w-full h-12 rounded-xl px-4 bg-background hover:bg-muted/50 transition-colors focus:ring-0 focus:ring-offset-0">
                            <SelectValue placeholder="Buscar atleta...">
                                {selectedAthlete && (
                                    <div className="flex items-center justify-between w-full">
                                        <span className="text-panel-sm font-semibold">{selectedAthlete.full_name}</span>
                                        <Badge
                                            variant="outline"
                                            style={getBeltStyle(selectedAthlete.belt_color)}
                                            className="text-panel-sm shadow-none uppercase font-bold px-2 py-0.5 border-border/50 mr-2"
                                        >
                                            {selectedAthlete.belt_color}
                                        </Badge>
                                    </div>
                                )}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[350px] p-2 rounded-xl">
                            {athletes.length === 0 ? (
                                <SelectItem value="none" disabled>Nenhum atleta cadastrado</SelectItem>
                            ) : athletes.map(athlete => (
                                <SelectItem key={athlete.id} value={athlete.id} className="py-2.5 px-3 mb-1 rounded-lg focus:bg-muted/60 cursor-pointer">
                                    <div className="flex items-center justify-between w-full gap-3">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-panel-sm font-semibold text-foreground truncate">{athlete.full_name}</span>
                                            <span className="text-panel-sm text-muted-foreground truncate font-medium mt-0.5">
                                                {athlete.weight}kg • {athlete.sexo}{calculateAge(athlete.birth_date) ? ` • ${calculateAge(athlete.birth_date)} anos` : ''}
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
                            ))}
                        </SelectContent>
                    </Select>

                    {selectedAthlete && (
                        <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
                            {[
                                { label: 'Sexo', value: selectedAthlete.sexo },
                                { label: 'Peso', value: `${selectedAthlete.weight}kg` },
                                { label: 'Faixa', value: selectedAthlete.belt_color },
                                calculateAge(selectedAthlete.birth_date) != null ? { label: 'Idade', value: `${calculateAge(selectedAthlete.birth_date)} anos` } : null,
                            ].filter(Boolean).map((item: any) => (
                                <div key={item.label} className="bg-muted px-3 py-1.5 rounded-lg text-panel-sm font-medium flex items-center gap-2">
                                    <span className="text-muted-foreground opacity-60">{item.label}:</span>
                                    {item.value}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 2. Categorias */}
                {selectedAthleteId && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <Label className="text-panel-md font-semibold">2. Selecione a Categoria</Label>

                        {loadingCategories ? (
                            <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
                                <CircleNotchIcon size={20} weight="bold" className="animate-spin" />
                                <span className="text-panel-sm">Buscando categorias...</span>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Já inscritos */}
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
                                            {enrolledCategories.map((ec: any) => {
                                                const s = getStatusLabel(ec.status);
                                                return (
                                                    <div key={ec.id} className="flex items-center justify-between bg-white/70 dark:bg-card rounded-xl px-4 py-3 border border-emerald-500/20 gap-3">
                                                        <span className="text-panel-sm font-bold truncate text-emerald-900 dark:text-emerald-100">
                                                            {formatFullCategoryName(ec)}
                                                        </span>
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
                                    onAddToCart={handleRegister}
                                    cartCategoryIds={enrolledCategoryIds}
                                    addToCartLabel="Inscrever"
                                    inCartLabel="Inscrito"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
}
