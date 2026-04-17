'use client';

import { Button } from "@/components/ui/button";
import { TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { showToast } from "@/lib/toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function CancelRegistrationButton({
    className,
    onSuccess,
    onConfirm
}: {
    className?: string,
    onSuccess?: () => void,
    onConfirm: () => Promise<any>
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const router = useRouter();

    const handleCancel = async (e: React.MouseEvent) => {
        try {
            setIsLoading(true);
            await onConfirm();

            setOpen(false); // fechar o modal
            showToast.success('Inscrição removida', 'Sua inscrição pendente foi cancelada.');

            if (onSuccess) {
                onSuccess();
            } else {
                router.refresh();
            }
        } catch (error: any) {
            console.error('Falha ao remover:', error);
            const msg = error.message || 'Ocorreu um erro ao tentar cancelar a inscrição.';
            showToast.error('Não foi possível remover', msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    size="icon"
                    variant="outline"
                    onClick={(e) => e.stopPropagation()}
                    className={cn("h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50 border-transparent hover:border-red-100 transition-colors rounded-full shadow-none shrink-0", className)}
                    title="Remover inscrição pendente"
                >
                    <TrashIcon size={14} weight="duotone" />
                </Button>
            </DialogTrigger>
            <DialogContent onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle>Remover Inscrição</DialogTitle>
                    <DialogDescription>
                        Tem certeza que deseja cancelar e remover permanentemente esta inscrição pendente? Esta ação não pode ser desfeita.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4 gap-2 sm:gap-0">
                    <DialogClose asChild>
                        <Button variant="outline" className="rounded-full">Voltar</Button>
                    </DialogClose>
                    <Button
                        onClick={handleCancel}
                        disabled={isLoading}
                        className="bg-red-600 hover:bg-red-700 text-white rounded-full"
                    >
                        {isLoading ? "Removendo..." : "Sim, Remover"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
