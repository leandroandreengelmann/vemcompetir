'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Trash, Pencil, X, Check, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { toast } from 'sonner';
import { CategoryRow, deleteCategoryRow, updateCategoryRow } from '../../../../actions/categories';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BELT_COLORS, getBeltStyle } from '@/lib/belt-theme';


interface CategoryListTableProps {
    rows: CategoryRow[];
    tableId: string;
    onEdit: (row: CategoryRow) => void;
}

export function CategoryListTable({ rows, tableId, onEdit }: CategoryListTableProps) {
    const [search, setSearch] = useState('');
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    const router = useRouter();

    const filteredRows = rows.filter(row => {
        if (!search) return true;
        const lowSearch = search.toLowerCase();
        return (
            (row.categoria_completa || '').toLowerCase().includes(lowSearch) ||
            (row.divisao_idade || '').toLowerCase().includes(lowSearch) ||
            (row.faixa || '').toLowerCase().includes(lowSearch) ||
            (row.categoria_peso || '').toLowerCase().includes(lowSearch)
        );
    });

    // Calculate pagination
    const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedRows = filteredRows.slice(startIndex, startIndex + itemsPerPage);

    const handleDelete = async () => {
        if (!deleteId) return;
        setLoading(true);
        try {
            const result = await deleteCategoryRow(deleteId, tableId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Categoria removida.');
                router.refresh();
            }
        } catch (error) {
            toast.error('Erro ao remover categoria.');
        } finally {
            setLoading(false);
            setDeleteId(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input variant="lg"
                        placeholder="Buscar categorias..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
                <div className="text-caption text-muted-foreground">
                    Total: {rows.length} | Filtrados: {filteredRows.length}
                </div>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Categoria Completa</TableHead>
                            <TableHead>Divisão e Idade</TableHead>
                            <TableHead>Sexo</TableHead>
                            <TableHead>Faixa</TableHead>
                            <TableHead>Peso</TableHead>
                            <TableHead>Uniforme</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedRows.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1.5 items-center">
                                        {row.categoria_completa.split('•').map((part, index) => (
                                            <Badge key={index} variant="secondary" className="text-caption px-2 py-0.5">
                                                {part.trim()}
                                            </Badge>
                                        ))}

                                        <Badge variant="outline" className="text-label px-2 py-0.5 border-dashed border-muted-foreground/50 text-muted-foreground">
                                            {row.peso_min_kg !== null ? `${row.peso_min_kg}kg` : ''}
                                            {row.peso_min_kg !== null && row.peso_max_kg !== null && ' - '}
                                            {row.peso_max_kg !== null ? `${row.peso_max_kg}kg` : (row.peso_min_kg !== null ? '+' : 'Livre')}
                                            {row.peso_min_kg === null && row.peso_max_kg !== null && ' (max)'}
                                        </Badge>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-ui font-medium">{row.divisao_idade}</span>
                                    </div>
                                </TableCell>


                                <TableCell>{row.sexo}</TableCell>
                                <TableCell>
                                    <Badge
                                        variant="outline"
                                        style={getBeltStyle(row.faixa)}
                                        className="font-normal"
                                    >
                                        {row.faixa}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center text-ui gap-1 whitespace-nowrap">
                                        {row.peso_min_kg !== null ? `${row.peso_min_kg}kg` : ''}
                                        {row.peso_min_kg !== null && row.peso_max_kg !== null && <span className="text-muted-foreground">-</span>}
                                        {row.peso_max_kg !== null ? `${row.peso_max_kg}kg` : (row.peso_min_kg !== null ? '+' : 'Livre')}
                                        {row.peso_min_kg === null && row.peso_max_kg !== null && <span className="text-muted-foreground ml-1">(até)</span>}
                                    </div>
                                </TableCell>
                                <TableCell>{row.uniforme}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(row)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteId(row.id)}>
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredRows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                    Nenhuma categoria encontrada.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between py-4 border-t border-muted/20">
                    <div className="flex-1 text-caption text-muted-foreground font-medium">
                        Mostrando <span className="font-bold text-primary">{startIndex + 1}</span> a <span className="font-bold text-primary">{Math.min(startIndex + itemsPerPage, filteredRows.length)}</span> de <span className="font-bold text-primary">{filteredRows.length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            pill
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="h-8 w-8"
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            pill
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="h-8 w-8"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-label text-primary px-4 uppercase tracking-tighter whitespace-nowrap">
                            Página {currentPage} de {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            pill
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="h-8 w-8"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            pill
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="h-8 w-8"
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir categoria?</DialogTitle>
                        <DialogDescription>
                            Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)} disabled={loading}>Cancelar</Button>
                        <Button variant="destructive" pill onClick={handleDelete} disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
