'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CookieIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const PANEL_PREFIXES = ['/admin', '/academia-equipe', '/atleta'];
const STORAGE_KEY = 'competir_cookie_consent';

export function CookieBanner() {
    const pathname = usePathname();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const accepted = localStorage.getItem(STORAGE_KEY);
        if (!accepted) setVisible(true);
    }, []);

    const isPanel = PANEL_PREFIXES.some(prefix => pathname.startsWith(prefix));
    if (isPanel || !visible) return null;

    const handleAccept = () => {
        localStorage.setItem(STORAGE_KEY, '1');
        setVisible(false);
    };

    return (
        <div className={cn(
            'fixed bottom-0 left-0 right-0 z-50',
            'bg-background/95 backdrop-blur-sm border-t border-border shadow-lg',
            'animate-in slide-in-from-bottom-4 duration-300'
        )}>
            <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <CookieIcon size={32} weight="duotone" className="shrink-0 text-amber-800 hidden sm:block" />
                <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
                    Utilizamos cookies para garantir que você tenha a melhor experiência em nosso site.
                    Ao continuar navegando, assumimos que você concorda com nossa{' '}
                    <Link href="/privacidade" className="text-foreground font-medium underline underline-offset-2 hover:text-primary transition-colors">
                        Política de Privacidade
                    </Link>
                    {' '}e nossos{' '}
                    <Link href="/termos-de-uso" className="text-foreground font-medium underline underline-offset-2 hover:text-primary transition-colors">
                        Termos de Uso
                    </Link>
                    .
                </p>
                <Button pill onClick={handleAccept} className="shrink-0">
                    Concordo
                </Button>
            </div>
        </div>
    );
}
