'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { updateOrganizerAction } from '../actions';

interface EditAcademiaEquipeFormProps {
    initialData: {
        id: string;
        full_name: string;
        email: string;
        responsible_name?: string;
        document?: string;
        address_street?: string;
        address_number?: string;
        address_city?: string;
        address_state?: string;
        address_zip_code?: string;
        use_own_asaas_api?: boolean;
        asaas_api_key_last4?: string | null;
    }
}

export default function EditAcademiaEquipeForm({ initialData }: EditAcademiaEquipeFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [useOwnAsaas, setUseOwnAsaas] = useState(initialData.use_own_asaas_api ?? false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const formData = new FormData(e.currentTarget);
            formData.append('id', initialData.id);
            const result = await updateOrganizerAction(formData);

            if ('error' in result && result.error) {
                setError(result.error);
                setLoading(false);
                return;
            }

            router.push(`/admin/dashboard/equipes-academias/${initialData.id}`);
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro ao atualizar os dados.');
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 relative">
            <div className="w-full max-w-md space-y-10">
                <div className="space-y-6">
                    <Link
                        href={`/admin/dashboard/equipes-academias/${initialData.id}`}
                        className="text-ui font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center w-fit"
                    >
                        <ArrowLeftIcon size={20} weight="duotone" className="mr-2" />
                        Voltar para a lista
                    </Link>

                    <div className="space-y-2 text-center">
                        <h1 className="text-panel-lg font-black tracking-tight">Editar Entidade</h1>
                        <p className="text-panel-sm text-muted-foreground">
                            Atualize os dados da academia ou equipe.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-destructive/15 text-destructive text-ui rounded-lg text-center animate-in fade-in zoom-in duration-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-6">
                        {/* Informações da Organização */}
                        <div className="space-y-4">
                            <h2 className="text-panel-md font-semibold border-b pb-2">Informações da Organização</h2>

                            <div className="space-y-2">
                                <label htmlFor="full_name" className="text-ui font-medium leading-none">
                                    Nome da Organização/Equipe/Academia
                                </label>
                                <Input variant="lg"
                                    id="full_name"
                                    name="full_name"
                                    defaultValue={initialData.full_name}
                                    placeholder="Ex: Nome da Organização"
                                    className="bg-background"
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
                                    defaultValue={initialData.document}
                                    placeholder="00.000.000/0000-00"
                                    className="bg-background"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* Endereço */}
                        <div className="space-y-4">
                            <h2 className="text-panel-md font-semibold border-b pb-2">Endereço</h2>

                            <div className="space-y-2">
                                <label htmlFor="address_street" className="text-ui font-medium leading-none">
                                    Rua/Logradouro
                                </label>
                                <Input variant="lg"
                                    id="address_street"
                                    name="address_street"
                                    defaultValue={initialData.address_street}
                                    placeholder="Nome da rua"
                                    className="bg-background"
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
                                    defaultValue={initialData.address_number}
                                    placeholder="Ex: 123"
                                    className="bg-background"
                                    disabled={loading}
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="address_city" className="text-ui font-medium leading-none">
                                    Cidade
                                </label>
                                <Input variant="lg"
                                    id="address_city"
                                    name="address_city"
                                    defaultValue={initialData.address_city}
                                    placeholder="Cidade"
                                    className="bg-background"
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
                                    defaultValue={initialData.address_state}
                                    placeholder="UF"
                                    className="bg-background"
                                    disabled={loading}
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="address_zip_code" className="text-ui font-medium leading-none">
                                    CEP
                                </label>
                                <Input variant="lg"
                                    id="address_zip_code"
                                    name="address_zip_code"
                                    defaultValue={initialData.address_zip_code}
                                    placeholder="00000-000"
                                    className="bg-background"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* Integração Asaas */}
                        <div className="space-y-4">
                            <h2 className="text-panel-md font-semibold border-b pb-2">Integração Asaas</h2>

                            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
                                <div className="space-y-0.5">
                                    <p className="text-ui font-medium">Usar conta Asaas própria</p>
                                    <p className="text-caption text-muted-foreground">
                                        Pagamentos irão direto para a conta Asaas da academia
                                    </p>
                                </div>
                                <Switch
                                    checked={useOwnAsaas}
                                    onCheckedChange={setUseOwnAsaas}
                                    disabled={loading}
                                />
                                <input type="hidden" name="use_own_asaas_api" value={useOwnAsaas ? 'true' : 'false'} />
                            </div>

                            {useOwnAsaas && (
                                <div className="space-y-2">
                                    <label htmlFor="asaas_api_key" className="text-ui font-medium leading-none">
                                        API Key Asaas
                                    </label>
                                    <Input
                                        id="asaas_api_key"
                                        name="asaas_api_key"
                                        type="password"
                                        placeholder={initialData.asaas_api_key_last4
                                            ? `Atual: ••••••••${initialData.asaas_api_key_last4} — deixe em branco para manter`
                                            : 'Cole a API Key da academia aqui'
                                        }
                                        className="bg-background font-mono"
                                        disabled={loading}
                                    />
                                    <p className="text-caption text-muted-foreground">
                                        O webhook será registrado automaticamente na conta Asaas da academia.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Acesso */}
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
                                        defaultValue={initialData.email}
                                        placeholder="email@exemplo.com"
                                        className="bg-background"
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="password" className="text-ui font-medium leading-none">
                                        Nova Senha <span className="text-caption text-muted-foreground font-normal">(opcional)</span>
                                    </label>
                                    <Input variant="lg"
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="Deixe em branco para manter"
                                        className="bg-background"
                                        minLength={6}
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-4 pt-4">
                        <Button pill type="submit"
                            className="w-full max-w-[320px] h-12  text-ui font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <SpinnerGapIcon size={20} weight="bold" className="mr-2 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                'Salvar Alterações'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
