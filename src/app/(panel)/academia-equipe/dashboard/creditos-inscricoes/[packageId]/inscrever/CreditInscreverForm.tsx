'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    CircleNotchIcon, MagnifyingGlassIcon, TicketIcon, WarningCircleIcon,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { getBeltStyle } from '@/lib/belt-theme';
import { useDebounce } from '@/hooks/use-debounce';
import { RegistrationCategoryCard } from '@/app/(panel)/academia-equipe/dashboard/eventos/components/registration-category-card';
import { getEligibleCategoriesAction } from '@/app/(panel)/academia-equipe/dashboard/eventos/registrations-actions';
import { registerWithCreditAction } from '../../actions';

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
    if (!birthDateStr) return '';
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
}

export function CreditInscreverForm({ pkg, event, athletes, creditsLeft }: Props) {
    const router = useRouter();
    const [selectedAthleteId, setSelectedAthleteId] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [allCategories, setAllCategories] = useState<any[]>([]);
    const [enrolledCategories, setEnrolledCategories] = useState<any[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [registering, setRegistering] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedQuery = useDebounce(searchQuery, 300);

    const selectedAthlete = useMemo(
        () => athletes.find(a => a.id === selectedAthleteId),
        [selectedAthleteId, athletes]
    );

    useEffect(() => {
        if (!selectedAthleteId) {
            setSuggestions([]);
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
                    // Filter by excluded_divisions
                    const excluded = pkg.excluded_divisions ?? [];
                    const filter = (cats: any[]) => excluded.length === 0 ? cats : cats.filter((cat: any) => {
                        const div = cat.divisao_idade ?? cat.divisao ?? '';
                        return !excluded.some((ex: string) => ex.toLowerCase() === div.toLowerCase());
                    });
                    setSuggestions(filter(data.suggestions ?? []));
                    setAllCategories(filter(data.all ?? []));
                    setEnrolledCategories(data.enrolledCategories ?? []);
                }
            })
            .catch(() => toast.error('Erro ao buscar categorias.'))
            .finally(() => setLoadingCategories(false));
    }, [selectedAthleteId, event.id, pkg.excluded_divisions]);

    const filteredAll = useMemo(() => {
        if (!debouncedQuery) return allCategories;
        const lower = debouncedQuery.toLowerCase();
        return allCategories.filter(cat =>
            cat.categoria_completa?.toLowerCase().includes(lower) ||
            cat.faixa?.toLowerCase().includes(lower) ||
            cat.divisao_idade?.toLowerCase().includes(lower)
        );
    }, [allCategories, debouncedQuery]);

    const noSuggestionDiagnosis = useMemo(() => {
        if (suggestions.length > 0 || loadingCategories || !selectedAthleteId) return null;
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
    }, [suggestions, loadingCategories, selectedAthleteId, allCategories, enrolledCategories]);

    const handleRegister = async (categoryId: string) => {
        if (!selectedAthleteId) return;
        setRegistering(categoryId);
        const result = await registerWithCreditAction(pkg.id, event.id, selectedAthleteId, categoryId);
        if (result?.error) {
            toast.error(result.error);
            setRegistering(null);
            return;
        }
        toast.success('Atleta inscrito com sucesso!');
        setRegistering(null);
        // Refresh categories to reflect new enrollment
        const data = await getEligibleCategoriesAction(event.id, selectedAthleteId);
        if (!data.error) {
            const excluded = pkg.excluded_divisions ?? [];
            const filter = (cats: any[]) => excluded.length === 0 ? cats : cats.filter((cat: any) => {
                const div = cat.divisao_idade ?? cat.divisao ?? '';
                return !excluded.some((ex: string) => ex.toLowerCase() === div.toLowerCase());
            });
            setSuggestions(filter(data.suggestions ?? []));
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
                                calculateAge(selectedAthlete.birth_date) ? { label: 'Idade', value: `${calculateAge(selectedAthlete.birth_date)} anos` } : null,
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
                    <div className="space-y-4 bg-card p-6 rounded-3xl border shadow-sm animate-in fade-in slide-in-from-bottom-2">
                        <Label className="text-panel-md font-semibold">2. Selecione a Categoria</Label>

                        {loadingCategories ? (
                            <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
                                <CircleNotchIcon size={20} weight="bold" className="animate-spin" />
                                <span className="text-panel-sm">Buscando categorias...</span>
                            </div>
                        ) : (
                            <Tabs defaultValue="match">
                                <TabsList className="mb-4">
                                    <TabsTrigger value="match">
                                        Sugeridas
                                        {suggestions.length > 0 && (
                                            <Badge variant="secondary" className="ml-2 rounded-full text-[10px]">{suggestions.length}</Badge>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="all">
                                        Todas
                                        {allCategories.length > 0 && (
                                            <Badge variant="secondary" className="ml-2 rounded-full text-[10px]">{allCategories.length}</Badge>
                                        )}
                                    </TabsTrigger>
                                </TabsList>

                                {/* Sugeridas */}
                                <TabsContent value="match" className="space-y-3">
                                    {noSuggestionDiagnosis ? (
                                        <Alert>
                                            <WarningCircleIcon size={16} />
                                            <AlertTitle>Nenhuma categoria compatível</AlertTitle>
                                            <AlertDescription className="text-panel-sm mt-1">
                                                {noSuggestionDiagnosis.hasEnrolled
                                                    ? 'Este atleta já está inscrito em todas as categorias compatíveis.'
                                                    : noSuggestionDiagnosis.hasCategories
                                                        ? 'O perfil do atleta (faixa, peso, sexo, idade) não corresponde às categorias disponíveis. Veja a aba "Todas" para inscrição manual.'
                                                        : 'Nenhuma categoria disponível neste evento.'}
                                            </AlertDescription>
                                        </Alert>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {suggestions.map(cat => (
                                                <RegistrationCategoryCard
                                                    key={cat.id}
                                                    eventId={event.id}
                                                    category={cat}
                                                    isWhiteBelt={isWhiteBelt}
                                                    onAddToCart={async () => handleRegister(cat.id)}
                                                    isInCart={enrolledCategories.some((e: any) => e.id === cat.id)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>

                                {/* Todas */}
                                <TabsContent value="all" className="space-y-3">
                                    <div className="relative">
                                        <MagnifyingGlassIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar categoria..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="pl-9 h-10 rounded-xl bg-background"
                                        />
                                    </div>
                                    {filteredAll.length === 0 ? (
                                        <p className="text-center text-panel-sm text-muted-foreground py-8">
                                            Nenhuma categoria encontrada.
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {filteredAll.map(cat => (
                                                <RegistrationCategoryCard
                                                    key={cat.id}
                                                    eventId={event.id}
                                                    category={cat}
                                                    isWhiteBelt={isWhiteBelt}
                                                    onAddToCart={async () => handleRegister(cat.id)}
                                                    isInCart={enrolledCategories.some((e: any) => e.id === cat.id)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
}
