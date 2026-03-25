'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CircleNotchIcon, CheckCircleIcon, UserIcon } from "@phosphor-icons/react";

interface CartItem {
    id: string;
    athleteName: string;
    categoryTitle: string;
    price: number;
}

interface OwnEventConfirmModalProps {
    open: boolean;
    eventTitle: string;
    items: CartItem[];
    submitting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function OwnEventConfirmModal({
    open,
    eventTitle,
    items,
    submitting,
    onConfirm,
    onCancel,
}: OwnEventConfirmModalProps) {
    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                            <CheckCircleIcon size={20} weight="duotone" className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <DialogTitle>Confirmar inscrições</DialogTitle>
                    </div>
                    <DialogDescription>
                        Por ser seu próprio evento, as inscrições abaixo serão confirmadas diretamente, sem cobrança.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/40"
                        >
                            <div className="p-1.5 rounded-full bg-background border border-border shrink-0 mt-0.5">
                                <UserIcon size={14} weight="duotone" className="text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold leading-tight truncate">{item.athleteName}</p>
                                <p className="text-sm text-muted-foreground font-medium line-clamp-2">{item.categoryTitle}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onCancel} disabled={submitting}>
                        Cancelar
                    </Button>
                    <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={onConfirm}
                        disabled={submitting}
                    >
                        {submitting
                            ? <CircleNotchIcon size={16} weight="bold" className="animate-spin mr-2" />
                            : <CheckCircleIcon size={16} weight="duotone" className="mr-2" />
                        }
                        Confirmar inscrições
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
