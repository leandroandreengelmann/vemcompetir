'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
    SpinnerGapIcon, PencilSimpleIcon, TrashIcon, ImageIcon,
    CaretUpIcon, CaretDownIcon, PlusIcon, UploadSimpleIcon,
} from '@phosphor-icons/react';
import {
    heroBannerImageUrl, HERO_BANNER_IDEAL, HERO_BANNER_IDEAL_MOBILE, HERO_BANNER_INTERVAL_OPTIONS,
    HERO_OVERLAY_CLASSES, HERO_OVERLAY_LABELS,
    type HeroBanner, type HeroBannerOverlay,
} from '@/lib/hero-banners';
import {
    createBannerAction, updateBannerAction, toggleBannerAction,
    deleteBannerAction, reorderBannersAction, toggleHeroEnabledAction,
    updateHeroIntervalAction,
} from './actions';

function BannerForm({
    banner, onSubmit, onCancel, isPending,
}: {
    banner: HeroBanner | null;
    onSubmit: (formData: FormData) => void;
    onCancel: () => void;
    isPending: boolean;
}) {
    const fileRef = useRef<HTMLInputElement>(null);
    const fileMobileRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [previewMobile, setPreviewMobile] = useState<string | null>(null);
    const [removeMobile, setRemoveMobile] = useState(false);
    const [fileInfo, setFileInfo] = useState<{ name: string; sizeKb: number } | null>(null);
    const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
    const [dragging, setDragging] = useState(false);

    // Estado controlado para refletir ao vivo na pré-visualização.
    const [title, setTitle] = useState(banner?.title || '');
    const [subtitle, setSubtitle] = useState(banner?.subtitle || '');
    const [overlay, setOverlay] = useState<HeroBannerOverlay>(banner?.overlay_style || 'medium');

    useEffect(() => {
        return () => { if (preview) URL.revokeObjectURL(preview); };
    }, [preview]);

    useEffect(() => {
        return () => { if (previewMobile) URL.revokeObjectURL(previewMobile); };
    }, [previewMobile]);

    const currentImage = preview || (banner ? heroBannerImageUrl(banner.image_path) : null);
    const currentMobileImage = previewMobile
        || (!removeMobile && banner?.image_path_mobile ? heroBannerImageUrl(banner.image_path_mobile) : null);
    const overlayClass = HERO_OVERLAY_CLASSES[overlay];

    function clearFile() {
        if (fileRef.current) fileRef.current.value = '';
    }

    function handleFile(file: File | undefined) {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast.error('Arquivo inválido', 'Selecione uma imagem (JPG, PNG ou WebP).');
            clearFile();
            return;
        }
        if (file.size > HERO_BANNER_IDEAL.maxFileMb * 1024 * 1024) {
            showToast.error('Imagem muito pesada', `A imagem deve ter no máximo ${HERO_BANNER_IDEAL.maxFileMb}MB.`);
            clearFile();
            return;
        }

        // Valida as dimensões: exige 1920×640 (ou múltiplo proporcional maior, ex.: 3840×1280).
        const url = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
            const { naturalWidth: w, naturalHeight: h } = img;
            const expectedRatio = HERO_BANNER_IDEAL.width / HERO_BANNER_IDEAL.height;
            const wrongRatio = Math.abs(w / h - expectedRatio) > 0.05;
            const tooSmall = w < HERO_BANNER_IDEAL.width;
            if (wrongRatio || tooSmall) {
                showToast.error(
                    'Tamanho incorreto',
                    `A imagem deve ter ${HERO_BANNER_IDEAL.width}×${HERO_BANNER_IDEAL.height}px — a sua tem ${w}×${h}px.`,
                );
                URL.revokeObjectURL(url);
                clearFile();
                return;
            }
            setDims({ w, h });
            setPreview(url);
            setFileInfo({ name: file.name, sizeKb: Math.round(file.size / 1024) });
        };
        img.onerror = () => {
            showToast.error('Arquivo inválido', 'Não foi possível ler a imagem.');
            URL.revokeObjectURL(url);
            clearFile();
        };
        img.src = url;
    }

    function handleMobileFile(file: File | undefined) {
        if (!file) return;
        const clear = () => { if (fileMobileRef.current) fileMobileRef.current.value = ''; };
        if (!file.type.startsWith('image/')) {
            showToast.error('Arquivo inválido', 'Selecione uma imagem (JPG, PNG ou WebP).');
            clear();
            return;
        }
        if (file.size > HERO_BANNER_IDEAL_MOBILE.maxFileMb * 1024 * 1024) {
            showToast.error('Imagem muito pesada', `A imagem deve ter no máximo ${HERO_BANNER_IDEAL_MOBILE.maxFileMb}MB.`);
            clear();
            return;
        }

        // Valida: quadrada 1080×1080 (ou múltiplo proporcional maior, ex.: 2160×2160).
        const url = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
            const { naturalWidth: w, naturalHeight: h } = img;
            const wrongRatio = Math.abs(w / h - 1) > 0.05;
            const tooSmall = w < HERO_BANNER_IDEAL_MOBILE.width;
            if (wrongRatio || tooSmall) {
                showToast.error(
                    'Tamanho incorreto',
                    `A imagem de celular deve ter ${HERO_BANNER_IDEAL_MOBILE.width}×${HERO_BANNER_IDEAL_MOBILE.height}px — a sua tem ${w}×${h}px.`,
                );
                URL.revokeObjectURL(url);
                clear();
                return;
            }
            setRemoveMobile(false);
            setPreviewMobile(url);
        };
        img.onerror = () => {
            showToast.error('Arquivo inválido', 'Não foi possível ler a imagem.');
            URL.revokeObjectURL(url);
            clear();
        };
        img.src = url;
    }

    function clearMobileImage() {
        setPreviewMobile(null);
        setRemoveMobile(true);
        if (fileMobileRef.current) fileMobileRef.current.value = '';
    }

    function submit(formData: FormData) {
        const file = formData.get('file') as File | null;
        if (!banner && (!file || file.size === 0)) {
            showToast.error('Falta a imagem', 'Selecione uma imagem para o banner.');
            return;
        }
        onSubmit(formData);
    }

    const lowResolution = !!dims && dims.w < HERO_BANNER_IDEAL.minWidth;

    return (
        <form action={submit} className="space-y-3">
            {/* Upload + pré-visualização ao vivo */}
            <div className="space-y-1.5">
                <Label>Imagem do banner</Label>
                <div
                    role="button"
                    tabIndex={0}
                    aria-label={currentImage ? 'Trocar imagem do banner' : 'Selecionar imagem do banner'}
                    onClick={() => fileRef.current?.click()}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file && fileRef.current) {
                            fileRef.current.files = e.dataTransfer.files;
                            handleFile(file);
                        }
                    }}
                    className={cn(
                        'relative w-full overflow-hidden rounded-lg border-2 border-dashed transition-colors cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                        dragging ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/50',
                    )}
                >
                    {currentImage ? (
                        <div className="relative aspect-[3/1] w-full overflow-hidden bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={currentImage}
                                alt="Pré-visualização do banner"
                                className="absolute inset-0 h-full w-full object-cover"
                            />
                            {overlayClass && <div className={cn('absolute inset-0', overlayClass)} aria-hidden="true" />}
                            {(title || subtitle) && (
                                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                                    {title && (
                                        <p className="text-white font-bold text-base sm:text-2xl leading-tight drop-shadow-md">{title}</p>
                                    )}
                                    {subtitle && (
                                        <p className="mt-0.5 text-white/85 text-sm sm:text-base leading-snug drop-shadow line-clamp-2">{subtitle}</p>
                                    )}
                                </div>
                            )}
                            <span className="absolute top-2 right-2 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                                Clique para trocar
                            </span>
                        </div>
                    ) : (
                        <div className="flex aspect-[3/1] w-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
                            <UploadSimpleIcon size={24} weight="bold" />
                            <p className="text-panel-sm font-medium text-foreground">Clique ou arraste uma imagem</p>
                            <p className="text-xs">{HERO_BANNER_IDEAL.width}×{HERO_BANNER_IDEAL.height}px · JPG, PNG ou WebP · máx. {HERO_BANNER_IDEAL.maxFileMb}MB</p>
                        </div>
                    )}
                </div>
                <input
                    ref={fileRef} id="b-file" name="file" type="file" accept="image/*" className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                />
                {fileInfo && (
                    <p className="text-xs text-muted-foreground truncate">
                        {fileInfo.name} · {fileInfo.sizeKb >= 1024 ? `${(fileInfo.sizeKb / 1024).toFixed(1)}MB` : `${fileInfo.sizeKb}KB`}
                        {dims && ` · ${dims.w}×${dims.h}px`}
                    </p>
                )}
                <p className="text-xs text-muted-foreground">
                    Tamanho obrigatório: <strong className="text-foreground">{HERO_BANNER_IDEAL.width}×{HERO_BANNER_IDEAL.height}px</strong> (proporção 3:1) · JPG ou WebP · até {HERO_BANNER_IDEAL.maxFileMb}MB.
                    Imagens em outro tamanho são recusadas.
                </p>
            </div>

            {/* Imagem para celular (opcional) */}
            <div className="space-y-1.5">
                <Label>Imagem para celular (opcional)</Label>
                <div className="flex items-center gap-3 rounded-lg border-2 border-dashed border-input p-2">
                    <button
                        type="button"
                        onClick={() => fileMobileRef.current?.click()}
                        aria-label={currentMobileImage ? 'Trocar imagem de celular' : 'Selecionar imagem de celular'}
                        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted outline-none transition-opacity hover:opacity-80 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                        {currentMobileImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={currentMobileImage} alt="Pré-visualização da imagem de celular" className="h-full w-full object-cover" />
                        ) : (
                            <UploadSimpleIcon size={20} weight="bold" className="absolute inset-0 m-auto text-muted-foreground" />
                        )}
                    </button>
                    <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                        Quadrada, <strong className="text-foreground">{HERO_BANNER_IDEAL_MOBILE.width}×{HERO_BANNER_IDEAL_MOBILE.height}px</strong> (formato de post do Instagram).
                        No celular, aparece no lugar da imagem larga; sem ela, a imagem acima é usada.
                    </p>
                    <div className="flex flex-col gap-1 shrink-0">
                        <Button type="button" size="sm" variant="outline" onClick={() => fileMobileRef.current?.click()}>
                            {currentMobileImage ? 'Trocar' : 'Escolher'}
                        </Button>
                        {currentMobileImage && (
                            <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={clearMobileImage}>
                                Remover
                            </Button>
                        )}
                    </div>
                </div>
                <input
                    ref={fileMobileRef} id="b-file-mobile" name="file_mobile" type="file" accept="image/*" className="hidden"
                    onChange={(e) => handleMobileFile(e.target.files?.[0])}
                />
                {removeMobile && <input type="hidden" name="remove_mobile" value="on" />}
            </div>

            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <Label htmlFor="b-title">Título (opcional)</Label>
                    <span className="text-xs text-muted-foreground tabular-nums">{title.length}/80</span>
                </div>
                <Input
                    id="b-title" name="title" maxLength={80} value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Texto principal sobre a imagem" variant="lg"
                />
            </div>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <Label htmlFor="b-subtitle">Subtítulo (opcional)</Label>
                    <span className="text-xs text-muted-foreground tabular-nums">{subtitle.length}/160</span>
                </div>
                <Textarea
                    id="b-subtitle" name="subtitle" rows={2} maxLength={160} value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Texto de apoio"
                />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label htmlFor="b-link">Link ao clicar (opcional)</Label>
                    <Input id="b-link" name="link_url" defaultValue={banner?.link_url || ''} placeholder="/eventos ou https://..." variant="lg" />
                </div>
                <div className="space-y-1.5">
                    <Label>Escurecimento</Label>
                    <Select name="overlay_style" value={overlay} onValueChange={(v) => setOverlay(v as HeroBannerOverlay)}>
                        <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {(Object.keys(HERO_OVERLAY_LABELS) as HeroBannerOverlay[]).map((k) => (
                                <SelectItem key={k} value={k}>{HERO_OVERLAY_LABELS[k]}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button type="submit" pill disabled={isPending}>
                    {isPending && <SpinnerGapIcon size={18} weight="bold" className="mr-2 animate-spin" />}
                    {banner ? 'Salvar' : 'Criar banner'}
                </Button>
            </DialogFooter>
        </form>
    );
}

export function BannersManager({
    banners, heroEnabled, intervalSeconds,
}: {
    banners: HeroBanner[];
    heroEnabled: boolean;
    intervalSeconds: number;
}) {
    const [isPending, startTransition] = useTransition();
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<HeroBanner | null>(null);
    const [deleting, setDeleting] = useState<HeroBanner | null>(null);

    function create(formData: FormData) {
        startTransition(async () => {
            const res = await createBannerAction(formData);
            if (res?.error) showToast.error('Erro', res.error);
            else { showToast.success('Banner criado!'); setCreating(false); }
        });
    }

    function update(formData: FormData) {
        if (!editing) return;
        startTransition(async () => {
            const res = await updateBannerAction(editing.id, formData);
            if (res?.error) showToast.error('Erro', res.error);
            else { showToast.success('Banner atualizado!'); setEditing(null); }
        });
    }

    function toggle(banner: HeroBanner, value: boolean) {
        startTransition(async () => {
            const res = await toggleBannerAction(banner.id, value);
            if (res?.error) showToast.error('Erro', res.error);
        });
    }

    function remove() {
        if (!deleting) return;
        startTransition(async () => {
            const res = await deleteBannerAction(deleting.id);
            if (res?.error) showToast.error('Erro', res.error);
            else { showToast.success('Banner excluído.'); setDeleting(null); }
        });
    }

    function move(index: number, direction: -1 | 1) {
        const target = index + direction;
        if (target < 0 || target >= banners.length) return;
        const ids = banners.map((b) => b.id);
        [ids[index], ids[target]] = [ids[target], ids[index]];
        startTransition(async () => {
            const res = await reorderBannersAction(ids);
            if (res?.error) showToast.error('Erro', res.error);
        });
    }

    function toggleHero(value: boolean) {
        startTransition(async () => {
            const res = await toggleHeroEnabledAction(value);
            if (res?.error) showToast.error('Erro', res.error);
            else showToast.success(value ? 'Banners ativados na home.' : 'Banners desativados — a home volta ao topo padrão.');
        });
    }

    function changeInterval(value: string) {
        startTransition(async () => {
            const res = await updateHeroIntervalAction(Number(value));
            if (res?.error) showToast.error('Erro', res.error);
            else showToast.success(`Banners agora trocam a cada ${value} segundos.`);
        });
    }

    return (
        <div className="space-y-6">
            {/* Configurações gerais */}
            <Card>
                <CardContent className="divide-y">
                    <div className="flex items-center justify-between gap-4 py-4">
                        <div>
                            <p className="font-medium text-panel-sm">Exibir banners na home</p>
                            <p className="text-xs text-muted-foreground">
                                Desligado, a home mostra o topo padrão. 1 banner ativo = imagem fixa; 2 ou mais = carrossel automático.
                            </p>
                        </div>
                        <Switch checked={heroEnabled} onCheckedChange={toggleHero} disabled={isPending} />
                    </div>
                    <div className="flex items-center justify-between gap-4 py-4">
                        <div>
                            <p className="font-medium text-panel-sm">Tempo entre banners</p>
                            <p className="text-xs text-muted-foreground">
                                Intervalo de troca automática quando há mais de um banner ativo.
                            </p>
                        </div>
                        <Select value={String(intervalSeconds)} onValueChange={changeInterval} disabled={isPending}>
                            <SelectTrigger className="w-36 shrink-0"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {HERO_BANNER_INTERVAL_OPTIONS.map((s) => (
                                    <SelectItem key={s} value={String(s)}>{s} segundos</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Lista */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-panel-md font-semibold flex items-center justify-between">
                        Banners
                        <Button pill size="sm" className="gap-2" onClick={() => setCreating(true)}>
                            <PlusIcon size={16} weight="bold" />
                            Novo Banner
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Banner</TableHead>
                                <TableHead>Aparência</TableHead>
                                <TableHead className="text-center">Ordem</TableHead>
                                <TableHead className="text-center">Ativo</TableHead>
                                <TableHead className="text-right pr-6">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {banners.map((banner, index) => (
                                <TableRow key={banner.id}>
                                    <TableCell className="pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className="relative h-12 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={heroBannerImageUrl(banner.image_path)}
                                                    alt={banner.title || 'Banner'}
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-panel-sm truncate max-w-[200px]">
                                                    {banner.title || <span className="text-muted-foreground italic">Sem título</span>}
                                                </p>
                                                {banner.subtitle && (
                                                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{banner.subtitle}</p>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            <Badge variant="secondary">{HERO_OVERLAY_LABELS[banner.overlay_style]}</Badge>
                                            {banner.image_path_mobile && <Badge variant="secondary">Celular</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Subir"
                                                disabled={index === 0 || isPending} onClick={() => move(index, -1)}>
                                                <CaretUpIcon size={14} weight="bold" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Descer"
                                                disabled={index === banners.length - 1 || isPending} onClick={() => move(index, 1)}>
                                                <CaretDownIcon size={14} weight="bold" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Switch checked={banner.is_active} onCheckedChange={(v) => toggle(banner, v)} />
                                    </TableCell>
                                    <TableCell className="pr-6">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar"
                                                onClick={() => setEditing(banner)}>
                                                <PencilSimpleIcon size={16} weight="bold" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Excluir"
                                                onClick={() => setDeleting(banner)}>
                                                <TrashIcon size={16} weight="bold" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {banners.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <ImageIcon size={24} />
                                            Nenhum banner ainda. Crie o primeiro!
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Criar */}
            <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
                <DialogContent className="sm:max-w-xl max-h-[92dvh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Novo banner</DialogTitle></DialogHeader>
                    <BannerForm banner={null} onSubmit={create} onCancel={() => setCreating(false)} isPending={isPending} />
                </DialogContent>
            </Dialog>

            {/* Editar */}
            <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
                <DialogContent className="sm:max-w-xl max-h-[92dvh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Editar banner</DialogTitle></DialogHeader>
                    {editing && (
                        <BannerForm banner={editing} onSubmit={update} onCancel={() => setEditing(null)} isPending={isPending} />
                    )}
                </DialogContent>
            </Dialog>

            {/* Excluir */}
            <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Excluir banner</DialogTitle></DialogHeader>
                    <p className="text-panel-sm text-muted-foreground">
                        Excluir o banner <strong>{deleting?.title || 'sem título'}</strong>? A imagem também será removida.
                    </p>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDeleting(null)}>Cancelar</Button>
                        <Button variant="destructive" pill disabled={isPending} onClick={remove}>
                            {isPending && <SpinnerGapIcon size={18} weight="bold" className="mr-2 animate-spin" />}
                            Excluir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
