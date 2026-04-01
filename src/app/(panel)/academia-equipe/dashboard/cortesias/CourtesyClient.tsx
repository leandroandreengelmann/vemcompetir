'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
    MagnifyingGlassIcon,
    UserPlusIcon,
    CheckCircleIcon,
    CircleNotchIcon,
    TicketIcon,
    UserIcon,
    CalendarBlankIcon,
    TagIcon,
    ArrowRightIcon,
    IdentificationCardIcon,
} from '@phosphor-icons/react';
import { PassportModal } from '@/components/passport/PassportModal';
import { getBeltStyle } from '@/lib/belt-theme';
import { cn } from '@/lib/utils';
import { formatCPF, validateCPF, formatPhone } from '@/lib/validation';
import { formatFullCategoryName } from '@/lib/category-utils';
import {
    searchAthletesForCourtesyAction,
    searchGymsAction,
    getEventCategoriesForCourtesyAction,
    createCourtesyAthleteAction,
    createCourtesyRegistrationAction,
    getCourtesyRegistrationsAction,
} from './actions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Event {
    id: string;
    title: string;
    event_date: string;
    status: string;
}

interface Athlete {
    id: string;
    full_name: string;
    belt_color: string | null;
    sexo: string | null;
    birth_date: string | null;
    weight: number | null;
    cpf: string | null;
    gym_name: string | null;
}

interface Category {
    id: string;
    categoria_completa: string;
    sexo: string | null;
    faixa: string | null;
    divisao_idade: string | null;
    peso_min_kg: number | null;
    peso_max_kg: number | null;
    registration_fee: number;
}

interface CourtesyRegistration {
    id: string;
    created_at: string;
    events: { title: string; event_date: string } | null;
    athlete: { id: string; full_name: string; belt_color: string | null; gym_name: string | null } | null;
    category: { categoria_completa: string } | null;
}

interface Props {
    events: Event[];
    initialCourtesies: CourtesyRegistration[];
}

type Step = 'event' | 'athlete' | 'category';
type AthleteMode = 'search' | 'new';

function isUnder18(dateStr: string): boolean {
    if (!dateStr) return false;
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age < 18;
}

const STEPS: { key: Step; label: string }[] = [
    { key: 'event', label: 'Evento' },
    { key: 'athlete', label: 'Atleta' },
    { key: 'category', label: 'Categoria' },
];

