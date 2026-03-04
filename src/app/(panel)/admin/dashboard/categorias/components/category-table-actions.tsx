'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, FileDown, Pencil, Trash, Eye } from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deleteCategoryTable, updateCategoryTable, CategoryTable } from '../../../actions/categories';

interface CategoryTableActionsProps {
    table: CategoryTable;
}

export function CategoryTableActions({ table }: CategoryTableActionsProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleDelete() {
        setLoading(true);
        try {
            const result = await deleteCategoryTable(table.id);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Tabela excluída com sucesso!');
                router.refresh();
            }
        } catch (error) {
            toast.error('Erro ao excluir tabela.');
        } finally {
            setLoading(false);
            setShowDeleteDialog(false);
        }
    }

    async function handleEdit(formData: FormData) {
        setLoading(true);
        try {
            const result = await updateCategoryTable(table.id, formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Tabela atualizada com sucesso!');
                setShowEditDialog(false);
                router.refresh();
            }
        } catch (error) {
            toast.error('Erro ao atualizar tabela.');
        } finally {
            setLoading(false);
        }
    }

    async function handleExport() {
        toast.info('Iniciando download...');
        window.location.href = `/api/export/categories/${table.id}`;
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button pill variant="ghost" className="h-8 w-8 p-0 data-[state=open]:bg-muted">
                        <span className="sr-only">Abrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuItem asChild className="focus:bg-muted/50 focus:text-foreground">
                        <Link href={`/admin/dashboard/categorias/${table.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Abrir Detalhes
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setShowEditDialog(true)} className="focus:bg-muted/50 focus:text-foreground">
                        <Pencil className="mr-2 h-4 w-4" />
                        Renomear
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleExport} className="focus:bg-muted/50 focus:text-foreground">
                        <FileDown className="mr-2 h-4 w-4" />
                        Exportar CSV
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onSelect={() => setShowDeleteDialog(true)}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                        <Trash className="mr-2 h-4 w-4" />
                        Excluir Tabela
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Você tem certeza?</DialogTitle>
                        <DialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente a tabela "{table.name}" e todas as suas categorias.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)} pill>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={loading} pill>
                            {loading ? 'Excluindo...' : 'Excluir'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Renomear Tabela</DialogTitle>
                        <DialogDescription>
                            Edite o nome e descrição da tabela.
                        </DialogDescription>
                    </DialogHeader>
                    <form action={handleEdit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-name" className="text-right">
                                    Nome
                                </Label>
                                <Input variant="lg"
                                    id="edit-name"
                                    name="name"
                                    defaultValue={table.name}
                                    className="col-span-3"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-description" className="text-right">
                                    Descrição
                                </Label>
                                <Textarea
                                    id="edit-description"
                                    name="description"
                                    defaultValue={table.description || ''}
                                    className="col-span-3"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={loading} pill>
                                {loading ? 'Salvando...' : 'Salvar Alterações'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
