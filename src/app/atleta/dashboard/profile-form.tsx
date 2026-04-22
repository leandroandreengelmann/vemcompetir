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
import { CheckIcon, CircleNotchIcon, XIcon, WarningCircleIcon, CheckCircleIcon, CaretRightIcon, ArrowLeftIcon, SignOutIcon } from '@phosphor-icons/react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { updateAthleteProfile, searchGyms, searchMasters, signOutAction } from './actions';
import { useDebounce } from '@/hooks/use-debounce';
import { getBeltColor, hexToHsl } from '@/lib/belt-theme';
import { validateCPF, formatCPF, formatPhone, normalizeNumeric } from '@/lib/validation';
import { COUNTRIES } from '@/lib/countries';
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';
import { showToast } from '@/lib/toast';

interface ProfileFormProps {
    profile: any;
    user: any;
    belts: string[];
}

export function AthleteProfileForm({ profile, user, belts }: ProfileFormProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialStep = searchParams.get('step') ? parseInt(searchParams.get('step') as string, 10) : 1;

    const needsIdentityStep = !profile?.cpf || !profile?.birth_date;
    const totalSteps = needsIdentityStep ? 3 : 2;
    const vinculoStepIndex = needsIdentityStep ? 2 : 1;
    const tecnicoStepIndex = needsIdentityStep ? 3 : 2;

    const clampedInitialStep = Math.min(initialStep, totalSteps);
    const [step, setStep] = useState(clampedInitialStep);
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

        if (needsIdentityStep && s === 1) {
            if (!profile?.birth_date && !birthDateValue) return false;
            if (!profile?.cpf && !cpfValue) return false;
            if (!profile?.cpf && cpfValue && !validateCPF(cpfValue)) return false;
            return true;
        }

        if (s === vinculoStepIndex) {
            if (!selectedGym) return false;
            if (!selectedMaster) return false;
            return true;
        }

        if (s === tecnicoStepIndex) {
            const sexo = formData.get('sexo') as string;
            const belt = formData.get('belt_color') as string;
            const weight = formData.get('weight') as string;
            const nationality = formData.get('nationality') as string;
            if (!sexo) return false;
            if (!belt) return false;
            if (!weight) return false;
            if (!nationality) return false;
            // Telefone é opcional — se preenchido, deve estar completo
            if (phoneValue && phoneValue.length > 0 && phoneValue.length < 14) return false;
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

    const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
        e?.preventDefault();

        // Final validation — valida todos os passos aplicáveis
        for (let s = 1; s <= totalSteps; s++) {
            if (!validateStep(s)) {
                setMessage({ type: 'error', text: 'Existem campos inválidos em etapas anteriores.' });
                return;
            }
        }

        if (!profile?.cpf && cpfValue && !validateCPF(cpfValue)) {
            setCpfError('CPF inválido.');
            setMessage({ type: 'error', text: 'Por favor, corrija o CPF informado.' });
            return;
        }

        setLoading(true);
        setMessage(null);

        const formData = new FormData(formRef.current!);

        if (selectedGym?.id) formData.append('tenant_id', selectedGym.id);
        if (selectedGym?.name) formData.append('gym_name', selectedGym.name);

        if (selectedMaster?.id) formData.append('master_id', selectedMaster.id);
        if (selectedMaster?.name) formData.append('master_name', selectedMaster.name);

        // Envia CPF apenas se o atleta preencheu no fallback (caso legado)
        if (!profile?.cpf && cpfValue) {
            formData.set('cpf', normalizeNumeric(cpfValue));
        }
        formData.set('phone', normalizeNumeric(phoneValue));

        const result = await updateAthleteProfile(formData);

        if (result?.error) {
            setMessage({ type: 'error', text: result.error });
            setLoading(false);
        } else {
            setLoading(false);
            showToast.success('Perfil completo', 'Agora você já pode se inscrever em eventos.');
            router.push('/atleta/dashboard/inscricoes');
        }
    };

    return (
        <div className="flex flex-col gap-8">
            {/* Progress Bar */}
            <div className="space-y-4 px-1">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-panel-sm font-bold text-muted-foreground uppercase tracking-widest">
                        Passo {step} de {totalSteps}
                    </span>
                    <span className="text-panel-sm font-bold text-primary uppercase">
                        {step === vinculoStepIndex ? 'Vínculo' : step === tecnicoStepIndex ? 'Técnico' : 'Identidade'}
                    </span>
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-700 ease-in-out relative overflow-hidden"
                        style={{
                            width: `${(step / totalSteps) * 100}%`,
                            background: 'linear-gradient(90deg, #10b981, #34d399)',
                        }}
                    >
                        <div className="absolute inset-0 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12" />
                    </div>
                </div>
            </div>

            <form
                ref={formRef}
                onSubmit={(e) => e.preventDefault()}
                className="space-y-6"
                style={{
                    '--primary': activeHsl,
                    '--primary-foreground': activeFg,
                    '--border-belt': activeBorder
                } as React.CSSProperties}
            >
                {message && (
                    <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={`animate-in fade-in zoom-in duration-300 ${message.type === 'success' ? 'border-green-500 text-green-700 bg-green-50 [&>svg]:text-green-600' : ''}`}>
                        {message.type === 'success' ? <CheckCircleIcon size={16} weight="duotone" /> : <WarningCircleIcon size={16} weight="duotone" />}
                        <AlertTitle>{message.type === 'success' ? 'Sucesso!' : 'Erro'}</AlertTitle>
                        <AlertDescription>{message.text}</AlertDescription>
                    </Alert>
                )}

                {/* Hidden fields enviados em qualquer passo */}
                <input type="hidden" name="full_name" value={profile?.full_name || ''} />
                <input type="hidden" name="email" value={emailValue} />
                {/* Preserva CPF e birth_date existentes para não serem sobrescritos pelo update */}
                {profile?.cpf && <input type="hidden" name="cpf" value={profile.cpf} />}
                {profile?.birth_date && <input type="hidden" name="birth_date" value={profile.birth_date} />}

                <div className="min-h-[340px]">
                    {/* STEP 1 (fallback): IDENTIDADE — só aparece para atletas legados sem CPF ou data de nascimento */}
                    {needsIdentityStep && (
                        <div className={cn("space-y-6 animate-in fade-in slide-in-from-right-4 duration-300", step !== 1 && "hidden")}>
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                                <p className="text-xs text-amber-700 font-medium">
                                    Precisamos de alguns dados que faltaram no seu cadastro.
                                </p>
                            </div>

                            {!profile?.birth_date && (
                                <div className="space-y-2">
                                    <Label htmlFor="birth_date" className="text-panel-sm font-medium text-muted-foreground">
                                        Data de nascimento <span className="text-red-500 ml-1">*</span>
                                    </Label>
                                    <Input
                                        id="birth_date"
                                        name="birth_date"
                                        type="date"
                                        value={birthDateValue}
                                        onChange={(e) => setBirthDateValue(e.target.value)}
                                        required
                                        max={new Date().toISOString().split('T')[0]}
                                        className={`h-12 rounded-xl shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 font-medium border ${isWhiteBelt ? 'border-gray-200' : 'border-primary/20'}`}
                                    />
                                    {calculatedAge !== null && (
                                        <p className="text-panel-sm text-muted-foreground font-medium">{calculatedAge} anos</p>
                                    )}
                                </div>
                            )}

                            {!profile?.cpf && (
                                <div className="space-y-2">
                                    <Label htmlFor="cpf" className="text-panel-sm font-medium text-muted-foreground">
                                        CPF <span className="text-red-500 ml-1">*</span>
                                    </Label>
                                    <Input
                                        id="cpf"
                                        name="cpf"
                                        placeholder="000.000.000-00"
                                        value={cpfValue}
                                        onChange={(e) => {
                                            const raw = normalizeNumeric(e.target.value).slice(0, 11);
                                            setCpfValue(formatCPF(raw));
                                            setCpfError(null);
                                        }}
                                        inputMode="numeric"
                                        className={`h-12 rounded-xl shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 font-medium border ${cpfError ? 'border-red-400' : isWhiteBelt ? 'border-gray-200' : 'border-primary/20'}`}
                                    />
                                    {cpfError && <p className="text-panel-sm text-red-500 font-medium">{cpfError}</p>}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP VÍNCULO */}
                    <div className={cn("space-y-6 animate-in fade-in slide-in-from-right-4 duration-300", step !== vinculoStepIndex && "hidden")}>
                        <div className="space-y-4 relative" ref={gymRef}>
                            <div className="space-y-1">
                                <Label className="text-panel-sm font-medium text-muted-foreground">Academia / equipe <span className="text-red-500 ml-1">*</span></Label>
                                <p className="text-panel-sm font-medium text-[hsl(var(--primary))] leading-tight">
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
                                    className="h-12 rounded-xl shadow-none pr-10 focus-visible:ring-0 focus-visible:ring-offset-0 text-panel-sm font-medium"
                                    autoComplete="off"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    {isFetchingGyms && <CircleNotchIcon size={16} weight="bold" className="animate-spin text-muted-foreground" />}
                                    {selectedGym ? (
                                        <button type="button" onClick={clearGym} className="text-muted-foreground hover:text-foreground">
                                            <XIcon size={20} weight="duotone" />
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
                                                    <Badge variant="outline" className={`h-9 px-4 text-panel-sm font-medium cursor-pointer rounded-full ${isWhiteBelt
                                                        ? "border-brand-950/20 bg-muted/50 text-foreground hover:bg-muted"
                                                        : "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.15)]"
                                                        }`}>
                                                        {g.name}
                                                    </Badge>
                                                </button>
                                            ))}

                                            {gymResults?.community?.map(name => (
                                                <button key={name} type="button" onClick={() => handleGymSelect({ name })} className="transition-transform active:scale-95">
                                                    <Badge variant="outline" className={`h-9 px-4 text-panel-sm font-medium cursor-pointer rounded-full ${isWhiteBelt
                                                        ? "border-brand-950/20 bg-muted/50 text-foreground hover:bg-muted"
                                                        : "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.15)]"
                                                        }`}>
                                                        {name}
                                                    </Badge>
                                                </button>
                                            ))}

                                            {(!gymResults?.official?.length && !gymResults?.community?.length) && (
                                                <p className="w-full py-4 text-panel-sm text-center text-muted-foreground">Nenhuma equipe encontrada.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-muted/30 mt-2 border-t border-border/60 space-y-3">
                                        <div className="space-y-1">
                                            <p className="text-panel-sm font-semibold text-slate-900">Não encontrou sua equipe/academia?</p>
                                            <p className="text-panel-sm text-muted-foreground">Você pode cadastrar agora e usar no seu perfil.</p>
                                        </div>
                                        <Link href={`/atleta/dashboard/perfil/cadastrar-academia?belt=${currentBelt}`} className="block">
                                            <Button
                                                type="button"
                                                className={`w-full h-10 rounded-full text-panel-sm font-bold ${isWhiteBelt
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
                            <Label className="text-panel-sm font-medium text-muted-foreground">Mestre / professor responsável <span className="text-red-500 ml-1">*</span></Label>
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
                                    {isFetchingMasters && <CircleNotchIcon size={16} weight="bold" className="animate-spin text-muted-foreground" />}
                                    {selectedMaster ? (
                                        <button type="button" onClick={clearMaster} className="text-muted-foreground hover:text-foreground">
                                            <XIcon size={20} weight="duotone" />
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
                                                    <Badge variant="outline" className={`h-9 px-4 text-panel-sm font-medium cursor-pointer rounded-full ${isWhiteBelt
                                                        ? "border-brand-950/20 bg-muted/50 text-foreground hover:bg-muted"
                                                        : "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.15)]"
                                                        }`}>
                                                        {m.full_name}
                                                    </Badge>
                                                </button>
                                            ))}

                                            {masterResults?.community?.map(name => (
                                                <button key={name} type="button" onClick={() => handleMasterSelect({ name })} className="transition-transform active:scale-95">
                                                    <Badge variant="outline" className={`h-9 px-4 text-panel-sm font-medium cursor-pointer rounded-full ${isWhiteBelt
                                                        ? "border-brand-950/20 bg-muted/50 text-foreground hover:bg-muted"
                                                        : "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.15)]"
                                                        }`}>
                                                        {name}
                                                    </Badge>
                                                </button>
                                            ))}

                                            {(!masterResults?.official?.length && !masterResults?.community?.length) && (
                                                <p className="w-full py-4 text-panel-sm text-center text-muted-foreground">Nenhum mestre encontrado.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-muted/30 mt-2 border-t border-border/60 space-y-3">
                                        <div className="space-y-1">
                                            <p className="text-panel-sm font-semibold text-slate-900">Não encontrou seu mestre?</p>
                                            <p className="text-panel-sm text-muted-foreground">Você pode cadastrar agora e usar no seu perfil.</p>
                                        </div>
                                        <Link
                                            href={`/atleta/dashboard/perfil/cadastrar-mestre?belt=${currentBelt}${selectedGym?.id ? `&tenantId=${selectedGym.id}` : ''}${selectedGym?.name ? `&gymName=${encodeURIComponent(selectedGym.name)}` : ''}`}
                                            className="block"
                                        >
                                            <Button
                                                type="button"
                                                className={`w-full h-10 rounded-full text-panel-sm font-bold ${isWhiteBelt
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

                    {/* STEP TÉCNICO & CONTATO */}
                    <div className={cn("space-y-6 animate-in fade-in slide-in-from-right-4 duration-300", step !== tecnicoStepIndex && "hidden")}>
                        <div className="space-y-2">
                            <Label htmlFor="sexo" className="text-panel-sm font-medium text-muted-foreground">Sexo <span className="text-red-500 ml-1">*</span></Label>
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
                            <Label htmlFor="belt_color" className="text-panel-sm font-medium text-muted-foreground">Cor da faixa <span className="text-red-500 ml-1">*</span></Label>
                            <Select
                                name="belt_color"
                                defaultValue={belts.find(b => b.toLowerCase() === (profile?.belt_color || '').toLowerCase()) || undefined}
                                onValueChange={(val) => setCurrentBelt(val.toLowerCase())}
                            >
                                <SelectTrigger className={`h-12 rounded-xl shadow-none focus:ring-2 focus:ring-primary focus:ring-offset-0 font-medium border ${isWhiteBelt ? 'border-gray-200' : 'border-primary/20'}`}>
                                    <SelectValue placeholder="Selecione sua faixa" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {belts.map(belt => (
                                        <SelectItem key={belt} value={belt} className="font-medium cursor-pointer focus:bg-primary focus:text-primary-foreground">
                                            {belt}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="nationality" className="text-panel-sm font-medium text-muted-foreground">Nacionalidade <span className="text-red-500 ml-1">*</span></Label>
                            <Select name="nationality" defaultValue={profile?.nationality || 'BR'}>
                                <SelectTrigger className={`h-12 rounded-xl shadow-none focus:ring-0 focus:ring-offset-0 font-medium bg-white border ${isWhiteBelt ? 'border-gray-200' : 'border-primary/20'}`}>
                                    <SelectValue placeholder="Selecione seu país" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl max-h-64">
                                    {COUNTRIES.map(c => (
                                        <SelectItem key={c.code} value={c.code} className="font-medium cursor-pointer focus:bg-primary focus:text-primary-foreground">
                                            <span className="inline-flex items-center gap-2">
                                                <span
                                                    className={`fi fi-${c.code.toLowerCase()} rounded-sm shadow-sm`}
                                                    style={{ width: '1.5em', height: '1.125em', display: 'inline-block' }}
                                                    aria-label={c.name}
                                                />
                                                <span>{c.name}</span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="weight" className="text-panel-sm font-medium text-muted-foreground">Peso (kg) <span className="text-red-500 ml-1">*</span></Label>
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
                                <Label htmlFor="phone" className="text-panel-sm font-medium text-muted-foreground">Telefone / WhatsApp</Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    value={phoneValue}
                                    onChange={(e) => setPhoneValue(formatPhone(e.target.value))}
                                    placeholder="(00) 00000-0000"
                                    className="h-12 rounded-xl shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 font-medium"
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 mt-4">
                            <p className="text-panel-sm text-primary font-medium text-center italic">
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
                            <ArrowLeftIcon size={16} weight="duotone" className="mr-2" />
                            Voltar
                        </Button>
                    )}

                    {step < totalSteps ? (
                        <Button
                            type="button"
                            onClick={nextStep}
                            className={`flex-1 h-12 rounded-full font-bold shadow-lg transition-all active:scale-[0.98] ${isWhiteBelt
                                ? "bg-background text-foreground border border-brand-950/20 shadow-none hover:bg-muted/40"
                                : "bg-primary text-primary-foreground hover:opacity-90"
                                }`}
                        >
                            Próximo
                            <CaretRightIcon size={16} weight="duotone" className="ml-2" />
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            onClick={() => handleSubmit()}
                            disabled={loading}
                            className={`flex-[1.5] h-12 rounded-full font-bold shadow-lg transition-all active:scale-[0.98] ${isWhiteBelt
                                ? "bg-background text-foreground border border-brand-950/20 shadow-none hover:bg-muted/40"
                                : "bg-primary text-primary-foreground hover:opacity-90"
                                }`}
                        >
                            {loading ? (
                                <>
                                    <CircleNotchIcon size={16} weight="bold" className="mr-2 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <CheckIcon size={16} weight="duotone" className="mr-2" />
                                    Finalizar Perfil
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </form >

            {/* Seção de Saída - Mobile Only */}
            < div className="pt-6 border-t border-gray-100 md:hidden" >
                <div className="flex justify-center">
                    <Button
                        onClick={() => setShowLogoutConfirm(true)}
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive h-10 px-4 flex items-center gap-2 transition-colors"
                    >
                        <SignOutIcon size={16} weight="duotone" />
                        <span className="text-panel-sm font-medium">Sair do aplicativo</span>
                    </Button>
                </div>
            </div >

            {/* Logout Confirmation Dialog */}
            <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
                <DialogContent className="max-w-[340px] rounded-3xl p-6 gap-6">
                    <DialogHeader className="items-center text-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                            <SignOutIcon size={24} weight="duotone" className="text-destructive" />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-panel-md font-bold">Encerrar sessão?</DialogTitle>
                            <DialogDescription className="text-panel-sm">
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
