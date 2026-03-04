'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    title: string;
    description: string;
    itemName: string;
    loading?: boolean;
}

export function DeleteConfirmationDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    itemName,
    loading = false
}: DeleteConfirmationDialogProps) {
    const [inputValue, setInputValue] = useState('');

    const handleConfirm = async () => {
        if (inputValue !== itemName) return;
        await onConfirm();
        setInputValue('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px] rounded-2xl border-primary/10">
                <DialogHeader className="flex flex-col items-center text-center space-y-3">
                    <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
                        <AlertTriangle className="size-6 text-destructive" />
                    </div>
                    <DialogTitle className="text-h2">{title}</DialogTitle>
                    <DialogDescription className="text-ui text-muted-foreground whitespace-pre-line">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <p className="text-ui font-medium text-center">
                        Para confirmar, digite <span className="font-bold underline">"{itemName}"</span> abaixo:
                    </p>
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Digite o nome aqui..."
                        className="h-12 border-primary/10 rounded-xl focus:ring-destructive/20"
                        variant="lg"
                        autoComplete="off"
                        disabled={loading}
                    />
                </div>

                <DialogFooter className="sm:justify-center gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        pill
                        onClick={onClose}
                        className="w-full sm:w-auto px-8"
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        pill
                        onClick={handleConfirm}
                        className="w-full sm:w-auto px-8 font-bold"
                        disabled={inputValue !== itemName || loading}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sim, Excluir
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
