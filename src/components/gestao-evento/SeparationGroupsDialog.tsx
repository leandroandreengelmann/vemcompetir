'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    HandshakeIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    TrashIcon,
    UsersIcon,
    LockKeyIcon,
    CheckIcon,
    WarningCircleIcon,
} from '@phosphor-icons/react';
import { teamColor, SEPARATION_GROUP_COLORS } from '@/lib/gestao-evento/team-colors';
import { cn } from '@/lib/utils';
import type { AthleteInput } from '@/lib/gestao-evento/bracket-generator';

export type LocalGrupo = {
    id: string;
    atleta_ids: string[];
};

type AthleteWithMeta = AthleteInput & {
    inGroupId: string | null;
};

interface SeparationGroupsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    athletes: AthleteInput[];
    grupos: LocalGrupo[];
    readOnly?: boolean;
    onCreate: (atletaIds: string[]) => Promise<{ ok: boolean; error?: string }>;
    onRemove: (grupoId: string) => Promise<{ ok: boolean; error?: string }>;
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const GROUP_COLORS = SEPARATION_GROUP_COLORS;

export function SeparationGroupsDialog({
    open,
    onOpenChange,
    athletes,
    grupos,
    readOnly = false,
    onCreate,
    onRemove,
}: SeparationGroupsDialogProps) {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState('');
    const [busy, setBusy] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            setSelected(new Set());
            setSearch('');
            setErrorMsg(null);
        }
    }, [open]);

    const athletesWithMeta = useMemo<AthleteWithMeta[]>(() => {
        const groupOf = new Map<string, string>();
        for (const g of grupos) for (const id of g.atleta_ids) groupOf.set(id, g.id);
        return athletes.map((a) => ({ ...a, inGroupId: groupOf.get(a.id) ?? null }));
    }, [athletes, grupos]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return athletesWithMeta;
        return athletesWithMeta.filter(
            (a) =>
                a.name.toLowerCase().includes(q) ||
                (a.team || '').toLowerCase().includes(q),
        );
    }, [athletesWithMeta, search]);

    function toggle(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    async function handleCreate() {
        setErrorMsg(null);
        if (selected.size < 2) {
            setErrorMsg('Selecione pelo menos 2 atletas para criar um grupo.');
            return;
        }
        setBusy(true);
        try {
            const res = await onCreate(Array.from(selected));
            if (!res.ok) {
                setErrorMsg(res.error || 'Não foi possível criar o grupo.');
                return;
            }
            setSelected(new Set());
        } finally {
            setBusy(false);
        }
    }

    async function handleRemove(id: string) {
        setErrorMsg(null);
        setBusy(true);
        try {
            const res = await onRemove(id);
            if (!res.ok) setErrorMsg(res.error || 'Não foi possível remover o grupo.');
        } finally {
            setBusy(false);
        }
    }

    const athleteById = useMemo(() => {
        const map = new Map<string, AthleteInput>();
        for (const a of athletes) map.set(a.id, a);
        return map;
    }, [athletes]);

    const hasGroup = grupos.length > 0;
    const lockedByExisting = hasGroup && !readOnly;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-2xl">
                        <HandshakeIcon size={28} weight="duotone" className="text-primary" />
                        Grupo de separação manual
                    </DialogTitle>
                    <DialogDescription className="pt-2 text-base">
                        Os atletas neste grupo são distribuídos em metades opostas da chave,
                        evitando confronto direto cedo. Útil para irmãos, amigos próximos ou
                        atletas que já se enfrentaram recentemente. <strong>Apenas 1 grupo por categoria</strong>.
                    </DialogDescription>
                </DialogHeader>

                {readOnly && (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-700 dark:text-amber-400">
                        <LockKeyIcon size={18} weight="duotone" />
                        <span className="text-sm font-semibold">
                            Chave congelada — para alterar grupos, reverta a chave.
                        </span>
                    </div>
                )}

                {errorMsg && (
                    <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-rose-700 dark:text-rose-400">
                        <WarningCircleIcon size={18} weight="duotone" />
                        <span className="text-sm font-semibold">{errorMsg}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden">
                    {/* Esquerda — Grupos criados */}
                    <div className="flex flex-col gap-3 min-h-0">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <UsersIcon size={16} weight="duotone" className="text-primary" />
                            Grupo ativo ({grupos.length}/1)
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[300px]">
                            {grupos.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-center gap-2 h-full py-12 border-2 border-dashed border-border/40 rounded-xl">
                                    <HandshakeIcon
                                        size={36}
                                        weight="duotone"
                                        className="text-muted-foreground/40"
                                    />
                                    <p className="text-sm font-semibold text-muted-foreground">
                                        Nenhum grupo criado
                                    </p>
                                    <p className="text-xs text-muted-foreground/70 max-w-[260px]">
                                        Selecione 2 ou mais atletas na lista ao lado e clique em
                                        "Criar grupo". Apenas 1 grupo por categoria.
                                    </p>
                                </div>
                            ) : (
                                grupos.map((g, idx) => {
                                    const color = GROUP_COLORS[idx % GROUP_COLORS.length];
                                    return (
                                        <div
                                            key={g.id}
                                            className="rounded-xl border border-border/50 bg-muted/20 p-3"
                                            style={{ borderLeft: `4px solid ${color}` }}
                                        >
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <span
                                                    className="text-xs font-black uppercase tracking-wider"
                                                    style={{ color }}
                                                >
                                                    Grupo · {g.atleta_ids.length} atletas
                                                </span>
                                                {!readOnly && (
                                                    <button
                                                        onClick={() => handleRemove(g.id)}
                                                        disabled={busy}
                                                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 rounded-md p-1 transition disabled:opacity-50"
                                                        aria-label="Remover grupo"
                                                    >
                                                        <TrashIcon size={16} weight="duotone" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                {g.atleta_ids.map((id) => {
                                                    const a = athleteById.get(id);
                                                    if (!a) {
                                                        return (
                                                            <div
                                                                key={id}
                                                                className="text-xs text-muted-foreground italic"
                                                            >
                                                                Atleta removido (id: {id.slice(0, 8)})
                                                            </div>
                                                        );
                                                    }
                                                    const tc = teamColor(a.team);
                                                    return (
                                                        <div
                                                            key={id}
                                                            className="flex items-center gap-2 text-sm"
                                                        >
                                                            <span
                                                                className="h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
                                                                style={{
                                                                    background: tc.solid,
                                                                    color: tc.text,
                                                                }}
                                                            >
                                                                {initials(a.name)}
                                                            </span>
                                                            <span className="font-semibold text-foreground truncate">
                                                                {a.name}
                                                            </span>
                                                            {a.team && (
                                                                <span className="text-xs text-muted-foreground truncate">
                                                                    · {a.team}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Direita — Lista de atletas */}
                    <div className="flex flex-col gap-3 min-h-0">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <UsersIcon size={16} weight="duotone" className="text-primary" />
                            Atletas da categoria ({athletes.length})
                        </h3>
                        <div className="relative">
                            <MagnifyingGlassIcon
                                size={16}
                                weight="duotone"
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por nome ou equipe..."
                                className="w-full h-10 rounded-full border border-border bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto pr-1 min-h-[300px] space-y-1">
                            {filtered.length === 0 ? (
                                <p className="text-center text-sm text-muted-foreground py-8">
                                    Nenhum atleta encontrado.
                                </p>
                            ) : (
                                filtered.map((a) => {
                                    const tc = teamColor(a.team);
                                    const isSelected = selected.has(a.id);
                                    const inGroup = !!a.inGroupId;
                                    const disabled = readOnly || inGroup || lockedByExisting;
                                    return (
                                        <button
                                            key={a.id}
                                            onClick={() => !disabled && toggle(a.id)}
                                            disabled={disabled}
                                            type="button"
                                            className={cn(
                                                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition',
                                                isSelected
                                                    ? 'bg-primary/10 border border-primary'
                                                    : 'border border-transparent hover:bg-muted',
                                                disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent',
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0',
                                                    isSelected
                                                        ? 'border-primary bg-primary text-primary-foreground'
                                                        : 'border-border',
                                                )}
                                            >
                                                {isSelected && <CheckIcon size={12} weight="bold" />}
                                            </span>
                                            <span
                                                className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                                                style={{
                                                    background: tc.solid,
                                                    color: tc.text,
                                                }}
                                            >
                                                {initials(a.name)}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-semibold text-foreground truncate">
                                                    {a.name}
                                                </div>
                                                {a.team && (
                                                    <div className="text-xs text-muted-foreground truncate">
                                                        {a.team}
                                                    </div>
                                                )}
                                            </div>
                                            {inGroup && (
                                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full shrink-0">
                                                    No grupo
                                                </span>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                    <div className="text-sm text-muted-foreground">
                        {lockedByExisting ? (
                            'Esta categoria já tem um grupo. Remova-o para criar outro.'
                        ) : selected.size > 0 ? (
                            <>
                                <strong>{selected.size}</strong> atleta(s) selecionado(s)
                                {selected.size >= 2 ? '' : ' — selecione mais um'}
                            </>
                        ) : (
                            'Selecione 2 ou mais atletas para criar o grupo.'
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            pill
                            onClick={() => onOpenChange(false)}
                            disabled={busy}
                        >
                            Fechar
                        </Button>
                        {!readOnly && !lockedByExisting && (
                            <Button
                                pill
                                onClick={handleCreate}
                                disabled={busy || selected.size < 2}
                                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <PlusIcon size={14} weight="bold" />
                                Criar grupo
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