export function CourtesyClient({ events, initialCourtesies }: Props) {
    const [step, setStep] = useState<Step>('event');
    const [athleteMode, setAthleteMode] = useState<AthleteMode>('search');

    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [reason, setReason] = useState('');

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Athlete[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);

    const [cpfValue, setCpfValue] = useState('');
    const [cpfError, setCpfError] = useState<string | null>(null);
    const [birthDateValue, setBirthDateValue] = useState('');
    const [hasGuardian, setHasGuardian] = useState(false);
    const [guardianCpfValue, setGuardianCpfValue] = useState('');
    const [guardianPhoneValue, setGuardianPhoneValue] = useState('');

    const [gymQuery, setGymQuery] = useState('');
    const [gymResults, setGymResults] = useState<{ name: string; type: 'oficial' | 'sugestao' }[]>([]);
    const [showGymDropdown, setShowGymDropdown] = useState(false);
    const gymTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const gymContainerRef = useRef<HTMLDivElement>(null);
    const isMinor = isUnder18(birthDateValue);

    const [courtesies, setCourtesies] = useState<CourtesyRegistration[]>(initialCourtesies);
    const [filterEventId, setFilterEventId] = useState<string>('all');

    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (!searchQuery.trim()) { setSearchResults([]); return; }
        searchTimeout.current = setTimeout(async () => {
            setIsSearching(true);
            const result = await searchAthletesForCourtesyAction(searchQuery);
            setSearchResults(result.data ?? []);
            setIsSearching(false);
        }, 400);
        return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
    }, [searchQuery]);

    useEffect(() => {
        if (gymTimeout.current) clearTimeout(gymTimeout.current);
        if (!gymQuery.trim() || gymQuery.trim().length < 2) { setGymResults([]); setShowGymDropdown(false); return; }
        gymTimeout.current = setTimeout(async () => {
            const result = await searchGymsAction(gymQuery);
            setGymResults(result.data ?? []);
            setShowGymDropdown(true);
        }, 300);
        return () => { if (gymTimeout.current) clearTimeout(gymTimeout.current); };
    }, [gymQuery]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (gymContainerRef.current && !gymContainerRef.current.contains(e.target as Node)) {
                setShowGymDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    async function handleSelectEvent(event: Event) {
        setSelectedEvent(event);
        setStep('athlete');
    }

    async function fetchEligibleCategories(eventId: string, athleteId: string) {
        setIsLoadingCategories(true);
        const result = await getEventCategoriesForCourtesyAction(eventId, athleteId);
        setCategories(result.data ?? []);
        setIsLoadingCategories(false);
    }

    function handleSelectAthlete(athlete: Athlete) {
        setSelectedAthlete(athlete);
        if (selectedEvent) fetchEligibleCategories(selectedEvent.id, athlete.id);
        setStep('category');
    }

    async function handleSubmitNewAthlete(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (cpfValue && !validateCPF(cpfValue)) { setCpfError('CPF inválido.'); return; }
        const formData = new FormData(e.currentTarget);
        formData.set('cpf', cpfValue.replace(/\D/g, ''));
        formData.set('gym_name', gymQuery.trim());
        startTransition(async () => {
            const result = await createCourtesyAthleteAction(formData);
            if (result.error) { toast.error(result.error); return; }
            if (result.success && result.athleteId && result.athleteName) {
                const newAthlete: Athlete = {
                    id: result.athleteId,
                    full_name: result.athleteName,
                    belt_color: formData.get('belt_color') as string || null,
                    sexo: formData.get('sexo') as string || null,
                    birth_date: formData.get('birth_date') as string || null,
                    weight: formData.get('weight') ? parseFloat(formData.get('weight') as string) : null,
                    cpf: cpfValue || null,
                    gym_name: gymQuery.trim() || null,
                };
                setSelectedAthlete(newAthlete);
                if (selectedEvent) fetchEligibleCategories(selectedEvent.id, newAthlete.id);
                setStep('category');
            }
        });
    }

    function handleConfirm() {
        if (!selectedEvent || !selectedAthlete || !selectedCategory) return;
        startTransition(async () => {
            const result = await createCourtesyRegistrationAction({
                eventId: selectedEvent.id,
                athleteId: selectedAthlete.id,
                categoryId: selectedCategory.id,
                reason,
            });
            if (result.error) { toast.error(result.error); return; }

            toast.custom(() => (
                <div className="flex items-center gap-3 w-[356px] bg-emerald-600 rounded-xl px-5 py-4 shadow-xl shadow-emerald-600/20 text-white">
                    <CheckCircleIcon size={24} weight="duotone" className="shrink-0" />
                    <p className="text-panel-sm font-bold">Cortesia concedida com sucesso!</p>
                </div>
            ), { duration: 4000 });

            if (result.tokenWarning) {
                toast.warning('Saldo de tokens negativo', {
                    description: result.tokenWarning,
                    duration: 8000,
                });
            }

            const updated = await getCourtesyRegistrationsAction(filterEventId === 'all' ? undefined : filterEventId);
            if (updated.data) setCourtesies(updated.data as unknown as CourtesyRegistration[]);

            setStep('event');
            setSelectedEvent(null);
            setSelectedAthlete(null);
            setSelectedCategory(null);
            setReason('');
            setSearchQuery('');
            setSearchResults([]);
            setCpfValue('');
            setBirthDateValue('');
            setHasGuardian(false);
            setGymQuery('');
            setGymResults([]);
            setAthleteMode('search');
        });
    }

    async function handleFilterChange(eventId: string) {
        setFilterEventId(eventId);
        const result = await getCourtesyRegistrationsAction(eventId === 'all' ? undefined : eventId);
        if (result.data) setCourtesies(result.data as unknown as CourtesyRegistration[]);
    }

    const stepIndex = STEPS.findIndex(s => s.key === step);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

            {/* ── COLUNA ESQUERDA: FORMULÁRIO ── */}
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <TicketIcon size={18} weight="duotone" className="text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-panel-md font-semibold">Nova Cortesia</CardTitle>
                            <p className="text-panel-sm text-muted-foreground mt-0.5">
                                Passo {stepIndex + 1} de {STEPS.length} — {STEPS[stepIndex].label}
                            </p>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-2 mt-4">
                        {STEPS.map((s, i) => (
                            <div key={s.key} className="flex items-center gap-2 flex-1">
                                <div className={cn(
                                    'size-6 rounded-full flex items-center justify-center text-panel-sm font-bold transition-colors shrink-0',
                                    stepIndex === i ? 'bg-primary text-primary-foreground' :
                                        stepIndex > i ? 'bg-emerald-500 text-white' :
                                            'bg-muted text-muted-foreground'
                                )}>
                                    {stepIndex > i ? '✓' : i + 1}
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div className={cn('flex-1 h-0.5 rounded-full', stepIndex > i ? 'bg-emerald-500' : 'bg-muted')} />
                                )}
                            </div>
                        ))}
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">

                    {/* ── STEP 1: EVENTO ── */}
                    {step === 'event' && (
                        <>
                            {events.length === 0 ? (
                                <p className="text-panel-sm text-muted-foreground text-center py-8">
                                    Nenhum evento encontrado.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {events.map(event => (
                                        <button
                                            key={event.id}
                                            onClick={() => handleSelectEvent(event)}
                                            disabled={isLoadingCategories}
                                            className="w-full text-left rounded-xl border border-border p-4 hover:border-primary/50 hover:bg-muted/40 transition-all flex items-center justify-between gap-3 disabled:opacity-50"
                                        >
                                            <div>
                                                <p className="text-panel-sm font-semibold">{event.title}</p>
                                                <p className="text-panel-sm text-muted-foreground mt-0.5">
                                                    {event.event_date
                                                        ? format(new Date(event.event_date), "dd/MM/yyyy", { locale: ptBR })
                                                        : '—'}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="text-panel-sm shrink-0">
                                                {event.status}
                                            </Badge>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* ── STEP 2: ATLETA ── */}
                    {step === 'athlete' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-xl">
                                <CalendarBlankIcon size={16} weight="duotone" className="text-muted-foreground shrink-0" />
                                <span className="text-panel-sm font-medium truncate">{selectedEvent?.title}</span>
                                <button
                                    onClick={() => { setStep('event'); setSelectedEvent(null); setCategories([]); }}
                                    className="ml-auto text-panel-sm text-muted-foreground hover:text-foreground shrink-0 font-medium"
                                >
                                    Trocar
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-1 p-1 bg-muted/40 rounded-xl">
                                {(['search', 'new'] as const).map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => setAthleteMode(mode)}
                                        className={cn(
                                            'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-panel-sm font-medium transition-all',
                                            athleteMode === mode ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        {mode === 'search'
                                            ? <><MagnifyingGlassIcon size={16} weight="duotone" />Buscar atleta</>
                                            : <><UserPlusIcon size={16} weight="duotone" />Novo atleta</>
                                        }
                                    </button>
                                ))}
                            </div>

                            {/* Busca */}
                            {athleteMode === 'search' && (
                                <div className="space-y-3">
                                    <div className="relative">
                                        <MagnifyingGlassIcon size={16} weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            placeholder="Nome ou CPF..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="pl-9"
                                            variant="lg"
                                        />
                                    </div>

                                    {isSearching && (
                                        <div className="flex justify-center py-4">
                                            <CircleNotchIcon size={20} weight="bold" className="animate-spin text-muted-foreground" />
                                        </div>
                                    )}

                                    {!isSearching && searchResults.length > 0 && (
                                        <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                            {searchResults.map(athlete => (
                                                <button
                                                    key={athlete.id}
                                                    onClick={() => handleSelectAthlete(athlete)}
                                                    className="w-full text-left rounded-xl border border-border p-3 hover:border-primary/50 hover:bg-muted/40 transition-all"
                                                >
                                                    <p className="text-panel-sm font-semibold">{athlete.full_name}</p>
                                                    <p className="text-panel-sm text-muted-foreground mt-0.5">
                                                        {[athlete.belt_color, athlete.sexo, athlete.gym_name].filter(Boolean).join(' · ')}
                                                    </p>
                                                    {athlete.cpf && (
                                                        <p className="text-panel-sm text-muted-foreground font-mono mt-0.5">
                                                            CPF: {formatCPF(athlete.cpf)}
                                                        </p>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                                        <p className="text-panel-sm text-muted-foreground text-center py-4">
                                            Nenhum atleta encontrado.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Formulário novo atleta */}
                            {athleteMode === 'new' && (
                                <form onSubmit={handleSubmitNewAthlete} className="space-y-4">

                                    {/* Linha 1: Academia + Nome */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-panel-sm font-semibold text-muted-foreground">Academia / Equipe</label>
                                            <div ref={gymContainerRef} className="relative">
                                                <Input
                                                    variant="lg"
                                                    name="gym_name"
                                                    placeholder="Digite para buscar..."
                                                    value={gymQuery}
                                                    onChange={e => { setGymQuery(e.target.value); setShowGymDropdown(false); }}
                                                    onFocus={() => gymResults.length > 0 && setShowGymDropdown(true)}
                                                    autoComplete="off"
                                                    disabled={isPending}
                                                />
                                                {showGymDropdown && gymResults.length > 0 && (
                                                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-lg overflow-hidden">
                                                        {gymResults.map((g, i) => (
                                                            <button
                                                                key={i}
                                                                type="button"
                                                                onMouseDown={() => { setGymQuery(g.name); setShowGymDropdown(false); }}
                                                                className="w-full text-left px-4 py-2.5 hover:bg-foreground hover:text-background transition-colors"
                                                            >
                                                                <span className="text-panel-sm font-medium">{g.name}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-panel-sm font-semibold text-muted-foreground">Nome completo *</label>
                                            <Input variant="lg" name="full_name" placeholder="Ex: João Silva" required disabled={isPending} />
                                        </div>
                                    </div>

                                    {/* Linha 2: Data de nascimento */}
                                    <div className="space-y-2">
                                        <label className="text-panel-sm font-semibold text-muted-foreground">Data de nascimento</label>
                                        <Input variant="lg" name="birth_date" type="date" disabled={isPending}
                                            value={birthDateValue}
                                            onChange={e => { setBirthDateValue(e.target.value); if (!isUnder18(e.target.value)) setHasGuardian(false); }}
                                        />
                                    </div>

                                    {/* Responsável legal — visível apenas para menores */}
                                    {isMinor && (
                                        <div className="border-2 border-amber-200 bg-amber-50/40 rounded-2xl p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-start gap-3">
                                                <Checkbox id="has_guardian" name="has_guardian" checked={hasGuardian}
                                                    onCheckedChange={v => setHasGuardian(!!v)} disabled={isPending} className="mt-1" />
                                                <div>
                                                    <label htmlFor="has_guardian" className="text-panel-sm font-bold leading-none cursor-pointer text-amber-900">
                                                        Adicionar responsável legal
                                                    </label>
                                                    <p className="text-panel-sm text-amber-700 mt-1">
                                                        Atleta menor de 18 anos. Cadastre os dados do responsável legal.
                                                    </p>
                                                </div>
                                            </div>
                                            {hasGuardian && (
                                                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                                    <div className="space-y-2">
                                                        <label className="text-panel-sm font-semibold text-muted-foreground">Vínculo com o atleta (opcional)</label>
                                                        <Select name="guardian_relationship" disabled={isPending}>
                                                            <SelectTrigger className="bg-background h-12 rounded-xl focus:ring-0 focus:ring-offset-0">
                                                                <SelectValue placeholder="Selecione o vínculo" />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-xl">
                                                                <SelectItem value="pai">Pai</SelectItem>
                                                                <SelectItem value="mae">Mãe</SelectItem>
                                                                <SelectItem value="irmao">Irmão / Irmã</SelectItem>
                                                                <SelectItem value="tio">Tio / Tia</SelectItem>
                                                                <SelectItem value="padrinho">Padrinho / Madrinha</SelectItem>
                                                                <SelectItem value="outro">Outro</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-panel-sm font-semibold text-muted-foreground">
                                                            Nome completo <span className="text-destructive ml-0.5">*</span>
                                                        </label>
                                                        <Input variant="lg" name="guardian_name" placeholder="Nome do responsável"
                                                            required={hasGuardian} disabled={isPending} />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-panel-sm font-semibold text-muted-foreground">
                                                                CPF <span className="text-destructive ml-0.5">*</span>
                                                            </label>
                                                            <Input variant="lg" name="guardian_cpf" value={guardianCpfValue}
                                                                onChange={e => setGuardianCpfValue(formatCPF(e.target.value))}
                                                                placeholder="000.000.000-00"
                                                                required={hasGuardian} disabled={isPending} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-panel-sm font-semibold text-muted-foreground">
                                                                Telefone / WhatsApp <span className="text-destructive ml-0.5">*</span>
                                                            </label>
                                                            <Input variant="lg" name="guardian_phone" value={guardianPhoneValue}
                                                                onChange={e => setGuardianPhoneValue(formatPhone(e.target.value))}
                                                                placeholder="(00) 00000-0000"
                                                                required={hasGuardian} disabled={isPending} />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Linha 3: Sexo + CPF + Peso + Faixa */}
                                    <div className="grid grid-cols-6 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-panel-sm font-semibold text-muted-foreground">Sexo *</label>
                                            <Select name="sexo" required disabled={isPending}>
                                                <SelectTrigger className="bg-background h-12 rounded-xl focus:ring-0 focus:ring-offset-0">
                                                    <SelectValue placeholder="Sel." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Masculino">Masculino</SelectItem>
                                                    <SelectItem value="Feminino">Feminino</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="col-span-2 space-y-2">
                                            <label className="text-panel-sm font-semibold text-muted-foreground">CPF *</label>
                                            <Input variant="lg" name="cpf" value={cpfValue} required disabled={isPending}
                                                onChange={e => {
                                                    const f = formatCPF(e.target.value);
                                                    setCpfValue(f);
                                                    if (f.length === 14) setCpfError(validateCPF(f) ? null : 'CPF inválido');
                                                    else setCpfError(null);
                                                }}
                                                placeholder="000.000.000-00"
                                                className={cpfError ? 'border-red-500' : ''}
                                            />
                                            {cpfError && <p className="text-panel-sm font-semibold text-red-500">{cpfError}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-panel-sm font-semibold text-muted-foreground">Peso (kg)</label>
                                            <Input variant="lg" name="weight" type="number" step="0.1" placeholder="85.5" disabled={isPending} />
                                        </div>

                                        <div className="col-span-2 space-y-2">
                                            <label className="text-panel-sm font-semibold text-muted-foreground">Faixa</label>
                                            <Select name="belt_color" disabled={isPending}>
                                                <SelectTrigger className="bg-background h-12 rounded-xl focus:ring-0 focus:ring-offset-0">
                                                    <SelectValue placeholder="Selecione a faixa" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-muted">
                                                    {['Branca','Cinza e branca','Cinza','Cinza e preta','Amarela e branca','Amarela','Amarela e preta','Laranja e branca','Laranja','Laranja e preta','Verde e branca','Verde','Verde e preta','Azul','Roxa','Marrom','Preta','Coral','Vermelha'].map(b => (
                                                        <SelectItem key={b} value={b}>{b}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <Button pill type="submit" className="w-full" disabled={isPending}>
                                        {isPending
                                            ? <><CircleNotchIcon size={18} weight="bold" className="animate-spin mr-2" />Cadastrando...</>
                                            : <><UserPlusIcon size={18} weight="duotone" className="mr-2" />Cadastrar e continuar</>
                                        }
                                    </Button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* ── STEP 3: CATEGORIA ── */}
                    {step === 'category' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-xl">
                                    <CalendarBlankIcon size={16} weight="duotone" className="text-muted-foreground shrink-0" />
                                    <span className="text-panel-sm font-medium truncate">{selectedEvent?.title}</span>
                                </div>
                                <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-xl">
                                    <UserIcon size={16} weight="duotone" className="text-muted-foreground shrink-0" />
                                    <span className="text-panel-sm font-medium truncate">{selectedAthlete?.full_name}</span>
                                    <button
                                        onClick={() => { setStep('athlete'); setSelectedAthlete(null); setSelectedCategory(null); }}
                                        className="ml-auto text-panel-sm text-muted-foreground hover:text-foreground shrink-0 font-medium"
                                    >
                                        Trocar
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-panel-sm font-semibold text-muted-foreground">Motivo da cortesia</label>
                                <Select value={reason} onValueChange={setReason}>
                                    <SelectTrigger className="bg-background h-12 rounded-xl focus:ring-0 focus:ring-offset-0">
                                        <SelectValue placeholder="Selecione o motivo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="arbitro">Árbitro</SelectItem>
                                        <SelectItem value="patrocinado">Patrocinado</SelectItem>
                                        <SelectItem value="convidado">Convidado</SelectItem>
                                        <SelectItem value="staff">Staff / Organização</SelectItem>
                                        <SelectItem value="outro">Outro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-panel-sm font-semibold text-muted-foreground">Categoria *</label>
                                {isLoadingCategories ? (
                                    <div className="flex justify-center py-6">
                                        <CircleNotchIcon size={20} weight="bold" className="animate-spin text-muted-foreground" />
                                    </div>
                                ) : categories.length === 0 ? (
                                    <p className="text-panel-sm text-muted-foreground text-center py-4">
                                        Nenhuma categoria encontrada para este evento.
                                    </p>
                                ) : (
                                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                                        {categories.map(cat => {
                                            const isSelected = selectedCategory?.id === cat.id;
                                            return (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => setSelectedCategory(cat)}
                                                    className={cn(
                                                        'group w-full text-left flex flex-col gap-3 p-4 rounded-3xl border shadow-sm transition-all active:scale-[0.99] outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                                                        isSelected
                                                            ? 'border-primary ring-2 ring-primary ring-offset-2 bg-primary/5'
                                                            : 'border-border bg-card hover:shadow-md hover:border-primary/20'
                                                    )}
                                                >
                                                    <h3 className={cn(
                                                        'text-panel-md font-semibold leading-snug line-clamp-2',
                                                        isSelected ? 'text-primary' : 'text-foreground group-hover:text-primary'
                                                    )}>
                                                        {formatFullCategoryName(cat as any)}
                                                    </h3>

                                                    <div className="flex items-center justify-between gap-2 border-t border-border/30 pt-3">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            {cat.faixa && (
                                                                <Badge
                                                                    variant="outline"
                                                                    style={getBeltStyle(cat.faixa)}
                                                                    className="text-panel-sm font-semibold px-3 py-1 uppercase tracking-wider h-7 flex items-center shadow-sm rounded-md border-border/50"
                                                                >
                                                                    {cat.faixa}
                                                                </Badge>
                                                            )}
                                                            <span className="text-panel-sm font-semibold text-muted-foreground">Grátis</span>
                                                        </div>

                                                        <div className={cn(
                                                            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-panel-sm font-bold transition-all shrink-0',
                                                            isSelected
                                                                ? 'bg-primary text-primary-foreground'
                                                                : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                                                        )}>
                                                            {isSelected
                                                                ? <><CheckCircleIcon size={14} weight="duotone" />Selecionado</>
                                                                : <><ArrowRightIcon size={14} weight="duotone" />Selecionar</>
                                                            }
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <Button
                                pill
                                onClick={handleConfirm}
                                disabled={!selectedCategory || isPending}
                                className="w-full"
                            >
                                {isPending
                                    ? <><CircleNotchIcon size={18} weight="bold" className="animate-spin mr-2" />Confirmando...</>
                                    : <><CheckCircleIcon size={18} weight="duotone" className="mr-2" />Confirmar cortesia</>
                                }
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── COLUNA DIREITA: LISTA ── */}
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-panel-md font-semibold">Cortesias concedidas</CardTitle>
                        <Select value={filterEventId} onValueChange={handleFilterChange}>
                            <SelectTrigger className="h-9 w-auto min-w-[160px] rounded-xl text-panel-sm focus:ring-0 focus:ring-offset-0">
                                <SelectValue placeholder="Todos os eventos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os eventos</SelectItem>
                                {events.map(e => (
                                    <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {courtesies.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center">
                                <TagIcon size={24} weight="duotone" className="text-muted-foreground" />
                            </div>
                            <p className="text-panel-sm text-muted-foreground">Nenhuma cortesia concedida ainda.</p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-3">
                            {courtesies.map(c => (
                                <div key={c.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <p className="text-panel-sm font-semibold truncate">{c.athlete?.full_name ?? '—'}</p>
                                        {c.athlete?.gym_name && (
                                            <p className="text-panel-sm text-muted-foreground truncate">{c.athlete.gym_name}</p>
                                        )}
                                        <p className="text-panel-sm text-muted-foreground truncate">
                                            {c.category?.categoria_completa ?? '—'}
                                        </p>
                                        <p className="text-panel-sm text-muted-foreground/60 truncate">
                                            {(c.events as { title: string } | null)?.title ?? '—'} · {format(new Date(c.created_at), "dd/MM/yy", { locale: ptBR })}
                                        </p>
                                    </div>
                                    <PassportModal
                                        registrationId={c.id}
                                        trigger={
                                            <Button variant="outline" pill size="sm" className="text-panel-sm font-bold gap-1.5 shrink-0">
                                                <IdentificationCardIcon size={14} weight="duotone" />
                                                Passaporte
                                            </Button>
                                        }
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
