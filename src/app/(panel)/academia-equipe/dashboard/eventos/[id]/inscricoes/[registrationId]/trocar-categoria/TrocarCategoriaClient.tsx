'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CategorySearchPanel } from '@/app/atleta/dashboard/campeonatos/components/_components/CategorySearchPanel';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    ArrowsClockwiseIcon, CircleNotchIcon, SpinnerGapIcon, CheckCircleIcon,
    ClockCounterClockwiseIcon,
} from '@phosphor-icons/react';
import { changeCategoryAction, getEligibleCategoriesAction } from '../../../../registrations-actions';
import { formatCategoryTitle } from '@/lib/category-utils';
import { toast } from 'sonner';

interface Category {
    id: string;
    categoria_completa: string;
    faixa?: string;
    divisao_idade?: string;
    categoria_peso?: string;
    sexo?: string;
    peso_min_kg?: number;
    peso_max_kg?: number;
    registration_fee?: number;
}

interface HistoryEntry {
    id: string;
    created_at: string;
    old_category: Category | null;
    new_category: Category | null;
    changed_by_name: string | null;
}

interface Props {
    registrationId: string;
    eventId: string;
    athleteId: string;
    currentCategory: Category;
    athleteAge?: number | null;
    history: HistoryEntry[];
}

function catLabel(cat: Category | null) {
    if (!cat) return '—';
    return formatCategoryTitle(cat) || cat.divisao_idade || '—';
}

export default function TrocarCategoriaClient({
    registrationId,
    eventId,
    athleteId,
    currentCategory,
    athleteAge,
    history,
}: Props) {
    const router = useRouter();

    const [categories, setCategories] = useState<any[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [selected, setSelected] = useState<Category | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        getEligibleCategoriesAction(eventId, athleteId)
            .then(data => {
                if ('error' in data && data.error) {
                    toast.error(data.error);
                } else {
                    const cats = (data.all || []).filter((c: any) => c.id !== currentCategory.id);
                    setCategories(cats);
                }
            })
            .catch(() => toast.error('Erro ao carregar categorias.'))
            .finally(() => setLoadingCategories(false));
    }, [eventId, athleteId, currentCategory.id]);

    async function handleConfirm() {
        if (!selected) return;
        setSaving(true);
        const result = await changeCategoryAction(registrationId, selected.id);
        setSaving(false);
        setConfirmOpen(false);

        if ('error' in result && result.error) {
            toast.error(result.error);
            return;
        }

        setShowSuccess(true);
        setTimeout(() => {
            router.push('/academia-equipe/dashboard/trocar-categoria');
        }, 2000);
    }

    return (
        <div className="space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ArrowsClockwiseIcon size={20} weight="duotone" className="text-muted-foreground" />
                    <div>
                        <p className="text-base font-bold">Trocar categoria</p>
                        <p className="text-xs text-muted-foreground">Busque a categoria para a qual deseja fazer a troca</p>
                    </div>
                </div>
                {history.length > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full gap-1.5 text-xs font-semibold shrink-0"
                        onClick={() => setHistoryOpen(true)}
                    >
                        <ClockCounterClockwiseIcon size={14} weight="duotone" />
                        Histórico ({history.length})
                    </Button>
                )}
            </div>

            {loadingCategories ? (
                <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                    <CircleNotchIcon size={36} weight="bold" className="text-primary/20 animate-spin mb-3" />
                    <p className="text-sm text-muted-foreground italic">Carregando categorias...</p>
                </div>
            ) : (
                <CategorySearchPanel
                    eventId={eventId}
                    categories={categories}
                    isWhiteBelt={false}
                    athleteSex={null}
                    athleteAge={null}
                    disableAutoFilter
                    addToCartLabel="Selecionar"
                    inCartLabel="Selecionada"
                    {...(athleteAge != null && athleteAge >= 15
                        ? { defaultQuery: 'absoluto' }
                        : { requireFilter: true }
                    )}
                    onAddToCart={async (categoryId) => {
                        const cat = categories.find((c: any) => c.id === categoryId);
                        if (cat) {
                            setSelected(cat);
                            setConfirmOpen(true);
                        }
                    }}
                    cartCategoryIds={new Set(selected ? [selected.id] : [])}
                />
            )}

            {/* Confirm modal */}
            <Dialog open={confirmOpen} onOpenChange={(open) => { if (!open) { setConfirmOpen(false); setSelected(null); } }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold">Confirmar troca de categoria?</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 p-4 rounded-xl bg-muted/30 border text-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-10">De</span>
                            <span className="font-semibold">{catLabel(currentCategory)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-10">Para</span>
                            <span className="font-bold text-primary">{catLabel(selected)}</span>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" className="rounded-full" onClick={() => { setConfirmOpen(false); setSelected(null); }} disabled={saving}>
                            Cancelar
                        </Button>
                        <Button className="rounded-full bg-brand-800 hover:bg-brand-900 text-white font-bold" disabled={saving} onClick={handleConfirm}>
                            {saving ? <><SpinnerGapIcon size={16} className="mr-2 animate-spin" />Salvando...</> : 'Confirmar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* History modal */}
            <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <ClockCounterClockwiseIcon size={18} weight="duotone" className="text-primary" />
                            Histórico de trocas
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 mt-1">
                        {history.map((entry) => (
                            <div key={entry.id} className="px-4 py-3 rounded-xl border bg-muted/20 space-y-1">
                                <div className="flex items-center gap-2 text-sm flex-wrap">
                                    <span className="text-muted-foreground truncate max-w-[120px]">{catLabel(entry.old_category)}</span>
                                    <ArrowsClockwiseIcon size={14} weight="duotone" className="text-muted-foreground/50 shrink-0" />
                                    <span className="font-bold text-foreground truncate max-w-[120px]">{catLabel(entry.new_category)}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(entry.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                    {entry.changed_by_name && ` · ${entry.changed_by_name}`}
                                </p>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {showSuccess && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                        <CheckCircleIcon size={22} weight="fill" />
                        <span className="text-sm font-semibold">Categoria alterada com sucesso!</span>
                    </div>
                </div>
            )}
        </div>
    );
}
