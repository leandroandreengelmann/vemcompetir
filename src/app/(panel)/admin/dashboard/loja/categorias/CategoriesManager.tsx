'use client';

import { useRef, useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { showToast } from '@/lib/toast';
import { SpinnerGapIcon, PencilSimpleIcon, TrashIcon, ImageIcon } from '@phosphor-icons/react';
import { storeImageUrl, type StoreCategory } from '@/lib/store';
import {
    createCategoryAction, updateCategoryAction, toggleCategoryAction,
    deleteCategoryAction, uploadCategoryImageAction,
} from '../actions';

export function CategoriesManager({ categories }: { categories: StoreCategory[] }) {
    const [isPending, startTransition] = useTransition();
    const [editing, setEditing] = useState<StoreCategory | null>(null);
    const [deleting, setDeleting] = useState<StoreCategory | null>(null);
    const createRef = useRef<HTMLFormElement>(null);
    const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

    function create(formData: FormData) {
        startTransition(async () => {
            const res = await createCategoryAction(formData);
            if (res?.error) showToast.error('Erro', res.error);
            else { showToast.success('Categoria criada!'); createRef.current?.reset(); }
        });
    }

    function update(formData: FormData) {
        if (!editing) return;
        startTransition(async () => {
            const res = await updateCategoryAction(editing.id, formData);
            if (res?.error) showToast.error('Erro', res.error);
            else { showToast.success('Categoria atualizada!'); setEditing(null); }
        });
    }

    function toggle(cat: StoreCategory, value: boolean) {
        startTransition(async () => {
            const res = await toggleCategoryAction(cat.id, value);
            if (res?.error) showToast.error('Erro', res.error);
        });
    }

    function remove() {
        if (!deleting) return;
        startTransition(async () => {
            const res = await deleteCategoryAction(deleting.id);
            if (res?.error) showToast.error('Erro', res.error);
            else { showToast.success('Categoria excluída.'); setDeleting(null); }
        });
    }

    function uploadImage(catId: string, file: File) {
        const fd = new FormData();
        fd.append('category_id', catId);
        fd.append('file', file);
        startTransition(async () => {
            const res = await uploadCategoryImageAction(fd);
            if (res?.error) showToast.error('Erro', res.error);
            else showToast.success('Imagem atualizada!');
        });
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Criar */}
            <Card className="lg:col-span-1 h-fit">
                <CardHeader><CardTitle className="text-panel-md font-semibold">Nova Categoria</CardTitle></CardHeader>
                <CardContent>
                    <form ref={createRef} action={create} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="c-name">Nome</Label>
                            <Input id="c-name" name="name" placeholder="Ex: Kimonos" required maxLength={60} variant="lg" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="c-desc">Descrição (opcional)</Label>
                            <Textarea id="c-desc" name="description" rows={2} placeholder="Breve descrição" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="c-order">Ordem</Label>
                            <Input id="c-order" name="sort_order" type="number" defaultValue={0} variant="lg" />
                        </div>
                        <Button type="submit" pill className="w-full" disabled={isPending}>
                            {isPending && <SpinnerGapIcon size={18} weight="bold" className="mr-2 animate-spin" />}
                            Criar
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Lista */}
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle className="text-panel-md font-semibold flex items-center justify-between">
                        Categorias
                        <span className="text-panel-sm font-normal text-muted-foreground">{categories.length} registros</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Categoria</TableHead>
                                <TableHead className="text-center">Ativa</TableHead>
                                <TableHead className="text-right pr-6">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.map((cat) => {
                                const img = storeImageUrl(cat.image_path);
                                return (
                                    <TableRow key={cat.id}>
                                        <TableCell className="pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                                                    {img
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        ? <img src={img} alt={cat.name} className="h-full w-full object-cover" />
                                                        : <ImageIcon size={18} className="absolute inset-0 m-auto text-muted-foreground" />}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-panel-sm">{cat.name}</p>
                                                    <p className="text-xs text-muted-foreground">/{cat.slug}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Switch checked={cat.is_active} onCheckedChange={(v) => toggle(cat, v)} />
                                        </TableCell>
                                        <TableCell className="pr-6">
                                            <div className="flex items-center justify-end gap-1">
                                                <input
                                                    ref={(el) => { fileRefs.current[cat.id] = el; }}
                                                    type="file" accept="image/*" className="hidden"
                                                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(cat.id, f); e.target.value = ''; }}
                                                />
                                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Imagem"
                                                    onClick={() => fileRefs.current[cat.id]?.click()}>
                                                    <ImageIcon size={16} weight="bold" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar"
                                                    onClick={() => setEditing(cat)}>
                                                    <PencilSimpleIcon size={16} weight="bold" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Excluir"
                                                    onClick={() => setDeleting(cat)}>
                                                    <TrashIcon size={16} weight="bold" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {categories.length === 0 && (
                                <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">Nenhuma categoria ainda.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Editar */}
            <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Editar categoria</DialogTitle></DialogHeader>
                    {editing && (
                        <form action={update} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="e-name">Nome</Label>
                                <Input id="e-name" name="name" defaultValue={editing.name} required maxLength={60} variant="lg" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="e-desc">Descrição</Label>
                                <Textarea id="e-desc" name="description" rows={2} defaultValue={editing.description || ''} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="e-order">Ordem</Label>
                                <Input id="e-order" name="sort_order" type="number" defaultValue={editing.sort_order} variant="lg" />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
                                <Button type="submit" pill disabled={isPending}>
                                    {isPending && <SpinnerGapIcon size={18} weight="bold" className="mr-2 animate-spin" />}
                                    Salvar
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Excluir */}
            <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Excluir categoria</DialogTitle></DialogHeader>
                    <p className="text-panel-sm text-muted-foreground">
                        Excluir <strong>{deleting?.name}</strong>? Produtos vinculados ficam sem categoria.
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
