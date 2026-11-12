'use client';

import { useState, useTransition } from 'react';
import { EyeIcon, EyeSlashIcon, CircleNotchIcon } from '@phosphor-icons/react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { setShowEnrolledAthletesAction } from '@/app/(panel)/actions/event-enrolled-visibility';

/** Chave liga/desliga: mostrar quem já está inscrito em cada categoria do evento. */
export function EnrolledVisibilityToggle({
    eventId,
    initialShow,
    className,
}: {
    eventId: string;
    initialShow: boolean;
    className?: string;
}) {
    const [show, setShow] = useState(initialShow);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const handleChange = (next: boolean) => {
        const previous = show;
        setShow(next);
        setError(null);
        startTransition(async () => {
            const res = await setShowEnrolledAthletesAction(eventId, next);
            if (res?.error) {
                setShow(previous);
                setError(res.error);
            }
        });
    };

    const Icon = show ? EyeIcon : EyeSlashIcon;

    return (
        <div className={cn('rounded-2xl border border-border/60 bg-background p-4 sm:p-5', className)}>
            <div className="flex items-start gap-4">
                <div
                    className={cn(
                        'p-2 rounded-xl shrink-0',
                        show
                            ? 'bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-500 dark:text-emerald-400'
                            : 'bg-slate-500/10 dark:bg-slate-400/10 text-slate-500 dark:text-slate-400',
                    )}
                >
                    <Icon size={24} weight="duotone" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                    <label htmlFor={`show-enrolled-${eventId}`} className="text-panel-md font-semibold cursor-pointer">
                        Mostrar inscritos nas categorias
                    </label>
                    <p className="text-panel-sm text-muted-foreground">
                        {show
                            ? 'Ligado: quem está se inscrevendo vê os atletas já inscritos em cada categoria.'
                            : 'Desligado: ninguém vê quem está inscrito nas categorias (nem a quantidade). Você continua vendo nos seus relatórios.'}
                    </p>
                    {error && <p className="text-panel-sm text-destructive font-medium">{error}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0 pt-1">
                    {pending && <CircleNotchIcon size={16} weight="bold" className="animate-spin text-muted-foreground" />}
                    <Switch
                        id={`show-enrolled-${eventId}`}
                        checked={show}
                        onCheckedChange={handleChange}
                        disabled={pending}
                    />
                </div>
            </div>
        </div>
    );
}
