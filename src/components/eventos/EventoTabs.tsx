'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    NotePencilIcon,
    StackIcon,
    SparkleIcon,
    InfoIcon,
    ImageIcon,
    IdentificationCardIcon,
    CurrencyDollarIcon,
    UserCircleIcon,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

type Tab = {
    label: string;
    href: (id: string) => string;
    matches: (pathname: string, id: string) => boolean;
    icon: Icon;
    accent?: 'amber';
};

const TABS: Tab[] = [
    {
        label: 'Dados',
        href: (id) => `/admin/dashboard/eventos/${id}/editar`,
        matches: (p, id) => p === `/admin/dashboard/eventos/${id}/editar`,
        icon: NotePencilIcon,
    },
    {
        label: 'Categorias',
        href: (id) => `/admin/dashboard/eventos/${id}/categorias`,
        matches: (p, id) => p === `/admin/dashboard/eventos/${id}/categorias`,
        icon: StackIcon,
    },
    {
        label: 'Categorias (Novo)',
        href: (id) => `/admin/dashboard/eventos/${id}/categorias-federacao`,
        matches: (p, id) => p === `/admin/dashboard/eventos/${id}/categorias-federacao`,
        icon: SparkleIcon,
        accent: 'amber',
    },
    {
        label: 'Infos Gerais',
        href: (id) => `/admin/dashboard/eventos/${id}/informacoes-gerais`,
        matches: (p, id) => p === `/admin/dashboard/eventos/${id}/informacoes-gerais`,
        icon: InfoIcon,
    },
    {
        label: 'Imagens',
        href: (id) => `/admin/dashboard/eventos/${id}/imagens`,
        matches: (p, id) => p === `/admin/dashboard/eventos/${id}/imagens`,
        icon: ImageIcon,
    },
    {
        label: 'Passaporte',
        href: (id) => `/admin/dashboard/eventos/${id}/passaporte`,
        matches: (p, id) => p === `/admin/dashboard/eventos/${id}/passaporte`,
        icon: IdentificationCardIcon,
    },
    {
        label: 'Preços (Academia)',
        href: (id) => `/admin/dashboard/eventos/${id}/precos-academias`,
        matches: (p, id) => p === `/admin/dashboard/eventos/${id}/precos-academias`,
        icon: CurrencyDollarIcon,
    },
    {
        label: 'Preços (Atleta)',
        href: (id) => `/admin/dashboard/eventos/${id}/precos-atletas`,
        matches: (p, id) => p === `/admin/dashboard/eventos/${id}/precos-atletas`,
        icon: UserCircleIcon,
    },
];

export function EventoTabs({ eventId }: { eventId: string }) {
    const pathname = usePathname();

    return (
        <nav
            aria-label="Seções do evento"
            className="-mx-4 px-4 overflow-x-auto scrollbar-thin"
        >
            <div className="inline-flex items-center gap-1.5 bg-muted/40 border rounded-full p-1.5 shadow-sm">
                {TABS.map((t) => {
                    const active = t.matches(pathname ?? '', eventId);
                    const Icon = t.icon;
                    return (
                        <Link
                            key={t.label}
                            href={t.href(eventId)}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                'inline-flex items-center gap-2 h-10 px-4 rounded-full text-base font-semibold whitespace-nowrap transition-all',
                                active
                                    ? t.accent === 'amber'
                                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                                        : 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                                    : t.accent === 'amber'
                                        ? 'text-amber-700 hover:bg-amber-500/10'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-background',
                            )}
                        >
                            <Icon size={18} weight={active ? 'fill' : 'duotone'} />
                            {t.label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
