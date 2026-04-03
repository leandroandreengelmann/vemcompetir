'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { WhatsappLogoIcon, HeadsetIcon, QuestionIcon } from '@phosphor-icons/react';

export function WhatsAppFloatingButton() {
    const pathname = usePathname();
    const [phone, setPhone] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/whatsapp/support-phone')
            .then(r => r.json())
            .then(d => { if (d.phone) setPhone(d.phone); })
            .catch(() => {});
    }, []);

    if (!phone) return null;
    if (pathname?.includes('/admin') || pathname?.includes('/dashboard')) return null;

    function buildLink(type: 'suporte' | 'duvida') {
        const text = type === 'suporte'
            ? 'SUPORTE: Olá! Preciso de ajuda com o Vem Competir.'
            : 'DÚVIDA: Olá! Tenho uma dúvida sobre o Vem Competir.';
        return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
            <a
                href={buildLink('suporte')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-zinc-800 shadow-lg border text-sm font-semibold text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-all"
            >
                <HeadsetIcon size={16} weight="duotone" />
                Suporte
            </a>
            <a
                href={buildLink('duvida')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-zinc-800 shadow-lg border text-sm font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all"
            >
                <QuestionIcon size={16} weight="duotone" />
                Dúvida
            </a>
            <div className="size-14 rounded-full bg-[#25D366] flex items-center justify-center shadow-xl">
                <WhatsappLogoIcon size={30} weight="fill" className="text-white" />
            </div>
        </div>
    );
}
