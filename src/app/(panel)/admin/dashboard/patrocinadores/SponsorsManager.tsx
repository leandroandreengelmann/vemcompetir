'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
    SpinnerGapIcon, PencilSimpleIcon, TrashIcon, ImageIcon,
    CaretUpIcon, CaretDownIcon, PlusIcon, UploadSimpleIcon, LinkIcon,
} from '@phosphor-icons/react';
import { sponsorLogoUrl, SPONSOR_LOGO_IDEAL, type Sponsor } from '@/lib/sponsors';
import {
    createSponsorAction, updateSponsorAction, toggleSponsorAction,
    deleteSponsorAction, reorderSponsorsAction,
    toggleSponsorsEnabledAction, updateSponsorsTitleAction,
} from './actions';

function SponsorForm({
    sponsor, onSubmit, onCancel, isPending,
}: {
    sponsor: Sponsor | null;
    onSubmit: (formData: FormData) => void;
    onCancel: () => void;
    isPending: boolean;
}) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [fileInfo, setFileInfo] = useState<{ name: string; sizeKb: number } | null>(null);
    const [dragging, setDragging] = useState(false);
    const [name, setName] = useState(sponsor?.name || '');
    const [descHtml, setDescHtml] = useState<string>(sponsor?.description || '');

    useEffect(() => {
        return () => { if (preview) URL.revokeObjectURL(preview); };
    }, [preview]);

    const currentImage = preview || (sponsor ? sponsorLogoUrl(sponsor.logo_path) : null);

    function clearFile() {
        if (fileRef.current) fileRef.current.value = '';
    }

    function handleFile(file: File | undefined) {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast.error('Arquivo inválido', 'Selecione uma imagem (PNG, SVG, JPG ou WebP).');
            clearFile();
            return;
        }
        if (file.size > SPONSOR_LOGO_IDEAL.maxFileMb * 1024 * 1024) {
            showToast.error('Imagem muito pesada', `A logo deve ter no máximo ${SPONSOR_LOGO_IDEAL.maxFileMb}MB.`);
            clearFile();
            return;
        }
        const url = URL.createObjectURL(file);
        setPreview(url);
        setFileInfo({ name: file.name, sizeKb: Math.round(file.size / 1024) });
    }

    function submit(formData: FormData) {
        const file = formData.get('file') as File | null;
        if (!sponsor && (!file || file.size === 0)) {
            showToast.error('Falta a logo', 'Selecione uma imagem para o parceiro.');
            return;
        }
        onSubmit(formData);
    }

    return (
        <form action={submit} className="space-y-3">
            {/* Upload + pré-visualização (mesma caixa uniforme da home) */}
            <div className="space-y-1.5">
                <Label>Logo do parceiro</Label>
                <div
                    role="button"
                    tabIndex={0}
                    aria-label={currentImage ? 'Trocar logo' : 'Selecionar logo'}
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
                        <div className="flex h-28 w-full items-center justify-center bg-white p-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={currentImage}
                                alt="Pré-visualização da logo"
                                className="max-h-full max-w-full object-contain"
                            />
                            <span className="absolute top-2 right-2 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                                Clique para trocar
                            </span>
                        </div>
                    ) : (
                        <div className="flex h-28 w-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
                            <UploadSimpleIcon size={24} weight="bold" />
                            <p className="text-panel-sm font-medium text-foreground">Clique ou arraste a logo</p>
                            <p className="text-xs">PNG transparente, SVG, JPG ou WebP · máx. {SPONSOR_LOGO_IDEAL.maxFileMb}MB</p>
                        </div>
                    )}
                </div>
                <input
                    ref={fileRef} name="file" type="file" accept="image/*" className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                />
                {fileInfo && (
                    <p className="text-xs text-muted-foreground truncate">
                        {fileInfo.name} · {fileInfo.sizeKb >= 1024 ? `${(fileInfo.sizeKb / 1024).toFixed(1)}MB` : `${fileInfo.sizeKb}KB`}
                    </p>
                )}
                <p className="text-xs text-muted-foreground">
                    Dica: use <strong className="text-foreground">PNG com fundo transparente</strong>. Todas as logos aparecem
                    em caixas do mesmo tamanho na home, então não precisa se preocupar com as dimensões exatas.
                </p>
            </div>

            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <Label htmlFor="s-name">Nome do parceiro</Label>
                    <span className="text-xs text-muted-foreground tabular-nums">{name.length}/80</span>
                </div>
                <Input
                    id="s-name" name="name" maxLength={80} value={name} required
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: CT Jiu-Jitsu Cuiabá" variant="lg"
                />
            </div>

            <div className="space-y-1.5">
                <Label>Descrição (opcional)</Label>
                <RichTextEditor
                    value={sponsor?.description || ''}
                    onChange={({ html }) => setDescHtml(html)}
                    placeholder="Fale sobre o parceiro, modalidades, história, diferenciais..."
                />
                <input type="hidden" name="description" value={descHtml} />
                <p className="text-xs text-muted-foreground">
                    Aparece na página do parceiro. Use negrito, listas e títulos para organizar o texto.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label htmlFor="s-link">Site / rede social (opcional)</Label>
                    <Input id="s-link" name="link_url" defaultValue={sponsor?.link_url || ''} placeholder="https://..." variant="lg" />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="s-whatsapp">WhatsApp (opcional)</Label>
                    <Input id="s-whatsapp" name="whatsapp" defaultValue={sponsor?.whatsapp || ''} placeholder="66 99999-8888" variant="lg" inputMode="numeric" />
                </div>
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button type="submit" pill disabled={isPending}>
                    {isPending && <SpinnerGapIcon size={18} weight="bold" className="mr-2 animate-spin" />}
                    {sponsor ? 'Salvar' : 'Adicionar parceiro'}
                </Button>
            </DialogFooter>
        </form>
    );
}

