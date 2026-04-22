'use client';

import { getBeltColor, hexToHsl } from '@/lib/belt-theme';
import { BeltKnot } from '@/components/athlete/belt-knot';
import { CountryFlag } from '@/components/ui/country-flag';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SignOutIcon } from '@phosphor-icons/react';
import { signOutAction } from '../dashboard/actions';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface AthleteDesktopSidebarProps {
    fullName?: string | null;
    avatarUrl?: string | null;
    beltColor?: string;
    nationality?: string | null;
}

export function AthleteDesktopSidebar({ fullName, avatarUrl, beltColor = 'branca', nationality }: AthleteDesktopSidebarProps) {
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
                <div className="animate-in fade-in slide-in-from-bottom-3 duration-700 relative -top-8 flex flex-col items-center gap-2">
                    <BeltKnot beltColor={beltColor} className="w-[210px] h-[118px]" />
                    {nationality && (
                        <CountryFlag
                            code={nationality}
                            showName={false}
                            className="[&_.fi]:!w-10 [&_.fi]:!h-[1.875rem] [&_.fi]:!rounded-none [&_.fi]:shadow-md"
                        />
                    )}
                </div>


                {/* Nome e graduação — conectados ao nó */}
                <div className="flex flex-col items-center gap-3 px-6">
                    <Avatar className={`h-20 w-20 shadow-sm ${isWhiteBelt ? 'border-2 border-brand-950/10' : 'border-2 border-white/30'}`}>
                        {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName || 'Avatar'} />}
                        <AvatarFallback
                            className={`text-2xl font-bold ${
                                isWhiteBelt ? 'bg-brand-950 text-white' : 'bg-white/15 text-white'
                            }`}
                        >
                            {fullName?.trim().charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                        <p className={`font-bold text-panel-md leading-tight tracking-wide ${nameColor}`}>
                            {displayName}
                        </p>
                        <p className={`mt-1.5 text-panel-sm uppercase tracking-[0.2em] font-semibold ${beltLabelColor}`}>
                            Faixa {beltColor}
                        </p>
                    </div>
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
                    <SignOutIcon size={16} weight="duotone" className={`transition-transform group-hover:-translate-x-0.5 ${isLoggingOut ? 'animate-pulse' : ''}`} />
                    <span className="text-panel-sm font-bold uppercase tracking-widest text-inherit">
                        {isLoggingOut ? 'Saindo...' : 'Sair'}
                    </span>
                </button>
            </div>
        </aside>
    );
}
