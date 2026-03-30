'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeftIcon, SpinnerGapIcon, ArrowsClockwiseIcon,
    UsersIcon, CheckIcon, ArrowUpIcon, ArrowDownIcon,
    ClockCounterClockwiseIcon, ArrowBendUpLeftIcon, CheckCircleIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { changeCategoryAction } from '../../../../registrations-actions';
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
    relativePosition?: number;
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
    eventId: string;
    eventTitle: string;
    athleteName: string;
    currentCategory: Category;
    availableCategories: Category[];
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
        <Badge variant="outline" className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5', cls)}>
            {belt}
        </Badge>
    );
}

function catLabel(cat: Category | null) {
    if (!cat) return '—';
    return formatCategoryTitle(cat) || cat.divisao_idade || '—';
}

export default function ChangeCategoryForm({
    registrationId,
    eventId,
    eventTitle,
    athleteName,
    currentCategory,
    availableCategories,
    deadlineDate,
    athletesByCategory,
    history,
}: Props) {
    const router = useRouter();

    const [selected, setSelected] = useState<Category | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modals
    const [modalAthletesCat, setModalAthletesCat] = useState<Category | null>(null);
    const [confirmPayload, setConfirmPayload] = useState<{ from: Category; to: Category; revert?: boolean } | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

    async function executeChange(targetCategoryId: string) {
        setLoading(true);
        setError(null);
        const result = await changeCategoryAction(registrationId, targetCategoryId);
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
            router.refresh();
            router.push(`/academia-equipe/dashboard/trocar-categoria`);
        }, 2000);
    }

    const above = [...availableCategories]
        .filter((c) => (c.relativePosition ?? 0) < 0)
        .sort((a, b) => (a.relativePosition ?? 0) - (b.relativePosition ?? 0));
    const below = [...availableCategories]
        .filter((c) => (c.relativePosition ?? 0) > 0)
        .sort((a, b) => (a.relativePosition ?? 0) - (b.relativePosition ?? 0));
    const orderedAbove = [...above].reverse();

    function AthletesButton({ cat }: { cat: Category }) {
        const count = (athletesByCategory[cat.id] || []).length;
        return (
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setModalAthletesCat(cat); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background text-caption font-semibold text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-150 shrink-0 cursor-pointer"
            >
                <UsersIcon size={16} weight="duotone" />
                {count} atleta{count !== 1 ? 's' : ''}
            </button>
        );
    }

    function TrackDot({ isCurrent, isSelected }: { isCurrent?: boolean; isSelected?: boolean }) {
        return (
            <div className="flex flex-col items-center shrink-0 w-5">
                <div className={cn(
                    'rounded-full border-2 transition-all duration-200 z-10',
                    isCurrent
                        ? 'w-4 h-4 bg-primary border-primary'
                        : isSelected
                            ? 'w-3.5 h-3.5 bg-primary border-primary'
                            : 'w-3 h-3 bg-background border-muted-foreground/30'
                )} />
            </div>
        );
    }

    function CategoryRow({ cat, isCurrent = false }: { cat: Category; isCurrent?: boolean }) {
        const isSelected = selected?.id === cat.id;

        if (isCurrent) {
            return (
                <div className="flex items-stretch gap-3">
                    <div className="flex flex-col items-center w-5 shrink-0">
                        <div className="flex-1 w-px bg-border" />
                        <TrackDot isCurrent />
                        <div className="flex-1 w-px bg-border" />
                    </div>
                    <div className="flex-1 flex items-center gap-4 px-6 py-5 bg-primary/5 border-2 border-primary rounded-2xl shadow-sm my-0.5">
                        <div className="flex-1 min-w-0">
                            <p className="text-panel-md font-black text-foreground truncate">{formatFullCategoryName(cat)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <AthletesButton cat={cat} />
                            <Badge className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/20">
                                Atual
                            </Badge>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex items-stretch gap-3">
                <div className="flex flex-col items-center w-5 shrink-0">
                    <div className="flex-1 w-px bg-border" />
                    <TrackDot isSelected={isSelected} />
                    <div className="flex-1 w-px bg-border" />
                </div>
                <div
                    className={cn(
                        'flex-1 flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all duration-150 cursor-pointer my-0.5',
                        'hover:translate-x-1 hover:shadow-sm',
                        isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm translate-x-1'
                            : 'border-border hover:border-primary/40 hover:bg-muted/20'
                    )}
                    onClick={() => setSelected(isSelected ? null : cat)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelected(isSelected ? null : cat)}
                >
                    <div className="flex-1 min-w-0">
                        <p className={cn('text-ui font-semibold truncate transition-colors', isSelected ? 'text-primary' : 'text-foreground')}>
                            {formatFullCategoryName(cat)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <AthletesButton cat={cat} />
                        <div className={cn(
                            'h-5 w-5 rounded-full border-2 transition-all duration-150 flex items-center justify-center',
                            isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                        )}>
                            {isSelected && <CheckIcon size={11} weight="bold" className="text-white" />}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const hasNeighbors = availableCategories.length > 0;
    const modalAthletes = modalAthletesCat ? (athletesByCategory[modalAthletesCat.id] || []) : [];

    return (
        <div className="flex flex-col items-center py-12 px-4">
            <div className="w-full max-w-lg space-y-8">

                {/* Header */}
                <div className="space-y-5">
                    <Link
                        href="/academia-equipe/dashboard/trocar-categoria"
                        className="text-ui font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center w-fit"
                    >
                        <ArrowLeftIcon size={18} weight="duotone" className="mr-2" />
                        Voltar para checagem
                    </Link>
                    <div className="space-y-1">
                        <h1 className="text-panel-lg font-black tracking-tight flex items-center gap-2">
                            <ArrowsClockwiseIcon size={24} weight="duotone" className="text-primary" />
                            Trocar Categoria
                        </h1>
                        <p className="text-panel-sm text-muted-foreground">{eventTitle}</p>
                    </div>
                </div>

                {/* Card do atleta */}
                <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent p-5">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="space-y-3 relative">
                        <span className="text-caption font-semibold uppercase tracking-widest text-primary/70">Atleta</span>
                        <p className="text-panel-md font-black text-foreground">{athleteName}</p>
                        <div className="flex items-center justify-between pt-1 border-t border-primary/10">
                            <span className="text-caption text-muted-foreground font-medium">Prazo para troca</span>
                            <Badge variant="outline" className="font-semibold border-primary/20 text-primary bg-primary/5">
                                {deadlineDate}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Escada de categorias */}
                <div className="space-y-3">
                    <h2 className="text-panel-md font-semibold">Selecione a nova categoria</h2>

                    {!hasNeighbors ? (
                        <p className="text-ui text-muted-foreground text-center py-8">
                            Não há categorias adjacentes disponíveis neste evento.
                        </p>
                    ) : (
                        <div>
                            {orderedAbove.length > 0 && (
                                <div className="flex items-center gap-2 mb-2 pl-8">
                                    <ArrowUpIcon size={12} weight="bold" className="text-muted-foreground/50" />
                                    <span className="text-caption text-muted-foreground/50 font-medium uppercase tracking-wider">Mais pesado</span>
                                </div>
                            )}
                            <div className="space-y-0">
                                {orderedAbove.map((cat) => <CategoryRow key={cat.id} cat={cat} />)}
                                <CategoryRow cat={currentCategory} isCurrent />
                                {below.map((cat) => <CategoryRow key={cat.id} cat={cat} />)}
                            </div>
                            {below.length > 0 && (
                                <div className="flex items-center gap-2 mt-2 pl-8">
                                    <ArrowDownIcon size={12} weight="bold" className="text-muted-foreground/50" />
                                    <span className="text-caption text-muted-foreground/50 font-medium uppercase tracking-wider">Mais leve</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {error && (
                    <div className="p-3 bg-destructive/15 text-destructive text-ui rounded-lg text-center">
                        {error}
                    </div>
                )}

                {/* Botão confirmar */}
                <div className={cn(
                    'transition-all duration-300',
                    selected ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-1'
                )}>
                    <Button
                        pill
                        className="w-full h-12 font-semibold bg-brand-800 hover:bg-brand-900 text-white"
                        disabled={!selected || loading}
                        onClick={() => selected && setConfirmPayload({ from: currentCategory, to: selected })}
                    >
                        {selected ? (
                            <>
                                <CheckIcon size={18} weight="bold" className="mr-2" />
                                Confirmar Troca
                            </>
                        ) : 'Selecione uma categoria'}
                    </Button>
                </div>

                {/* Histórico */}
                {history.length > 0 && (
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2">
                            <ClockCounterClockwiseIcon size={24} weight="duotone" className="text-primary" />
                            <h2 className="text-panel-md font-semibold">Histórico de trocas</h2>
                        </div>

                        <div className="space-y-2">
                            {history.map((entry) => (
                                <div key={entry.id} className="flex items-center gap-3 pl-4 pr-3 py-3.5 rounded-xl border border-border bg-muted/20">
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center gap-2 text-ui flex-wrap">
                                            <span className="font-medium text-muted-foreground truncate max-w-[120px]">{catLabel(entry.old_category)}</span>
                                            <ArrowsClockwiseIcon size={20} weight="duotone" className="text-primary/50 shrink-0" />
                                            <span className="font-bold text-primary truncate max-w-[120px]">{catLabel(entry.new_category)}</span>
                                        </div>
                                        <p className="text-caption text-muted-foreground/70">
                                            {new Date(entry.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                            {entry.changed_by_name && <> · <span className="font-medium text-muted-foreground">{entry.changed_by_name}</span></>}
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
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background text-caption font-semibold text-muted-foreground hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all duration-150 shrink-0"
                                        >
                                            <ArrowBendUpLeftIcon size={14} weight="duotone" />
                                            Desfazer
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de confirmação */}
            <Dialog open={!!confirmPayload} onOpenChange={(open) => !open && setConfirmPayload(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-panel-md font-bold">
                            {confirmPayload?.revert ? 'Desfazer troca?' : 'Confirmar troca de categoria?'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="flex flex-col p-4 rounded-xl bg-muted/30 border divide-y divide-border">
                            <div className="flex items-center gap-2 pb-3">
                                <span className="text-caption font-medium text-muted-foreground w-10">De</span>
                                <span className="text-ui font-semibold text-foreground">{catLabel(confirmPayload?.from ?? null)}</span>
                            </div>
                            <div className="flex items-center gap-2 pt-3">
                                <span className="text-caption font-medium text-muted-foreground w-10">Para</span>
                                <span className="text-ui font-bold text-primary">{catLabel(confirmPayload?.to ?? null)}</span>
                            </div>
                        </div>
                        {confirmPayload?.revert && (
                            <p className="text-caption text-amber-600 dark:text-amber-400">
                                Esta ação irá reverter a última troca feita nesta inscrição.
                            </p>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" pill onClick={() => setConfirmPayload(null)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button
                            pill
                            className="bg-brand-800 hover:bg-brand-900 text-white"
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

            {/* Modal de atletas */}
            <Dialog open={!!modalAthletesCat} onOpenChange={(open) => !open && setModalAthletesCat(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-panel-md font-bold flex items-center gap-2">
                            <UsersIcon size={18} weight="duotone" className="text-primary" />
                            Atletas confirmados
                        </DialogTitle>
                        <p className="text-caption text-muted-foreground">{modalAthletesCat ? formatFullCategoryName(modalAthletesCat) : ''}</p>
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

            {/* Toast de sucesso */}
            {showSuccess && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                        <CheckCircleIcon size={22} weight="fill" />
                        <span className="text-ui font-semibold">Categoria alterada com sucesso!</span>
                    </div>
                </div>
            )}
        </div>
    );
}
