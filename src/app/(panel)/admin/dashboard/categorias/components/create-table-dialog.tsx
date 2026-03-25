'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
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
import { PlusIcon } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { createCategoryTable } from '../../../actions/categories';

export function CreateTableDialog() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        try {
            const result = await createCategoryTable(formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Tabela criada com sucesso!');
                setOpen(false);
                router.refresh();
            }
        } catch (error) {
            toast.error('Erro ao criar tabela.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button pill>
                    <PlusIcon size={20} weight="bold" className="mr-2" />
                    Criar nova tabela
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Criar Tabela de Categorias</DialogTitle>
                    <DialogDescription>
                        Crie um novo grupo de categorias para usar nos eventos.
                    </DialogDescription>
                </DialogHeader>
                <form action={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right leading-none">
                                Nome
                            </Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="Ex: Juvenil 16-17 (Kimono)"
                                className="col-span-3 bg-background"
                                variant="lg"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right leading-none">
                                Descrição
                            </Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Opcional"
                                className="col-span-3 bg-background min-h-[100px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading} pill className="w-full sm:w-auto">
                            {loading ? 'Salvando...' : 'Criar Tabela'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
