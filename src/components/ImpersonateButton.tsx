'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { EyeIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { impersonateUser } from '@/lib/impersonation-actions';
import { toast } from 'sonner';

interface ImpersonateButtonProps {
    /** auth user id da conta alvo (academia/equipe ou atleta). */
    targetUserId: string;
    /** Nome exibido no diálogo de confirmação. */
    label: string;
    variant?: 'default' | 'outline' | 'secondary' | 'ghost';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    pill?: boolean;
    className?: string;
    children?: React.ReactNode;
}

/**
 * Botão exclusivo do admin para acessar o painel "como" outra conta.
 * Ao confirmar, troca a sessão e redireciona para o painel da conta alvo.
 */
export function ImpersonateButton({
    targetUserId,
    label,
    variant = 'outline',
    size = 'default',
    pill = true,
    className,
    children,
}: ImpersonateButtonProps) {
    const [pending, startTransition] = useTransition();

    const handleClick = () => {
        const ok = window.confirm(
            `Você vai acessar o sistema como "${label}".\n\n` +
            `Um aviso ficará visível no topo enquanto durar o acesso, e você poderá sair a qualquer momento.\n\nDeseja continuar?`
        );
        if (!ok) return;

        startTransition(async () => {
            const res = await impersonateUser(targetUserId);
            if (res.ok) {
                window.location.href = res.redirectTo;
            } else {
                toast.error(res.error);
            }
        });
    };

    return (
        <Button
            type="button"
            variant={variant}
            size={size}
            pill={pill}
            className={className}
            onClick={handleClick}
            disabled={pending}
        >
            {pending ? (
                <SpinnerGapIcon size={20} weight="bold" className="mr-2 animate-spin" />
            ) : (
                <EyeIcon size={20} weight="duotone" className="mr-2" />
            )}
            {children ?? 'Acessar como'}
        </Button>
    );
}
