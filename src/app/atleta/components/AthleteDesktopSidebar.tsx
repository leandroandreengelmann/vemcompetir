'use client';

import { getBeltColor, hexToHsl } from '@/lib/belt-theme';
import { BeltKnot } from '@/components/athlete/belt-knot';
import { LogOut } from 'lucide-react';
import { signOutAction } from '../dashboard/actions';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface AthleteDesktopSidebarProps {
    fullName?: string | null;
    avatarUrl?: string | null;
    beltColor?: string;
}

export function AthleteDesktopSidebar({ fullName, beltColor = 'branca' }: AthleteDesktopSidebarProps) {
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const isWhiteBelt = beltColor.toLowerCase().trim() === 'branca';
    const activeHex = getBeltColor(beltColor);
    const activeHsl = hexToHsl(activeHex);

    const nameColor = isWhiteBelt ? 'text-brand-950' : 'text-white';
    const beltLabelColor = isWhiteBelt ? 'text-brand-950/40' : 'text-white/50';

    // Primeiro nome + segundo nome
    const displayName = fullName?.split(' ').slice(0, 2).join(' ') || 'Atleta';

    return (
        <aside
            className={`hidden md:flex flex-col w-64 fixed left-0 top-0 h-screen items-center py-10 z-50 ${
                isWhiteBelt ? 'bg-white border-r border-gray-100' : ''
            }`}
            style={{
                backgroundColor: isWhiteBelt ? undefined : activeHex,
                '--primary': activeHsl,
            } as React.CSSProperties}
        >
            <div className="flex-1 flex flex-col items-center justify-center gap-8">
                {/* Nó da faixa — identidade central */}
                <div className="animate-in fade-in slide-in-from-bottom-3 duration-700 relative -top-8">
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
            </div>

            {/* Botão de Sair */}
            <div className="px-6 w-full mt-auto">
                <button
                    disabled={isLoggingOut}
                    onClick={async () => {
                        setIsLoggingOut(true);
                        try {
                            await signOutAction();
                            // Client-side hard redirect to clear state
                            window.location.href = '/login';
                        } catch (error) {
                            console.error('Logout error:', error);
                            window.location.href = '/login';
                        }
                    }}
                    className={`flex items-center justify-center gap-2 w-full py-4 px-4 rounded-xl transition-all duration-300 group shadow-sm active:scale-95 ${
                        isWhiteBelt 
                            ? 'text-brand-950 font-bold hover:bg-black/5 bg-black/5' 
                            : 'text-white font-bold hover:bg-white/20 bg-white/10 border border-white/10'
                    }`}
                >
                    <LogOut className={`w-4 h-4 transition-transform group-hover:-translate-x-0.5 ${isLoggingOut ? 'animate-pulse' : ''}`} />
                    <span className="text-xs font-black uppercase tracking-widest text-inherit">
                        {isLoggingOut ? 'Saindo...' : 'Sair'}
                    </span>
                </button>
            </div>
        </aside>
    );
}
