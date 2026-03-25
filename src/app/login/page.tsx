'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { createClient } from '@/lib/supabase/client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { checkInterest, clearInterest } from '@/app/eventos/actions';
import { getAuthErrorMessage } from '@/lib/auth-errors';


export default function LoginPage() {
    const supabase = createClient();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        senha: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.senha,
            });

            if (signInError) throw signInError;

            const metaRole = authData.user?.user_metadata?.role;
            let profileRole = metaRole;

            try {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', authData.user.id)
                    .single();

                if (!profileError && profile?.role) {
                    profileRole = profile.role;
                }
            } catch (pErr) {
                console.error('Error fetching profile:', pErr);
            }

            const activeRole = profileRole || metaRole;
            const roleRoutes: Record<string, string> = {
                admin_geral: '/admin/dashboard',
                'academia/equipe': '/academia-equipe/dashboard',
                academia: '/academia-equipe/dashboard',
                organizador: '/organizador/dashboard',
                atleta: '/atleta/dashboard'
            };

            const targetRoute = roleRoutes[activeRole as string];

            if (!targetRoute) {
                throw new Error('Perfil de usuário não encontrado. Tente novamente.');
            }

            // Special handling for Administrators: Always go to dashboard
            if (activeRole === 'admin_geral') {
                window.location.href = targetRoute;
                return;
            }

            // Check intended interest for smart redirects
            let interestedEventId = null;
            try {
                interestedEventId = await checkInterest();
            } catch (err) {
                console.error('Error checking interest:', err);
            }

            // Athlete specific logic: they are the only ones who can "join" via the public site cart flow
            if (activeRole === 'atleta') {
                if (interestedEventId) {
                    await clearInterest();
                    window.location.href = `/atleta/dashboard/campeonatos/${interestedEventId}`;
                    return;
                }
            } else {
                // Anyone else (Organizers, Academies, Admins) should ALWAYS go to their dashboard
                // If they had an interest cookie hanging around by accident, clear it
                if (interestedEventId) {
                    await clearInterest();
                }
            }

            // Default redirection for everyone else (including athletes without interest)
            // window.location.href forces a full HTTP request, ensuring the middleware
            // picks up the new session cookies set by Supabase after signInWithPassword
            window.location.href = targetRoute;
        } catch (err) {
            setError(getAuthErrorMessage(err));
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
                        Acesse sua conta para continuar.
                    </p>
                </div>

                {error && (
                    <Alert variant="destructive" className="animate-in fade-in zoom-in duration-300">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Erro</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
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
                            <div className="flex items-center justify-between">
                                <label htmlFor="senha" className="text-sm font-medium leading-none">
                                    Senha
                                </label>
                                <Link
                                    href="/forgot-password"
                                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Esqueceu a senha?
                                </Link>
                            </div>
                            <div className="relative">
                                <Input
                                    id="senha"
                                    name="senha"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={formData.senha}
                                    onChange={handleInputChange}
                                    variant="lg"
                                    required
                                    disabled={loading}
                                    className="pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-6 pt-4">
                        <Button
                            type="submit"
                            pill
                            className="w-full max-w-[320px] h-12 text-base font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                            disabled={!formData.email || !formData.senha || loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Entrando...
                                </>
                            ) : (
                                'Entrar'
                            )}
                        </Button>

                        <div className="flex flex-col items-center gap-2">
                            <p className="text-sm text-muted-foreground">Não tem uma conta?</p>
                            <Link
                                href="/register"
                                className="text-sm font-semibold text-foreground hover:underline transition-all"
                            >
                                Criar conta gratuita
                            </Link>
                        </div>
                    </div>
                </form>

                <div className="pt-8 flex justify-center">
                    <Link
                        href="/"
                        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para o início
                    </Link>
                </div>
            </div>
        </div>
    );
}
