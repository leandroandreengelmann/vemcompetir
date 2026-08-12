'use client';

import Link from 'next/link';
import { WarningIcon, WhatsappLogoIcon } from '@phosphor-icons/react';

/** Mesmo número de suporte usado no WhatsAppFloatingButton. */
const SUPPORT_PHONE = '556696766283';

function buildWhatsAppLink(text: string) {
    return `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(text)}`;
}

interface OrganizerBannerProps {
    variant: 'organizer';
    balance: number;
}

interface AdminBannerAcademy {
    id: string;
    name: string;
    balance: number;
}

interface AdminBannerProps {
    variant: 'admin';
    academies: AdminBannerAcademy[];
}

type TokenCriticalBannerProps = OrganizerBannerProps | AdminBannerProps;

/**
 * Aviso grande e persistente (não é dismissível) exibido no topo de todo o
 * painel — academia/equipe e admin — quando o saldo de tokens de inscrição
 * está crítico (<= CRITICAL_BALANCE_THRESHOLD). Objetivo: garantir contato
 * humano para recarga antes que as inscrições parem de ser confirmadas.
 */
export function TokenCriticalBanner(props: TokenCriticalBannerProps) {
    if (props.variant === 'organizer') {
        const { balance } = props;
        const text = `SUPORTE: Olá! Meu saldo de tokens está em ${balance} e preciso recarregar para não parar de confirmar inscrições.`;

        return (
            <div className="w-full bg-destructive text-destructive-foreground">
                <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="flex items-start gap-3">
                        <WarningIcon size={22} weight="fill" className="shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="font-bold leading-tight">
                                Saldo de tokens crítico: {balance} restante{balance === 1 ? '' : 's'}
                            </p>
                            <p className="text-sm text-destructive-foreground/90">
                                Suas inscrições podem parar de ser confirmadas. Fale com o suporte agora para recarregar.
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 pl-9 sm:pl-0">
                        <a
                            href={buildWhatsAppLink(text)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-destructive transition-colors hover:bg-white/90"
                        >
                            <WhatsappLogoIcon size={16} weight="fill" />
                            Falar no WhatsApp
                        </a>
                        <Link
                            href="/academia-equipe/dashboard/tokens"
                            className="inline-flex items-center rounded-md border border-white/40 px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-white/10"
                        >
                            Ver tokens
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const { academies } = props;
    if (academies.length === 0) return null;

    const shown = academies.slice(0, 3);
    const restCount = academies.length - shown.length;

    return (
        <div className="w-full bg-destructive text-destructive-foreground">
            <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-start gap-3 min-w-0">
                    <WarningIcon size={22} weight="fill" className="shrink-0 mt-0.5" />
                    <div className="min-w-0">
                        <p className="font-bold leading-tight">
                            {academies.length} academia{academies.length === 1 ? '' : 's'} com saldo crítico de tokens
                        </p>
                        <p className="text-sm text-destructive-foreground/90 truncate">
                            {shown.map(a => `${a.name} (${a.balance})`).join(', ')}
                            {restCount > 0 ? ` e mais ${restCount}` : ''} — entre em contato para oferecer recarga.
                        </p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 pl-9 sm:pl-0">
                    <Link
                        href="/admin/dashboard/pacotes-tokens"
                        className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-destructive transition-colors hover:bg-white/90"
                    >
                        Gerenciar academias
                    </Link>
                </div>
            </div>
        </div>
    );
}
