'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AthletePageHeader } from '@/app/atleta/dashboard/components/athlete-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    ArrowsClockwiseIcon, SpinnerGapIcon, CheckIcon,
    MedalIcon, UsersIcon,
    ClockCounterClockwiseIcon, ArrowBendUpLeftIcon, CheckCircleIcon,
} from '@phosphor-icons/react';
import { athleteChangeCategoryAction } from '../../athlete-category-actions';
import { cn } from '@/lib/utils';
import { formatFullCategoryName, formatCategoryTitle } from '@/lib/category-utils';

interface Athlete {
    full_name: string;
    belt_color?: string;
}

interface Category {
    id: string;
    categoria_completa: string;
    faixa?: string;
    divisao_idade?: string;
    categoria_peso?: string;
    sexo?: string;
    peso_min_kg?: number;
    peso_max_kg?: number;
}

interface HistoryEntry {
    id: string;
    created_at: string;
    old_category_id: string;
    new_category_id: string;
    old_category: Category | null;
    new_category: Category | null;
    changed_by_name: string | null;
}

interface Props {
    registrationId: string;
    eventTitle: string;
    athleteName: string;
    beltColor: string;
    currentCategory: Category;
    weightNeighbors: Category[];
    beltUpgrades: Category[];
    deadlineDate: string;
    athletesByCategory: Record<string, Athlete[]>;
    history: HistoryEntry[];
}

function BeltBadge({ belt }: { belt?: string }) {
    if (!belt) return null;
    const lower = belt.toLowerCase();
    let cls = 'bg-muted text-muted-foreground border-border';
    if (lower.includes('branca')) cls = 'bg-white text-slate-800 border-slate-200';
    else if (lower.includes('azul')) cls = 'bg-blue-500 text-white border-blue-600';
    else if (lower.includes('roxa')) cls = 'bg-purple-500 text-white border-purple-600';
    else if (lower.includes('marrom')) cls = 'bg-amber-800 text-white border-amber-900';
    else if (lower.includes('preta')) cls = 'bg-slate-900 text-white border-slate-950';
    else if (lower.includes('colorida')) cls = 'bg-gradient-to-r from-green-500 via-yellow-500 to-blue-500 text-white border-none';
    else if (lower.includes('cinza')) cls = 'bg-gray-400 text-white border-gray-500';
    else if (lower.includes('amarela')) cls = 'bg-yellow-400 text-yellow-950 border-yellow-500';
    else if (lower.includes('laranja')) cls = 'bg-orange-500 text-white border-orange-600';
    else if (lower.includes('verde')) cls = 'bg-green-600 text-white border-green-700';
    return (
        <Badge variant="outline" className={cn('text-panel-sm font-bold uppercase tracking-wider px-2 py-0.5', cls)}>
            {belt}
        </Badge>
    );
}

function catLabel(cat: Category | null) {
    if (!cat) return '—';
    return formatCategoryTitle(cat) || cat.divisao_idade || '—';
}

