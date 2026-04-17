'use client';

import React, { useMemo, useState } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, XIcon, CheckIcon } from '@phosphor-icons/react';
import { CategoryCard } from './CategoryCard';
import { addToAthleteCartAction } from '../../athlete-cart-actions';
import { useAthleteCart } from '@/hooks/use-athlete-cart';
import { toast } from 'sonner';
import { showToast } from '@/lib/toast';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const BELT_DOT: Record<string, string> = {
    'branca':           'bg-white border border-gray-300',
    'cinza':            'bg-gray-400',
    'cinza e branca':   'bg-gray-300 border border-gray-400',
    'cinza e preta':    'bg-gray-500',
    'amarela':          'bg-yellow-400',
    'amarela e branca': 'bg-yellow-200 border border-yellow-400',
    'amarela e preta':  'bg-yellow-500',
    'laranja':          'bg-orange-400',
    'laranja e branca': 'bg-orange-200 border border-orange-400',
    'laranja e preta':  'bg-orange-500',
    'verde':            'bg-green-500',
    'verde e branca':   'bg-green-300 border border-green-400',
    'verde e preta':    'bg-green-600',
    'azul':             'bg-blue-500',
    'roxa':             'bg-purple-600',
    'marrom':           'bg-amber-800',
    'preta':            'bg-gray-900',
};

