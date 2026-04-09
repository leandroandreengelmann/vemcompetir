'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, KeyRound, ShieldCheck } from "lucide-react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { getAuthErrorMessage } from '@/lib/auth-errors';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const supabase = createClient();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        email: '',
        otp: '',
        password: '',
        confirmPassword: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRequestOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(formData.email);
            if (resetError) throw resetError;

            setStep(2);
        } catch (err) {
            setError(getAuthErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: verifyError } = await supabase.auth.verifyOtp({
                email: formData.email,
                token: formData.otp,
                type: 'recovery'
            });
            if (verifyError) throw verifyError;

            setStep(3);
        } catch (err) {
            setError(getAuthErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: formData.password
            });
            if (updateError) throw updateError;

            setSuccess('Senha alterada com sucesso! Você já pode entrar com sua nova senha.');
            setTimeout(() => router.push('/login'), 3000);
        } catch (err) {
            setError(getAuthErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-10 py-12">
                <div className="flex flex-col items-center gap-4 text-center">
                    <Link href="/login">
                        <img
                            src="/logo-camaleao-black.png"
                            alt="COMPETIR"
                            className="h-14 w-auto cursor-pointer hover:opacity-80 transition-opacity"
                        />
                    </Link>
                    <SectionHeader
                        title={step === 1 ? "Recuperar Senha" : step === 2 ? "Verificar Código" : "Nova Senha"}
                        description={
                            step === 1 ? "Enviaremos um código de 6 dígitos para o seu e-mail." :
                                step === 2 ? `Insira o código enviado para ${formData.email}` :
                                    "Crie uma nova senha forte para sua conta."
                        }
                        className="items-center"
                    />
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

                <div className="space-y-6">
                    {step === 1 && (
                        <form onSubmit={handleRequestOTP} className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium leading-none">
                                    E-mail da sua conta
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
                            <Button
                                type="submit"
                                pill
                                className="w-full h-12 text-base font-semibold"
                                disabled={!formData.email || loading}
                            >
                                {loading ? 'Enviando...' : 'Enviar Código'}
                            </Button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleVerifyOTP} className="space-y-6">
                            <div className="space-y-2 text-center">
                                <label htmlFor="otp" className="text-sm font-medium leading-none">
                                    Código de 6 dígitos
                                </label>
                                <Input
                                    id="otp"
                                    name="otp"
                                    type="text"
                                    placeholder="000000"
                                    maxLength={6}
                                    className="text-center text-2xl tracking-[0.3em] font-bold h-14"
                                    value={formData.otp}
                                    onChange={handleInputChange}
                                    variant="lg"
                                    required
                                    disabled={loading}
                                    autoFocus
                                />
                            </div>
                            <Button
                                type="submit"
                                pill
                                className="w-full h-12 text-base font-semibold"
                                disabled={formData.otp.length !== 6 || loading}
                            >
                                {loading ? 'Verificando...' : 'Verificar Código'}
                            </Button>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                                disabled={loading}
                            >
                                Alterar e-mail
                            </button>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleUpdatePassword} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="password" className="text-sm font-medium leading-none">
                                        Nova Senha
                                    </label>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        variant="lg"
                                        required
                                        minLength={6}
                                        disabled={loading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="confirmPassword" className="text-sm font-medium leading-none">
                                        Confirme a Nova Senha
                                    </label>
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        variant="lg"
                                        required
                                        minLength={6}
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <Button
                                type="submit"
                                pill
                                className="w-full h-12 text-base font-semibold"
                                disabled={!formData.password || loading}
                            >
                                {loading ? 'Alterando...' : 'Alterar Senha'}
                            </Button>
                        </form>
                    )}
                </div>

                <div className="pt-8 flex justify-center">
                    <Link
                        href="/login"
                        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para o login
                    </Link>
                </div>
            </div>
        </div>
    );
}