export function SponsorsManager({
    sponsors, enabled, title,
}: {
    sponsors: Sponsor[];
    enabled: boolean;
    title: string;
}) {
    const [isPending, startTransition] = useTransition();
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<Sponsor | null>(null);
    const [deleting, setDeleting] = useState<Sponsor | null>(null);
    const [titleDraft, setTitleDraft] = useState(title);

    function create(formData: FormData) {
        startTransition(async () => {
            const res = await createSponsorAction(formData);
            if (res?.error) showToast.error('Erro', res.error);
            else { showToast.success('Parceiro adicionado!'); setCreating(false); }
        });
    }

    function update(formData: FormData) {
        if (!editing) return;
        startTransition(async () => {
            const res = await updateSponsorAction(editing.id, formData);
            if (res?.error) showToast.error('Erro', res.error);
            else { showToast.success('Parceiro atualizado!'); setEditing(null); }
        });
    }

    function toggle(sponsor: Sponsor, value: boolean) {
        startTransition(async () => {
            const res = await toggleSponsorAction(sponsor.id, value);
            if (res?.error) showToast.error('Erro', res.error);
        });
    }

    function remove() {
        if (!deleting) return;
        startTransition(async () => {
            const res = await deleteSponsorAction(deleting.id);
            if (res?.error) showToast.error('Erro', res.error);
            else { showToast.success('Parceiro excluído.'); setDeleting(null); }
        });
    }

    function move(index: number, direction: -1 | 1) {
        const target = index + direction;
        if (target < 0 || target >= sponsors.length) return;
        const ids = sponsors.map((s) => s.id);
        [ids[index], ids[target]] = [ids[target], ids[index]];
        startTransition(async () => {
            const res = await reorderSponsorsAction(ids);
            if (res?.error) showToast.error('Erro', res.error);
        });
    }

    function toggleEnabled(value: boolean) {
        startTransition(async () => {
            const res = await toggleSponsorsEnabledAction(value);
            if (res?.error) showToast.error('Erro', res.error);
            else showToast.success(value ? 'Bloco de parceiros ativado na home.' : 'Bloco de parceiros ocultado da home.');
        });
    }

    function saveTitle() {
        if (titleDraft.trim() === title) return;
        startTransition(async () => {
            const res = await updateSponsorsTitleAction(titleDraft);
            if (res?.error) showToast.error('Erro', res.error);
            else showToast.success('Título atualizado.');
        });
    }

    return (
        <div className="space-y-6">
            {/* Configurações gerais */}
            <Card>
                <CardContent className="divide-y">
                    <div className="flex items-center justify-between gap-4 py-4">
                        <div>
                            <p className="font-medium text-panel-sm">Exibir bloco de parceiros na home</p>
                            <p className="text-xs text-muted-foreground">
                                Desligado, a seção não aparece. Só é exibida se houver ao menos uma logo ativa.
                            </p>
                        </div>
                        <Switch checked={enabled} onCheckedChange={toggleEnabled} disabled={isPending} />
                    </div>
                    <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex-1 space-y-1.5">
                            <Label htmlFor="s-title" className="font-medium text-panel-sm">Título da seção</Label>
                            <p className="text-xs text-muted-foreground">Texto exibido acima das logos (ex.: "Parceiros", "Apoio", "Patrocinadores").</p>
                            <Input
                                id="s-title" value={titleDraft} maxLength={60}
                                onChange={(e) => setTitleDraft(e.target.value)}
                                className="mt-1 max-w-xs"
                            />
                        </div>
                        <Button variant="outline" onClick={saveTitle} disabled={isPending || titleDraft.trim() === title}>
                            Salvar título
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Lista */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-panel-md font-semibold flex items-center justify-between">
                        Parceiros
                        <Button pill size="sm" className="gap-2" onClick={() => setCreating(true)}>
                            <PlusIcon size={16} weight="bold" />
                            Novo parceiro
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Parceiro</TableHead>
                                <TableHead>Link</TableHead>
                                <TableHead className="text-center">Ordem</TableHead>
                                <TableHead className="text-center">Ativo</TableHead>
                                <TableHead className="text-right pr-6">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sponsors.map((sponsor, index) => (
                                <TableRow key={sponsor.id}>
                                    <TableCell className="pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-12 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white p-1.5">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={sponsorLogoUrl(sponsor.logo_path)}
                                                    alt={sponsor.name}
                                                    className="max-h-full max-w-full object-contain"
                                                />
                                            </div>
                                            <p className="font-medium text-panel-sm truncate max-w-[220px]">{sponsor.name}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {sponsor.link_url ? (
                                            <Badge variant="secondary" className="gap-1 max-w-[220px]">
                                                <LinkIcon size={12} weight="bold" />
                                                <span className="truncate">{sponsor.link_url}</span>
                                            </Badge>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">Sem link</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Subir"
                                                disabled={index === 0 || isPending} onClick={() => move(index, -1)}>
                                                <CaretUpIcon size={14} weight="bold" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Descer"
                                                disabled={index === sponsors.length - 1 || isPending} onClick={() => move(index, 1)}>
                                                <CaretDownIcon size={14} weight="bold" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Switch checked={sponsor.is_active} onCheckedChange={(v) => toggle(sponsor, v)} />
                                    </TableCell>
                                    <TableCell className="pr-6">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar"
                                                onClick={() => setEditing(sponsor)}>
                                                <PencilSimpleIcon size={16} weight="bold" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Excluir"
                                                onClick={() => setDeleting(sponsor)}>
                                                <TrashIcon size={16} weight="bold" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {sponsors.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <ImageIcon size={24} />
                                            Nenhum parceiro ainda. Adicione o primeiro!
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
                <DialogContent className="sm:max-w-lg max-h-[92dvh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Novo parceiro</DialogTitle></DialogHeader>
                    <SponsorForm sponsor={null} onSubmit={create} onCancel={() => setCreating(false)} isPending={isPending} />
                </DialogContent>
            </Dialog>

            {/* Editar */}
            <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
                <DialogContent className="sm:max-w-lg max-h-[92dvh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Editar parceiro</DialogTitle></DialogHeader>
                    {editing && (
                        <SponsorForm sponsor={editing} onSubmit={update} onCancel={() => setEditing(null)} isPending={isPending} />
                    )}
                </DialogContent>
            </Dialog>

            {/* Excluir */}
            <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Excluir parceiro</DialogTitle></DialogHeader>
                    <p className="text-panel-sm text-muted-foreground">
                        Excluir <strong>{deleting?.name}</strong>? A logo também será removida.
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
