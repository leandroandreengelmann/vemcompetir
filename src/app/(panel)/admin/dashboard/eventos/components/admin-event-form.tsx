'use client';

import React, { useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeftIcon,
    SpinnerGapIcon,
    BuildingsIcon,
    CalendarBlankIcon,
    MapPinIcon,
    ImageIcon,
    EyeIcon,
    TrashIcon,
    UploadSimpleIcon,
    XIcon,
    LockSimpleIcon,
    LockSimpleOpenIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    createAdminEventAction,
    updateAdminEventAction,
    deleteAdminEventAction,
    approveAdminEventAction,
    publishAdminEventAction,
    unpublishAdminEventAction,
    setRegistrationsClosedAction,
} from '../actions';
import { confirmAsync } from '@/components/panel/ConfirmDialog';
import { showToast } from '@/lib/toast';
import { DeleteConfirmationDialog } from '@/components/panel/DeleteConfirmationDialog';
import { EventoTabs } from '@/components/eventos/EventoTabs';

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
        inscricoes_encerradas?: boolean;
    };
    academies: Academy[];
}

type StatusKey = 'pendente' | 'aprovado' | 'publicado' | 'rascunho' | 'desconhecido';

const STATUS_META: Record<StatusKey, { label: string; variant: 'pending' | 'info' | 'success' | 'secondary' | 'outline' }> = {
    pendente: { label: 'Pendente', variant: 'pending' },
    aprovado: { label: 'Aprovado', variant: 'info' },
    publicado: { label: 'Publicado', variant: 'success' },
    rascunho: { label: 'Rascunho', variant: 'secondary' },
    desconhecido: { label: 'Sem status', variant: 'outline' },
};

function resolveStatus(s?: string): StatusKey {
    if (!s) return 'desconhecido';
    if (s === 'pendente' || s === 'aprovado' || s === 'publicado' || s === 'rascunho') return s;
    return 'desconhecido';
}

