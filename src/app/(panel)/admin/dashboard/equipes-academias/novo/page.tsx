'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createOrganizerAction } from '../actions';

export default function NovoAcademiaEquipePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const formData = new FormData(e.currentTarget);
            const result = await createOrganizerAction(formData);
            if (result?.error) {
                setError(result.error);
                setLoading(false);
                return;
            }
            router.push('/admin/dashboard/equipes-academias');
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ocorreu um erro ao cadastrar a entidade.');
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-8 px-4 relative">
            <div className="w-full max-w-2xl space-y-8">
                <div className="space-y-4">
                    <Link
                        href="/admin/dashboard/equipes-academias"
                        className="text-panel-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center w-fit"
                    >
                        <ArrowLeftIcon size={24} weight="duotone" className="mr-2" />
                        Voltar para a lista
                    </Link>
                    <div className="space-y-1 text-center">
                        <h1 className="text-panel-lg font-bold">Nova Entidade</h1>
                        <p className="text-panel-sm text-muted-foreground">Preencha os dados para cadastrar uma nova academia ou equipe.</p>
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-destructive/15 text-destructive text-panel-sm rounded-lg text-center animate-in fade-in zoom-in duration-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Organização */}
                    <div className="space-y-2">
                        <label className="text-panel-sm font-semibold text-muted-foreground">Nome da Organização / Equipe / Academia</label>
                        <Input variant="lg" name="full_name" placeholder="Ex: CT Jiu-Jitsu Cuiabá" className="bg-background" required disabled={loading} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-panel-sm font-semibold text-muted-foreground">CNPJ ou CPF</label>
                            <Input variant="lg" name="document" placeholder="00.000.000/0000-00" className="bg-background" disabled={loading} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-panel-sm font-semibold text-muted-foreground">WhatsApp / Telefone</label>
                            <Input variant="lg" name="phone" placeholder="66999999999" className="bg-background" disabled={loading} />
                        </div>
                    </div>

                    {/* Endereço */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                            <label className="text-panel-sm font-semibold text-muted-foreground">Rua / Logradouro</label>
                            <Input variant="lg" name="address_street" placeholder="Nome da rua" className="bg-background" disabled={loading} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-panel-sm font-semibold text-muted-foreground">Número</label>
                            <Input variant="lg" name="address_number" placeholder="123" className="bg-background" disabled={loading} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                            <label className="text-panel-sm font-semibold text-muted-foreground">Cidade</label>
                            <Input variant="lg" name="address_city" placeholder="Cidade" className="bg-background" disabled={loading} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-panel-sm font-semibold text-muted-foreground">Estado</label>
                            <Input variant="lg" name="address_state" placeholder="MT" className="bg-background" disabled={loading} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-panel-sm font-semibold text-muted-foreground">CEP</label>
                            <Input variant="lg" name="address_zip_code" placeholder="78000-000" className="bg-background" disabled={loading} />
                        </div>
                    </div>

                    {/* Acesso */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-2">
                            <label className="text-panel-sm font-semibold text-muted-foreground">E-mail</label>
                            <Input variant="lg" name="email" type="email" placeholder="email@exemplo.com" className="bg-background" required disabled={loading} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-panel-sm font-semibold text-muted-foreground">Senha</label>
                            <Input variant="lg" name="password" type="password" placeholder="••••••••" className="bg-background" required minLength={6} disabled={loading} />
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-4 pt-2">
                        <Button pill type="submit" className="w-full max-w-[320px] h-12 transition-all hover:opacity-90 active:scale-[0.98]" disabled={loading}>
                            {loading ? <><SpinnerGapIcon size={20} weight="bold" className="mr-2 animate-spin" />Cadastrando...</> : 'Cadastrar Entidade'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
