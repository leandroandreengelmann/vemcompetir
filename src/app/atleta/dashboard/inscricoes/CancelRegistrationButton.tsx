'use client';

import { Button } from "@/components/ui/button";
import { Trash2, Check, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
            toast.custom((t) => (
                <div className="flex items-center justify-between gap-3 w-full sm:w-[356px] bg-green-600 rounded-xl px-5 py-4 shadow-xl shadow-green-600/20 text-white animate-in slide-in-from-right-2">
                    <div className="flex items-center gap-3">
                        <Check className="h-6 w-6 shrink-0" />
                        <div className="flex flex-col">
                            <p className="text-base font-bold">Inscrição removida</p>
                            <p className="text-sm opacity-90">Sua inscrição pendente foi cancelada.</p>
                        </div>
                    </div>
                </div>
            ), { duration: 4000 });

            if (onSuccess) {
                onSuccess();
            } else {
                router.refresh();
            }
        } catch (error: any) {
            console.error('Falha ao remover:', error);
            const msg = error.message || 'Ocorreu um erro ao tentar cancelar a inscrição.';
            toast.custom((t) => (
                <div className="flex items-center justify-between gap-3 w-full sm:w-[356px] bg-red-600 rounded-xl px-5 py-4 shadow-xl shadow-red-600/20 text-white animate-in slide-in-from-right-2">
                    <div className="flex items-center gap-3">
                        <Info className="h-6 w-6 shrink-0" />
                        <div className="flex flex-col">
                            <p className="text-base font-bold">Erro ao remover</p>
                            <p className="text-sm opacity-90">{msg}</p>
                        </div>
                    </div>
                </div>
            ), { duration: 5000 });
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
                    <Trash2 className="w-3.5 h-3.5" />
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
