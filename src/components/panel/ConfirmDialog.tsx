'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react';

type ConfirmVariant = 'destructive' | 'warning' | 'default';

const VARIANT_MAP: Record<
    ConfirmVariant,
    { Icon: typeof AlertTriangle; iconColor: string; iconBg: string; buttonVariant: 'destructive' | 'default' }
> = {
    destructive: {
        Icon: AlertTriangle,
        iconColor: 'text-destructive',
        iconBg: 'bg-destructive/10',
        buttonVariant: 'destructive',
    },
    warning: {
        Icon: AlertCircle,
        iconColor: 'text-warning',
        iconBg: 'bg-warning/10',
        buttonVariant: 'default',
    },
    default: {
        Icon: Info,
        iconColor: 'text-primary',
        iconBg: 'bg-primary/10',
        buttonVariant: 'default',
    },
};

export interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ConfirmVariant;
    loading?: boolean;
    onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'default',
    loading = false,
    onConfirm,
}: ConfirmDialogProps) {
    const { Icon, iconColor, iconBg, buttonVariant } = VARIANT_MAP[variant];
    const [internalLoading, setInternalLoading] = React.useState(false);
    const isLoading = loading || internalLoading;

    const handleConfirm = async () => {
        try {
            setInternalLoading(true);
            await onConfirm();
            onOpenChange(false);
        } finally {
            setInternalLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !isLoading && onOpenChange(next)}>
            <DialogContent className="sm:max-w-[425px] rounded-2xl border-primary/10">
                <DialogHeader className="flex flex-col items-center text-center space-y-3">
                    <div className={`size-12 rounded-full ${iconBg} flex items-center justify-center mb-2`}>
                        <Icon className={`size-6 ${iconColor}`} aria-hidden="true" />
                    </div>
                    <DialogTitle className="text-h2">{title}</DialogTitle>
                    {description && (
                        <DialogDescription className="text-ui text-muted-foreground whitespace-pre-line">
                            {description}
                        </DialogDescription>
                    )}
                </DialogHeader>

                <DialogFooter className="sm:justify-center gap-3 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        pill
                        onClick={() => onOpenChange(false)}
                        className="w-full sm:w-auto px-8"
                        disabled={isLoading}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        variant={buttonVariant}
                        pill
                        onClick={handleConfirm}
                        className="w-full sm:w-auto px-8"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="size-4 animate-spin" /> Processando...
                            </>
                        ) : (
                            confirmLabel
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

type ConfirmImperativeArgs = Omit<ConfirmDialogProps, 'open' | 'onOpenChange' | 'onConfirm'> & {
    onConfirm?: () => void | Promise<void>;
};

type ConfirmState = (ConfirmImperativeArgs & {
    open: boolean;
    resolve: (value: boolean) => void;
}) | null;

let setConfirmState: ((s: ConfirmState) => void) | null = null;

export function ConfirmDialogHost() {
    const [state, setState] = React.useState<ConfirmState>(null);

    React.useEffect(() => {
        setConfirmState = setState;
        return () => {
            setConfirmState = null;
        };
    }, []);

    if (!state) return null;

    return (
        <ConfirmDialog
            {...state}
            open={state.open}
            onOpenChange={(next) => {
                if (!next) {
                    state.resolve(false);
                    setState(null);
                }
            }}
            onConfirm={async () => {
                if (state.onConfirm) await state.onConfirm();
                state.resolve(true);
                setState(null);
            }}
        />
    );
}

export function confirmAsync(args: ConfirmImperativeArgs): Promise<boolean> {
    return new Promise((resolve) => {
        if (!setConfirmState) {
            resolve(window.confirm(`${args.title}${args.description ? `\n\n${args.description}` : ''}`));
            return;
        }
        setConfirmState({ ...args, open: true, resolve });
    });
}
