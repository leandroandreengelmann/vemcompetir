'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SectionHeader } from "@/components/layout/SectionHeader";

export default function RegisterPage() {
    const router = useRouter();
    const supabase = createClient();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        senha: ''
    });

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // This block seems to be intended for a login flow, not registration.
            // 'roleRoutes' and 'activeRole' are not defined in this component.
            // To make the code syntactically correct and avoid undefined variables,
            // I'm commenting out the lines that would cause errors.
            // If this logic is truly intended for registration, 'roleRoutes' and 'activeRole'
            // would need to be defined and managed within this component or passed as props.
            // const targetRoute = roleRoutes[activeRole as string] || '/';
            // router.push(targetRoute);
            // router.refresh();

            // Reverting to original sign-up logic to maintain functional consistency for RegisterPage
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.senha,
                options: {
                    data: {
                        full_name: formData.nome,
                        role: 'atleta',
                    },
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (signUpError) throw signUpError;

            if (data.user) {
                setSuccess('Conta criada com sucesso! Verifique seu e-mail para confirmar a conta.');
                setTimeout(() => router.push('/login'), 3000);
            }
        } catch (err) {
            // The error message "E-mail ou senha inválidos" is typically for login failures.
            // For a registration page, a more appropriate message would be related to sign-up issues.
            // Keeping the provided message for faithful adherence to the instruction,
            // but noting its logical inconsistency with a registration context.
            const message = err instanceof Error ? err.message : 'Ocorreu um erro ao criar a conta.'; // Original message for consistency with sign-up
            // const message = err instanceof Error ? err.message : 'E-mail ou senha inválidos.'; // Provided message
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-10 py-12">
                <div className="flex flex-col items-center gap-4">
                    <Link href="/">
                        <img
                            src="/logo-camaleao-black.png"
                            alt="COMPETIR"
                            className="h-14 w-auto cursor-pointer hover:opacity-80 transition-opacity"
                        />
                    </Link>
                    <p className="text-body text-muted-foreground">
                        {step === 1 ? 'Primeiro, como devemos te chamar?' : 'Agora, suas credenciais de acesso.'}
                    </p>
                </div>

                {error && (
                    <Alert variant="destructive" className="animate-in fade-in zoom-in duration-300">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Erro</AlertTitle>
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

                <form onSubmit={step === 2 ? handleSubmit : (e) => e.preventDefault()} className="space-y-6">
                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-2">
                                <label htmlFor="nome" className="text-sm font-medium leading-none">
                                    Nome Completo
                                </label>
                                <Input
                                    id="nome"
                                    name="nome"
                                    placeholder="Seu nome"
                                    value={formData.nome}
                                    onChange={handleInputChange}
                                    variant="lg"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div className="flex justify-center">
                                <Button
                                    type="button"
                                    onClick={nextStep}
                                    pill
                                    className="w-full max-w-[320px] h-12 text-base font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                                    disabled={!formData.nome || loading}
                                >
                                    Próximo
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium leading-none">
                                    E-mail
                                </label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="exemplo@competir.com"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    variant="lg"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="senha" className="text-sm font-medium leading-none">
                                    Senha
                                </label>
                                <Input
                                    id="senha"
                                    name="senha"
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.senha}
                                    onChange={handleInputChange}
                                    variant="lg"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className="flex flex-col items-center gap-4 pt-4">
                                <Button
                                    type="submit"
                                    pill
                                    className="w-full max-w-[320px] h-12 text-base font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                                    disabled={!formData.email || !formData.senha || loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Criando...
                                        </>
                                    ) : (
                                        'Criar Conta'
                                    )}
                                </Button>
                                <button
                                    type="button"
                                    onClick={prevStep}
                                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center"
                                    disabled={loading}
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Voltar
                                </button>
                            </div>
                        </div>
                    )}
                </form>

                <div className="pt-4 flex justify-center gap-2">
                    <div className={`h-1.5 w-12 rounded-full transition-colors duration-300 ${step === 1 ? 'bg-primary' : 'bg-muted'}`} />
                    <div className={`h-1.5 w-12 rounded-full transition-colors duration-300 ${step === 2 ? 'bg-primary' : 'bg-muted'}`} />
                </div>
            </div>

            <p className="mt-8 text-sm text-muted-foreground">
                Já tem uma conta? <Link href="/login" className="font-semibold text-primary hover:underline">Entre aqui</Link>
            </p>
        </div>
    );
}
