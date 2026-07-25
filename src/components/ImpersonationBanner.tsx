'use client';

import { useTransition } from 'react';
import { EyeIcon, SignOutIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { stopImpersonation } from '@/lib/impersonation-actions';

/**
 * Barra fixa exibida enquanto um admin está acessando o sistema "como" outra
 * conta (academia/equipe ou atleta). Deixa o estado sempre visível e oferece
 * o botão para encerrar e voltar à conta de admin.
 */
export function ImpersonationBanner({
    label,
    positionClassName = 'fixed bottom-4 left-4',
}: {
    label: string;
    /** Classes de posicionamento do container flutuante. */
    positionClassName?: string;
}) {
    const [pending, startTransition] = useTransition();

    const handleExit = () => {
        startTransition(async () => {
            const res = await stopImpersonation();
            if (res.ok) {
                window.location.href = res.redirectTo;
            }
        });
    };

    return (
        <div className={`${positionClassName} z-[200] max-w-[calc(100vw-2rem)]`}>
            <div className="flex items-center gap-2 rounded-full bg-amber-500 py-1.5 pl-3 pr-1.5 text-amber-950 shadow-lg ring-1 ring-amber-950/10">
                <EyeIcon size={18} weight="fill" className="shrink-0" />
                <span className="min-w-0 truncate text-xs font-medium">
                    <span className="hidden sm:inline">Modo admin — </span>
                    <strong className="font-bold">{label}</strong>
                </span>
                <button
                    type="button"
                    onClick={handleExit}
                    disabled={pending}
                    title="Sair do modo admin"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-950 px-3 py-1.5 text-xs font-semibold text-amber-50 transition-colors hover:bg-amber-900 disabled:opacity-60"
                >
                    {pending ? (
                        <SpinnerGapIcon size={16} weight="bold" className="animate-spin" />
                    ) : (
                        <SignOutIcon size={16} weight="bold" />
                    )}
                    <span className="hidden sm:inline">{pending ? 'Saindo…' : 'Sair'}</span>
                </button>
            </div>
        </div>
    );
}
