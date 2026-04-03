'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { updateOrganizerAction } from '../actions';
import { toast } from 'sonner';

interface EditAcademiaEquipeFormProps {
    initialData: {
        id: string;
        full_name: string;
        email: string;
        phone?: string;
        document?: string;
        address_street?: string;
        address_number?: string;
        address_city?: string;
        address_state?: string;
        address_zip_code?: string;
        use_own_asaas_api?: boolean;
        asaas_api_key_last4?: string | null;
        can_register_academies?: boolean;
        token_management_enabled?: boolean;
        inscription_token_balance?: number;
    }
}

export default function EditAcademiaEquipeForm({ initialData }: EditAcademiaEquipeFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [useOwnAsaas, setUseOwnAsaas] = useState(initialData.use_own_asaas_api ?? false);
    const [canRegisterAcademies, setCanRegisterAcademies] = useState(initialData.can_register_academies ?? false);
    const [tokenManagementEnabled, setTokenManagementEnabled] = useState(initialData.token_management_enabled ?? false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData(e.currentTarget);
            formData.append('id', initialData.id);
            const result = await updateOrganizerAction(formData);
            if ('error' in result && result.error) {
                toast.error(result.error);
                setLoading(false);
                return;
            }
            toast.success('Alterações salvas com sucesso!');
            router.push(`/admin/dashboard/equipes-academias/${initialData.id}`);
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || 'Ocorreu um erro ao atualizar os dados.');
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-8 px-4 relative">
            <div className="w-full max-w-2xl space-y-8">
                <div className="space-y-4">
                    <Link
                        href={`/admin/dashboard/equipes-academias/${initialData.id}`}
                        className="text-panel-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center w-fit"
                    >
                        <ArrowLeftIcon size={24} weight="duotone" className="mr-2" />
                        Voltar para a lista
                    </Link>
                    <div className="space-y-1 text-center">
                        <h1 className="text-panel-lg font-bold">Editar Entidade</h1>
                        <p className="text-panel-sm text-muted-foreground">Atualize os dados da academia ou equipe.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Organização */}
                    <div className="space-y-2">
                        <label className="text-panel-sm font-semibold text-muted-foreground">Nome da Organização / Equipe / Academia</label>
                        <Input variant="lg" name="full_name" defaultValue={initialData.full_name} placeholder="Ex: CT Jiu-Jitsu Cuiabá" className="bg-background" required disabled={loading} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-panel-sm font-semibold text-muted-foreground">CNPJ ou CPF</label>
                            <Input variant="lg" name="document" defaultValue={initialData.document} placeholder="00.000.000/0000-00" className="bg-background" disabled={loading} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-panel-sm font-semibold text-muted-foreground">WhatsApp / Telefone</label>
                            <Input variant="lg" name="phone" defaultValue={initialData.phone} placeholder="66999999999" className="bg-background" disabled={loading} />
                        </div>
                    </div>

                    {/* Endereço */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                            <label className="text-panel-sm font-semibold text-muted-foreground">Rua / Logradouro</label>
                            <Input variant="lg" name="address_street" defaultValue={initialData.address_street} placeholder="Nome da rua" className="bg-background" disabled={loading} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-panel-sm font-semibold text-muted-foreground">Número</label>
                            <Input variant="lg" name="address_number" defaultValue={initialData.address_number} placeholder="123" className="bg-background" disabled={loading} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                            <label className="text-panel-sm font-semibold text-muted-foreground">Cidade</label>
                            <Input variant="lg" name="address_city" defaultValue={initialData.address_city} placeholder="Cidade" className="bg-background" disabled={loading} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-panel-sm font-semibold text-muted-foreground">Estado</label>
                            <Input variant="lg" name="address_state" defaultValue={initialData.address_state} placeholder="MT" className="bg-background" disabled={loading} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-panel-sm font-semibold text-muted-foreground">CEP</label>
                            <Input variant="lg" name="address_zip_code" defaultValue={initialData.address_zip_code} placeholder="78000-000" className="bg-background" disabled={loading} />
                        </div>
                    </div>

                    {/* Funcionalidades */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl border-2 border-transparent">
                            <div className="grid gap-1 leading-none">
                                <p className="text-panel-sm font-bold">Academias afiliadas</p>
                                <p className="text-panel-sm text-muted-foreground">Permite cadastrar afiliadas</p>
                            </div>
                            <Switch checked={canRegisterAcademies} onCheckedChange={setCanRegisterAcademies} disabled={loading} />
                            <input type="hidden" name="can_register_academies" value={canRegisterAcademies ? 'true' : 'false'} />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl border-2 border-transparent">
                            <div className="grid gap-1 leading-none">
                                <p className="text-panel-sm font-bold">Gestão por token</p>
                                <p className="text-panel-sm text-muted-foreground">Sistema de tokens de inscrição</p>
                            </div>
                            <Switch checked={tokenManagementEnabled} onCheckedChange={setTokenManagementEnabled} disabled={loading} />
                            <input type="hidden" name="token_management_enabled" value={tokenManagementEnabled ? 'true' : 'false'} />
                        </div>
                    </div>

                    {/* Asaas */}
                    <div className="p-4 bg-muted/40 rounded-2xl border-2 border-transparent space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="grid gap-1 leading-none">
                                <p className="text-panel-sm font-bold">Usar conta Asaas própria</p>
                                <p className="text-panel-sm text-muted-foreground">Pagamentos direto para a conta da academia</p>
                            </div>
                            <Switch checked={useOwnAsaas} onCheckedChange={setUseOwnAsaas} disabled={loading} />
                            <input type="hidden" name="use_own_asaas_api" value={useOwnAsaas ? 'true' : 'false'} />
                        </div>
                        {useOwnAsaas && (
                            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                <label className="text-panel-sm font-semibold text-muted-foreground">API Key Asaas</label>
                                <Input
                                    name="asaas_api_key"
                                    type="password"
                                    autoComplete="new-password"
                                    variant="lg"
                                    placeholder={initialData.asaas_api_key_last4
                                        ? `Atual: ••••••••${initialData.asaas_api_key_last4} — deixe em branco para manter`
                                        : 'Cole a API Key aqui'}
                                    className="bg-background font-mono"
                                    disabled={loading}
                                />
                            </div>
                        )}
                    </div>

                    {/* Acesso */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-2">
                            <label className="text-panel-sm font-semibold text-muted-foreground">E-mail</label>
                            <Input variant="lg" name="email" type="email" defaultValue={initialData.email} placeholder="email@exemplo.com" className="bg-background" required disabled={loading} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-panel-sm font-semibold text-muted-foreground">
                                Nova Senha <span className="font-normal text-muted-foreground">(opcional)</span>
                            </label>
                            <Input variant="lg" name="password" type="password" autoComplete="new-password" placeholder="Deixe em branco para manter" className="bg-background" minLength={6} disabled={loading} />
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-4 pt-2">
                        <Button pill type="submit" className="w-full max-w-[320px] h-12 transition-all hover:opacity-90 active:scale-[0.98]" disabled={loading}>
                            {loading ? <><SpinnerGapIcon size={20} weight="bold" className="mr-2 animate-spin" />Salvando...</> : 'Salvar Alterações'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
