'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, AlertTriangle, Eye, EyeOff } from "lucide-react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAuthErrorMessage } from '@/lib/auth-errors';
import { validateCPF, formatCPF, formatPhone, normalizeNumeric } from '@/lib/validation';
import { getGuardianTemplateContentAction } from './actions';
import { sendWelcomeWhatsApp } from '@/app/(panel)/admin/dashboard/atletas/whatsapp/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

const RELATIONSHIP_LABELS: Record<string, string> = {
    pai: 'Pai',
    mae: 'Mãe',
    irmao: 'Irmão/Irmã',
    tio: 'Tio/Tia',
    padrinho: 'Padrinho/Madrinha',
    outro: 'Outro',
};

function isUnder18(birthDateStr: string): boolean {
    if (!birthDateStr) return false;
    const birth = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age < 18;
}

function fillTemplate(template: string, data: {
    nome: string;
    guardian_name: string;
    guardian_cpf: string;
    guardian_relationship: string;
    guardian_phone: string;
}): string {
    const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    return template
        .replace(/{{atleta_nome}}/g, data.nome || '[Nome do Atleta]')
        .replace(/{{responsavel_nome}}/g, data.guardian_name || '[Nome do Responsável]')
        .replace(/{{responsavel_cpf}}/g, data.guardian_cpf ? formatCPF(data.guardian_cpf) : '[CPF]')
        .replace(/{{responsavel_vinculo}}/g, (RELATIONSHIP_LABELS[data.guardian_relationship] ?? data.guardian_relationship) || '[Vínculo]')
        .replace(/{{responsavel_telefone}}/g, data.guardian_phone || '[Telefone]')
        .replace(/{{academia_nome}}/g, 'Plataforma Competir')
        .replace(/{{data}}/g, today);
}

