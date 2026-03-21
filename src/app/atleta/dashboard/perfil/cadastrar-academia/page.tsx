'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeftIcon, CircleNotchIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { registerGymAction } from './actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSearchParams } from 'next/navigation';
import { getBeltColor, hexToHsl } from '@/lib/belt-theme';

export default function CadastrarAcademia() {
    const searchParams = useSearchParams();
    const currentBelt = (searchParams.get('belt') || 'branca').toLowerCase();

    // Use official project colors for consistency
    const activeHex = getBeltColor(currentBelt);
    const activeHsl = hexToHsl(activeHex);

    // For foreground, use black for white belt, otherwise white
    const isWhiteBelt = currentBelt === 'branca';
    const activeFg = isWhiteBelt ? '240 10% 3.9%' : '0 0% 100%';

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const result = await registerGymAction(formData);

        if (result?.error) {
            setError(result.error);
            setLoading(false);
        }
    }

    return (
        <div
            className="min-h-screen bg-[#FAFAFA] p-0"
            style={{
                // @ts-ignore
                '--primary': isWhiteBelt ? '240 10% 3.9%' : activeHsl,
                '--primary-foreground': activeFg
            } as React.CSSProperties}
        >
            <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-10">

                {/* Header */}
                <div className="flex flex-col gap-8">
                    <Link href="/atleta/dashboard/perfil" className="w-fit" aria-label="Voltar">
                        <ArrowLeftIcon size={24} weight="duotone" className="text-primary hover:opacity-80 transition-opacity cursor-pointer" />
                    </Link>

                    <div className="space-y-1">
                        <h1 className="text-panel-lg font-bold tracking-tight text-primary">Cadastrar academia</h1>
                        <p className="text-muted-foreground">
                            Como você não encontrou sua equipe/academia, cadastre abaixo para usar no seu perfil.
                        </p>
                    </div>
                </div>

                {error && (
                    <Alert variant="destructive" className="animate-in fade-in zoom-in duration-300">
                        <WarningCircleIcon size={16} weight="duotone" />
                        <AlertTitle>Erro</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 mt-2">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="gym_name" className="text-panel-sm font-medium text-muted-foreground">Nome da academia / equipe</Label>
                            <Input
                                id="gym_name"
                                name="gym_name"
                                placeholder="Ex: Equipe de Jiu-Jitsu Brasileira"
                                required
                                minLength={2}
                                className="h-12 rounded-xl shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 font-medium"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="master_name" className="text-panel-sm font-medium text-muted-foreground">Nome do mestre / professor responsável</Label>
                            <Input
                                id="master_name"
                                name="master_name"
                                placeholder="Quem é seu professor?"
                                required
                                minLength={2}
                                className="h-12 rounded-xl shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 font-medium"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-3 pt-4">
                        <Button
                            type="submit"
                            disabled={loading}
                            className={`w-1/2 h-12 rounded-full font-semibold text-panel-lg transition-all active:scale-[0.98] ${isWhiteBelt
                                ? "bg-background text-foreground border border-brand-950/20 shadow-none hover:bg-muted/40"
                                : "bg-primary text-primary-foreground shadow-lg hover:opacity-90"
                                }`}
                        >
                            {loading ? <CircleNotchIcon size={20} weight="bold" className="animate-spin mr-2" /> : null}
                            Salvar
                        </Button>

                        <Link href="/atleta/dashboard/perfil" className="w-1/2">
                            <Button
                                type="button"
                                variant="ghost"
                                className={`w-full h-12 rounded-full font-medium transition-all ${isWhiteBelt
                                    ? "text-muted-foreground border border-brand-950/10 hover:bg-muted/30"
                                    : "text-slate-600 hover:text-slate-900"
                                    }`}
                            >
                                Cancelar
                            </Button>
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
