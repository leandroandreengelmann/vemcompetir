'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Check, Loader2, X, AlertCircle, CheckCircle2, ChevronRight, ArrowLeft, LogOut } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { updateAthleteProfile, searchGyms, searchMasters, signOutAction } from './actions';
import { useDebounce } from '@/hooks/use-debounce';
import { getBeltColor, hexToHsl } from '@/lib/belt-theme';
import { validateCPF, formatCPF, formatPhone, normalizeNumeric } from '@/lib/validation';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

interface ProfileFormProps {
    profile: any;
    user: any;
    belts: string[];
}

export function AthleteProfileForm({ profile, user, belts }: ProfileFormProps) {
    const searchParams = useSearchParams();
    const initialStep = searchParams.get('step') ? parseInt(searchParams.get('step') as string, 10) : 1;

    const [step, setStep] = useState(initialStep);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const [currentBelt, setCurrentBelt] = useState((profile?.belt_color || 'Branca').toLowerCase());

    useEffect(() => {
        if (profile?.belt_color) {
            setCurrentBelt(profile.belt_color.toLowerCase());
        }
    }, [profile?.belt_color]);

    // Use official project colors for consistency
    const activeHex = getBeltColor(currentBelt);
    const activeHsl = hexToHsl(activeHex);

    // For foreground, use black for white belt, otherwise white
    const isWhiteBelt = currentBelt === 'branca';
    const activeFg = isWhiteBelt ? '240 10% 3.9%' : '0 0% 100%';
    const activeBorder = isWhiteBelt ? '240 5.9% 90%' : activeHsl;

    // Form states
    const [gymQuery, setGymQuery] = useState(profile?.gym_name || '');
    const [gymResults, setGymResults] = useState<{ official: any[], community: string[] }>({ official: [], community: [] });
    const [showGymResults, setShowGymResults] = useState(false);
    const [selectedGym, setSelectedGym] = useState<{ id?: string, name: string } | null>(
        profile?.tenant_id ? { id: profile.tenant_id, name: profile.gym_name || '' } :
            profile?.gym_name ? { name: profile.gym_name } : null
    );

    const [masterQuery, setMasterQuery] = useState(profile?.master_name || '');
    const [masterResults, setMasterResults] = useState<{ official: any[], community: string[] }>({ official: [], community: [] });
    const [showMasterResults, setShowMasterResults] = useState(false);
    const [selectedMaster, setSelectedMaster] = useState<{ id?: string, name: string } | null>(
        profile?.master_id ? { id: profile.master_id, name: profile.master_name || '' } :
            profile?.master_name ? { name: profile.master_name } : null
    );

    const [isFetchingGyms, setIsFetchingGyms] = useState(false);
    const [isFetchingMasters, setIsFetchingMasters] = useState(false);

    const [cpfValue, setCpfValue] = useState(profile?.cpf ? formatCPF(profile.cpf) : '');
    const [phoneValue, setPhoneValue] = useState(profile?.phone ? formatPhone(profile.phone) : '');
    const [cpfError, setCpfError] = useState<string | null>(null);
    const [birthDateValue, setBirthDateValue] = useState(profile?.birth_date || '');
    const [emailValue, setEmailValue] = useState(user?.email || '');

    const calculatedAge = React.useMemo(() => {
        if (!birthDateValue) return null;
        const parts = birthDateValue.split('-');
        if (parts.length !== 3) return null;
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const birthDate = new Date(year, month, day);
        const today = new Date();

        if (isNaN(birthDate.getTime()) || birthDate > today) return null;

        let ageNum = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            ageNum--;
        }
        return ageNum;
    }, [birthDateValue]);

    const debouncedGymQuery = useDebounce(gymQuery, 300);
    const debouncedMasterQuery = useDebounce(masterQuery, 300);

    const gymRef = useRef<HTMLDivElement>(null);
    const masterRef = useRef<HTMLDivElement>(null);

    // Form refs for validation
    const formRef = useRef<HTMLFormElement>(null);

    // Click outside to close results
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (gymRef.current && !gymRef.current.contains(event.target as Node)) setShowGymResults(false);
            if (masterRef.current && !masterRef.current.contains(event.target as Node)) setShowMasterResults(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Fetch Gyms
    useEffect(() => {
        if (debouncedGymQuery.length > 1 && !selectedGym) {
            Promise.resolve().then(() => setIsFetchingGyms(true));
            searchGyms(debouncedGymQuery).then(results => {
                setGymResults(results);
                setIsFetchingGyms(false);
                setShowGymResults(true);
            }).catch(() => {
                setIsFetchingGyms(false);
            });
        } else {
            Promise.resolve().then(() => {
                setGymResults({ official: [], community: [] });
                setShowGymResults(false);
                setIsFetchingGyms(false);
            });
        }
    }, [debouncedGymQuery, selectedGym]);

    // Fetch Masters
    useEffect(() => {
        const shouldSearch = selectedGym && (debouncedMasterQuery.length > 1 || debouncedMasterQuery.length === 0);

        if (shouldSearch && !selectedMaster) {
            Promise.resolve().then(() => setIsFetchingMasters(true));
            searchMasters(debouncedMasterQuery, selectedGym.id, selectedGym.id ? undefined : selectedGym.name)
                .then(results => {
                    setMasterResults(results);
                    setIsFetchingMasters(false);
                    setShowMasterResults(true);
                })
                .catch(() => {
                    setIsFetchingMasters(false);
                });
        } else if (!selectedGym) {
            Promise.resolve().then(() => {
                setMasterResults({ official: [], community: [] });
                setShowMasterResults(false);
                setIsFetchingMasters(false);
            });
        }
    }, [debouncedMasterQuery, selectedMaster, selectedGym]);

    const handleGymSelect = (gym: { id?: string, name: string }) => {
        setSelectedGym(gym);
        setGymQuery(gym.name);
        setShowGymResults(false);
        setSelectedMaster(null);
        setMasterQuery('');
    };

    const handleMasterSelect = (master: { id?: string, name: string }) => {
        setSelectedMaster(master);
        setMasterQuery(master.name);
        setShowMasterResults(false);
    };

    const clearGym = () => {
        setSelectedGym(null);
        setGymQuery('');
        setSelectedMaster(null);
        setMasterQuery('');
    };

    const clearMaster = () => {
        setSelectedMaster(null);
        setMasterQuery('');
    };

    const validateStep = (s: number) => {
        if (!formRef.current) return false;
        const formData = new FormData(formRef.current);

        if (s === 1) {
            const name = formData.get('full_name') as string;
            const birth = formData.get('birth_date') as string;
            const sexo = formData.get('sexo') as string;
            const cpf = cpfValue;
            if (!name || name.length < 3) return false;
            if (!birth) return false;
            if (!sexo) return false;
            if (!emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) return false;
            if (!cpf || !validateCPF(cpf)) return false;
            return true;
        }

        if (s === 2) {
            if (!selectedGym) return false;
            // Master name is optional if athlete doesn't have one? 
            // In the original form it was potentially optional. 
            // Let's keep it required for the wizard if we want a complete profile.
            // Actually, master is usually required for competition.
            if (!selectedMaster) return false;
            return true;
        }

        return true;
    };

    const nextStep = () => {
        if (validateStep(step)) {
            setStep(s => s + 1);
            setMessage(null);
        } else {
            setMessage({ type: 'error', text: 'Por favor, preencha os campos obrigatórios corretamente.' });
        }
    };

    const prevStep = () => {
        setStep(s => s - 1);
        setMessage(null);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Final validation
        if (!validateStep(1) || !validateStep(2)) {
            setMessage({ type: 'error', text: 'Existem campos inválidos em etapas anteriores.' });
            return;
        }

        const formDataObj = new FormData(e.currentTarget);
        const belt = formDataObj.get('belt_color') as string;
        const weight = formDataObj.get('weight') as string;

        if (!belt || !weight || !phoneValue || phoneValue.length < 14) {
            setMessage({ type: 'error', text: 'Por favor, preencha todos os campos obrigatórios da última etapa.' });
            return;
        }

        if (cpfValue && !validateCPF(cpfValue)) {
            setCpfError('CPF inválido.');
            setMessage({ type: 'error', text: 'Por favor, corrija o CPF informado.' });
            return;
        }

        setLoading(true);
        setMessage(null);

        const formData = new FormData(e.currentTarget);

        if (selectedGym?.id) formData.append('tenant_id', selectedGym.id);
        if (selectedGym?.name) formData.append('gym_name', selectedGym.name);

        if (selectedMaster?.id) formData.append('master_id', selectedMaster.id);
        if (selectedMaster?.name) formData.append('master_name', selectedMaster.name);

        // Ensure normalized values are sent
        formData.set('cpf', normalizeNumeric(cpfValue));
        formData.set('phone', normalizeNumeric(phoneValue));

        const result = await updateAthleteProfile(formData);

        if (result?.error) {
            setMessage({ type: 'error', text: result.error });
        } else {
            setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col gap-8">
            {/* Progress Bar */}
            <div className="space-y-4 px-1">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-caption font-bold text-muted-foreground uppercase tracking-widest">
                        Passo {step} de 3
                    </span>
                    <span className="text-caption font-bold text-primary uppercase">
                        {step === 1 ? 'Identidade' : step === 2 ? 'Vínculo' : 'Técnico'}
                    </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex gap-1 p-[2px]">
                    <div className={cn("h-full rounded-full transition-all duration-500", step >= 1 ? "bg-primary flex-1" : "bg-transparent w-0")} />
                    <div className={cn("h-full rounded-full transition-all duration-500", step >= 2 ? "bg-primary flex-1" : "bg-transparent w-0")} />
                    <div className={cn("h-full rounded-full transition-all duration-500", step >= 3 ? "bg-primary flex-1" : "bg-transparent w-0")} />
                </div>
            </div>

            <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="space-y-6"
                style={{
                    '--primary': activeHsl,
                    '--primary-foreground': activeFg,
                    '--border-belt': activeBorder
                } as React.CSSProperties}
            >
                {message && (
                    <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={`animate-in fade-in zoom-in duration-300 ${message.type === 'success' ? 'border-green-500 text-green-700 bg-green-50 [&>svg]:text-green-600' : ''}`}>
                        {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        <AlertTitle>{message.type === 'success' ? 'Sucesso!' : 'Erro'}</AlertTitle>
                        <AlertDescription>{message.text}</AlertDescription>
                    </Alert>
                )}

                <div className="min-h-[340px]">
                    {/* STEP 1: IDENTIDADE */}
                    <div className={cn("space-y-6 animate-in fade-in slide-in-from-right-4 duration-300", step !== 1 && "hidden")}>
                        <div className="space-y-2">
                            <Label htmlFor="full_name" className="text-ui font-medium text-muted-foreground">Nome completo <span className="text-red-500 ml-1">*</span></Label>
                            <Input
                                id="full_name"
                                name="full_name"
                                defaultValue={profile?.full_name || ''}
                                placeholder="Seu nome oficial"
                                required
                                minLength={3}
                                className="bg-background h-12 text-base rounded-xl shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sexo" className="text-ui font-medium text-muted-foreground">Sexo <span className="text-red-500 ml-1">*</span></Label>
                                <Select name="sexo" defaultValue={profile?.sexo || undefined}>
                                    <SelectTrigger className={`h-12 rounded-xl shadow-none focus:ring-0 focus:ring-offset-0 font-medium bg-white border ${isWhiteBelt ? 'border-gray-200' : 'border-primary/20'}`}>
                                        <SelectValue placeholder="Selecione seu sexo" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="Masculino" className="font-medium cursor-pointer focus:bg-primary focus:text-primary-foreground">Masculino</SelectItem>
                                        <SelectItem value="Feminino" className="font-medium cursor-pointer focus:bg-primary focus:text-primary-foreground">Feminino</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="birth_date" className="text-ui font-medium text-muted-foreground">Data de nascimento <span className="text-red-500 ml-1">*</span></Label>
                                <div className="flex flex-col gap-1.5">
                                    <Input
                                        id="birth_date"
                                        name="birth_date"
                                        type="date"
                                        value={birthDateValue}
                                        onChange={(e) => setBirthDateValue(e.target.value)}
                                        required
                                        className="h-12 rounded-xl shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 font-medium"
                                        style={{ accentColor: isWhiteBelt ? "black" : "hsl(var(--primary))" }}
                                    />
                                    {calculatedAge !== null && calculatedAge >= 0 && (
                                        <p className="text-sm font-medium pl-1 text-[hsl(var(--primary))]">
                                            Sua idade é {calculatedAge} {calculatedAge === 1 ? 'ano' : 'anos'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cpf" className="text-ui font-medium text-muted-foreground">CPF <span className="text-red-500 ml-1">*</span></Label>
                            <Input
                                id="cpf"
                                name="cpf"
                                value={cpfValue}
                                onChange={(e) => {
                                    const formatted = formatCPF(e.target.value);
                                    setCpfValue(formatted);
                                    if (formatted.length === 14) {
                                        if (!validateCPF(formatted)) {
                                            setCpfError('CPF inválido');
                                        } else {
                                            setCpfError(null);
                                        }
                                    } else {
                                        setCpfError(null);
                                    }
                                }}
                                placeholder="000.000.000-00"
                                required
                                className={`h-12 rounded-xl shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 font-medium ${cpfError ? 'border-red-500' : ''}`}
                            />
                            {cpfError && <p className="text-xs text-red-500 font-medium">{cpfError}</p>}
                        </div>

                        <div className="space-y-2 pt-2">
                            <Label htmlFor="email" className="text-ui font-medium text-muted-foreground">E-mail (login) <span className="text-red-500 ml-1">*</span></Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                value={emailValue}
                                onChange={(e) => setEmailValue(e.target.value)}
                                className="h-12 rounded-xl shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 font-medium bg-background"
                                required
                            />
                        </div>
                    </div>

                    {/* STEP 2: VÍNCULO */}
                    <div className={cn("space-y-6 animate-in fade-in slide-in-from-right-4 duration-300", step !== 2 && "hidden")}>
                        <div className="space-y-4 relative" ref={gymRef}>
                            <div className="space-y-1">
                                <Label className="text-ui font-medium text-muted-foreground">Academia / equipe <span className="text-red-500 ml-1">*</span></Label>
                                <p className="text-sm font-medium text-[hsl(var(--primary))] leading-tight">
                                    {selectedGym
                                        ? "Para se desvincular desta academia e adicionar outra, basta clicar no X ao lado do nome. Isso limpará os campos para uma nova busca."
                                        : "Digite o nome da sua equipe / academia para buscar. Caso ela ainda não exista no sistema, você poderá cadastrá-la em seguida."
                                    }
                                </p>
                            </div>
                            <div className="relative">
                                <Input
                                    placeholder="Busque sua equipe / academia..."
                                    value={gymQuery}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setGymQuery(value);
                                        if (selectedGym) setSelectedGym(null);
                                    }}
                                    className="h-12 rounded-xl shadow-none pr-10 focus-visible:ring-0 focus-visible:ring-offset-0 text-ui font-medium"
                                    autoComplete="off"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    {isFetchingGyms && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                    {selectedGym ? (
                                        <button type="button" onClick={clearGym} className="text-muted-foreground hover:text-foreground">
                                            <X className="h-5 w-5" />
                                        </button>
                                    ) : null}
                                </div>
                            </div>

                            {showGymResults && gymQuery.length > 1 && (
                                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <div className="max-h-60 overflow-y-auto p-1">
                                        <div className="flex flex-wrap gap-2 p-3">
                                            {gymResults?.official?.map(g => (
                                                <button key={g.id} type="button" onClick={() => handleGymSelect({ id: g.id, name: g.name })} className="transition-transform active:scale-95">
                                                    <Badge variant="outline" className={`h-9 px-4 text-sm font-medium cursor-pointer rounded-full ${isWhiteBelt
                                                        ? "border-brand-950/20 bg-muted/50 text-foreground hover:bg-muted"
                                                        : "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.15)]"
                                                        }`}>
                                                        {g.name}
                                                    </Badge>
                                                </button>
                                            ))}

                                            {gymResults?.community?.map(name => (
                                                <button key={name} type="button" onClick={() => handleGymSelect({ name })} className="transition-transform active:scale-95">
                                                    <Badge variant="outline" className={`h-9 px-4 text-sm font-medium cursor-pointer rounded-full ${isWhiteBelt
                                                        ? "border-brand-950/20 bg-muted/50 text-foreground hover:bg-muted"
                                                        : "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.15)]"
                                                        }`}>
                                                        {name}
                                                    </Badge>
                                                </button>
                                            ))}

                                            {(!gymResults?.official?.length && !gymResults?.community?.length) && (
                                                <p className="w-full py-4 text-sm text-center text-muted-foreground">Nenhuma equipe encontrada.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-muted/30 mt-2 border-t border-border/60 space-y-3">
                                        <div className="space-y-1">
                                            <p className="text-ui font-semibold text-slate-900">Não encontrou sua equipe/academia?</p>
                                            <p className="text-caption text-muted-foreground">Você pode cadastrar agora e usar no seu perfil.</p>
                                        </div>
                                        <Link href={`/atleta/dashboard/perfil/cadastrar-academia?belt=${currentBelt}`} className="block">
                                            <Button
                                                type="button"
                                                className={`w-full h-10 rounded-full text-sm font-bold ${isWhiteBelt
                                                    ? "bg-background text-foreground border border-brand-950/20 shadow-none hover:bg-muted/40"
                                                    : "bg-primary text-primary-foreground border-none hover:opacity-90"
                                                    }`}
                                            >
                                                Cadastrar equipe
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={cn("space-y-2 relative animate-in fade-in slide-in-from-top-2", !selectedGym && "opacity-50 pointer-events-none")} ref={masterRef}>
                            <Label className="text-ui font-medium text-muted-foreground">Mestre / professor responsável <span className="text-red-500 ml-1">*</span></Label>
                            <div className="relative">
                                <Input
                                    placeholder="Quem é seu mestre?"
                                    value={masterQuery}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setMasterQuery(value);
                                        if (selectedMaster) setSelectedMaster(null);
                                    }}
                                    onFocus={() => {
                                        if (selectedGym && !selectedMaster) setShowMasterResults(true);
                                    }}
                                    className="h-12 rounded-xl shadow-none pr-10 focus-visible:ring-0 focus-visible:ring-offset-0 font-medium"
                                    autoComplete="off"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    {isFetchingMasters && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                    {selectedMaster ? (
                                        <button type="button" onClick={clearMaster} className="text-muted-foreground hover:text-foreground">
                                            <X className="h-5 w-5" />
                                        </button>
                                    ) : null}
                                </div>
                            </div>

                            {showMasterResults && (debouncedMasterQuery.length > 1 || debouncedMasterQuery.length === 0) && (
                                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <div className="max-h-60 overflow-y-auto p-1">
                                        <div className="flex flex-wrap gap-2 p-3">
                                            {masterResults?.official?.map(m => (
                                                <button key={m.id} type="button" onClick={() => handleMasterSelect({ id: m.id, name: m.full_name })} className="transition-transform active:scale-95">
                                                    <Badge variant="outline" className={`h-9 px-4 text-sm font-medium cursor-pointer rounded-full ${isWhiteBelt
                                                        ? "border-brand-950/20 bg-muted/50 text-foreground hover:bg-muted"
                                                        : "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.15)]"
                                                        }`}>
                                                        {m.full_name}
                                                    </Badge>
                                                </button>
                                            ))}

                                            {masterResults?.community?.map(name => (
                                                <button key={name} type="button" onClick={() => handleMasterSelect({ name })} className="transition-transform active:scale-95">
                                                    <Badge variant="outline" className={`h-9 px-4 text-sm font-medium cursor-pointer rounded-full ${isWhiteBelt
                                                        ? "border-brand-950/20 bg-muted/50 text-foreground hover:bg-muted"
                                                        : "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.15)]"
                                                        }`}>
                                                        {name}
                                                    </Badge>
                                                </button>
                                            ))}

                                            {(!masterResults?.official?.length && !masterResults?.community?.length) && (
                                                <p className="w-full py-4 text-sm text-center text-muted-foreground">Nenhum mestre encontrado.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-muted/30 mt-2 border-t border-border/60 space-y-3">
                                        <div className="space-y-1">
                                            <p className="text-ui font-semibold text-slate-900">Não encontrou seu mestre?</p>
                                            <p className="text-caption text-muted-foreground">Você pode cadastrar agora e usar no seu perfil.</p>
                                        </div>
                                        <Link
                                            href={`/atleta/dashboard/perfil/cadastrar-mestre?belt=${currentBelt}${selectedGym?.id ? `&tenantId=${selectedGym.id}` : ''}${selectedGym?.name ? `&gymName=${encodeURIComponent(selectedGym.name)}` : ''}`}
                                            className="block"
                                        >
                                            <Button
                                                type="button"
                                                className={`w-full h-10 rounded-full text-sm font-bold ${isWhiteBelt
                                                    ? "bg-background text-foreground border border-brand-950/20 shadow-none hover:bg-muted/40"
                                                    : "bg-primary text-primary-foreground border-none hover:opacity-90"
                                                    }`}
                                            >
                                                Cadastrar
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* STEP 3: TÉCNICO & CONTATO */}
                    <div className={cn("space-y-6 animate-in fade-in slide-in-from-right-4 duration-300", step !== 3 && "hidden")}>
                        <div className="space-y-2">
                            <Label htmlFor="belt_color" className="text-ui font-medium text-muted-foreground">Cor da faixa <span className="text-red-500 ml-1">*</span></Label>
                            <Select
                                name="belt_color"
                                defaultValue={profile?.belt_color?.toLowerCase() || undefined}
                                onValueChange={(val) => setCurrentBelt(val.toLowerCase())}
                            >
                                <SelectTrigger className={`h-12 rounded-xl shadow-none focus:ring-2 focus:ring-primary focus:ring-offset-0 font-medium border ${isWhiteBelt ? 'border-gray-200' : 'border-primary/20'}`}>
                                    <SelectValue placeholder="Selecione sua faixa" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {belts.map(belt => (
                                        <SelectItem key={belt} value={belt.toLowerCase()} className="font-medium cursor-pointer focus:bg-primary focus:text-primary-foreground">
                                            {belt}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="weight" className="text-ui font-medium text-muted-foreground">Peso (kg) <span className="text-red-500 ml-1">*</span></Label>
                                <Input
                                    id="weight"
                                    name="weight"
                                    type="number"
                                    step="0.1"
                                    defaultValue={profile?.weight || ''}
                                    placeholder="Ex: 75.5"
                                    required
                                    className="h-12 rounded-xl shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 font-medium"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-ui font-medium text-muted-foreground">Telefone / WhatsApp <span className="text-red-500 ml-1">*</span></Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    value={phoneValue}
                                    onChange={(e) => setPhoneValue(formatPhone(e.target.value))}
                                    placeholder="(00) 00000-0000"
                                    required
                                    className="h-12 rounded-xl shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 font-medium"
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 mt-4">
                            <p className="text-caption text-primary font-medium text-center italic">
                                Quase lá! Verifique se seus dados técnicos estão corretos para garantir sua categoria ideal nos eventos.
                            </p>
                        </div>
                    </div>
                </div>

                {/* NAVIGATION BUTTONS */}
                <div className="flex gap-4 pt-4">
                    {step > 1 && (
                        <Button pill type="button"
                            onClick={prevStep}
                            variant="outline"
                            className="flex-1 h-12  font-bold border-2"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar
                        </Button>
                    )}

                    {step < 3 ? (
                        <Button
                            type="button"
                            onClick={nextStep}
                            className={`flex-1 h-12 rounded-full font-bold shadow-lg transition-all active:scale-[0.98] ${isWhiteBelt
                                ? "bg-background text-foreground border border-brand-950/20 shadow-none hover:bg-muted/40"
                                : "bg-primary text-primary-foreground hover:opacity-90"
                                }`}
                        >
                            Próximo
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            type="submit"
                            disabled={loading}
                            className={`flex-[1.5] h-12 rounded-full font-bold shadow-lg transition-all active:scale-[0.98] ${isWhiteBelt
                                ? "bg-background text-foreground border border-brand-950/20 shadow-none hover:bg-muted/40"
                                : "bg-primary text-primary-foreground hover:opacity-90"
                                }`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Check className="mr-2 h-4 w-4" />
                                    Finalizar Perfil
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </form >

            {/* Seção de Saída */}
            < div className="pt-6 border-t border-gray-100" >
                <div className="flex justify-center">
                    <Button
                        onClick={() => setShowLogoutConfirm(true)}
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive h-10 px-4 flex items-center gap-2 transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        <span className="text-ui font-medium">Sair do aplicativo</span>
                    </Button>
                </div>
            </div >

            {/* Logout Confirmation Dialog */}
            <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
                <DialogContent className="max-w-[340px] rounded-3xl p-6 gap-6">
                    <DialogHeader className="items-center text-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                            <LogOut className="h-6 w-6 text-destructive" />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-h2 font-bold">Encerrar sessão?</DialogTitle>
                            <DialogDescription className="text-ui">
                                Tem certeza que deseja sair do aplicativo?
                            </DialogDescription>
                        </div>
                    </DialogHeader>
                    <DialogFooter className="flex-row gap-3 sm:justify-center">
                        <DialogClose asChild>
                            <Button pill variant="outline" className="flex-1 h-12  font-bold border-2">
                                Cancelar
                            </Button>
                        </DialogClose>
                        <Button
                            onClick={async () => {
                                setShowLogoutConfirm(false);
                                await signOutAction();
                            }}
                            className={cn(
                                "flex-1 h-12 rounded-full font-bold shadow-lg",
                                isWhiteBelt ? "bg-brand-950 text-white" : "bg-primary text-primary-foreground"
                            )}
                        >
                            Sair
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