export default function RegisterPage() {
    const router = useRouter();
    const supabase = createClient();

    // step 1=nome, 2=dados, 3=guardian(minor), 4=termo(minor), 5=credenciais
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isMinor, setIsMinor] = useState(false);
    const [templateContent, setTemplateContent] = useState('');
    const [cpfValue, setCpfValue] = useState('');
    const [phoneValue, setPhoneValue] = useState('');
    const [guardianCpfValue, setGuardianCpfValue] = useState('');
    const [guardianPhoneValue, setGuardianPhoneValue] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        nome: '',
        birth_date: '',
        cpf: '',
        phone: '',
        guardian_name: '',
        guardian_phone: '',
        guardian_cpf: '',
        guardian_relationship: '',
        guardian_term_accepted: false,
        email: '',
        senha: '',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const [birthDateDisplay, setBirthDateDisplay] = useState('');

    const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = normalizeNumeric(e.target.value).slice(0, 8);
        let masked = digits;
        if (digits.length > 4) masked = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
        else if (digits.length > 2) masked = digits.slice(0, 2) + '/' + digits.slice(2);
        setBirthDateDisplay(masked);

        if (digits.length === 8) {
            const iso = `${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
            setFormData(prev => ({ ...prev, birth_date: iso }));
            setIsMinor(isUnder18(iso));
        } else {
            setFormData(prev => ({ ...prev, birth_date: '' }));
            setIsMinor(false);
        }
    };

    const totalSteps = isMinor ? 5 : 3;
    const displayStep = step <= 2 ? step : isMinor ? step - 2 : step - 4;
    // Display step: minor 1,2,3,4,5 → show 1,2,3,4,5; adult 1,2,5 → show 1,2,3

    const goNext = () => {
        setError(null);
        if (step === 2 && !isMinor) { setStep(5); return; }
        setStep(s => s + 1);
    };

    const goPrev = () => {
        if (step === 5 && !isMinor) { setStep(2); return; }
        setStep(s => s - 1);
    };

    // Fetch template when reaching step 4
    useEffect(() => {
        if (step === 4 && !templateContent) {
            getGuardianTemplateContentAction().then(setTemplateContent);
        }
    }, [step, templateContent]);

    const validateStep = (): string | null => {
        if (step === 1 && !formData.nome.trim()) return 'Informe seu nome completo.';
        if (step === 2) {
            if (!formData.birth_date) return 'Informe sua data de nascimento.';
            if (!formData.cpf) return 'Informe seu CPF.';
            if (!validateCPF(formData.cpf)) return 'CPF inválido. Verifique os dígitos.';
            if (!isMinor && normalizeNumeric(formData.phone).length < 10) return 'Informe um telefone válido.';
        }
        if (step === 3) {
            if (!formData.guardian_name.trim()) return 'Informe o nome completo do responsável.';
            if (!formData.guardian_relationship) return 'Selecione o parentesco.';
            if (!formData.guardian_cpf || !validateCPF(formData.guardian_cpf)) return 'CPF do responsável inválido.';
            if (!formData.guardian_phone || normalizeNumeric(formData.guardian_phone).length < 10) return 'Informe um telefone válido para o responsável.';
        }
        if (step === 4 && !formData.guardian_term_accepted) return 'Você precisa ler e aceitar o Termo de Responsabilidade.';
        if (step === 5) {
            if (!formData.email) return 'Informe um e-mail.';
            if (!formData.senha || formData.senha.length < 6) return 'A senha precisa ter ao menos 6 caracteres.';
        }
        return null;
    };

    const handleNext = () => {
        const validationError = validateStep();
        if (validationError) { setError(validationError); return; }
        goNext();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validationError = validateStep();
        if (validationError) { setError(validationError); return; }

        setLoading(true);
        setError(null);

        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.senha,
                options: {
                    data: {
                        full_name: formData.nome,
                        role: 'atleta',
                        birth_date: formData.birth_date,
                        cpf: normalizeNumeric(formData.cpf),
                        phone: !isMinor ? normalizeNumeric(formData.phone) : null,
                        has_guardian: isMinor,
                        guardian_name: isMinor ? formData.guardian_name : null,
                        guardian_phone: isMinor ? normalizeNumeric(formData.guardian_phone) : null,
                        guardian_cpf: isMinor ? normalizeNumeric(formData.guardian_cpf) : null,
                        guardian_relationship: isMinor ? formData.guardian_relationship : null,
                    },
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (signUpError) throw signUpError;

            if (data.user) {
                setSuccess('Conta criada com sucesso! Verifique seu e-mail para confirmar a conta.');
                // Envia boas-vindas via WhatsApp após 5 segundos
                const phone = !isMinor ? normalizeNumeric(formData.phone) : normalizeNumeric(formData.guardian_phone);
                if (phone) {
                    setTimeout(() => sendWelcomeWhatsApp(phone, formData.nome).catch(() => {}), 5000);
                }
                setTimeout(() => router.push('/login'), 4000);
            }
        } catch (err) {
            setError(getAuthErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const filledTerm = templateContent ? fillTemplate(templateContent, formData) : '';

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8 py-12">

                {/* Logo */}
                <div className="flex flex-col items-center gap-3">
                    <Link href="/">
                        <img src="/logo-camaleao-black.png" alt="COMPETIR" className="h-14 w-auto cursor-pointer hover:opacity-80 transition-opacity" />
                    </Link>
                    <p className="text-sm text-muted-foreground text-center">
                        {step === 1 && 'Primeiro, como devemos te chamar?'}
                        {step === 2 && 'Seus dados pessoais'}
                        {step === 3 && 'Dados do responsável legal'}
                        {step === 4 && 'Termo de Responsabilidade'}
                        {step === 5 && 'Suas credenciais de acesso'}
                    </p>
                </div>

                {/* Alerts */}
                {error && (
                    <Alert variant="destructive" className="animate-in fade-in zoom-in duration-300">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Atenção</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {success && (
                    <Alert className="border-green-500 text-green-700 bg-green-50 animate-in fade-in zoom-in duration-300 [&>svg]:text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertTitle>Sucesso!</AlertTitle>
                        <AlertDescription>{success}</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={step === 5 ? handleSubmit : (e) => e.preventDefault()} className="space-y-5">

                    {/* PASSO 1 — Nome */}
                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-400">
                            <div className="space-y-2">
                                <label htmlFor="nome" className="text-sm font-medium">Nome Completo do Atleta</label>
                                <Input id="nome" name="nome" placeholder="Nome completo do atleta" value={formData.nome} onChange={handleInputChange} variant="lg" required disabled={loading} />
                            </div>
                            <Button type="button" onClick={handleNext} pill className="w-full h-12 text-base font-semibold" disabled={!formData.nome.trim()}>
                                Próximo
                            </Button>
                        </div>
                    )}

                    {/* PASSO 2 — Data de nascimento + CPF */}
                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-400">
                            <Alert className="border-amber-300 bg-amber-50 text-amber-900 [&>svg]:text-amber-600">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle className="font-bold text-sm">Dados importantes</AlertTitle>
                                <AlertDescription className="text-xs leading-relaxed">
                                    Informe sua data de nascimento e CPF <strong>corretos</strong>. Dados incorretos podem resultar em classificação errada de categoria, problemas em inscrições e <strong>exclusão da conta</strong>.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <label htmlFor="birth_date" className="text-sm font-medium">Data de Nascimento</label>
                                <Input id="birth_date" name="birth_date" type="text" placeholder="dd/mm/aaaa" value={birthDateDisplay} onChange={handleBirthDateChange} variant="lg" required disabled={loading} inputMode="numeric" />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="cpf" className="text-sm font-medium">CPF</label>
                                <Input
                                    id="cpf"
                                    name="cpf"
                                    placeholder="000.000.000-00"
                                    value={cpfValue}
                                    onChange={(e) => {
                                        const raw = normalizeNumeric(e.target.value).slice(0, 11);
                                        const formatted = formatCPF(raw);
                                        setCpfValue(formatted);
                                        setFormData(prev => ({ ...prev, cpf: raw }));
                                    }}
                                    variant="lg"
                                    required
                                    disabled={loading}
                                    inputMode="numeric"
                                />
                            </div>

                            {/* Telefone — só para maiores de idade */}
                            {formData.birth_date && !isMinor && (
                                <div className="space-y-2">
                                    <label htmlFor="phone" className="text-sm font-medium">WhatsApp / Telefone</label>
                                    <Input
                                        id="phone"
                                        placeholder="(00) 00000-0000"
                                        value={phoneValue}
                                        onChange={(e) => {
                                            const raw = normalizeNumeric(e.target.value).slice(0, 11);
                                            const formatted = formatPhone(raw);
                                            setPhoneValue(formatted);
                                            setFormData(prev => ({ ...prev, phone: raw }));
                                        }}
                                        variant="lg"
                                        disabled={loading}
                                        inputMode="numeric"
                                    />
                                </div>
                            )}

                            <div className="flex flex-col gap-3 pt-2">
                                <Button type="button" onClick={handleNext} pill className="w-full h-12 text-base font-semibold" disabled={!formData.birth_date || !formData.cpf || (!isMinor && normalizeNumeric(formData.phone).length < 10)}>
                                    Próximo
                                </Button>
                                <button type="button" onClick={goPrev} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1" disabled={loading}>
                                    <ArrowLeft className="h-4 w-4" /> Voltar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PASSO 3 — Dados do responsável (só menores) */}
                    {step === 3 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-400">
                            <Alert className="border-amber-300 bg-amber-50 text-amber-900 [&>svg]:text-amber-600">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle className="font-bold text-sm">Atleta menor de idade</AlertTitle>
                                <AlertDescription className="text-xs leading-relaxed">
                                    Por ser menor de 18 anos, é obrigatório o cadastro de um responsável legal. Preencha os dados completos.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Parentesco</label>
                                <Select value={formData.guardian_relationship} onValueChange={(v) => setFormData(prev => ({ ...prev, guardian_relationship: v }))}>
                                    <SelectTrigger className="h-12 rounded-xl">
                                        <SelectValue placeholder="Selecione o vínculo..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pai">Pai</SelectItem>
                                        <SelectItem value="mae">Mãe</SelectItem>
                                        <SelectItem value="irmao">Irmão/Irmã</SelectItem>
                                        <SelectItem value="tio">Tio/Tia</SelectItem>
                                        <SelectItem value="padrinho">Padrinho/Madrinha</SelectItem>
                                        <SelectItem value="outro">Outro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nome completo do responsável</label>
                                <Input name="guardian_name" placeholder="Nome do responsável" value={formData.guardian_name} onChange={handleInputChange} variant="lg" disabled={loading} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">CPF do responsável</label>
                                    <Input
                                        placeholder="000.000.000-00"
                                        value={guardianCpfValue}
                                        onChange={(e) => {
                                            const raw = normalizeNumeric(e.target.value).slice(0, 11);
                                            const formatted = formatCPF(raw);
                                            setGuardianCpfValue(formatted);
                                            setFormData(prev => ({ ...prev, guardian_cpf: raw }));
                                        }}
                                        variant="lg"
                                        disabled={loading}
                                        inputMode="numeric"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">WhatsApp / Telefone</label>
                                    <Input
                                        placeholder="(00) 00000-0000"
                                        value={guardianPhoneValue}
                                        onChange={(e) => {
                                            const raw = normalizeNumeric(e.target.value).slice(0, 11);
                                            const formatted = formatPhone(raw);
                                            setGuardianPhoneValue(formatted);
                                            setFormData(prev => ({ ...prev, guardian_phone: raw }));
                                        }}
                                        variant="lg"
                                        disabled={loading}
                                        inputMode="numeric"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <Button type="button" onClick={handleNext} pill className="w-full h-12 text-base font-semibold"
                                    disabled={!formData.guardian_name || !formData.guardian_relationship || !formData.guardian_cpf || !formData.guardian_phone}>
                                    Próximo
                                </Button>
                                <button type="button" onClick={goPrev} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1" disabled={loading}>
                                    <ArrowLeft className="h-4 w-4" /> Voltar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PASSO 4 — Termo de Responsabilidade (só menores) */}
                    {step === 4 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-400">
                            <div className="space-y-1">
                                <p className="text-sm font-semibold">Leia o Termo de Responsabilidade</p>
                                <p className="text-xs text-muted-foreground">Role até o fim para aceitar.</p>
                            </div>

                            <ScrollArea className="h-64 rounded-xl border bg-muted/30 p-4">
                                <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground">
                                    {filledTerm || 'Carregando termo...'}
                                </pre>
                            </ScrollArea>

                            <div className="flex items-start gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
                                <Checkbox
                                    id="guardian_term_accepted"
                                    checked={formData.guardian_term_accepted}
                                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, guardian_term_accepted: !!v }))}
                                    className="mt-0.5"
                                />
                                <label htmlFor="guardian_term_accepted" className="text-xs leading-relaxed cursor-pointer text-foreground">
                                    Li e aceito o Termo de Responsabilidade acima, estando ciente das obrigações e da necessidade de envio do documento assinado.
                                </label>
                            </div>

                            <div className="flex flex-col gap-3 pt-1">
                                <Button type="button" onClick={handleNext} pill className="w-full h-12 text-base font-semibold" disabled={!formData.guardian_term_accepted}>
                                    Aceitar e Continuar
                                </Button>
                                <button type="button" onClick={goPrev} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1">
                                    <ArrowLeft className="h-4 w-4" /> Voltar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PASSO 5 — E-mail + Senha */}
                    {step === 5 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-400">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium">E-mail</label>
                                <Input id="email" name="email" type="email" placeholder="exemplo@competir.com" value={formData.email} onChange={handleInputChange} variant="lg" required disabled={loading} />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="senha" className="text-sm font-medium">Senha</label>
                                <div className="relative">
                                    <Input id="senha" name="senha" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={formData.senha} onChange={handleInputChange} variant="lg" required disabled={loading} className="pr-12" />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <Button type="submit" pill className="w-full h-12 text-base font-semibold" disabled={!formData.email || !formData.senha || loading}>
                                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : 'Criar Conta'}
                                </Button>
                                <button type="button" onClick={goPrev} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1" disabled={loading}>
                                    <ArrowLeft className="h-4 w-4" /> Voltar
                                </button>
                            </div>
                        </div>
                    )}
                </form>

                {/* Step dots */}
                <div className="pt-2 flex justify-center gap-2">
                    {Array.from({ length: totalSteps }).map((_, i) => {
                        const currentDisplay = step <= 2 ? step : isMinor ? step - 2 : 3;
                        const dotStep = i + 1;
                        return (
                            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${dotStep === currentDisplay ? 'w-8 bg-primary' : dotStep < currentDisplay ? 'w-4 bg-primary/40' : 'w-4 bg-muted'}`} />
                        );
                    })}
                </div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
                Já tem uma conta? <Link href="/login" className="font-semibold text-primary hover:underline">Entre aqui</Link>
            </p>
        </div>
    );
}