function formatDateBR(iso?: string | null) {
    if (!iso) return null;
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return null; }
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
            : null,
    );
    const [resizedImage, setResizedImage] = useState<Blob | null>(null);
    const [removeImage, setRemoveImage] = useState(false);
    const [selectedTenantId, setSelectedTenantId] = useState(initialData?.tenant_id || '');
    const [imageMeta, setImageMeta] = useState<{ w: number; h: number; sizeKB: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const status = resolveStatus(initialData?.status);
    const statusMeta = STATUS_META[status];

    const academiaSelecionada = useMemo(
        () => academies.find((a) => a.tenant_id === selectedTenantId),
        [academies, selectedTenantId],
    );

    const headerSubtitle = useMemo(() => {
        if (!isEdit || !initialData) return null;
        const partes: string[] = [];
        const data = formatDateBR(initialData.event_date);
        if (data) partes.push(data);
        if (initialData.address_city && initialData.address_state) {
            partes.push(`${initialData.address_city} — ${initialData.address_state}`);
        }
        const academyName = academiaSelecionada?.gym_name || academiaSelecionada?.full_name;
        if (academyName) partes.push(academyName);
        return partes.join(' · ');
    }, [isEdit, initialData, academiaSelecionada]);

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
                        if (blob) {
                            setResizedImage(blob);
                            setImagePreview(URL.createObjectURL(blob));
                            setImageMeta({ w: canvas.width, h: canvas.height, sizeKB: Math.round(blob.size / 1024) });
                        }
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
        setImageMeta(null);
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
        if (!initialData?.id) return;
        const ok = await confirmAsync({
            variant: 'default',
            title: 'Aprovar evento?',
            description: 'Após aprovado, o evento poderá ser publicado e aparecerá na página inicial.',
            confirmLabel: 'Aprovar',
        });
        if (!ok) return;
        setLoading(true);
        const result = await approveAdminEventAction(initialData.id);
        if (result.error) {
            setError(result.error);
            setLoading(false);
        } else {
            showToast.success('Evento aprovado');
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
            if (result.error) setError(result.error);
            else if (result.success) {
                showToast.success('Evento publicado', 'Agora ele está visível na página inicial.');
                router.refresh();
            }
        } catch {
            setError('Falha ao publicar o evento.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleRegistrations = async () => {
        if (!initialData?.id || loading) return;
        const isClosed = !!initialData.inscricoes_encerradas;
        const ok = await confirmAsync({
            variant: isClosed ? 'default' : 'warning',
            title: isClosed ? 'Reabrir inscrições?' : 'Encerrar inscrições?',
            description: isClosed
                ? 'O botão de inscrição voltará a aparecer na página pública do evento.'
                : 'O botão de inscrição será substituído por "Inscrições encerradas" na página pública. Atletas já inscritos não são afetados.',
            confirmLabel: isClosed ? 'Reabrir' : 'Encerrar',
        });
        if (!ok) return;
        setLoading(true);
        setError(null);
        try {
            const result = await setRegistrationsClosedAction(initialData.id, !isClosed);
            if (result.error) setError(result.error);
            else if (result.success) {
                showToast.success(isClosed ? 'Inscrições reabertas' : 'Inscrições encerradas');
                router.refresh();
            }
        } catch {
            setError('Falha ao alterar status das inscrições.');
        } finally {
            setLoading(false);
        }
    };

    const handleUnpublish = async () => {
        if (!initialData?.id || loading) return;
        const ok = await confirmAsync({
            variant: 'warning',
            title: 'Despublicar evento?',
            description: 'O evento deixará de ser visível na página inicial até você publicá-lo novamente.',
            confirmLabel: 'Despublicar',
        });
        if (!ok) return;
        setLoading(true);
        setError(null);
        try {
            const result = await unpublishAdminEventAction(initialData.id);
            if (result.error) setError(result.error);
            else if (result.success) {
                showToast.success('Evento despublicado');
                router.refresh();
            }
        } catch {
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
            if (resizedImage) formData.set('image', resizedImage, 'thumb.jpg');
            if (removeImage) formData.set('remove_image', 'true');
            const action = isEdit ? updateAdminEventAction : createAdminEventAction;
            const result = await action(formData);
            if (result?.error) {
                setError(result.error);
                setLoading(false);
                return;
            }
            router.push('/admin/dashboard/eventos');
            router.refresh();
        } catch {
            setError('Ocorreu um erro ao processar o evento.');
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-6">
            {/* Voltar */}
            <Link
                href="/admin/dashboard/eventos"
                className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center w-fit"
            >
                <ArrowLeftIcon size={20} weight="duotone" className="mr-2" />
                Voltar para Eventos
            </Link>

            {/* Header com status */}
            <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                        {isEdit ? initialData!.title : 'Novo Evento'}
                    </h1>
                    {isEdit && (
                        <Badge variant={statusMeta.variant} className="text-sm px-3 py-1 rounded-full">
                            {statusMeta.label}
                        </Badge>
                    )}
                </div>
                {isEdit && headerSubtitle && (
                    <p className="text-base text-muted-foreground">{headerSubtitle}</p>
                )}
                {!isEdit && (
                    <p className="text-base text-muted-foreground">
                        Preencha os dados para criar um novo evento administrativo.
                    </p>
                )}
            </div>

            {/* Tabs (apenas em edição) */}
            {isEdit && initialData && <EventoTabs eventId={initialData.id} />}

            {error && (
                <div className="p-3 bg-destructive/15 text-destructive text-base rounded-lg text-center">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {isEdit && <input type="hidden" name="id" value={initialData!.id} />}

                <div className="grid gap-8 md:grid-cols-2">
                    {/* SEÇÃO 1 — Identificação */}
                    <div className="space-y-6">
                        <h3 className="text-panel-md font-semibold border-b pb-2 flex items-center gap-2">
                            <BuildingsIcon size={20} weight="duotone" className="text-primary" />
                            Identificação
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
                                        {academies.map((a) => (
                                            <SelectItem key={a.tenant_id} value={a.tenant_id}>
                                                {a.gym_name || a.full_name}
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
                        </div>
                    </div>

                    {/* SEÇÃO 2 — Quando */}
                    <div className="space-y-6">
                        <h3 className="text-panel-md font-semibold border-b pb-2 flex items-center gap-2">
                            <CalendarBlankIcon size={20} weight="duotone" className="text-primary" />
                            Quando
                        </h3>

                        <div className="space-y-4">
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

                            <div className="grid gap-4 sm:grid-cols-2">
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
                                        Prazo Inscrições
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
                                    <span className="text-panel-sm text-muted-foreground">
                                        dias antes (0 = não permite)
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO 3 — Onde */}
                    <div className="space-y-6 md:col-span-2">
                        <h3 className="text-panel-md font-semibold border-b pb-2 flex items-center gap-2">
                            <MapPinIcon size={20} weight="duotone" className="text-primary" />
                            Onde
                        </h3>

                        <div className="space-y-4">
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

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                <div className="sm:col-span-3 space-y-2">
                                    <label htmlFor="address_street" className="text-panel-sm font-medium leading-none">Rua *</label>
                                    <Input id="address_street" name="address_street" defaultValue={initialData?.address_street} variant="lg" required disabled={loading} placeholder="Rua..." />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="address_number" className="text-panel-sm font-medium leading-none">Nº</label>
                                    <Input id="address_number" name="address_number" defaultValue={initialData?.address_number} variant="lg" disabled={loading} placeholder="123" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="address_neighborhood" className="text-panel-sm font-medium leading-none">Bairro</label>
                                    <Input id="address_neighborhood" name="address_neighborhood" defaultValue={initialData?.address_neighborhood} variant="lg" disabled={loading} placeholder="Centro" />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="address_zip" className="text-panel-sm font-medium leading-none">CEP</label>
                                    <Input id="address_zip" name="address_zip" defaultValue={initialData?.address_zip} variant="lg" disabled={loading} placeholder="00000-000" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="sm:col-span-2 space-y-2">
                                    <label htmlFor="address_city" className="text-panel-sm font-medium leading-none">Cidade *</label>
                                    <Input id="address_city" name="address_city" defaultValue={initialData?.address_city} variant="lg" required disabled={loading} placeholder="Cidade" />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="address_state" className="text-panel-sm font-medium leading-none">UF *</label>
                                    <Input id="address_state" name="address_state" defaultValue={initialData?.address_state} variant="lg" required disabled={loading} placeholder="UF" maxLength={2} className="uppercase" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO 4 — Imagem principal */}
                    <div className="space-y-6 md:col-span-2">
                        <h3 className="text-panel-md font-semibold border-b pb-2 flex items-center gap-2">
                            <ImageIcon size={20} weight="duotone" className="text-primary" />
                            Imagem Principal
                        </h3>

                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div
                                className={cn(
                                    'relative size-[240px] sm:size-[280px] rounded-2xl border flex flex-col items-center justify-center bg-muted/10 transition-all overflow-hidden cursor-pointer hover:bg-muted/20 shrink-0',
                                    imagePreview ? 'border-primary/20' : 'border-dashed border-input',
                                )}
                                onClick={() => !imagePreview && fileInputRef.current?.click()}
                            >
                                {imagePreview ? (
                                    <>
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                                        <button
                                            type="button"
                                            onClick={handleRemoveImage}
                                            className="absolute top-2 right-2 inline-flex items-center gap-1 px-3 py-1 bg-destructive text-white text-xs uppercase tracking-wider rounded-full hover:scale-105 transition-transform shadow-lg"
                                        >
                                            <XIcon size={14} weight="bold" /> Remover
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 px-4 text-center">
                                        <UploadSimpleIcon size={32} weight="duotone" className="text-muted-foreground" />
                                        <span className="text-panel-sm font-semibold text-foreground">Enviar imagem</span>
                                        <span className="text-xs text-muted-foreground">1000×1000 recomendado</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 w-full space-y-3">
                                <p className="text-panel-sm text-muted-foreground">
                                    A imagem aparece em destaque na página do evento e na listagem pública.
                                    Idealmente <strong>quadrada</strong>, com pelo menos <strong>1000×1000px</strong>.
                                    Vamos comprimir e redimensionar automaticamente.
                                </p>
                                {imageMeta && (
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline">{imageMeta.w}×{imageMeta.h}px</Badge>
                                        <Badge variant="outline">{imageMeta.sizeKB} KB</Badge>
                                        <Badge variant="success">JPEG otimizado</Badge>
                                    </div>
                                )}
                                {imagePreview && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        pill
                                        onClick={() => fileInputRef.current?.click()}
                                        className="h-10"
                                    >
                                        <UploadSimpleIcon size={16} weight="duotone" />
                                        Trocar imagem
                                    </Button>
                                )}
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageChange}
                            disabled={loading}
                        />
                    </div>
                </div>

                {/* Rodapé enxuto: 4 ações principais */}
                <div className="sticky bottom-4 z-10">
                    <div className="flex flex-wrap items-center justify-end gap-3 p-4 rounded-2xl border bg-background/95 backdrop-blur shadow-lg">
                        {isEdit && (
                            <Button
                                type="button"
                                variant="outline"
                                pill
                                asChild
                                className="h-12 px-5 text-base font-semibold"
                            >
                                <Link href={`/eventos/${initialData!.id}`} target="_blank">
                                    <EyeIcon size={18} weight="duotone" />
                                    Visualizar prévia
                                </Link>
                            </Button>
                        )}

                        {isEdit && initialData?.status === 'pendente' && (
                            <Button
                                type="button"
                                variant="default"
                                pill
                                onClick={handleApprove}
                                className="h-12 px-5 text-base font-bold text-white shadow-lg shadow-primary/20"
                                disabled={loading}
                            >
                                {loading ? <SpinnerGapIcon size={18} weight="bold" className="animate-spin" /> : 'Aprovar Evento'}
                            </Button>
                        )}

                        {isEdit && (initialData?.status === 'aprovado' || initialData?.status === 'publicado') && (
                            <Button
                                type="button"
                                variant="default"
                                pill
                                onClick={initialData.status === 'publicado' ? handleUnpublish : handlePublish}
                                className={cn(
                                    'h-12 px-5 text-base font-bold transition-all',
                                    initialData.status === 'publicado'
                                        ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/30 shadow-none'
                                        : 'text-white shadow-lg shadow-primary/20',
                                )}
                                disabled={loading}
                            >
                                {loading ? (
                                    <SpinnerGapIcon size={18} weight="bold" className="animate-spin" />
                                ) : initialData.status === 'publicado' ? 'Despublicar' : 'Publicar'}
                            </Button>
                        )}

                        {isEdit && initialData?.status === 'publicado' && (
                            <Button
                                type="button"
                                variant="outline"
                                pill
                                onClick={handleToggleRegistrations}
                                className={cn(
                                    'h-12 px-5 text-base font-bold transition-all',
                                    initialData.inscricoes_encerradas
                                        ? 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-amber-500/40'
                                        : 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-rose-500/40',
                                )}
                                disabled={loading}
                            >
                                {loading ? (
                                    <SpinnerGapIcon size={18} weight="bold" className="animate-spin" />
                                ) : initialData.inscricoes_encerradas ? (
                                    <>
                                        <LockSimpleOpenIcon size={18} weight="duotone" />
                                        Reabrir Inscrições
                                    </>
                                ) : (
                                    <>
                                        <LockSimpleIcon size={18} weight="duotone" />
                                        Encerrar Inscrições
                                    </>
                                )}
                            </Button>
                        )}

                        {isEdit && (
                            <Button
                                type="button"
                                variant="destructive"
                                pill
                                onClick={() => setIsDeleteDialogOpen(true)}
                                className="h-12 px-5 text-base font-bold text-white shadow-lg shadow-destructive/20"
                                disabled={loading}
                            >
                                <TrashIcon size={18} weight="duotone" />
                                Excluir
                            </Button>
                        )}

                        <Button
                            type="submit"
                            pill
                            className="h-12 px-6 text-base font-bold text-white shadow-lg shadow-primary/30 min-w-[180px]"
                            disabled={loading || !selectedTenantId}
                        >
                            {loading ? (
                                <SpinnerGapIcon size={18} weight="bold" className="animate-spin" />
                            ) : isEdit ? 'Salvar Alterações' : 'Criar Evento'}
                        </Button>
                    </div>
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
    );
}
