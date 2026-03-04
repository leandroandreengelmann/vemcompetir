import React from 'react';
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Trophy } from 'lucide-react';
import { getBeltStyle } from '@/lib/belt-theme';
import { formatFullCategoryName } from '@/lib/category-utils';

interface CategoryResult {
    id: string;
    categoria_completa: string;
    faixa: string;
    divisao: string;
    categoria_peso?: string;
    peso?: string;
    peso_min_kg?: number | null;
    peso_max_kg?: number | null;
    registration_fee: number;
    match?: {
        eligible: boolean;
        reasons: { belt: boolean; age: boolean; weight: boolean; sex: boolean };
    };
}

interface CategoryCardProps {
    category: CategoryResult;
    onClick?: () => void;
    isSelected?: boolean;
    isWhiteBelt?: boolean;
}

export function RegistrationCategoryCard({ category, onClick, isSelected = false, isWhiteBelt = false }: CategoryCardProps) {
    const formattedTitle = formatFullCategoryName(category);

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && onClick) {
                    e.preventDefault();
                    onClick();
                }
            }}
            className={`
                group relative flex flex-col p-4 rounded-3xl border shadow-sm transition-all cursor-pointer 
                outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.99]
                ${isSelected
                    ? 'border-primary ring-2 ring-primary ring-offset-2 bg-primary/5'
                    : 'border-border bg-card hover:shadow-md hover:border-primary/20'
                }
            `}
        >
            <div className="flex flex-col gap-3">
                {/* Title */}
                <div className="space-y-1">
                    <h3 className={`text-ui font-semibold leading-snug line-clamp-2 transition-colors ${isWhiteBelt && !isSelected ? 'text-brand-950 group-hover:text-brand-800' : 'text-foreground group-hover:text-primary'}`}>
                        {formattedTitle}
                    </h3>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                    <Badge
                        variant="outline"
                        style={getBeltStyle(category.faixa)}
                        className="text-label px-4 py-2 font-bold uppercase tracking-wider h-8 flex items-center border-none shadow-none rounded-md"
                    >
                        {category.faixa}
                    </Badge>
                </div>

                {/* Footer: Price and Action */}
                <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="flex items-center gap-2">
                        <span className="text-caption font-medium text-muted-foreground whitespace-nowrap">
                            Inscrição
                        </span>
                        <span className={`text-h3 font-bold tabular-nums ${isWhiteBelt && !isSelected ? 'text-brand-950' : 'text-primary'}`}>
                            R$ {category.registration_fee}
                        </span>
                    </div>

                    <div className={`flex items-center gap-2 transition-colors ${isSelected ? 'text-primary' : (isWhiteBelt ? 'text-brand-950' : 'text-primary')}`}>
                        <ArrowRight className={`h-5 w-5 ${isSelected ? 'animate-pulse' : ''}`} />
                    </div>
                </div>
            </div>
        </div>
    );
}
