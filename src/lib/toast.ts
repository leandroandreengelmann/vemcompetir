'use client';

import { toast } from 'sonner';
import { createElement } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

const VARIANT_STYLES: Record<ToastVariant, { bg: string; Icon: typeof CheckCircle2 }> = {
    success: { bg: 'bg-success', Icon: CheckCircle2 },
    error: { bg: 'bg-destructive', Icon: AlertCircle },
    warning: { bg: 'bg-warning', Icon: AlertTriangle },
    info: { bg: 'bg-primary', Icon: Info },
};

const DURATIONS: Record<ToastVariant, number> = {
    success: 4000,
    info: 4000,
    warning: 6000,
    error: 8000,
};

type ToastAction = { label: string; onClick: () => void };

type ShowToastArgs = {
    title: string;
    description?: string;
    action?: ToastAction;
    duration?: number;
};

function showToastImpl(variant: ToastVariant, args: ShowToastArgs): string | number {
    const { title, description, action, duration } = args;
    const { bg, Icon } = VARIANT_STYLES[variant];

    return toast.custom(
        (id) =>
            createElement(
                'div',
                {
                    className: `flex items-start gap-3 w-[356px] max-w-[calc(100vw-2rem)] ${bg} rounded-xl px-5 py-4 shadow-xl text-white animate-in slide-in-from-right-2`,
                },
                createElement(Icon, { className: 'size-6 shrink-0 mt-0.5', 'aria-hidden': true }),
                createElement(
                    'div',
                    { className: 'flex-1 min-w-0' },
                    createElement('p', { className: 'text-base font-bold leading-tight' }, title),
                    description &&
                        createElement(
                            'p',
                            { className: 'text-xs opacity-90 mt-0.5 leading-snug' },
                            description
                        ),
                    action &&
                        createElement(
                            'button',
                            {
                                type: 'button',
                                onClick: () => {
                                    action.onClick();
                                    toast.dismiss(id);
                                },
                                className:
                                    'mt-2 text-xs font-semibold underline underline-offset-2 hover:opacity-80',
                            },
                            action.label
                        )
                )
            ),
        { duration: duration ?? DURATIONS[variant] }
    );
}

export const showToast = {
    success: (title: string, description?: string, action?: ToastAction) =>
        showToastImpl('success', { title, description, action }),
    error: (title: string, description?: string, action?: ToastAction) =>
        showToastImpl('error', { title, description, action }),
    warning: (title: string, description?: string, action?: ToastAction) =>
        showToastImpl('warning', { title, description, action }),
    info: (title: string, description?: string, action?: ToastAction) =>
        showToastImpl('info', { title, description, action }),

    loading: (title: string, description?: string) =>
        toast.custom(
            () =>
                createElement(
                    'div',
                    {
                        className:
                            'flex items-start gap-3 w-[356px] max-w-[calc(100vw-2rem)] bg-popover border border-border rounded-xl px-5 py-4 shadow-xl animate-in slide-in-from-right-2',
                    },
                    createElement(Loader2, {
                        className: 'size-6 shrink-0 mt-0.5 animate-spin text-primary',
                        'aria-hidden': true,
                    }),
                    createElement(
                        'div',
                        { className: 'flex-1 min-w-0' },
                        createElement(
                            'p',
                            { className: 'text-base font-bold leading-tight text-foreground' },
                            title
                        ),
                        description &&
                            createElement(
                                'p',
                                {
                                    className:
                                        'text-xs text-muted-foreground mt-0.5 leading-snug',
                                },
                                description
                            )
                    )
                ),
            { duration: Infinity }
        ),

    dismiss: (id?: string | number) => toast.dismiss(id),

    promise: <T,>(
        promise: Promise<T>,
        messages: {
            loading: string;
            success: string | ((data: T) => string);
            error: string | ((err: unknown) => string);
        }
    ) => {
        const loadingId = showToast.loading(messages.loading);
        promise
            .then((data) => {
                toast.dismiss(loadingId);
                const successMsg =
                    typeof messages.success === 'function' ? messages.success(data) : messages.success;
                showToast.success(successMsg);
            })
            .catch((err) => {
                toast.dismiss(loadingId);
                const errorMsg =
                    typeof messages.error === 'function' ? messages.error(err) : messages.error;
                showToast.error(errorMsg);
            });
        return promise;
    },
};

export type { ToastVariant, ToastAction };
