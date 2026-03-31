import React from 'react';

interface AthleteProfile {
    belt_color: string | null;
    weight: number | null;
    birth_date: string | null;
    sexo: string | null;
}

interface AthleteProfileCardProps {
    profile: AthleteProfile;
}

const BELT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    'branca':           { bg: 'bg-white',          text: 'text-gray-700',   border: 'border-gray-300' },
    'cinza':            { bg: 'bg-gray-400',        text: 'text-white',      border: 'border-gray-400' },
    'cinza e branca':   { bg: 'bg-gray-300',        text: 'text-gray-700',   border: 'border-gray-400' },
    'cinza e preta':    { bg: 'bg-gray-500',        text: 'text-white',      border: 'border-gray-600' },
    'amarela':          { bg: 'bg-yellow-400',      text: 'text-yellow-900', border: 'border-yellow-500' },
    'amarela e branca': { bg: 'bg-yellow-200',      text: 'text-yellow-800', border: 'border-yellow-400' },
    'amarela e preta':  { bg: 'bg-yellow-500',      text: 'text-yellow-950', border: 'border-yellow-600' },
    'laranja':          { bg: 'bg-orange-400',      text: 'text-white',      border: 'border-orange-500' },
    'laranja e branca': { bg: 'bg-orange-200',      text: 'text-orange-800', border: 'border-orange-400' },
    'laranja e preta':  { bg: 'bg-orange-500',      text: 'text-white',      border: 'border-orange-600' },
    'verde':            { bg: 'bg-green-500',       text: 'text-white',      border: 'border-green-600' },
    'verde e branca':   { bg: 'bg-green-300',       text: 'text-green-900',  border: 'border-green-400' },
    'verde e preta':    { bg: 'bg-green-600',       text: 'text-white',      border: 'border-green-700' },
    'azul':             { bg: 'bg-blue-500',        text: 'text-white',      border: 'border-blue-600' },
    'roxa':             { bg: 'bg-purple-600',      text: 'text-white',      border: 'border-purple-700' },
    'marrom':           { bg: 'bg-amber-800',       text: 'text-white',      border: 'border-amber-900' },
    'preta':            { bg: 'bg-gray-900',        text: 'text-white',      border: 'border-gray-950' },
};

function getBeltStyle(belt: string | null) {
    if (!belt) return BELT_COLORS['branca'];
    const key = belt.toLowerCase().trim();
    return BELT_COLORS[key] ?? { bg: 'bg-muted', text: 'text-foreground', border: 'border-border' };
}

function computeAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    return today.getFullYear() - birth.getFullYear() -
        (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
}

export function AthleteProfileCard({ profile }: AthleteProfileCardProps) {
    const beltStyle = getBeltStyle(profile.belt_color);
    const age = profile.birth_date ? computeAge(profile.birth_date) : null;

    const fields = [
        {
            label: 'Faixa',
            value: profile.belt_color
                ? (
                    <span className="flex items-center gap-2">
                        <span className={`inline-block w-3 h-3 rounded-full border ${beltStyle.bg} ${beltStyle.border}`} />
                        <span className="capitalize">{profile.belt_color}</span>
                    </span>
                )
                : null,
        },
        {
            label: 'Sexo',
            value: profile.sexo ?? null,
        },
        {
            label: 'Peso',
            value: profile.weight ? `${profile.weight} kg` : null,
        },
        {
            label: 'Idade',
            value: age !== null ? `${age} anos` : null,
        },
    ];

    return (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <p className="text-panel-sm uppercase tracking-wide text-muted-foreground font-medium">
                Seu Perfil
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {fields.map(field => (
                    <div key={field.label} className="space-y-0.5 min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {field.label}
                        </p>
                        {field.value ? (
                            <p className="text-panel-sm font-semibold text-foreground leading-snug">
                                {field.value}
                            </p>
                        ) : (
                            <p className="text-panel-sm font-medium text-muted-foreground/50">—</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
