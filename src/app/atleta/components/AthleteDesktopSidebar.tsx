'use client';

import { getBeltColor, hexToHsl } from '@/lib/belt-theme';
import { BeltKnot } from '@/components/athlete/belt-knot';

interface AthleteDesktopSidebarProps {
    fullName?: string | null;
    avatarUrl?: string | null;
    beltColor?: string;
}

export function AthleteDesktopSidebar({ fullName, beltColor = 'branca' }: AthleteDesktopSidebarProps) {
    const isWhiteBelt = beltColor.toLowerCase().trim() === 'branca';
    const activeHex = getBeltColor(beltColor);
    const activeHsl = hexToHsl(activeHex);

    const nameColor = isWhiteBelt ? 'text-brand-950' : 'text-white';
    const beltLabelColor = isWhiteBelt ? 'text-brand-950/40' : 'text-white/50';

    // Primeiro nome + segundo nome
    const displayName = fullName?.split(' ').slice(0, 2).join(' ') || 'Atleta';

    return (
        <aside
            className={`hidden md:flex flex-col w-64 shrink-0 sticky top-0 h-screen items-center justify-center gap-5 ${
                isWhiteBelt ? 'bg-white border-r border-gray-100' : ''
            }`}
            style={{
                backgroundColor: isWhiteBelt ? undefined : activeHex,
                '--primary': activeHsl,
            } as React.CSSProperties}
        >
            {/* Nó da faixa — identidade central */}
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-700">
                <BeltKnot beltColor={beltColor} className="w-[210px] h-[118px]" />
            </div>


            {/* Nome e graduação — conectados ao nó */}
            <div className="text-center px-6">
                <p className={`font-black text-base leading-tight tracking-wide ${nameColor}`}>
                    {displayName}
                </p>
                <p className={`mt-1.5 text-[11px] uppercase tracking-[0.2em] font-semibold ${beltLabelColor}`}>
                    Faixa {beltColor}
                </p>
            </div>
        </aside>
    );
}
