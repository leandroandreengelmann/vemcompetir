'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
    UsersIcon,
    WarningCircleIcon,
    ShoppingCartIcon,
    ClockIcon,
    MagnifyingGlassIcon,
    CheckCircleIcon,
    XCircleIcon,
    CopyIcon,
    UserIcon,
    EnvelopeIcon,
    PhoneIcon,
    IdentificationCardIcon,
    ScalesIcon,
    CalendarBlankIcon,
    GenderIntersexIcon,
    BuildingsIcon,
    SealCheckIcon,
    FileTextIcon,
} from '@phosphor-icons/react';
import { toast } from 'sonner';

interface Registration {
    id: string;
    event_title: string;
    category: string;
    status: string;
    price: number;
    created_at: string;
}

interface Athlete {
    id: string;
    full_name: string;
    email: string;
    email_confirmed: boolean;
    phone: string | null;
    cpf: string | null;
    belt_color: string | null;
    weight: number | null;
    birth_date: string | null;
    sexo: string | null;
    gym_name: string | null;
    tenant_name: string | null;
    created_at: string;
    has_terms: boolean;
    missing_fields: string[];
    is_complete: boolean;
    registrations: Registration[];
    counts: { total: number; pago: number; carrinho: number; aguardando: number };
}

type FilterTab = 'todos' | 'incompleto' | 'sem_termos' | 'carrinho' | 'aguardando' | 'sem_email';

