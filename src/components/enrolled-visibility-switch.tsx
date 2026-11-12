'use client';

import { useState, useTransition } from 'react';
import { EyeIcon, EyeSlashIcon, CircleNotchIcon } from '@phosphor-icons/react';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { showToast } from '@/lib/toast';
import { setShowEnrolledAthletesAction } from '@/app/(panel)/actions/event-enrolled-visibility';

/**
 * Versão compacta da chave "Mostrar inscritos nas categorias", para listas (Meus Eventos).
 * Salva na hora e mostra um aviso explicando o que passa a acontecer.
 */
export function EnrolledVisibilitySwitch({ eventId, initialShow }: { eventId: string; initialShow: boolean }) {
    const [show, setShow] = useState(initialShow);
    const [pending, startTransition] = useTransition();

    const handleChange = (next: boolean) => {
        const previous = show;
        setShow(next);
        startTransition(async () => {
            const res = await setShowEnrolledAthletesAction(eventId, next);
            if (res?.error) {
                setShow(previous);
                showToast.error('Não foi possível alterar', res.error);
                return;
            }
            if (next) {
                showToast.success(
                    'Inscritos visíveis',
                    'A partir de agora, quem se inscrever vê os atletas já inscritos em cada categoria.',
                );
            } else {
                showToast.success(
                    'Inscritos ocultos',
                    'A partir de agora, ninguém vê quem está inscrito nas categorias, nem a quantidade. Você continua vendo nos seus relatórios.',
                );
            }
        });
    };

    const Icon = show ? EyeIcon : EyeSlashIcon;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <Icon
                        size={20}
                        weight="duotone"
                        className={cn(show ? 'text-emerald-500 dark:text-emerald-400' : 'text-muted-foreground')}
                    />
                    <Switch
                        checked={show}
                        onCheckedChange={handleChange}
                        disabled={pending}
                        aria-label="Mostrar inscritos nas categorias"
                    />
                    <span className={cn('text-panel-sm font-bold w-14 text-left', show ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
                        {pending ? <CircleNotchIcon size={14} weight="bold" className="animate-spin" /> : show ? 'Visíveis' : 'Ocultos'}
                    </span>
                </label>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px]">
                {show
                    ? 'Quem se inscreve vê os atletas já inscritos em cada categoria. Clique para ocultar.'
                    : 'Ninguém vê quem está inscrito nas categorias. Clique para mostrar.'}
            </TooltipContent>
        </Tooltip>
    );
}
