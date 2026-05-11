'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
    CaretDownIcon,
    CaretUpIcon,
    UsersIcon,
    CircleNotchIcon,
} from '@phosphor-icons/react';
import { getBeltStyle } from '@/lib/belt-theme';
import { getCategoryEnrolledAthletes } from '@/app/(panel)/actions/event-categories';

interface AthletePreview {
    id: string;
    name: string;
    belt: string;
    gym: string;
}

interface Props {
    eventId: string;
    categoryId: string;
    currentAthleteId: string;
    initialCount: number;
    initialPreviewNames: string[];
}

function initials(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
}

export function EnrolledAthletesPreview({
    eventId,
    categoryId,
    currentAthleteId,
    initialCount,
    initialPreviewNames,
}: Props) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [athletes, setAthletes] = useState<AthletePreview[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    if (initialCount <= 0) return null;

    const handleToggle = async () => {
        if (!isExpanded && !hasLoaded) {
            setLoading(true);
            try {
                const data = await getCategoryEnrolledAthletes(eventId, categoryId);
                const sorted = [...data].sort((a, b) => {
                    if (a.id === currentAthleteId) return -1;
                    if (b.id === currentAthleteId) return 1;
                    return a.name.localeCompare(b.name);
                });
                setAthletes(sorted);
                setHasLoaded(true);
            } catch (err) {
                console.error('Falha ao buscar atletas', err);
            } finally {
                setLoading(false);
            }
        }
        setIsExpanded(!isExpanded);
    };

    return (
        <div className="mt-2 flex flex-col">
            {!isExpanded ? (
                <button
                    type="button"
                    onClick={handleToggle}
                    className="group/preview w-full flex items-center justify-between p-2.5 rounded-xl border border-primary/15 bg-primary/5 hover:bg-primary/10 transition-colors"
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        {initialPreviewNames.length > 0 && (
                            <div className="flex -space-x-2 overflow-hidden">
                                {initialPreviewNames.map((name, i) => (
                                    <div
                                        key={i}
                                        title={name}
                                        className="inline-flex h-7 w-7 rounded-full ring-2 ring-background bg-primary/20 text-primary items-center justify-center text-[11px] font-bold shrink-0"
                                    >
                                        {initials(name)}
                                    </div>
                                ))}
                                {initialCount > initialPreviewNames.length && (
                                    <div className="inline-flex h-7 w-7 rounded-full ring-2 ring-background bg-muted text-muted-foreground items-center justify-center text-[11px] font-bold shrink-0">
                                        +{initialCount - initialPreviewNames.length}
                                    </div>
                                )}
                            </div>
                        )}
                        <span className="text-panel-sm font-semibold text-foreground/80 whitespace-nowrap">
                            {initialCount} {initialCount === 1 ? 'inscrito' : 'inscritos'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-primary shrink-0 ml-2">
                        <span className="text-panel-sm font-bold uppercase tracking-wider hidden sm:inline">
                            Ver
                        </span>
                        <CaretDownIcon
                            size={16}
                            weight="duotone"
                            className="group-hover/preview:translate-y-0.5 transition-transform"
                        />
                    </div>
                </button>
            ) : (
                <>
                    <button
                        type="button"
                        onClick={handleToggle}
                        className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary/15 transition-colors mb-2"
                    >
                        <span className="text-panel-sm font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                            <UsersIcon size={14} weight="duotone" />
                            {initialCount} {initialCount === 1 ? 'Inscrito' : 'Inscritos'}
                        </span>
                        <CaretUpIcon size={16} weight="duotone" className="text-primary" />
                    </button>

                    <div className="animate-in slide-in-from-top-1 fade-in duration-200">
                        {loading ? (
                            <div className="flex items-center justify-center p-4 bg-muted/20 rounded-xl">
                                <CircleNotchIcon
                                    size={16}
                                    weight="bold"
                                    className="animate-spin text-muted-foreground"
                                />
                            </div>
                        ) : athletes.length > 0 ? (
                            <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                                {athletes.map((ath, idx) => {
                                    const isSelf = ath.id === currentAthleteId;
                                    return (
                                        <div
                                            key={ath.id || idx}
                                            className={`flex items-center justify-between py-1.5 px-2 rounded-lg border text-sm shadow-sm ${
                                                isSelf
                                                    ? 'bg-primary/5 border-primary/30'
                                                    : 'bg-card border-border/50'
                                            }`}
                                        >
                                            <div className="flex flex-col min-w-0 pr-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-foreground truncate text-panel-sm">
                                                        {ath.name}
                                                    </span>
                                                    {isSelf && (
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/30 rounded-full px-1.5 py-0.5 shrink-0">
                                                            Você
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-panel-sm text-muted-foreground truncate uppercase font-medium">
                                                    {ath.gym}
                                                </span>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                style={getBeltStyle(ath.belt)}
                                                className="text-panel-sm shadow-none uppercase font-bold whitespace-nowrap px-1.5 py-0 border-border/50"
                                            >
                                                {ath.belt}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-3 text-center text-panel-sm text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border/50">
                                Nenhum atleta confirmado.
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