export default function AthleteChangeCategoryForm({
    registrationId,
    eventTitle,
    athleteName,
    beltColor,
    currentCategory,
    weightNeighbors,
    beltUpgrades,
    deadlineDate,
    athletesByCategory,
    history,
}: Props) {
    const router = useRouter();

    const [selected, setSelected] = useState<Category | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [modalAthletesCat, setModalAthletesCat] = useState<Category | null>(null);
    const [confirmPayload, setConfirmPayload] = useState<{ from: Category; to: Category; revert?: boolean } | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showAllWeights, setShowAllWeights] = useState(false);
    const [showAllBelts, setShowAllBelts] = useState(false);

    async function executeChange(targetCategoryId: string) {
        setLoading(true);
        setError(null);
        const result = await athleteChangeCategoryAction(registrationId, targetCategoryId);
        setLoading(false);
        setConfirmPayload(null);

        if ('error' in result && result.error) {
            setError(result.error);
            return;
        }

        setSelected(null);
        setShowSuccess(true);
        setTimeout(() => {
            setShowSuccess(false);
            router.push('/atleta/dashboard/inscricoes');
        }, 2000);
    }

    const hasOptions = weightNeighbors.length > 0 || beltUpgrades.length > 0;
    const modalAthletes = modalAthletesCat ? (athletesByCategory[modalAthletesCat.id] || []) : [];

    function CategoryCard({ cat }: { cat: Category }) {
        const isSelected = selected?.id === cat.id;
        const count = (athletesByCategory[cat.id] || []).length;

        return (
            <div
                className={cn(
                    'flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all duration-150 cursor-pointer active:scale-[0.98]',
                    isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
                        : 'border-border bg-white active:bg-muted/20'
                )}
                onClick={() => setSelected(isSelected ? null : cat)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelected(isSelected ? null : cat)}
            >
                <div className="flex-1 min-w-0">
                    <p className={cn('text-ui font-semibold leading-snug transition-colors', isSelected ? 'text-primary' : 'text-foreground')}>
                        {formatFullCategoryName(cat)}
                    </p>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <BeltBadge belt={cat.faixa} />
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setModalAthletesCat(cat); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-full border border-border bg-background text-panel-sm font-semibold text-muted-foreground active:border-primary active:text-primary active:bg-primary/5 transition-all duration-150"
                        >
                            <UsersIcon size={20} weight="duotone" />
                            {count} atleta{count !== 1 ? 's' : ''}
                        </button>
                    </div>
                </div>
                <div className={cn(
                    'h-6 w-6 rounded-full border-2 transition-all duration-150 flex items-center justify-center shrink-0',
                    isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                )}>
                    {isSelected && <CheckIcon size={12} weight="bold" className="text-white" />}
                </div>
            </div>
        );
    }

    const medalColor = beltColor.toLowerCase().includes('branca') ? 'text-slate-900' : 'text-primary';

    function SectionHeader({ label, showMedal }: { label: string; showMedal?: boolean }) {
        return (
            <div className="flex items-center gap-2 mb-2">
                {showMedal && <MedalIcon size={28} weight="duotone" className={medalColor} />}
                <span className="text-panel-sm font-bold uppercase tracking-wider text-muted-foreground/70">{label}</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] p-4 md:p-8 pb-28 sm:pb-8">
            <div className="max-w-2xl mx-auto flex flex-col gap-6">

                <AthletePageHeader
                    title="Trocar Categoria"
                    description={eventTitle}
                    backHref="/atleta/dashboard/inscricoes"
                    beltColor={beltColor}
                />

                {/* Athlete info card */}
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
                        <div className="flex-1 min-w-0">
                            <p className="text-ui font-black text-foreground leading-snug">{formatFullCategoryName(currentCategory)}</p>
                            <button
                                type="button"
                                onClick={() => setModalAthletesCat(currentCategory)}
                                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-full border border-primary/30 bg-white text-panel-sm font-semibold text-muted-foreground active:border-primary active:text-primary active:bg-primary/5 transition-all duration-150"
                            >
                                <UsersIcon size={20} weight="duotone" />
                                {(athletesByCategory[currentCategory.id] || []).length} atleta{(athletesByCategory[currentCategory.id] || []).length !== 1 ? 's' : ''}
                            </button>
                        </div>
                        <Badge className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/20 shrink-0">
                            Atual
                        </Badge>
                    </div>
                </div>

                {/* Options */}
                {!hasOptions ? (
                    <p className="text-ui text-muted-foreground text-center py-8">
                        Não há categorias disponíveis para troca neste evento.
                    </p>
                ) : (
                    <div className="space-y-5">
                        <p className="text-panel-md font-bold -mb-1">Selecione a nova categoria</p>

                        {/* Weight neighbors */}
                        {weightNeighbors.length > 0 && (
                            <div>
                                <SectionHeader label="Peso diferente" />
                                <div className="space-y-2">
                                    {(showAllWeights ? weightNeighbors : weightNeighbors.slice(0, 2)).map((cat) => (
                                        <CategoryCard key={cat.id} cat={cat} />
                                    ))}
                                    {!showAllWeights && weightNeighbors.length > 2 && (
                                        <div className="relative overflow-hidden" style={{ maxHeight: 52 }}>
                                            <CategoryCard cat={weightNeighbors[2]} />
                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#FAFAFA] pointer-events-none" />
                                        </div>
                                    )}
                                </div>
                                {weightNeighbors.length > 2 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowAllWeights((v) => !v)}
                                        className="mt-2 w-full text-center text-panel-sm font-bold text-primary py-2 rounded-xl border border-primary/20 bg-primary/5 active:bg-primary/10 transition-colors"
                                    >
                                        {showAllWeights ? 'Mostrar menos' : `Mostrar todas (${weightNeighbors.length})`}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Belt upgrade */}
                        {beltUpgrades.length > 0 && (
                            <div>
                                <SectionHeader label="Subir faixa" showMedal />
                                <div className="space-y-2">
                                    {(showAllBelts ? beltUpgrades : beltUpgrades.slice(0, 2)).map((cat) => (
                                        <CategoryCard key={cat.id} cat={cat} />
                                    ))}
                                    {!showAllBelts && beltUpgrades.length > 2 && (
                                        <div className="relative overflow-hidden" style={{ maxHeight: 52 }}>
                                            <CategoryCard cat={beltUpgrades[2]} />
                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#FAFAFA] pointer-events-none" />
                                        </div>
                                    )}
                                </div>
                                {beltUpgrades.length > 2 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowAllBelts((v) => !v)}
                                        className="mt-2 w-full text-center text-panel-sm font-bold text-primary py-2 rounded-xl border border-primary/20 bg-primary/5 active:bg-primary/10 transition-colors"
                                    >
                                        {showAllBelts ? 'Mostrar menos' : `Mostrar todas (${beltUpgrades.length})`}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {error && (
                    <div className="p-3 bg-destructive/15 text-destructive text-ui rounded-xl text-center">
                        {error}
                    </div>
                )}

                {/* Confirm button — fixed bottom on mobile, inline on desktop */}
                <div className={cn(
                    'fixed bottom-0 left-0 right-0 p-4 bg-[#FAFAFA]/95 backdrop-blur border-t border-border sm:relative sm:p-0 sm:bg-transparent sm:border-0 sm:backdrop-blur-none transition-all duration-300',
                    selected ? 'opacity-100' : 'opacity-60'
                )}>
                    <Button
                        className="w-full h-14 font-bold rounded-full bg-brand-950 hover:bg-brand-900 !text-white text-panel-sm tracking-wider disabled:opacity-50 disabled:!text-white"
                        disabled={!selected || loading}
                        onClick={() => selected && setConfirmPayload({ from: currentCategory, to: selected })}
                    >
                        {loading ? (
                            <><SpinnerGapIcon size={18} weight="bold" className="mr-2 animate-spin" /> Salvando...</>
                        ) : selected ? (
                            <><CheckIcon size={18} weight="bold" className="mr-2" /> Confirmar Troca</>
                        ) : 'Selecione uma categoria'}
                    </Button>
                </div>

                {/* History */}
                {history.length > 0 && (
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2">
                            <ClockCounterClockwiseIcon size={24} weight="duotone" className="text-muted-foreground" />
                            <h2 className="text-panel-md font-bold">Histórico de trocas</h2>
                        </div>
                        <div className="space-y-2">
                            {history.map((entry) => (
                                <div key={entry.id} className="flex items-center gap-3 px-4 py-3.5 rounded-xl border bg-white">
                                    <div className="flex-1 min-w-0 space-y-0.5">
                                        <div className="flex items-center gap-2 text-ui flex-wrap">
                                            <span className="font-medium text-muted-foreground truncate max-w-[120px]">{catLabel(entry.old_category)}</span>
                                            <ArrowsClockwiseIcon size={18} weight="duotone" className="text-muted-foreground/50 shrink-0" />
                                            <span className="font-bold text-foreground truncate max-w-[120px]">{catLabel(entry.new_category)}</span>
                                        </div>
                                        <p className="text-panel-sm text-muted-foreground">
                                            {new Date(entry.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                            {entry.changed_by_name && ` · ${entry.changed_by_name}`}
                                        </p>
                                    </div>
                                    {entry.old_category && (
                                        <button
                                            type="button"
                                            onClick={() => setConfirmPayload({
                                                from: currentCategory,
                                                to: entry.old_category!,
                                                revert: true,
                                            })}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-full border border-border bg-background text-panel-sm font-semibold text-muted-foreground hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50 active:border-amber-500 active:text-amber-600 active:bg-amber-50 transition-all duration-150 shrink-0"
                                        >
                                            <ArrowBendUpLeftIcon size={20} weight="duotone" />
                                            Desfazer
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation modal */}
            <Dialog open={!!confirmPayload} onOpenChange={(open) => !open && setConfirmPayload(null)}>
                <DialogContent className="max-w-sm mx-4">
                    <DialogHeader>
                        <DialogTitle className="text-panel-md font-bold">
                            {confirmPayload?.revert ? 'Desfazer troca?' : 'Confirmar troca de categoria?'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="flex flex-col gap-2 p-4 rounded-xl bg-muted/30 border">
                            <div className="flex items-center gap-2">
                                <span className="text-panel-sm font-medium text-muted-foreground w-10">De</span>
                                <span className="text-ui font-semibold text-foreground">{catLabel(confirmPayload?.from ?? null)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-panel-sm font-medium text-muted-foreground w-10">Para</span>
                                <span className="text-ui font-bold text-primary">{catLabel(confirmPayload?.to ?? null)}</span>
                            </div>
                        </div>
                        {confirmPayload?.revert && (
                            <p className="text-panel-sm text-amber-600 dark:text-amber-400">
                                Esta ação irá reverter a última troca feita nesta inscrição.
                            </p>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" className="rounded-full" onClick={() => setConfirmPayload(null)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button
                            className="rounded-full bg-brand-950 hover:bg-brand-900 text-white font-bold"
                            disabled={loading}
                            onClick={() => confirmPayload && executeChange(confirmPayload.to.id)}
                        >
                            {loading ? (
                                <><SpinnerGapIcon size={16} weight="bold" className="mr-2 animate-spin" /> Salvando...</>
                            ) : 'Confirmar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Athletes modal */}
            <Dialog open={!!modalAthletesCat} onOpenChange={(open) => !open && setModalAthletesCat(null)}>
                <DialogContent className="max-w-sm mx-4">
                    <DialogHeader>
                        <DialogTitle className="text-panel-md font-bold flex items-center gap-2">
                            <UsersIcon size={18} weight="duotone" className="text-primary" />
                            Atletas confirmados
                        </DialogTitle>
                        <p className="text-panel-sm text-muted-foreground">
                            {modalAthletesCat ? formatFullCategoryName(modalAthletesCat) : ''}
                        </p>
                    </DialogHeader>
                    {modalAthletes.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            <UsersIcon size={32} weight="duotone" className="mx-auto mb-2 opacity-30" />
                            <p className="text-ui">Nenhum atleta confirmado ainda.</p>
                        </div>
                    ) : (
                        <div className="space-y-2 mt-2">
                            {modalAthletes.map((ath, i) => (
                                <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl border bg-muted/20">
                                    <span className="text-ui font-semibold">{ath.full_name}</span>
                                    <BeltBadge belt={ath.belt_color} />
                                </div>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Success toast */}
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
