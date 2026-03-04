'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getBeltColor, hexToHsl } from '@/lib/belt-theme';

interface AthletePageHeaderProps {
    title: string;
    description?: string;
    backHref: string;
    beltColor?: string;
}

export function AthletePageHeader({ title, description, backHref, beltColor = 'branca' }: AthletePageHeaderProps) {
    // Lógica de cores baseada na faixa
    const currentBelt = beltColor.toLowerCase();
    const activeHex = getBeltColor(currentBelt);
    const activeHsl = hexToHsl(activeHex);

    // Determina cor do foreground para contraste (preto para faixa branca, branco para as outras)
    const isWhiteBelt = currentBelt === 'branca';
    const activeFg = isWhiteBelt ? '240 10% 3.9%' : '0 0% 100%';

    return (
        <div
            className="flex flex-col gap-8 mb-4 px-2 md:px-0"
            style={{
                // @ts-ignore
                '--primary': activeHsl,
                '--primary-foreground': activeFg,
            } as React.CSSProperties}
        >
            <Link
                href={backHref}
                className="w-fit group transition-all"
                aria-label="Voltar"
            >
                <ArrowLeft className={`h-6 w-6 group-hover:-translate-x-1 transition-transform cursor-pointer ${isWhiteBelt ? 'text-brand-950' : 'text-primary'}`} />
            </Link>

            <div className="space-y-1">
                <h1 className={`text-h1 tracking-tight ${isWhiteBelt ? 'text-brand-950' : 'text-primary'}`}>
                    {title}
                </h1>
                {description && (
                    <p className="text-ui text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
}
