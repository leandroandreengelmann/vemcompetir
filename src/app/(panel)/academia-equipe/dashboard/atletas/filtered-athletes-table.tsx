'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    MagnifyingGlassIcon,
    XIcon,
    FunnelSimpleIcon,
    PencilSimpleIcon,
    EyeIcon,
    ClipboardTextIcon,
} from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { AthleteAvatarCard } from '@/components/athlete/athlete-avatar-card';
import { CountryFlag } from '@/components/ui/country-flag';
import { getBeltStyle } from '@/lib/belt-theme';
import { formatCPF, formatPhone } from '@/lib/validation';
import { CollapsibleTableSection } from './collapsible-card';
import { GenerateAccessButton } from './generate-access-button';
import { ClaimAthleteButton } from './claim-athlete-button';
import { UnclaimAthleteButton } from './unclaim-athlete-button';
import { AthleteRegistrationsSheet } from './athlete-registrations-sheet';

type Variant = 'main' | 'linked' | 'suggested';

type Counts = { total: number; pago: number; pendente: number };

interface FilteredAthletesTableProps {
    variant: Variant;
    athletes: any[];
    isAdmin?: boolean;
    isAcademy?: boolean;
    academyMasters?: { id: string; full_name: string }[];
    registrationCounts?: Record<string, Counts>;
}

