import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { ArrowRightIcon, ShoppingBagIcon, CircleNotchIcon, CheckIcon, CaretDownIcon, CaretUpIcon, UsersIcon, InfoIcon, GiftIcon } from '@phosphor-icons/react';
import { getBeltStyle } from '@/lib/belt-theme';
import { formatFullCategoryName } from '@/lib/category-utils';
import { getCategoryEnrolledAthletes } from '@/app/(panel)/actions/event-categories';

interface CategoryResult {
    id: string;
    categoria_completa: string;
    faixa: string;
    peso?: string; // Mantido para compatibilidade
    categoria_peso?: string;
    peso_min_kg?: number | null;
    peso_max_kg?: number | null;
    registration_fee: number;
    description?: string | null;
    promo_type?: string | null;
    registered_count?: number;
    preview_athletes?: string[];
    match?: {
        eligible: boolean;
        reasons: { belt: boolean; age: boolean; weight: boolean; sex: boolean };
    };
}

interface CategoryCardProps {
    eventId?: string;
    category: CategoryResult;
    onClick?: () => void;
    onAddToCart?: () => Promise<void>;
    showMatchDetails?: boolean;
    isWhiteBelt?: boolean;
    isInCart?: boolean;
}

export function CategoryCard({ eventId, category, onClick, onAddToCart, showMatchDetails = false, isWhiteBelt = false, isInCart = false }: CategoryCardProps) {
    const [adding, setAdding] = useState(false);
    const [added, setAdded] = useState(false);

    // Reset local "added" state when the item is removed from cart externally
    React.useEffect(() => {
        if (!isInCart) setAdded(false);
    }, [isInCart]);

    // Accordion state
    const [isExpanded, setIsExpanded] = useState(false);
    const [athletes, setAthletes] = useState<any[]>([]);
    const [loadingAthletes, setLoadingAthletes] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const formattedTitle = formatFullCategoryName(category);

    const isActuallyInCart = isInCart || added;

    const displayCount = category.registered_count;
    const displayPreviews = category.preview_athletes;

    const handleToggleExpand = async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!isExpanded && !hasLoaded && eventId) {
            setLoadingAthletes(true);
            try {
                const data = await getCategoryEnrolledAthletes(eventId, category.id);
                setAthletes(data);
                setHasLoaded(true);
            } catch (err) {
                console.error("Falha ao buscar atletas", err);
            } finally {
                setLoadingAthletes(false);
            }
        }

        setIsExpanded(!isExpanded);
    };

    return (
        <div
            onClick={onClick}
            className={`group flex flex-col p-4 rounded-3xl border ${isActuallyInCart ? 'border-green-500 bg-green-50/30 dark:bg-green-500/10' : 'border-border bg-card hover:shadow-md hover:border-primary/20'} shadow-sm transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.99] outline-none overflow-hidden`}
        >
            <div className="flex flex-col gap-3">
                {/* Topo: Título */}
                <div className="space-y-1">
                    <h3 className={`text-panel-sm font-semibold leading-snug line-clamp-2 transition-colors ${isWhiteBelt ? 'text-brand-950 group-hover:text-brand-800' : 'text-foreground group-hover:text-primary'}`}>
                        {formattedTitle}
                    </h3>
                </div>

                {/* Chips/Badges */}
                <div className="flex flex-wrap items-center gap-2 border-b border-border/30 pb-3">
                    <Badge
                        variant="outline"
                        style={getBeltStyle(category.faixa)}
                        className="text-panel-sm px-3 py-1 uppercase tracking-wider flex items-center shadow-sm rounded-full border-border/50"
                    >
                        {category.faixa}
                    </Badge>
                </div>

                {/* Promo: inscrição grátis na categoria regular */}
                {category.promo_type === 'free_second_registration' && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-emerald-800">
                        <GiftIcon size={16} weight="duotone" className="shrink-0 text-emerald-500" />
                        <p className="text-panel-sm font-semibold leading-relaxed">
                            Ao se inscrever nesta categoria, você ganha gratuitamente sua categoria regular correspondente.
                        </p>
                    </div>
                )}

                {/* Descrição / Observação do organizador */}
                {category.description && (
                    <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-amber-800">
                        <InfoIcon size={16} weight="duotone" className="mt-0.5 shrink-0 text-amber-500" />
                        <p className="text-panel-sm leading-relaxed">{category.description}</p>
                    </div>
                )}

                {/* Rodapé: Preço e Ação */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-auto pt-2 gap-2">
                    <div className="flex items-center gap-2">
                        <span className="text-panel-sm font-semibold text-foreground">
                            Valor da inscrição
                        </span>
                        <span className={`text-panel-md font-bold tabular-nums ${isWhiteBelt ? 'text-brand-950' : 'text-primary'}`}>
                            R$ {category.registration_fee}
                        </span>
                    </div>

                    {onAddToCart && (
                        <button
                            type="button"
                            className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-panel-sm font-bold transition-all w-full sm:w-auto ${isActuallyInCart
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 opacity-100 cursor-default'
                                : isWhiteBelt
                                    ? 'bg-brand-950 text-white hover:bg-brand-800'
                                    : 'bg-primary text-primary-foreground hover:opacity-90'
                                }`}
                            disabled={adding || isActuallyInCart}
                            onClick={async (e) => {
                                e.stopPropagation();
                                if (isActuallyInCart) return;
                                setAdding(true);
                                try {
                                    await onAddToCart();
                                    setAdded(true);
                                } catch {
                                    // error handled by parent
                                } finally {
                                    setAdding(false);
                                }
                            }}
                        >
                            {adding ? (
                                <CircleNotchIcon size={14} weight="bold" className="animate-spin" />
                            ) : isActuallyInCart ? (
                                <CheckIcon size={14} weight="duotone" />
                            ) : (
                                <ShoppingBagIcon size={14} weight="duotone" />
                            )}
                            {isActuallyInCart ? 'Na sacola' : 'Inscrever'}
                        </button>
                    )}
                </div>

                {/* Athletes Preview Footer */}
                {typeof displayCount === 'number' && displayCount > 0 && (
                    <div className="mt-1 flex flex-col pt-2 border-t border-dashed border-border/60">
                        {/* Compact view (preview) */}
                        {!isExpanded ? (
                            <button
                                type="button"
                                onClick={handleToggleExpand}
                                className="w-full group/preview flex items-center justify-between p-3 rounded-xl border border-primary/10 bg-primary/5 hover:bg-primary/10 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {/* Facepile */}
                                    {displayPreviews && displayPreviews.length > 0 && (
                                        <div className="flex -space-x-2 overflow-hidden">
                                            {displayPreviews.map((name, index) => (
                                                <div
                                                    key={index}
                                                    title={name}
                                                    className="inline-flex h-7 w-7 rounded-full ring-2 ring-background bg-primary/20 text-primary items-center justify-center text-panel-sm font-bold shrink-0"
                                                >
                                                    {name.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                </div>
                                            ))}
                                            {displayCount! > displayPreviews.length && (
                                                <div className="inline-flex h-7 w-7 rounded-full ring-2 ring-background bg-muted text-muted-foreground items-center justify-center text-panel-sm font-bold shrink-0">
                                                    +{displayCount! - displayPreviews.length}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <span className="text-panel-sm font-semibold text-foreground/80 whitespace-nowrap">
                                        {displayCount! > (displayPreviews?.length || 0)
                                            ? `mais ${displayCount! - (displayPreviews?.length || 0)} inscrições`
                                            : `${displayCount} ${displayCount === 1 ? 'inscrição' : 'inscrições'}`}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 opacity-80 group-hover/preview:opacity-100 transition-opacity ml-2">
                                    <span className="text-panel-sm font-bold text-primary uppercase tracking-wider hidden sm:inline-flex">
                                        Ver
                                    </span>
                                    <CaretDownIcon size={16} weight="duotone" className="text-primary group-hover/preview:translate-y-0.5 transition-transform shrink-0" />
                                </div>
                            </button>
                        ) : (
                            /* Expanded View Header */
                            <button
                                type="button"
                                onClick={handleToggleExpand}
                                className="w-full flex justify-between items-center py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary/15 transition-colors mb-2"
                            >
                                <span className="text-panel-sm font-bold text-primary flex items-center gap-1.5 uppercase tracking-wide">
                                    <UsersIcon size={14} weight="duotone" />
                                    {displayCount} {displayCount === 1 ? 'Inscrito' : 'Inscritos'}
                                </span>
                                <CaretUpIcon size={16} weight="duotone" className="text-primary" />
                            </button>
                        )}

                        {/* Expanded Athletes List */}
                        {isExpanded && (
                            <div
                                className="animate-in slide-in-from-top-1 fade-in duration-200"
                                onClick={(e) => e.stopPropagation()} // Prevent clicking the list from adding to cart
                            >
                                {loadingAthletes ? (
                                    <div className="flex items-center justify-center p-4 bg-muted/20 rounded-xl">
                                        <CircleNotchIcon size={16} weight="bold" className="animate-spin text-muted-foreground" />
                                    </div>
                                ) : athletes.length > 0 ? (
                                    <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                                        {athletes.map((athlete, idx) => (
                                            <div key={athlete.id || idx} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-card border border-border/50 text-sm shadow-sm group/item">
                                                <div className="flex flex-col min-w-0 pr-2">
                                                    <span className="font-semibold text-foreground truncate text-panel-sm">{athlete.name}</span>
                                                    <span className="text-panel-sm text-muted-foreground truncate uppercase font-medium">{athlete.gym}</span>
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    style={getBeltStyle(athlete.belt)}
                                                    className="text-panel-sm shadow-none uppercase font-bold whitespace-nowrap px-1.5 py-0 border-border/50"
                                                >
                                                    {athlete.belt}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-3 text-center text-panel-sm text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border/50">
                                        Nenhum atleta confirmado.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