const TABS: { key: FilterTab; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'incompleto', label: 'Cadastro incompleto' },
    { key: 'sem_termos', label: 'Sem termos' },
    { key: 'carrinho', label: 'Carrinho abandonado' },
    { key: 'aguardando', label: 'Aguardando pagamento' },
    { key: 'sem_email', label: 'Email não confirmado' },
];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    pago:                 { label: 'Pago',           className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
    confirmado:           { label: 'Confirmado',     className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
    isento:               { label: 'Isento',         className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' },
    aguardando_pagamento: { label: 'Aguard. pag.',   className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
    pendente:             { label: 'Pendente',       className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
    carrinho:             { label: 'Carrinho',       className: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400' },
    cancelado:            { label: 'Cancelado',      className: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' },
};

function formatCpf(cpf?: string | null) {
    if (!cpf) return null;
    const d = cpf.replace(/\D/g, '');
    if (d.length !== 11) return cpf;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatPhone(phone?: string | null) {
    if (!phone) return null;
    const d = phone.replace(/\D/g, '');
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return phone;
}

const avatarColors = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-600', 'bg-orange-500',
    'bg-pink-500', 'bg-teal-600', 'bg-indigo-500', 'bg-rose-500',
];
function getAvatarColor(id: string) {
    const n = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
    return avatarColors[n % avatarColors.length];
}
function getInitials(name: string) {
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function copyToClipboard(value: string, label: string) {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copiado!`);
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
    return (
        <div className={cn('flex items-center gap-2 py-1.5 px-3 rounded-lg text-sm', ok ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400' : 'text-destructive bg-destructive/5')}>
            {ok
                ? <CheckCircleIcon size={15} weight="duotone" className="shrink-0" />
                : <XCircleIcon size={15} weight="duotone" className="shrink-0" />
            }
            {label}
        </div>
    );
}

export function CentralAtletasClient({ athletes }: { athletes: Athlete[] }) {
    const [tab, setTab] = useState<FilterTab>('todos');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Athlete | null>(null);

    const filtered = useMemo(() => {
        let list = athletes;

        if (tab === 'incompleto') list = list.filter(a => !a.is_complete);
        else if (tab === 'sem_termos') list = list.filter(a => !a.has_terms);
        else if (tab === 'carrinho') list = list.filter(a => a.counts.carrinho > 0);
        else if (tab === 'aguardando') list = list.filter(a => a.counts.aguardando > 0);
        else if (tab === 'sem_email') list = list.filter(a => !a.email_confirmed);

        if (search.trim()) {
            const q = search.toLowerCase().trim();
            list = list.filter(a =>
                a.full_name.toLowerCase().includes(q) ||
                a.email.toLowerCase().includes(q) ||
                (a.cpf ?? '').includes(q.replace(/\D/g, '')) ||
                (a.phone ?? '').includes(q.replace(/\D/g, ''))
            );
        }

        return list;
    }, [athletes, tab, search]);

    const kpis = useMemo(() => ({
        total: athletes.length,
        incompleto: athletes.filter(a => !a.is_complete).length,
        carrinho: athletes.filter(a => a.counts.carrinho > 0).length,
        aguardando: athletes.filter(a => a.counts.aguardando > 0).length,
    }), [athletes]);

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Central de Atletas"
                description="Visão completa de cadastros, inscrições e pagamentos pendentes."
            />

            {/* KPIs */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <Card className="relative overflow-hidden border-none shadow-md cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setTab('todos')}>
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5 pointer-events-none" />
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                                <UsersIcon size={20} weight="duotone" className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">Total atletas</p>
                                <p className="text-2xl font-black tabular-nums">{kpis.total}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-none shadow-md cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setTab('incompleto')}>
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-amber-600/5 pointer-events-none" />
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                                <WarningCircleIcon size={20} weight="duotone" className="text-amber-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">Cadastro incompleto</p>
                                <p className="text-2xl font-black tabular-nums">{kpis.incompleto}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-none shadow-md cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setTab('carrinho')}>
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5 pointer-events-none" />
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
                                <ShoppingCartIcon size={20} weight="duotone" className="text-purple-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">Carrinho abandonado</p>
                                <p className="text-2xl font-black tabular-nums">{kpis.carrinho}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-none shadow-md cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setTab('aguardando')}>
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/5 pointer-events-none" />
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
                                <ClockIcon size={20} weight="duotone" className="text-orange-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">Aguardando pag.</p>
                                <p className="text-2xl font-black tabular-nums">{kpis.aguardando}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filtros + busca */}
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                    {TABS.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={cn(
                                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                                tab === t.key
                                    ? 'bg-foreground text-background border-foreground'
                                    : 'bg-muted/40 text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
                            )}
                        >
                            {t.label}
                            {t.key !== 'todos' && (
                                <span className="ml-1.5 opacity-70">
                                    {t.key === 'incompleto' && kpis.incompleto}
                                    {t.key === 'carrinho' && kpis.carrinho}
                                    {t.key === 'aguardando' && kpis.aguardando}
                                    {t.key === 'sem_termos' && athletes.filter(a => !a.has_terms).length}
                                    {t.key === 'sem_email' && athletes.filter(a => !a.email_confirmed).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="relative max-w-sm">
                    <MagnifyingGlassIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome, email, CPF ou telefone..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 h-10 rounded-xl"
                    />
                </div>
            </div>

            {/* Tabela */}
            <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="border-b bg-muted/20 py-3 px-6">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                        <span className="flex items-center gap-2 text-muted-foreground">
                            <UsersIcon size={16} weight="duotone" />
                            {filtered.length} {filtered.length === 1 ? 'atleta' : 'atletas'}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-6 w-10" />
                                <TableHead>Atleta</TableHead>
                                <TableHead>Contato</TableHead>
                                <TableHead className="text-center">Cadastro</TableHead>
                                <TableHead className="text-center">Termos</TableHead>
                                <TableHead className="text-center">Inscrições</TableHead>
                                <TableHead>Academia</TableHead>
                                <TableHead className="text-right pr-6">Desde</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length > 0 ? filtered.map(athlete => (
                                <TableRow
                                    key={athlete.id}
                                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                                    onClick={() => setSelected(athlete)}
                                >
                                    <TableCell className="pl-6">
                                        <div className={cn('size-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm', getAvatarColor(athlete.id))}>
                                            {getInitials(athlete.full_name)}
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-semibold text-sm">{athlete.full_name}</span>
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                {athlete.email_confirmed
                                                    ? <SealCheckIcon size={11} className="text-emerald-500" weight="duotone" />
                                                    : <XCircleIcon size={11} className="text-destructive" weight="duotone" />
                                                }
                                                {athlete.email || <span className="italic">sem email</span>}
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex flex-col gap-0.5 text-xs">
                                            {athlete.phone
                                                ? <span className="font-medium">{formatPhone(athlete.phone)}</span>
                                                : <span className="text-muted-foreground italic">Sem telefone</span>
                                            }
                                            {athlete.cpf
                                                ? <span className="text-muted-foreground font-mono">{formatCpf(athlete.cpf)}</span>
                                                : <span className="text-muted-foreground italic">Sem CPF</span>
                                            }
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-center">
                                        {athlete.is_complete ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                <CheckCircleIcon size={12} weight="duotone" /> Completo
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">
                                                <WarningCircleIcon size={12} weight="duotone" /> {athlete.missing_fields.length} campo{athlete.missing_fields.length > 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </TableCell>

                                    <TableCell className="text-center">
                                        {athlete.has_terms ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                <CheckCircleIcon size={12} weight="duotone" /> Aceito
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                                                <XCircleIcon size={12} weight="duotone" /> Nunca
                                            </span>
                                        )}
                                    </TableCell>

                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                            {athlete.counts.pago > 0 && (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700">
                                                    {athlete.counts.pago} pago
                                                </span>
                                            )}
                                            {athlete.counts.carrinho > 0 && (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-700">
                                                    {athlete.counts.carrinho} carrinho
                                                </span>
                                            )}
                                            {athlete.counts.aguardando > 0 && (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700">
                                                    {athlete.counts.aguardando} aguard.
                                                </span>
                                            )}
                                            {athlete.counts.total === 0 && (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-sm">
                                        {athlete.tenant_name ?? athlete.gym_name
                                            ? <span className="font-medium">{athlete.tenant_name ?? athlete.gym_name}</span>
                                            : <span className="text-muted-foreground italic text-xs">Sem academia</span>
                                        }
                                    </TableCell>

                                    <TableCell className="text-right pr-6">
                                        <div className="flex flex-col items-end gap-0.5">
                                            <span className="text-sm font-medium">
                                                {format(new Date(athlete.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(athlete.created_at), 'HH:mm', { locale: ptBR })}
                                            </span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-40 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <UsersIcon size={32} weight="duotone" className="opacity-30" />
                                            <p className="text-sm italic">Nenhum atleta encontrado.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Drawer de detalhes */}
            <Sheet open={!!selected} onOpenChange={open => !open && setSelected(null)}>
                <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto p-0">
                    {selected && (
                        <div className="flex flex-col h-full">
                            {/* Header */}
                            <div className="p-6 border-b bg-muted/20">
                                <div className="flex items-center gap-4">
                                    <div className={cn('size-14 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-md', getAvatarColor(selected.id))}>
                                        {getInitials(selected.full_name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <SheetTitle className="text-base font-black truncate">{selected.full_name}</SheetTitle>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Cadastrado em {format(new Date(selected.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            {selected.is_complete
                                                ? <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700"><CheckCircleIcon size={10} weight="duotone" /> Cadastro completo</span>
                                                : <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700"><WarningCircleIcon size={10} weight="duotone" /> Cadastro incompleto</span>
                                            }
                                            {selected.has_terms
                                                ? <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700"><FileTextIcon size={10} weight="duotone" /> Termos aceitos</span>
                                                : <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground"><FileTextIcon size={10} weight="duotone" /> Sem termos</span>
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 p-6 space-y-6">
                                {/* Contato */}
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contato</h3>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <EnvelopeIcon size={15} weight="duotone" className="text-muted-foreground shrink-0" />
                                                <span className="text-sm truncate">{selected.email || <span className="italic text-muted-foreground">Sem email</span>}</span>
                                                {selected.email_confirmed
                                                    ? <SealCheckIcon size={13} className="text-emerald-500 shrink-0" weight="duotone" />
                                                    : <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full shrink-0">Não confirmado</span>
                                                }
                                            </div>
                                            {selected.email && (
                                                <button onClick={() => copyToClipboard(selected.email, 'Email')} className="text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2">
                                                    <CopyIcon size={14} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40">
                                            <div className="flex items-center gap-2.5">
                                                <PhoneIcon size={15} weight="duotone" className="text-muted-foreground shrink-0" />
                                                <span className="text-sm">{formatPhone(selected.phone) ?? <span className="italic text-muted-foreground">Sem telefone</span>}</span>
                                            </div>
                                            {selected.phone && (
                                                <button onClick={() => copyToClipboard(selected.phone!, 'Telefone')} className="text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2">
                                                    <CopyIcon size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Dados pessoais */}
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dados Pessoais</h3>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {[
                                            { icon: IdentificationCardIcon, label: 'CPF', value: formatCpf(selected.cpf) },
                                            { icon: GenderIntersexIcon, label: 'Sexo', value: selected.sexo },
                                            { icon: CalendarBlankIcon, label: 'Nascimento', value: selected.birth_date ? format(new Date(selected.birth_date), 'dd/MM/yyyy') : null },
                                            { icon: ScalesIcon, label: 'Peso', value: selected.weight ? `${selected.weight} kg` : null },
                                            { icon: UserIcon, label: 'Faixa', value: selected.belt_color },
                                            { icon: BuildingsIcon, label: 'Academia', value: selected.tenant_name ?? selected.gym_name },
                                        ].map(({ icon: Icon, label, value }) => (
                                            <div key={label} className="p-2.5 rounded-xl bg-muted/40">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <Icon size={12} weight="duotone" className="text-muted-foreground" />
                                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
                                                </div>
                                                <span className="text-sm font-medium">{value ?? <span className="text-muted-foreground italic text-xs">—</span>}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Completude */}
                                {!selected.is_complete && (
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Campos faltando</h3>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {selected.missing_fields.map(f => (
                                                <CheckItem key={f} ok={false} label={f} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Inscrições */}
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                                        Inscrições
                                        <span className="normal-case font-semibold text-foreground">{selected.registrations.length}</span>
                                    </h3>
                                    {selected.registrations.length > 0 ? (
                                        <div className="space-y-1.5">
                                            {selected.registrations.map(reg => {
                                                const cfg = STATUS_CONFIG[reg.status] ?? STATUS_CONFIG.pendente;
                                                return (
                                                    <div key={reg.id} className="p-3 rounded-xl border bg-background">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-semibold truncate">{reg.event_title}</p>
                                                                <p className="text-xs text-muted-foreground truncate mt-0.5">{reg.category}</p>
                                                            </div>
                                                            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0', cfg.className)}>
                                                                {cfg.label}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between mt-2">
                                                            <span className="text-xs text-muted-foreground">
                                                                {format(new Date(reg.created_at), 'dd/MM/yy HH:mm')}
                                                            </span>
                                                            <span className="text-xs font-semibold">
                                                                {reg.price > 0 ? `R$ ${reg.price.toFixed(2).replace('.', ',')}` : 'Grátis'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic text-center py-4">Nenhuma inscrição.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