const normalize = (s: string | null | undefined) =>
    (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function buildSearchText(a: any, variant: Variant): string {
    if (variant === 'main') {
        return [a.full_name, a.email, a.gym_name].map(normalize).join(' ');
    }
    return [a.full_name, a.phone, a.cpf, a.gym_name, a.master_name].map(normalize).join(' ');
}

export function FilteredAthletesTable({
    variant,
    athletes,
    isAdmin = false,
    isAcademy = false,
    academyMasters = [],
    registrationCounts,
}: FilteredAthletesTableProps) {
    const [search, setSearch] = useState('');
    const [selectedBelts, setSelectedBelts] = useState<Set<string>>(new Set());
    const [accountFilter, setAccountFilter] = useState<'all' | 'own' | 'no-account'>('all');

    const indexed = useMemo(() => {
        return athletes.map((a: any) => {
            const isDummy = (a.email || '').includes('@dummy.competir.com');
            const hasOwnAccount = variant === 'main' && !isDummy && !!a.last_sign_in_at;
            return {
                athlete: a,
                searchText: buildSearchText(a, variant),
                belt: (a.belt_color || '').toLowerCase().trim(),
                hasOwnAccount,
            };
        });
    }, [athletes, variant]);

    const availableBelts = useMemo(() => {
        const s = new Set<string>();
        indexed.forEach(({ belt }) => {
            if (belt) s.add(belt);
        });
        return Array.from(s).sort();
    }, [indexed]);

    const filtered = useMemo(() => {
        const q = normalize(search.trim());
        return indexed.filter(({ searchText, belt, hasOwnAccount }) => {
            if (q && !searchText.includes(q)) return false;
            if (selectedBelts.size > 0 && !selectedBelts.has(belt)) return false;
            if (variant === 'main') {
                if (accountFilter === 'own' && !hasOwnAccount) return false;
                if (accountFilter === 'no-account' && hasOwnAccount) return false;
            }
            return true;
        });
    }, [indexed, search, selectedBelts, accountFilter, variant]);

    const hasActiveFilter =
        search.trim() !== '' ||
        selectedBelts.size > 0 ||
        (variant === 'main' && accountFilter !== 'all');

    const clearAll = () => {
        setSearch('');
        setSelectedBelts(new Set());
        setAccountFilter('all');
    };

    const toggleBelt = (belt: string) => {
        setSelectedBelts((prev) => {
            const next = new Set(prev);
            if (next.has(belt)) next.delete(belt);
            else next.add(belt);
            return next;
        });
    };

    const colCount = variant === 'main' ? (isAdmin ? 6 : 5) : 7;
    const emptyMessage =
        variant === 'main'
            ? 'Nenhum atleta encontrado.'
            : variant === 'linked'
                ? 'Nenhum atleta vinculado encontrado.'
                : 'Nenhuma sugestão encontrada.';

    return (
        <>
            {/* Barra de filtros */}
            <div className="px-6 pt-4 pb-3 border-b border-border/40 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[220px] max-w-md group">
                        <MagnifyingGlassIcon
                            size={16}
                            weight="duotone"
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
                        />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={
                                variant === 'main'
                                    ? 'Buscar por nome, e-mail ou academia...'
                                    : 'Buscar por nome, CPF, telefone ou mestre...'
                            }
                            variant="lg"
                            className="pl-11 pr-10 bg-background border-input shadow-sm"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <XIcon size={14} weight="bold" />
                                <span className="sr-only">Limpar busca</span>
                            </button>
                        )}
                    </div>

                    {/* Faixa */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button pill variant="outline" size="sm" className="gap-2 h-10">
                                <FunnelSimpleIcon size={16} weight="duotone" />
                                Faixa
                                {selectedBelts.size > 0 && (
                                    <Badge variant="secondary" className="ml-1 px-1.5 h-5 rounded-full text-xs">
                                        {selectedBelts.size}
                                    </Badge>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-56 p-2">
                            {availableBelts.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-2">
                                    Nenhuma faixa disponível.
                                </p>
                            ) : (
                                <div className="space-y-1 max-h-64 overflow-auto">
                                    {availableBelts.map((belt) => {
                                        const checked = selectedBelts.has(belt);
                                        return (
                                            <label
                                                key={belt}
                                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
                                            >
                                                <Checkbox
                                                    checked={checked}
                                                    onCheckedChange={() => toggleBelt(belt)}
                                                />
                                                <Badge
                                                    variant="outline"
                                                    style={getBeltStyle(belt)}
                                                    className="text-xs font-semibold uppercase tracking-wide"
                                                >
                                                    {belt}
                                                </Badge>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </PopoverContent>
                    </Popover>

                    {/* Conta (apenas main) */}
                    {variant === 'main' && (
                        <div className="inline-flex rounded-full border border-border p-0.5 bg-muted/30">
                            {(['all', 'own', 'no-account'] as const).map((opt) => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setAccountFilter(opt)}
                                    className={`px-3 h-9 rounded-full text-xs font-medium transition-colors ${
                                        accountFilter === opt
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {opt === 'all' ? 'Todos' : opt === 'own' ? 'Com conta' : 'Sem conta'}
                                </button>
                            ))}
                        </div>
                    )}

                    {hasActiveFilter && (
                        <Button
                            pill
                            variant="ghost"
                            size="sm"
                            onClick={clearAll}
                            className="gap-1 text-muted-foreground hover:text-foreground h-10"
                        >
                            <XIcon size={14} weight="bold" />
                            Limpar
                        </Button>
                    )}

                    <div className="ml-auto text-panel-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">{filtered.length}</span>
                        {' de '}
                        <span>{athletes.length}</span>
                    </div>
                </div>

                {/* Chips de faixa selecionada */}
                {selectedBelts.size > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {Array.from(selectedBelts).map((belt) => (
                            <button
                                key={belt}
                                type="button"
                                onClick={() => toggleBelt(belt)}
                                className="group inline-flex items-center gap-1 rounded-full px-2 py-0.5 border border-border/60 bg-muted/40 hover:bg-muted transition-colors"
                            >
                                <Badge
                                    variant="outline"
                                    style={getBeltStyle(belt)}
                                    className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0 border-0"
                                >
                                    {belt}
                                </Badge>
                                <XIcon size={12} weight="bold" className="text-muted-foreground group-hover:text-foreground" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <CollapsibleTableSection totalCount={filtered.length} forceOpen={hasActiveFilter}>
                <Table>
                    <TableHeader>
                        {variant === 'main' ? (
                            <TableRow>
                                <TableHead className="pl-6">Nome</TableHead>
                                <TableHead>Faixa</TableHead>
                                <TableHead>E-mail</TableHead>
                                {isAdmin && <TableHead>Academia / Equipe</TableHead>}
                                <TableHead>Data de Cadastro</TableHead>
                                <TableHead className="text-right pr-6 w-[100px]">Ações</TableHead>
                            </TableRow>
                        ) : (
                            <TableRow>
                                <TableHead className="pl-6">Nome</TableHead>
                                <TableHead>Faixa</TableHead>
                                <TableHead>Telefone</TableHead>
                                <TableHead>CPF</TableHead>
                                <TableHead>Academia informada</TableHead>
                                <TableHead>Mestre informado</TableHead>
                                <TableHead className="text-right pr-6">Ação</TableHead>
                            </TableRow>
                        )}
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={colCount} className="h-24 text-center text-muted-foreground">
                                    {hasActiveFilter ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <span>Nenhum resultado para os filtros atuais.</span>
                                            <Button pill size="sm" variant="outline" onClick={clearAll}>
                                                Limpar filtros
                                            </Button>
                                        </div>
                                    ) : (
                                        emptyMessage
                                    )}
                                </TableCell>
                            </TableRow>
                        ) : variant === 'main' ? (
                            filtered.map(({ athlete, hasOwnAccount }) => {
                                const counts = registrationCounts?.[athlete.id] ?? { total: 0, pago: 0, pendente: 0 };
                                return (
                                    <TableRow key={athlete.id}>
                                        <TableCell className="pl-6 font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col items-center gap-1 shrink-0">
                                                    <AthleteAvatarCard
                                                        fullName={athlete.full_name}
                                                        avatarUrl={athlete.avatar_url}
                                                        beltColor={athlete.belt_color}
                                                    />
                                                    {athlete.nationality && (
                                                        <CountryFlag code={athlete.nationality} showName={false} />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {athlete.full_name}
                                                    {hasOwnAccount && (
                                                        <Badge variant="secondary" className="text-xs font-normal">
                                                            Conta própria
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                style={getBeltStyle(athlete.belt_color || '')}
                                                className="text-panel-sm font-semibold uppercase tracking-wide"
                                            >
                                                {athlete.belt_color || '-'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {(athlete.email || '').includes('@dummy.competir.com') ? (
                                                <GenerateAccessButton athleteId={athlete.id} athleteName={athlete.full_name} />
                                            ) : (
                                                athlete.email
                                            )}
                                        </TableCell>
                                        {isAdmin && (
                                            <TableCell className="font-medium text-primary/80">
                                                {athlete.gym_name || '-'}
                                            </TableCell>
                                        )}
                                        <TableCell className="text-muted-foreground">
                                            {athlete.created_at
                                                ? format(new Date(athlete.created_at), 'dd/MM/yy', { locale: ptBR })
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            pill
                                                            variant="ghost"
                                                            size="icon"
                                                            asChild
                                                            className="text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                                        >
                                                            <Link href={`/academia-equipe/dashboard/atletas/${athlete.id}/perfil`}>
                                                                <EyeIcon size={24} weight="duotone" />
                                                                <span className="sr-only">Ver Perfil</span>
                                                            </Link>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">Ver perfil completo</TooltipContent>
                                                </Tooltip>
                                                <AthleteRegistrationsSheet
                                                    athleteId={athlete.id}
                                                    athleteName={athlete.full_name}
                                                    counts={counts}
                                                />
                                                {isAcademy && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                pill
                                                                variant="ghost"
                                                                size="icon"
                                                                asChild
                                                                className="text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors"
                                                            >
                                                                <Link href={`/academia-equipe/dashboard/eventos/disponiveis?atleta=${athlete.id}`}>
                                                                    <ClipboardTextIcon size={24} weight="duotone" />
                                                                    <span className="sr-only">Inscrever em evento</span>
                                                                </Link>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">Inscrever em evento</TooltipContent>
                                                    </Tooltip>
                                                )}
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            pill
                                                            variant="ghost"
                                                            size="icon"
                                                            asChild
                                                            className="text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                                        >
                                                            <Link href={`/academia-equipe/dashboard/atletas/${athlete.id}`}>
                                                                <PencilSimpleIcon size={24} weight="duotone" />
                                                                <span className="sr-only">Editar</span>
                                                            </Link>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">Editar dados do atleta</TooltipContent>
                                                </Tooltip>
                                                {isAcademy && hasOwnAccount && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <UnclaimAthleteButton athleteId={athlete.id} athleteName={athlete.full_name} />
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">Desvincular atleta</TooltipContent>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            filtered.map(({ athlete }) => (
                                <TableRow key={athlete.id}>
                                    <TableCell className="pl-6 font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col items-center gap-1 shrink-0">
                                                <AthleteAvatarCard
                                                    fullName={athlete.full_name}
                                                    avatarUrl={athlete.avatar_url}
                                                    beltColor={athlete.belt_color}
                                                />
                                                {athlete.nationality && (
                                                    <CountryFlag code={athlete.nationality} showName={false} />
                                                )}
                                            </div>
                                            <span>{athlete.full_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            style={getBeltStyle(athlete.belt_color || '')}
                                            className="text-panel-sm font-semibold uppercase tracking-wide"
                                        >
                                            {athlete.belt_color || '-'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {athlete.phone ? formatPhone(athlete.phone) : '-'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {athlete.cpf ? formatCPF(athlete.cpf) : '-'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{athlete.gym_name || '-'}</TableCell>
                                    <TableCell className="text-muted-foreground">{athlete.master_name || '-'}</TableCell>
                                    <TableCell className="text-right pr-6">
                                        <ClaimAthleteButton
                                            athleteId={athlete.id}
                                            athleteName={athlete.full_name}
                                            currentMasterName={athlete.master_name ?? null}
                                            masters={academyMasters}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CollapsibleTableSection>
        </>
    );
}