function BeltDot({ belt }: { belt: string }) {
    const cls = BELT_DOT[belt.toLowerCase().trim()] ?? 'bg-muted border border-border';
    return <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${cls}`} />;
}

const COMBINED_BELT_LABELS: Record<string, string> = {
    'cinza amarela':         'Cinza e Amarela',
    'laranja verde':         'Laranja e Verde',
    'cinza amarela laranja': 'Cinza, Amarela e Laranja',
};

function formatBeltLabel(belt: string): string {
    const key = belt.toLowerCase().trim();
    return COMBINED_BELT_LABELS[key] ?? belt.charAt(0).toUpperCase() + belt.slice(1).toLowerCase();
}

interface Category {
    id: string;
    categoria_completa: string;
    faixa: string;
    divisao_idade?: string | null;
    sexo?: string | null;
    peso_min_kg?: number | null;
    peso_max_kg?: number | null;
    registration_fee: number;
    description?: string | null;
    promo_type?: string | null;
    registered_count?: number;
    preview_athletes?: string[];
    [key: string]: any;
}

interface CategorySearchPanelProps {
    eventId: string;
    categories: Category[];
    isWhiteBelt?: boolean;
    athleteAge?: number | null;
    athleteSex?: string | null;
    onAddToCart?: (categoryId: string) => Promise<void>;
    cartCategoryIds?: Set<string>;
    disableAutoFilter?: boolean;
    addToCartLabel?: string;
    inCartLabel?: string;
    defaultQuery?: string;
    requireFilter?: boolean;
}

function normalize(text: string) {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function buildSearchableText(c: Category): string {
    const parts = [c.categoria_completa ?? '', c.faixa ?? '', c.divisao_idade ?? ''];
    if (c.peso_min_kg != null) parts.push(`${c.peso_min_kg}`, `${c.peso_min_kg}kg`);
    if (c.peso_max_kg != null && c.peso_max_kg < 150) parts.push(`${c.peso_max_kg}`, `${c.peso_max_kg}kg`);
    if (c.peso_min_kg != null && c.peso_max_kg != null) parts.push(`${c.peso_min_kg}-${c.peso_max_kg}`);
    return normalize(parts.join(' '));
}

function matchesQuery(c: Category, query: string): boolean {
    if (!query) return true;
    const haystack = buildSearchableText(c);
    return normalize(query).split(/\s+/).filter(Boolean).every(t => haystack.includes(t));
}

export function CategorySearchPanel({ eventId, categories, isWhiteBelt = false, athleteAge, athleteSex, onAddToCart: onAddToCartProp, cartCategoryIds: cartCategoryIdsProp, disableAutoFilter = false, addToCartLabel, inCartLabel, defaultQuery: defaultQueryProp = '', requireFilter = false }: CategorySearchPanelProps) {
    const canSeeAbsoluto = athleteAge == null || athleteAge >= 15;

    const [query, setQuery] = useState(defaultQueryProp);
    const [selectedSexo, setSelectedSexo] = useState('');
    const [selectedUniformes, setSelectedUniformes] = useState<string[]>([]);
    const [selectedDivisao, setSelectedDivisao] = useState('');
    const [selectedFaixa, setSelectedFaixa] = useState('');
    const [onlyAbsoluto, setOnlyAbsoluto] = useState(false);

    const [initialized, setInitialized] = useState(false);
    React.useEffect(() => {
        if (!initialized && categories.length > 0) {
            if (canSeeAbsoluto && athleteSex) setSelectedSexo(athleteSex);
            if (!disableAutoFilter && canSeeAbsoluto) {
                const has = categories.some(c => normalize(c.categoria_completa).includes('absoluto'));
                setOnlyAbsoluto(has);
            }
            setInitialized(true);
        }
    }, [categories, initialized, canSeeAbsoluto, athleteSex, disableAutoFilter]);

    const cartItems = useAthleteCart(state => state.items);

    const divisoes = useMemo(() => {
        const set = new Set<string>();
        categories.forEach(c => { if (c.divisao_idade) set.add(c.divisao_idade); });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [categories]);

    const faixas = useMemo(() => {
        const set = new Set<string>();
        categories.forEach(c => { if (c.faixa) set.add(c.faixa); });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [categories]);

    const hasNoGi = useMemo(() =>
        categories.some(c => normalize(c.categoria_completa).includes('no-gi') || normalize(c.categoria_completa).includes('sem kimono')),
        [categories]);

    const hasAbsoluto = useMemo(() =>
        categories.some(c => normalize(c.categoria_completa).includes('absoluto')),
        [categories]);


    const filtered = useMemo(() => {
        const hasAnyFilter = onlyAbsoluto || !!query || !!selectedDivisao || !!selectedFaixa || !!selectedSexo || selectedUniformes.length > 0;
        if (!canSeeAbsoluto && !hasAnyFilter) return [];

        return categories.filter(c => {
            if (onlyAbsoluto && !normalize(c.categoria_completa).includes('absoluto')) return false;
            if (!matchesQuery(c, query)) return false;
            if (selectedDivisao && c.divisao_idade !== selectedDivisao) return false;
            if (selectedFaixa && c.faixa !== selectedFaixa) return false;
            if (selectedSexo && c.sexo && normalize(c.sexo) !== normalize(selectedSexo)) return false;
            if (selectedUniformes.length > 0 && selectedUniformes.length < 2) {
                const nome = normalize(c.categoria_completa);
                const isNoGi = nome.includes('no-gi') || nome.includes('sem kimono');
                if (selectedUniformes.includes('kimono') && isNoGi) return false;
                if (selectedUniformes.includes('no-gi') && !isNoGi) return false;
            }
            return true;
        });
    }, [categories, query, selectedDivisao, selectedFaixa, selectedSexo, selectedUniformes, onlyAbsoluto, canSeeAbsoluto]);

    const defaultSexo = canSeeAbsoluto && athleteSex ? athleteSex : '';
    const defaultOnlyAbsoluto = !disableAutoFilter && canSeeAbsoluto ? hasAbsoluto : false;
    const hasActiveFilters =
        query !== defaultQueryProp || !!selectedDivisao || !!selectedFaixa || selectedUniformes.length > 0 ||
        selectedSexo !== defaultSexo || onlyAbsoluto !== defaultOnlyAbsoluto;

    const hasAnyInput = !!query || !!selectedDivisao || !!selectedFaixa || selectedUniformes.length > 0 || !!selectedSexo || onlyAbsoluto;

    function clearFilters() {
        setQuery(defaultQueryProp);
        setSelectedDivisao('');
        setSelectedFaixa('');
        setSelectedSexo(defaultSexo);
        setSelectedUniformes([]);
        setOnlyAbsoluto(defaultOnlyAbsoluto);
    }

    const PILL_BASE = 'px-3 py-1.5 rounded-full text-panel-sm font-semibold border transition-all';
    const PILL_IDLE = 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground';
    const PILL_ON   = 'bg-primary text-primary-foreground border-primary';

    return (
        <div className="space-y-4">

            {/* Busca */}
            <div className="relative">
                <MagnifyingGlassIcon size={18} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar por nome, divisão, faixa, peso..."
                    className="w-full pl-11 pr-10 py-3 rounded-2xl border border-border bg-background text-panel-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                {query && (
                    <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1">
                        <XIcon size={15} weight="bold" />
                    </button>
                )}
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                    <FunnelIcon size={14} weight="duotone" />
                    <span className="text-panel-sm font-medium">Filtros:</span>
                </div>

                {/* Absoluto */}
                {hasAbsoluto && (
                    <button onClick={() => setOnlyAbsoluto(!onlyAbsoluto)} className={`${PILL_BASE} ${onlyAbsoluto ? PILL_ON : PILL_IDLE}`}>
                        Absoluto
                    </button>
                )}

                {/* Sexo */}
                <div className="flex gap-1">
                    {['Masculino', 'Feminino'].map(s => (
                        <button key={s} onClick={() => setSelectedSexo(selectedSexo === s ? '' : s)} className={`${PILL_BASE} ${selectedSexo === s ? PILL_ON : PILL_IDLE}`}>
                            {s}
                        </button>
                    ))}
                </div>

                {/* Uniforme */}
                {hasNoGi && (
                    <div className="flex gap-1">
                        {[{ value: 'kimono', label: 'Kimono' }, { value: 'no-gi', label: 'No-Gi' }].map(u => (
                            <button
                                key={u.value}
                                onClick={() => {
                                    setSelectedUniformes(prev =>
                                        prev.includes(u.value) ? prev.filter(x => x !== u.value) : [...prev, u.value]
                                    );
                                    setOnlyAbsoluto(false);
                                }}
                                className={`${PILL_BASE} ${selectedUniformes.includes(u.value) ? PILL_ON : PILL_IDLE}`}
                            >
                                {u.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Divisão */}
                <Select value={selectedDivisao} onValueChange={v => { setSelectedDivisao(v === '__all__' ? '' : v); if (v !== '__all__') setOnlyAbsoluto(false); }}>
                    <SelectTrigger className={`h-auto px-3 py-1.5 rounded-full text-panel-sm font-semibold border transition-all bg-background shadow-none focus:ring-2 focus:ring-primary/30 gap-1.5 w-auto ${selectedDivisao ? 'border-primary text-foreground' : 'border-border text-muted-foreground'}`}>
                        <SelectValue placeholder="Divisão" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border shadow-lg">
                        <SelectItem value="__all__" className="text-panel-sm font-medium text-muted-foreground">Todas as divisões</SelectItem>
                        {divisoes.map(d => <SelectItem key={d} value={d} className="text-panel-sm font-semibold">{d}</SelectItem>)}
                    </SelectContent>
                </Select>

                {/* Faixa */}
                <Select value={selectedFaixa} onValueChange={v => { setSelectedFaixa(v === '__all__' ? '' : v); if (v !== '__all__') setOnlyAbsoluto(false); }}>
                    <SelectTrigger className={`h-auto px-3 py-1.5 rounded-full text-panel-sm font-semibold border transition-all bg-background shadow-none focus:ring-2 focus:ring-primary/30 gap-1.5 w-auto ${selectedFaixa ? 'border-primary text-foreground' : 'border-border text-muted-foreground'}`}>
                        <SelectValue placeholder="Faixa">
                            {selectedFaixa && (
                                <span className="flex items-center gap-1.5">
                                    <BeltDot belt={selectedFaixa} />
                                    <span>{formatBeltLabel(selectedFaixa)}</span>
                                </span>
                            )}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border shadow-lg">
                        <SelectItem value="__all__" className="text-panel-sm font-medium text-muted-foreground">Todas as faixas</SelectItem>
                        {faixas.map(f => (
                            <SelectItem key={f} value={f} className="text-panel-sm font-semibold">
                                <span className="flex items-center gap-2">
                                    <BeltDot belt={f} />
                                    <span>{formatBeltLabel(f)}</span>
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Limpar */}
                {hasActiveFilters && (
                    <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-panel-sm font-semibold text-destructive border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-all">
                        <XIcon size={12} weight="bold" />
                        Limpar
                    </button>
                )}
            </div>

            {/* Banner absoluto */}
            {onlyAbsoluto && filtered.length > 0 && (
                <div className="rounded-2xl bg-primary px-4 py-3.5 space-y-0.5">
                    <p className="text-panel-sm font-extrabold text-primary-foreground">Estas são as categorias Absoluto</p>
                    <p className="text-panel-sm font-medium text-primary-foreground/80 leading-relaxed">
                        Para encontrar sua categoria por peso, faixa ou divisão, use a busca ou os filtros acima.
                    </p>
                </div>
            )}

            {/* Resultados */}
            <div className="space-y-3">
                {requireFilter && !hasAnyInput ? (
                    <div className="py-10 bg-muted/20 rounded-3xl border border-dashed border-border flex flex-col items-center gap-4 px-6">
                        <FunnelIcon size={32} weight="duotone" className="text-muted-foreground/30" />
                        <div className="space-y-1 text-center">
                            <p className="text-panel-sm font-semibold text-foreground">Use os filtros para buscar</p>
                            <p className="text-panel-sm text-muted-foreground">Clique em um filtro ou digite no campo acima.</p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2 pointer-events-none select-none opacity-60">
                            {['Absoluto', 'Masculino', 'Feminino', 'Divisão', 'Faixa'].map(label => (
                                <span key={label} className={`${PILL_BASE} ${PILL_IDLE}`}>{label}</span>
                            ))}
                        </div>
                    </div>
                ) : filtered.length === 0 && hasAnyInput ? (
                    <div className="text-center py-16 bg-muted/20 rounded-3xl border border-dashed border-border flex flex-col items-center gap-3 px-6">
                        <MagnifyingGlassIcon size={40} weight="duotone" className="text-muted-foreground/20" />
                        <div className="space-y-1">
                            <p className="text-panel-sm font-semibold text-foreground">Nenhuma categoria encontrada</p>
                            <p className="text-panel-sm text-muted-foreground">Tente outros termos ou remova os filtros.</p>
                        </div>
                        <button onClick={clearFilters} className="mt-1 text-panel-sm font-bold text-primary hover:underline">
                            Limpar filtros
                        </button>
                    </div>
                ) : (
                    filtered.map(cat => {
                        const isInCart = cartCategoryIdsProp
                            ? cartCategoryIdsProp.has(cat.id)
                            : cartItems.some(item => item.categoryId === cat.id && item.eventId === eventId);
                        const handleAddToCart = onAddToCartProp
                            ? async () => { await onAddToCartProp(cat.id); }
                            : async () => {
                                await addToAthleteCartAction({ eventId, categoryId: cat.id });
                                showToast.success('Adicionado à sacola', cat.name);
                                useAthleteCart.getState().fetchCart();
                            };
                        return (
                            <CategoryCard
                                key={cat.id}
                                eventId={eventId}
                                category={cat}
                                showMatchDetails={false}
                                isWhiteBelt={isWhiteBelt}
                                isInCart={isInCart}
                                onAddToCart={handleAddToCart}
                                addToCartLabel={addToCartLabel}
                                inCartLabel={inCartLabel}
                            />
                        );
                    })
                )}
            </div>

        </div>
    );
}
