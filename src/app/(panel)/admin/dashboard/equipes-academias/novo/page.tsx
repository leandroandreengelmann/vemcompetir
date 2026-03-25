'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createOrganizerAction } from '../actions';
import { SectionHeader } from "@/components/layout/SectionHeader";

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
            const message = err instanceof Error ? err.message : 'Ocorreu um erro ao cadastrar a entidade.';
            setError(message);
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 relative">
            <div className="w-full max-w-md space-y-10">
                <div className="space-y-6">
                    <Link
                        href="/admin/dashboard/equipes-academias"
                        className="text-ui font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center w-fit"
                    >
                        <ArrowLeftIcon size={20} weight="duotone" className="mr-2" />
                        Voltar para a lista
                    </Link>

                    <SectionHeader
                        title="Nova Entidade"
                        description="Preencha os dados para cadastrar uma nova academia ou equipe."
                        className="text-center md:flex-col md:items-center"
                    />
                </div>

                {error && (
                    <div className="p-3 bg-destructive/15 text-destructive text-ui rounded-lg text-center animate-in fade-in zoom-in duration-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h2 className="text-panel-md font-semibold border-b pb-2">Informações da Organização</h2>

                            <div className="space-y-2">
                                <label htmlFor="full_name" className="text-ui font-medium leading-none">
                                    Nome da Organização/Equipe/Academia
                                </label>
                                <Input
                                    id="full_name"
                                    name="full_name"
                                    placeholder="Ex: Nome da Organização"
                                    variant="lg"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="document" className="text-ui font-medium leading-none">
                                    CNPJ ou CPF
                                </label>
                                <Input
                                    id="document"
                                    name="document"
                                    placeholder="00.000.000/0000-00"
                                    variant="lg"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-panel-md font-semibold border-b pb-2">Endereço</h2>

                            <div className="space-y-2">
                                <label htmlFor="address_street" className="text-ui font-medium leading-none">
                                    Rua/Logradouro
                                </label>
                                <Input
                                    id="address_street"
                                    name="address_street"
                                    placeholder="Nome da rua"
                                    variant="lg"
                                    disabled={loading}
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="address_number" className="text-ui font-medium leading-none">
                                    Número
                                </label>
                                <Input
                                    id="address_number"
                                    name="address_number"
                                    placeholder="Ex: 123"
                                    variant="lg"
                                    disabled={loading}
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="address_city" className="text-ui font-medium leading-none">
                                    Cidade
                                </label>
                                <Input
                                    id="address_city"
                                    name="address_city"
                                    placeholder="Cidade"
                                    variant="lg"
                                    disabled={loading}
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="address_state" className="text-ui font-medium leading-none">
                                    Estado
                                </label>
                                <Input
                                    id="address_state"
                                    name="address_state"
                                    placeholder="UF"
                                    variant="lg"
                                    disabled={loading}
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="address_zip_code" className="text-ui font-medium leading-none">
                                    CEP
                                </label>
                                <Input
                                    id="address_zip_code"
                                    name="address_zip_code"
                                    placeholder="00000-000"
                                    variant="lg"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-panel-md font-semibold border-b pb-2">Dados de Acesso</h2>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-ui font-medium leading-none">
                                        E-mail
                                    </label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="email@exemplo.com"
                                        variant="lg"
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="password" className="text-ui font-medium leading-none">
                                        Senha
                                    </label>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                        variant="lg"
                                        required
                                        minLength={6}
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-4 pt-4">
                        <Button
                            type="submit"
                            pill
                            className="w-full max-w-[320px] h-12 text-ui text-white font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <SpinnerGapIcon size={20} weight="bold" className="mr-2 animate-spin" />
                                    Cadastrando...
                                </>
                            ) : (
                                'Cadastrar Entidade'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
