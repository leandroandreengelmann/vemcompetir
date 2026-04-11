'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createAdminEventAction, updateAdminEventAction, deleteAdminEventAction, approveAdminEventAction, publishAdminEventAction, unpublishAdminEventAction } from '../actions';
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmationDialog } from "@/components/panel/DeleteConfirmationDialog";

interface Academy {
    id: string;
    full_name: string;
    gym_name?: string;
    tenant_id: string;
}

interface AdminEventFormProps {
    initialData?: {
        id: string;
        title: string;
        location?: string;
        event_date: string;
        event_end_date?: string | null;
        tenant_id: string;
        image_path?: string;
        secondary_image_1_path?: string | null;
        secondary_image_2_path?: string | null;
        address_street?: string;
        address_number?: string;
        address_neighborhood?: string;
        address_city?: string;
        address_state?: string;
        address_zip?: string;
        status?: string;
        registration_end_date?: string | null;
        category_change_deadline_days?: number | null;
    };
    academies: Academy[];
}

export default function AdminEventForm({ initialData, academies }: AdminEventFormProps) {
    const router = useRouter();
    const isEdit = !!initialData;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(
        initialData?.image_path
            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-images/${initialData.image_path}`
            : null
    );
    const [resizedImage, setResizedImage] = useState<Blob | null>(null);
    const [removeImage, setRemoveImage] = useState(false);
    const [selectedTenantId, setSelectedTenantId] = useState(initialData?.tenant_id || '');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setRemoveImage(false);
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const MAX = 1000;
                const scale = Math.min(MAX / img.width, MAX / img.height, 1);
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob((blob) => {
                        if (blob) { setResizedImage(blob); setImagePreview(URL.createObjectURL(blob)); }
                    }, 'image/jpeg', 0.92);
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
        setImagePreview(null);
        setResizedImage(null);
        setRemoveImage(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDelete = async () => {
        if (!initialData?.id) return;

        setLoading(true);
        const result = await deleteAdminEventAction(initialData.id);
        if (result.error) {
            setError(result.error);
            setLoading(false);
        } else {
            router.push(`/admin/dashboard/equipes-academias/${selectedTenantId}/eventos`);
            router.refresh();
        }
    };

    const handleApprove = async () => {
        if (!initialData?.id || !confirm('Deseja aprovar este evento?')) return;
        setLoading(true);
        const result = await approveAdminEventAction(initialData.id);
        if (result.error) {
            setError(result.error);
            setLoading(false);
        } else {
            router.refresh();
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!initialData?.id || loading) return;

        setLoading(true);
        setError(null);

        try {
            const result = await publishAdminEventAction(initialData.id);
            if (result.error) {
                setError(result.error);
            } else if (result.success) {
                alert('Evento publicado com sucesso! Agora ele está visível na página inicial.');
                router.refresh();
            }
        } catch (err) {
            setError('Falha ao publicar o evento.');
        } finally {
            setLoading(false);
        }
    };

    const handleUnpublish = async () => {
        if (!initialData?.id || loading) return;

        if (!confirm('Deseja despublicar este evento? Ele deixará de ser visível na página inicial.')) return;

        setLoading(true);
        setError(null);

        try {
            const result = await unpublishAdminEventAction(initialData.id);
            if (result.error) {
                setError(result.error);
            } else if (result.success) {
                alert('Evento despublicado com sucesso.');
                router.refresh();
            }
        } catch (err) {
            setError('Falha ao despublicar o evento.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const formData = new FormData(e.currentTarget);
            formData.set('tenant_id', selectedTenantId);

            if (resizedImage) {
                formData.set('image', resizedImage, 'thumb.jpg');
            }
            if (removeImage) {
                formData.set('remove_image', 'true');
            }

            const action = isEdit ? updateAdminEventAction : createAdminEventAction;
            const result = await action(formData);

            if (result?.error) {
                setError(result.error);
                setLoading(false);
                return;
            }

            router.push(`/admin/dashboard/eventos`);
            router.refresh();
        } catch (err) {
            setError('Ocorreu um erro ao processar o evento.');
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 relative">
            <div className="w-full max-w-2xl space-y-10">
                <div className="space-y-6">
                    <Link
                        href="/admin/dashboard/eventos"
                        className="text-panel-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center w-fit"
                    >
                        <ArrowLeftIcon size={20} weight="duotone" className="mr-2" />
                        Voltar
                    </Link>

                    <SectionHeader
                        title={isEdit ? "Editar Evento" : "Novo Evento"}
                        description={isEdit ? "Atualize as informações do evento acadêmico." : "Preencha os dados para criar um novo evento administrativo."}
                        className="text-center md:flex-col md:items-center"
                    />
                </div>

                {error && (
                    <div className="p-3 bg-destructive/15 text-destructive text-panel-sm rounded-lg text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    {isEdit && <input type="hidden" name="id" value={initialData.id} />}

                    <div className="grid gap-8 md:grid-cols-2">
                        {/* Informações Básicas */}
                        <div className="space-y-6">
                            <h3 className="text-panel-md font-semibold border-b pb-2">
                                Dados do Evento
                            </h3>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-panel-sm font-medium leading-none">
                                        Academia / Equipe Vinculada *
                                    </label>
                                    <Select
                                        disabled={loading}
                                        onValueChange={setSelectedTenantId}
                                        value={selectedTenantId}
                                    >
                                        <SelectTrigger className="h-12 border-input bg-transparent rounded-xl shadow-xs focus:ring-1 focus:ring-ring">
                                            <SelectValue placeholder="Selecione a academia" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {academies.map((academy) => (
                                                <SelectItem key={academy.tenant_id} value={academy.tenant_id}>
                                                    {academy.gym_name || academy.full_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="title" className="text-panel-sm font-medium leading-none">
                                        Título do Evento *
                                    </label>
                                    <Input
                                        id="title"
                                        name="title"
                                        defaultValue={initialData?.title}
                                        placeholder="Ex: Copa de Inverno"
                                        variant="lg"
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="event_date" className="text-panel-sm font-medium leading-none">
                                        Data do Evento *
                                    </label>
                                    <Input
                                        id="event_date"
                                        name="event_date"
                                        type="datetime-local"
                                        defaultValue={initialData?.event_date ? new Date(initialData.event_date).toISOString().slice(0, 16) : ''}
                                        variant="lg"
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="event_end_date" className="text-panel-sm font-medium leading-none">
                                        Data de Término
                                    </label>
                                    <Input
                                        id="event_end_date"
                                        name="event_end_date"
                                        type="date"
                                        defaultValue={initialData?.event_end_date ? initialData.event_end_date.slice(0, 10) : ''}
                                        variant="lg"
                                        disabled={loading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="registration_end_date" className="text-panel-sm font-medium leading-none">
                                        Prazo de Inscrições
                                    </label>
                                    <Input
                                        id="registration_end_date"
                                        name="registration_end_date"
                                        type="date"
                                        defaultValue={initialData?.registration_end_date ? initialData.registration_end_date.slice(0, 10) : ''}
                                        variant="lg"
                                        disabled={loading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="category_change_deadline_days" className="text-panel-sm font-medium leading-none">
                                        Prazo para Troca de Categoria
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <Input
                                            id="category_change_deadline_days"
                                            name="category_change_deadline_days"
                                            type="number"
                                            min="0"
                                            defaultValue={initialData?.category_change_deadline_days ?? 0}
                                            variant="lg"
                                            disabled={loading}
                                            className="max-w-[120px]"
                                        />
                                        <span className="text-panel-sm text-muted-foreground">dias antes do evento (0 = não permite)</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="location" className="text-panel-sm font-medium leading-none">
                                        Local (Nome da Arena/Ginásio)
                                    </label>
                                    <Input
                                        id="location"
                                        name="location"
                                        defaultValue={initialData?.location}
                                        placeholder="Ex: Ginásio Municipal"
                                        variant="lg"
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Endereço e Imagem */}
                        <div className="space-y-6">
                            <h3 className="text-panel-md font-semibold border-b pb-2">
                                Endereço
                            </h3>

                            <div className="grid gap-4">
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="col-span-3 space-y-2">
                                        <label htmlFor="address_street" className="text-panel-sm font-medium leading-none"> Rua * </label>
                                        <Input id="address_street" name="address_street" defaultValue={initialData?.address_street} variant="lg" required disabled={loading} placeholder="Rua..." />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="address_number" className="text-panel-sm font-medium leading-none"> Nº </label>
                                        <Input id="address_number" name="address_number" defaultValue={initialData?.address_number} variant="lg" disabled={loading} placeholder="123" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="address_neighborhood" className="text-panel-sm font-medium leading-none"> Bairro </label>
                                        <Input id="address_neighborhood" name="address_neighborhood" defaultValue={initialData?.address_neighborhood} variant="lg" disabled={loading} placeholder="Centro" />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="address_zip" className="text-panel-sm font-medium leading-none"> CEP </label>
                                        <Input id="address_zip" name="address_zip" defaultValue={initialData?.address_zip} variant="lg" disabled={loading} placeholder="00000-000" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2 space-y-2">
                                        <label htmlFor="address_city" className="text-panel-sm font-medium leading-none"> Cidade * </label>
                                        <Input id="address_city" name="address_city" defaultValue={initialData?.address_city} variant="lg" required disabled={loading} placeholder="Cidade" />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="address_state" className="text-panel-sm font-medium leading-none"> UF * </label>
                                        <Input id="address_state" name="address_state" defaultValue={initialData?.address_state} variant="lg" required disabled={loading} placeholder="UF" maxLength={2} className="uppercase" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4">
                                <h3 className="text-panel-md font-semibold border-b pb-2"> Imagem Principal </h3>
                                <div className="flex flex-col items-center gap-4">
                                    <div className={cn("relative size-[260px] sm:size-[320px] rounded-2xl border flex flex-col items-center justify-center p-1 bg-muted/10 transition-all overflow-hidden cursor-pointer hover:bg-muted/20", imagePreview ? "border-primary/20" : "border-dashed border-input")} onClick={() => !imagePreview && fileInputRef.current?.click()} >
                                        {imagePreview ? (
                                            <>
                                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                                                <button type="button" onClick={handleRemoveImage} className="absolute top-2 right-2 px-3 py-1 bg-destructive text-white text-xs uppercase tracking-wider rounded-full hover:scale-105 transition-transform shadow-lg" > Remover </button>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center transition-opacity">
                                                <span className="text-xs uppercase tracking-wider opacity-60">ENVIAR IMAGEM</span>
                                                <span className="text-xs mt-1 opacity-40">Recomendado: 1000×1000</span>
                                            </div>
                                        )}
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} disabled={loading} />
                                </div>
                            </div>

                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4 pt-8 border-t w-full">
                        <Button
                            type="submit"
                            pill
                            className="w-full sm:w-fit min-w-[200px] h-12 text-panel-sm font-bold text-white transition-all shadow-lg shadow-primary/20"
                            disabled={loading || !selectedTenantId}
                        >
                            {loading ? <SpinnerGapIcon size={20} weight="bold" className="mr-2 animate-spin" /> : isEdit ? 'Salvar Alterações' : 'Criar Evento'}
                        </Button>

                        {isEdit && initialData?.status === 'pendente' && (
                            <Button
                                type="button"
                                variant="default"
                                pill
                                onClick={handleApprove}
                                className="w-full sm:w-fit min-w-[200px] h-12 text-panel-sm font-bold text-white shadow-lg shadow-primary/20"
                                disabled={loading}
                            >
                                {loading ? <SpinnerGapIcon size={20} weight="bold" className="mr-2 animate-spin" /> : 'Aprovar Evento'}
                            </Button>
                        )}

                        {isEdit && (initialData?.status === 'aprovado' || initialData?.status === 'publicado') && (
                            <Button
                                type="button"
                                variant="default"
                                pill
                                onClick={initialData.status === 'publicado' ? handleUnpublish : handlePublish}
                                className={cn(
                                    "w-full sm:w-fit min-w-[200px] h-12 text-panel-sm font-bold shadow-lg transition-all",
                                    initialData.status === 'publicado'
                                        ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20 shadow-none"
                                        : "text-white shadow-primary/20"
                                )}
                                disabled={loading}
                            >
                                {loading ? <SpinnerGapIcon size={20} weight="bold" className="mr-2 animate-spin" /> : initialData.status === 'publicado' ? 'Despublicar Evento' : 'Publicar'}
                            </Button>
                        )}

                        {isEdit && (
                            <Button
                                type="button"
                                pill
                                asChild
                                className="w-full sm:w-fit min-w-[200px] h-12 text-panel-sm font-bold text-white shadow-lg shadow-primary/20"
                            >
                                <Link href={`/eventos/${initialData.id}`} target="_blank">
                                    Visualizar Prévia
                                </Link>
                            </Button>
                        )}

                        {isEdit && (
                            <Button
                                type="button"
                                pill
                                asChild
                                className="w-full sm:w-fit min-w-[200px] h-12 text-panel-sm font-bold text-white shadow-lg shadow-primary/20"
                            >
                                <Link href={`/admin/dashboard/eventos/${initialData.id}/categorias`}>
                                    Categorias
                                </Link>
                            </Button>
                        )}

                        {isEdit && (
                            <Button
                                type="button"
                                pill
                                asChild
                                className="w-full sm:w-fit min-w-[200px] h-12 text-panel-sm font-bold text-white shadow-lg shadow-primary/20"
                            >
                                <Link href={`/admin/dashboard/eventos/${initialData.id}/informacoes-gerais`}>
                                    Infos Gerais
                                </Link>
                            </Button>
                        )}

                        {isEdit && (
                            <Button
                                type="button"
                                pill
                                asChild
                                className="w-full sm:w-fit min-w-[200px] h-12 text-panel-sm font-bold text-white shadow-lg shadow-primary/20"
                            >
                                <Link href={`/admin/dashboard/eventos/${initialData.id}/imagens`}>
                                    Imagens
                                </Link>
                            </Button>
                        )}

                        {isEdit && (
                            <Button
                                type="button"
                                pill
                                asChild
                                className="w-full sm:w-fit min-w-[200px] h-12 text-panel-sm font-bold text-white shadow-lg shadow-primary/20"
                            >
                                <Link href={`/admin/dashboard/eventos/${initialData.id}/passaporte`}>
                                    Passaporte
                                </Link>
                            </Button>
                        )}

                        {isEdit && (
                            <Button
                                type="button"
                                pill
                                asChild
                                variant="secondary"
                                className="w-full sm:w-fit min-w-[200px] h-12 text-panel-sm font-bold shadow-lg shadow-primary/10"
                            >
                                <Link href={`/admin/dashboard/eventos/${initialData.id}/precos-academias`}>
                                    Preços por Academia
                                </Link>
                            </Button>
                        )}

                        {isEdit && (
                            <Button
                                type="button"
                                variant="destructive"
                                pill
                                onClick={() => setIsDeleteDialogOpen(true)}
                                className="w-full sm:w-fit min-w-[200px] h-12 text-panel-sm font-bold text-white transition-all shadow-lg shadow-destructive/20"
                                disabled={loading}
                            >
                                Excluir Evento
                            </Button>
                        )}
                    </div>
                </form>

                {initialData && (
                    <DeleteConfirmationDialog
                        isOpen={isDeleteDialogOpen}
                        onClose={() => setIsDeleteDialogOpen(false)}
                        onConfirm={handleDelete}
                        title="Excluir Evento"
                        description={`Esta ação é irreversível.\nTodos os dados vinculados a este evento serão removidos.`}
                        itemName={initialData.title}
                        loading={loading}
                    />
                )}
            </div>
        </div>
    );
}
