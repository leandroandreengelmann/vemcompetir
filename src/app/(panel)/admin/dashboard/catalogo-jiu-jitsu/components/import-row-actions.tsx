'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { DotsThreeIcon, EyeIcon, TrashIcon } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { deleteImport } from '../actions';

export function ImportRowActions({ id, name }: { id: string; name: string }) {
    const [openConfirm, setOpenConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleDelete() {
        setLoading(true);
        try {
            const r = await deleteImport(id);
            if (r.error) toast.error(r.error);
            else {
                toast.success('Import removido.');
                router.refresh();
            }
        } finally {
            setLoading(false);
            setOpenConfirm(false);
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button pill variant="ghost" className="h-8 w-8 p-0 data-[state=open]:bg-muted">
                        <span className="sr-only">Abrir menu</span>
                        <DotsThreeIcon size={20} weight="bold" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuItem asChild className="focus:bg-muted/50 focus:text-foreground">
                        <Link href={`/admin/dashboard/catalogo-jiu-jitsu/${id}`}>
                            <EyeIcon size={20} weight="duotone" className="mr-2" />
                            Abrir
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onSelect={() => setOpenConfirm(true)}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                        <TrashIcon size={20} weight="duotone" className="mr-2" />
                        Excluir
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={openConfirm} onOpenChange={setOpenConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir &quot;{name}&quot;?</DialogTitle>
                        <DialogDescription>
                            Remove o import e todas as linhas. Não afeta nenhum evento.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" pill onClick={() => setOpenConfirm(false)}>Cancelar</Button>
                        <Button variant="destructive" pill onClick={handleDelete} disabled={loading}>
                            {loading ? 'Excluindo...' : 'Excluir'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
