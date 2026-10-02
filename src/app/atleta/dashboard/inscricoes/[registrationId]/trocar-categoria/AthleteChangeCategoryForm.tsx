'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CategorySearchPanel } from '@/app/atleta/dashboard/campeonatos/components/_components/CategorySearchPanel';
import { AthletePageHeader } from '@/app/atleta/dashboard/components/athlete-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    ArrowsClockwiseIcon, SpinnerGapIcon, CheckCircleIcon,
    ClockCounterClockwiseIcon,
} from '@phosphor-icons/react';
import { athleteChangeCategoryAction } from '../../athlete-category-actions';
import { formatFullCategoryName, formatCategoryTitle } from '@/lib/category-utils';
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
    eventTitle: string;
    athleteName: string;
    beltColor: string;
    athleteAge?: number | null;
    currentCategory: Category;
    allCategories: Category[];
    deadlineDate: string;
    history: HistoryEntry[];
}

function catLabel(cat: Category | null) {
    if (!cat) return '—';
    return formatCategoryTitle(cat) || cat.divisao_idade || '—';
}

export default function AthleteChangeCategoryForm({
    registrationId,
    eventId,
    eventTitle,
    athleteName,
    beltColor,
    athleteAge,
    currentCategory,
    allCategories,
    deadlineDate,
    history,
}: Props) {
    const router = useRouter();

    const [selected, setSelected] = useState<Category | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const otherCategories = allCategories.filter(c => c.id !== currentCategory.id);

    async function handleConfirm() {
        if (!selected) return;
        setSaving(true);
        const result = await athleteChangeCategoryAction(registrationId, selected.id);
        setSaving(false);
        setConfirmOpen(false);

        if ('error' in result && result.error) {
            toast.error(result.error);
            return;
        }

        setShowSuccess(true);
        setTimeout(() => {
            router.push('/atleta/dashboard/inscricoes');
        }, 2000);
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] p-4 md:p-8 pb-8">
            <div className="max-w-2xl mx-auto flex flex-col gap-6">

                <AthletePageHeader
                    title="Trocar Categoria"
                    description={eventTitle}
                    backHref="/atleta/dashboard/inscricoes"
                    beltColor={beltColor}
                />

                {/* Athlete info + deadline */}
                <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent p-5">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="space-y-3 relative">
                        <span className="text-panel-sm font-semibold uppercase tracking-widest text-primary/70">Atleta</span>
                        <p className="text-panel-md font-black text-foreground">{athleteName}</p>
                        <div className="flex items-center justify-between pt-1 border-t border-primary/10">
                            <span className="text-panel-sm text-muted-foreground font-medium">Prazo para troca</span>
                            <Badge variant="outline" className="font-semibold border-primary/20 text-primary bg-primary/5">
                                {deadlineDate}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Current category */}
                <div>
                    <p className="text-panel-sm font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Categoria atual</p>
                    <div className="flex items-center gap-3 px-4 py-3.5 bg-primary/5 border-2 border-primary rounded-2xl">
                        <p className="text-ui font-black text-foreground flex-1 leading-snug">
                            {formatFullCategoryName(currentCategory)}
                        </p>
                        <Badge className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/20 shrink-0">
                            Atual
                        </Badge>
                    </div>
                </div>

                {/* Search header + history button */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ArrowsClockwiseIcon size={20} weight="duotone" className="text-muted-foreground" />
                        <div>
                            <p className="text-panel-md font-bold">Trocar categoria</p>
                            <p className="text-panel-sm text-muted-foreground">Busque a categoria para a qual deseja fazer a troca</p>
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

                {/* Category search */}
                <CategorySearchPanel
                    eventId={eventId}
                    categories={otherCategories as any}
                    isWhiteBelt={false}
                    athleteSex={null}
                    athleteAge={null}
                    disableAutoFilter
                    addToCartLabel="Selecionar"
                    inCartLabel="Selecionada"
                    allowComboChoice={false}
                    {...(athleteAge != null && athleteAge >= 15
                        ? { defaultQuery: 'absoluto' }
                        : { requireFilter: true }
                    )}
                    onAddToCart={async (categoryId) => {
                        const cat = otherCategories.find(c => c.id === categoryId);
                        if (cat) {
                            setSelected(cat);
                            setConfirmOpen(true);
                        }
                    }}
                    cartCategoryIds={new Set(selected ? [selected.id] : [])}
                />

            </div>

            {/* Confirm modal */}
            <Dialog open={confirmOpen} onOpenChange={(open) => { if (!open) { setConfirmOpen(false); setSelected(null); } }}>
                <DialogContent className="max-w-sm mx-4">
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
                        <Button className="rounded-full bg-brand-950 hover:bg-brand-900 text-white font-bold" disabled={saving} onClick={handleConfirm}>
                            {saving ? <><SpinnerGapIcon size={16} weight="bold" className="mr-2 animate-spin" />Salvando...</> : 'Confirmar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* History modal */}
            <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                <DialogContent className="max-w-sm mx-4">
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
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 w-[calc(100%-2rem)] max-w-sm">
                    <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                        <CheckCircleIcon size={22} weight="fill" className="shrink-0" />
                        <span className="text-panel-sm font-bold">Categoria alterada com sucesso!</span>
                    </div>
                </div>
            )}
        </div>
    );
}
