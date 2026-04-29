'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HouseIcon, TrophyIcon, ClipboardTextIcon, UserIcon } from '@phosphor-icons/react';

const items = [
    { href: '/atleta/dashboard', label: 'Início', icon: HouseIcon, exact: true },
    { href: '/atleta/dashboard/campeonatos', label: 'Campeonatos', icon: TrophyIcon },
    { href: '/atleta/dashboard/inscricoes', label: 'Inscrições', icon: ClipboardTextIcon },
    { href: '/atleta/dashboard/perfil', label: 'Perfil', icon: UserIcon },
];

export function AthleteBottomNav() {
    const pathname = usePathname();

    const isActive = (href: string, exact?: boolean) => {
        if (exact) return pathname === href;
        return pathname === href || pathname.startsWith(href + '/');
    };

    return (
        <nav
            aria-label="Navegação principal"
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4"
            style={{
                paddingTop: '8px',
                paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            }}
        >
            <ul
                className="flex flex-row justify-center items-center w-full max-w-md bg-primary rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-white/10 px-3 py-3"
            >
                {items.map(({ href, label, icon: Icon, exact }) => {
                    const active = isActive(href, exact);
                    return (
                        <li key={href} className="flex-1">
                            <Link
                                href={href}
                                aria-current={active ? 'page' : undefined}
                                className="flex flex-col items-center justify-center gap-1 transition-colors"
                            >
                                <span
                                    className={`flex items-center justify-center rounded-full transition-all ${
                                        active
                                            ? 'bg-white/15 px-5 py-1.5'
                                            : 'px-2 py-1.5'
                                    }`}
                                >
                                    <Icon
                                        size={24}
                                        weight={active ? 'fill' : 'duotone'}
                                        className={active ? 'text-primary-foreground' : 'text-primary-foreground/60'}
                                    />
                                </span>
                                <span
                                    className={`text-[12px] leading-none ${
                                        active ? 'font-semibold text-primary-foreground' : 'font-medium text-primary-foreground/60'
                                    }`}
                                >
                                    {label}
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
