'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { GearIcon, FileTextIcon, ClockCounterClockwiseIcon, QrCodeIcon } from '@phosphor-icons/react';

const TABS = [
    { href: '/admin/dashboard/notificacoes/config', label: 'Configuração', icon: GearIcon },
    { href: '/admin/dashboard/notificacoes/conectar', label: 'Conectar', icon: QrCodeIcon },
    { href: '/admin/dashboard/notificacoes/templates', label: 'Templates', icon: FileTextIcon },
    { href: '/admin/dashboard/notificacoes/historico', label: 'Histórico', icon: ClockCounterClockwiseIcon },
];

export function NotificacoesTabs() {
    const pathname = usePathname();
    return (
        <div className="flex gap-1 border-b">
            {TABS.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname?.startsWith(href + '/');
                return (
                    <Link
                        key={href}
                        href={href}
                        className={cn(
                            'inline-flex items-center gap-2 px-4 py-2.5 text-panel-sm font-semibold border-b-2 -mb-px transition-all',
                            active
                                ? 'border-foreground text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <Icon size={16} weight="duotone" />
                        {label}
                    </Link>
                );
            })}
        </div>
    );
}
