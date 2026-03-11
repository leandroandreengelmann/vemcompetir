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
    const currentBelt = beltColor.toLowerCase();
    const activeHex = getBeltColor(currentBelt);
    const activeHsl = hexToHsl(activeHex);

    const isWhiteBelt = currentBelt === 'branca';
    const activeFg = isWhiteBelt ? '240 10% 3.9%' : '0 0% 100%';
    const accentColor = isWhiteBelt ? 'text-brand-950' : 'text-primary';
    const borderColor = isWhiteBelt ? 'md:border-brand-950' : 'md:border-primary';

    return (
        <div
            className="flex flex-col gap-8 md:gap-5 mb-4 md:mb-8 px-2 md:px-0"
            style={{
                // @ts-ignore
                '--primary': activeHsl,
                '--primary-foreground': activeFg,
            } as React.CSSProperties}
        >
            {/* Botão voltar — só seta no mobile, seta + texto no desktop */}
            <Link
                href={backHref}
                className={`w-fit group flex items-center gap-2 transition-all md:pl-5 ${accentColor}`}
                aria-label="Voltar"
            >
                <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform cursor-pointer" />
                <span className="hidden md:inline text-sm font-semibold">Voltar</span>
            </Link>

            {/* Título com borda-acento lateral no desktop */}
            <div className={`space-y-2 md:pl-5 md:border-l-[3px] ${borderColor}`}>
                <h1 className={`text-h1 md:text-4xl md:font-black tracking-tight ${accentColor}`}>
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
