'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    AlertTriangle,
    CheckCircle2,
    Info,
    Loader2,
    XCircle,
    type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'success' | 'warning' | 'destructive' | 'info';

const ICON_BY_TONE: Record<Tone, LucideIcon | null> = {
    default: null,
    success: CheckCircle2,
    warning: AlertTriangle,
    destructive: XCircle,
    info: Info,
};

const TONE_CLASSES: Record<Tone, { wrapper: string; icon: string }> = {
    default: { wrapper: 'bg-muted', icon: 'text-foreground' },
    success: { wrapper: 'bg-success/10', icon: 'text-success' },
    warning: { wrapper: 'bg-warning/10', icon: 'text-warning' },
    destructive: { wrapper: 'bg-destructive/10', icon: 'text-destructive' },
    info: { wrapper: 'bg-primary/10', icon: 'text-primary' },
};

interface StandardModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tone?: Tone;
    icon?: LucideIcon;
    title: string;
    description?: string;
    children?: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void | Promise<void>;
    confirmDisabled?: boolean;
    loading?: boolean;
    hideFooter?: boolean;
    contentClassName?: string;
}

export function StandardModal({
    open,
    onOpenChange,
    tone = 'default',
    icon,
    title,
    description,
    children,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    onConfirm,
    confirmDisabled = false,
    loading = false,
    hideFooter = false,
    contentClassName,
}: StandardModalProps) {
    const Icon = icon ?? ICON_BY_TONE[tone];
    const toneCls = TONE_CLASSES[tone];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn('sm:max-w-lg', contentClassName)}>
                <DialogHeader>
                    {Icon && (
                        <div className={cn('flex h-11 w-11 items-center justify-center rounded-full mb-2', toneCls.wrapper)}>
                            <Icon className={cn('h-5 w-5', toneCls.icon)} />
                        </div>
                    )}
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>

                {children && <div className="py-2">{children}</div>}

                {!hideFooter && (
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            {cancelLabel}
                        </Button>
                        {onConfirm && (
                            <Button
                                onClick={onConfirm}
                                disabled={confirmDisabled || loading}
                                variant={tone === 'destructive' ? 'destructive' : 'default'}
                            >
                                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                {confirmLabel}
                            </Button>
                        )}
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
