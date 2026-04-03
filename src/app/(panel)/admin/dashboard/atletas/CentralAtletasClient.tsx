'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
    UsersIcon,
    WarningCircleIcon,
    ShoppingCartSimpleIcon,
    ClockIcon,
    MagnifyingGlassIcon,
    CheckCircleIcon,
    XCircleIcon,
    CopyIcon,
    EnvelopeSimpleIcon,
    PhoneIcon,
    IdentificationCardIcon,
    ScalesIcon,
    CalendarBlankIcon,
    GenderIntersexIcon,
    BuildingsIcon,
    SealCheckIcon,
    FileTextIcon,
    UserCircleIcon,
    BabyIcon,
    WhatsappLogoIcon,
    ChatTeardropTextIcon,
    PaperPlaneTiltIcon,
    GearIcon,
    SpinnerGapIcon,
    RobotIcon,
    BellIcon,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { formatCategoryTitle } from '@/lib/category-utils';
import { WhatsAppInbox } from './whatsapp/WhatsAppInbox';
import { ensureConversation } from './whatsapp/actions';
import { WhatsAppTemplates } from './whatsapp/WhatsAppTemplates';
import { WhatsAppConfig } from './whatsapp/WhatsAppConfig';
import { WhatsAppDisparos } from './whatsapp/WhatsAppDisparos';
import { WhatsAppAIConfig } from './whatsapp/WhatsAppAIConfig';
import { WhatsAppNotificacoes } from './whatsapp/WhatsAppNotificacoes';

type MainTab = 'atletas' | 'whatsapp';
type WhatsAppTab = 'inbox' | 'notificacoes' | 'disparos' | 'templates' | 'ia' | 'config';

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
    has_own_account: boolean;
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

type FilterTab = 'todos' | 'incompleto' | 'carrinho' | 'aguardando' | 'menor';

const PAGE_SIZE = 50;

const TABS: { key: FilterTab; label: string }[] = [
    { key: 'todos',       label: 'Todos' },
    { key: 'incompleto',  label: 'Cadastro incompleto' },
    { key: 'carrinho',    label: 'Carrinho abandonado' },
    { key: 'aguardando',  label: 'Aguardando pagamento' },
    { key: 'menor',       label: 'Menores de idade' },
];

const BELT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    branca:   { bg: 'bg-white',        text: 'text-gray-800',   border: 'border-gray-300' },
    branco:   { bg: 'bg-white',        text: 'text-gray-800',   border: 'border-gray-300' },
    cinza:    { bg: 'bg-gray-400',     text: 'text-white',      border: 'border-gray-500' },
    amarela:  { bg: 'bg-yellow-400',   text: 'text-yellow-900', border: 'border-yellow-500' },
    amarelo:  { bg: 'bg-yellow-400',   text: 'text-yellow-900', border: 'border-yellow-500' },
    laranja:  { bg: 'bg-orange-500',   text: 'text-white',      border: 'border-orange-600' },
    verde:    { bg: 'bg-green-600',    text: 'text-white',      border: 'border-green-700' },
    azul:     { bg: 'bg-blue-600',     text: 'text-white',      border: 'border-blue-700' },
    roxa:     { bg: 'bg-purple-600',   text: 'text-white',      border: 'border-purple-700' },
    roxo:     { bg: 'bg-purple-600',   text: 'text-white',      border: 'border-purple-700' },
    marrom:   { bg: 'bg-amber-800',    text: 'text-white',      border: 'border-amber-900' },
    preta:    { bg: 'bg-gray-900',     text: 'text-white',      border: 'border-black' },
    preto:    { bg: 'bg-gray-900',     text: 'text-white',      border: 'border-black' },
    coral:    { bg: 'bg-red-400',      text: 'text-white',      border: 'border-red-500' },
    vermelha: { bg: 'bg-red-600',      text: 'text-white',      border: 'border-red-700' },
    vermelho: { bg: 'bg-red-600',      text: 'text-white',      border: 'border-red-700' },
};

function getBeltStyle(belt: string | null) {
    if (!belt) return null;
    const key = belt.toLowerCase().trim();
    return BELT_COLORS[key] ?? null;
}

function isMinor(birth_date: string | null): boolean {
    if (!birth_date) return false;
    const today = new Date();
    const dob = new Date(birth_date);
    const age = today.getFullYear() - dob.getFullYear() -
        (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
    return age < 18;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    pago:                 { label: 'Pago',         className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
    confirmado:           { label: 'Confirmado',   className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
    isento:               { label: 'Isento',       className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
    aguardando_pagamento: { label: 'Aguard. pag.', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
    pendente:             { label: 'Pendente',     className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
    carrinho:             { label: 'Carrinho',     className: 'bg-sky-500/10 text-sky-700 dark:text-sky-400' },
    cancelado:            { label: 'Cancelado',    className: 'bg-destructive/10 text-destructive' },
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

export function CentralAtletasClient({ athletes }: { athletes: Athlete[] }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const mainTab = (searchParams.get('tab') as MainTab) ?? 'atletas';
    const whatsappTab = (searchParams.get('wtab') as WhatsAppTab) ?? 'inbox';

    function setMainTab(tab: MainTab) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tab);
        if (tab !== 'whatsapp') params.delete('wtab');
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }

    function setWhatsappTab(tab: WhatsAppTab) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('wtab', tab);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
    const [whatsappConvId, setWhatsappConvId] = useState<string | undefined>();
    const [openingChat, setOpeningChat] = useState(false);

    const [tab, setTab] = useState<FilterTab>('todos');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Athlete | null>(null);
    const [page, setPage] = useState(1);
    const [beltFilter, setBeltFilter] = useState<string | null>(null);

    async function openWhatsApp(phone: string, name: string, athleteId: string) {
        setOpeningChat(true);
        try {
            const convId = await ensureConversation(phone, name, athleteId);
            setWhatsappConvId(convId);
            setMainTab('whatsapp');
            setWhatsappTab('inbox');
            setSelected(null);
        } catch {
            toast.error('Erro ao abrir conversa.');
        } finally {
            setOpeningChat(false);
        }
    }

    const availableBelts = useMemo(() => {
        // key normalizada (lowercase) → { label original capitalizado, count }
        const counts = new Map<string, { label: string; count: number }>();
        for (const a of athletes) {
            if (a.belt_color) {
                const key = a.belt_color.trim().toLowerCase();
                const label = a.belt_color.trim().charAt(0).toUpperCase() + a.belt_color.trim().slice(1).toLowerCase();
                const prev = counts.get(key);
                counts.set(key, { label: prev?.label ?? label, count: (prev?.count ?? 0) + 1 });
            }
        }
        const order = ['branca', 'cinza', 'amarela', 'laranja', 'verde', 'azul', 'roxa', 'marrom', 'preta', 'coral', 'vermelha'];
        return [...counts.entries()]
            .sort(([a], [b]) => {
                const ia = order.indexOf(a);
                const ib = order.indexOf(b);
                if (ia === -1 && ib === -1) return a.localeCompare(b);
                if (ia === -1) return 1;
                if (ib === -1) return -1;
                return ia - ib;
            })
            .map(([key, { label, count }]) => ({ belt: key, label, count }));
    }, [athletes]);

    const tabCounts = useMemo(() => ({
        incompleto: athletes.filter(a => !a.is_complete).length,
        carrinho:   athletes.filter(a => a.counts.carrinho > 0).length,
        aguardando: athletes.filter(a => a.counts.aguardando > 0).length,
        menor:      athletes.filter(a => isMinor(a.birth_date)).length,
    }), [athletes]);

    const filtered = useMemo(() => {
        setPage(1);
        let list = athletes;
        if (tab === 'incompleto')      list = list.filter(a => !a.is_complete);
        else if (tab === 'carrinho')   list = list.filter(a => a.counts.carrinho > 0);
        else if (tab === 'aguardando') list = list.filter(a => a.counts.aguardando > 0);
        else if (tab === 'menor')      list = list.filter(a => isMinor(a.birth_date));

        if (beltFilter) {
            list = list.filter(a => (a.belt_color ?? '').toLowerCase().trim() === beltFilter);
        }

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
    }, [athletes, tab, beltFilter, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div className="space-y-6">
            {/* Header + tabs principais */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-panel-lg font-black tracking-tight">Central V/S</h1>
                    <p className="text-panel-sm text-muted-foreground mt-1">
                        Visão completa de cadastros, inscrições e comunicação.
                    </p>
                </div>
                <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/40 border w-fit">
                    <button
                        onClick={() => setMainTab('atletas')}
                        className={cn(
                            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-panel-sm font-semibold transition-all',
                            mainTab === 'atletas'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <UsersIcon size={16} weight="duotone" />
                        Atletas
                    </button>
                    <button
                        onClick={() => setMainTab('whatsapp')}
                        className={cn(
                            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-panel-sm font-semibold transition-all',
                            mainTab === 'whatsapp'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <WhatsappLogoIcon size={16} weight="duotone" />
                        WhatsApp
                    </button>
                </div>
            </div>

            {/* ── ABA WHATSAPP ── */}
            {mainTab === 'whatsapp' && (
                <div className="space-y-4">
                    {/* Sub-tabs */}
                    <div className="flex gap-1 border-b">
                        {([
                            { key: 'inbox',         label: 'Inbox',          icon: ChatTeardropTextIcon },
                            { key: 'notificacoes',  label: 'Notificações',   icon: BellIcon },
                            { key: 'disparos',      label: 'Disparos',       icon: PaperPlaneTiltIcon },
                            { key: 'templates',     label: 'Templates',      icon: FileTextIcon },
                            { key: 'ia',            label: 'IA',             icon: RobotIcon },
                            { key: 'config',        label: 'Config',         icon: GearIcon },
                        ] as { key: WhatsAppTab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                onClick={() => setWhatsappTab(key)}
                                className={cn(
                                    'inline-flex items-center gap-2 px-4 py-2.5 text-panel-sm font-semibold border-b-2 -mb-px transition-all',
                                    whatsappTab === key
                                        ? 'border-foreground text-foreground'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <Icon size={16} weight="duotone" />
                                {label}
                            </button>
                        ))}
                    </div>

                    {whatsappTab === 'inbox' && <WhatsAppInbox initialConvId={whatsappConvId} />}
                    {whatsappTab === 'notificacoes' && <WhatsAppNotificacoes />}
                    {whatsappTab === 'disparos' && <WhatsAppDisparos />}
                    {whatsappTab === 'templates' && <WhatsAppTemplates />}
                    {whatsappTab === 'ia' && <WhatsAppAIConfig />}
                    {whatsappTab === 'config' && <WhatsAppConfig />}
                </div>
            )}

            {/* ── ABA ATLETAS ── */}
            {mainTab === 'atletas' && (<>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {[
                    { key: 'todos' as FilterTab,     label: 'Total de atletas',      value: athletes.length,      icon: UsersIcon,              color: 'blue' },
                    { key: 'incompleto' as FilterTab, label: 'Cadastro incompleto',   value: tabCounts.incompleto, icon: WarningCircleIcon,       color: 'amber' },
                    { key: 'carrinho' as FilterTab,   label: 'Carrinho abandonado',   value: tabCounts.carrinho,   icon: ShoppingCartSimpleIcon,  color: 'purple' },
                    { key: 'aguardando' as FilterTab, label: 'Aguardando pagamento',  value: tabCounts.aguardando, icon: ClockIcon,               color: 'orange' },
                    { key: 'menor' as FilterTab,      label: 'Menores de idade',      value: tabCounts.menor,      icon: BabyIcon,                color: 'pink' },
                ].map(({ key, label, value, icon: Icon, color }) => (
                    <Card
                        key={key}
                        className="shadow-none cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => setTab(key)}
                    >
                        <CardContent className="pt-5 pb-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl bg-${color}-500/10`}>
                                    <Icon size={20} weight="duotone" className={`text-${color}-600`} />
                                </div>
                                <div>
                                    <p className="text-panel-sm text-muted-foreground">{label}</p>
                                    <p className="text-panel-lg font-black tabular-nums">{value}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filtros + busca */}
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                    {TABS.map(t => {
                        const count = t.key !== 'todos' ? tabCounts[t.key as keyof typeof tabCounts] : null;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={cn(
                                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-panel-sm font-semibold border transition-all',
                                    tab === t.key
                                        ? 'bg-foreground text-background border-foreground'
                                        : 'bg-muted/40 text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
                                )}
                            >
                                {t.label}
                                {count !== null && (
                                    <span className={cn(
                                        'text-panel-sm font-black px-2.5 py-0.5 rounded-full leading-none tabular-nums',
                                        tab === t.key ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'
                                    )}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Filtro por faixa */}
                {availableBelts.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {availableBelts.map(({ belt, label, count }) => {
                            const style = getBeltStyle(belt);
                            const isActive = beltFilter === belt;
                            return (
                                <button
                                    key={belt}
                                    onClick={() => setBeltFilter(isActive ? null : belt)}
                                    className={cn(
                                        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-panel-sm font-semibold border transition-all',
                                        isActive
                                            ? (style ? cn(style.bg, style.text, style.border) : 'bg-foreground text-background border-foreground')
                                            : 'bg-muted/40 text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
                                    )}
                                >
                                    {style && (
                                        <span className={cn('size-3 rounded-full border shrink-0', style.bg, style.border)} />
                                    )}
                                    {label}
                                    <span className={cn(
                                        'text-panel-sm font-black px-2 py-0.5 rounded-full leading-none tabular-nums',
                                        isActive ? 'bg-black/20 text-inherit' : 'bg-muted text-muted-foreground'
                                    )}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="relative max-w-sm">
                    <MagnifyingGlassIcon size={18} weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome, email, CPF ou telefone..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 h-10 rounded-xl"
                    />
                </div>
            </div>

            {/* Tabela */}
            <Card className="shadow-none">
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-panel-md font-semibold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <UsersIcon size={20} weight="duotone" className="text-muted-foreground" />
                            Atletas
                        </div>
                        <Badge variant="secondary" className="rounded-full">{filtered.length}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-6 w-12" />
                                <TableHead className="text-panel-sm font-semibold">Atleta</TableHead>
                                <TableHead className="text-panel-sm font-semibold">Contato</TableHead>
                                <TableHead className="text-panel-sm font-semibold text-center">Cadastro</TableHead>
                                <TableHead className="text-panel-sm font-semibold text-center">Conta</TableHead>
                                <TableHead className="text-panel-sm font-semibold text-center">Inscrições</TableHead>
                                <TableHead className="text-panel-sm font-semibold">Academia</TableHead>
                                <TableHead className="text-panel-sm font-semibold text-right pr-6">Desde</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length > 0 ? paginated.map(athlete => (
                                <TableRow
                                    key={athlete.id}
                                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                                    onClick={() => setSelected(athlete)}
                                >
                                    <TableCell className="pl-6">
                                        <div className={cn('size-9 rounded-full flex items-center justify-center text-white text-xs font-bold', getAvatarColor(athlete.id))}>
                                            {getInitials(athlete.full_name)}
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="flex items-center gap-2">
                                                <span className="text-panel-sm font-semibold">{athlete.full_name}</span>
                                                {isMinor(athlete.birth_date) && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-panel-sm font-bold bg-pink-500/10 text-pink-700 dark:text-pink-400">
                                                        <BabyIcon size={16} weight="duotone" />
                                                        Menor de idade
                                                    </span>
                                                )}
                                            </span>
                                            <span className="text-panel-sm text-muted-foreground flex items-center gap-1">
                                                <span>{athlete.email || '—'}</span>
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-panel-sm font-medium">
                                                {formatPhone(athlete.phone) ?? <span className="text-muted-foreground italic">Sem telefone</span>}
                                            </span>
                                            <span className="text-panel-sm text-muted-foreground font-mono">
                                                {formatCpf(athlete.cpf) ?? <span className="not-italic">—</span>}
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-center">
                                        {athlete.is_complete ? (
                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-panel-sm font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                                                <CheckCircleIcon size={16} weight="duotone" />
                                                Completo
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-panel-sm font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                                <WarningCircleIcon size={16} weight="duotone" />
                                                {athlete.missing_fields.length} campo{athlete.missing_fields.length > 1 ? 's' : ''}
                                            </div>
                                        )}
                                    </TableCell>

                                    <TableCell className="text-center">
                                        {athlete.has_own_account ? (
                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-panel-sm font-medium bg-blue-500/10 text-blue-700 dark:text-blue-400">
                                                <UserCircleIcon size={16} weight="duotone" />
                                                Própria
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-panel-sm font-medium bg-muted text-muted-foreground">
                                                <BuildingsIcon size={16} weight="duotone" />
                                                Academia
                                            </div>
                                        )}
                                    </TableCell>

                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-2 flex-wrap">
                                            {athlete.counts.pago > 0 && (
                                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-panel-sm font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 tabular-nums">
                                                    <CheckCircleIcon size={16} weight="duotone" />
                                                    {athlete.counts.pago} pago
                                                </div>
                                            )}
                                            {athlete.counts.carrinho > 0 && (
                                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-panel-sm font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 tabular-nums">
                                                    <ShoppingCartSimpleIcon size={16} weight="duotone" />
                                                    {athlete.counts.carrinho} carrinho
                                                </div>
                                            )}
                                            {athlete.counts.aguardando > 0 && (
                                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-panel-sm font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 tabular-nums">
                                                    <ClockIcon size={16} weight="duotone" />
                                                    {athlete.counts.aguardando} aguard.
                                                </div>
                                            )}
                                            {athlete.counts.total === 0 && (
                                                <span className="text-panel-sm text-muted-foreground">—</span>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-panel-sm">
                                        {athlete.tenant_name ?? athlete.gym_name
                                            ? <span className="font-medium">{athlete.tenant_name ?? athlete.gym_name}</span>
                                            : <span className="text-muted-foreground italic">Sem academia</span>
                                        }
                                    </TableCell>

                                    <TableCell className="text-right pr-6">
                                        <div className="flex flex-col items-end gap-0.5">
                                            <span className="text-panel-sm font-medium">
                                                {format(new Date(athlete.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                                            </span>
                                            <span className="text-panel-sm text-muted-foreground">
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
                                            <p className="text-panel-sm italic">Nenhum atleta encontrado.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Paginação */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-panel-sm text-muted-foreground">
                        Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} atletas
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="h-9 px-3 rounded-lg text-panel-sm font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/40"
                        >
                            Anterior
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                            .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((p, idx) =>
                                p === '...'
                                    ? <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground text-panel-sm">…</span>
                                    : <button
                                        key={p}
                                        onClick={() => setPage(p as number)}
                                        className={cn(
                                            'size-9 rounded-lg text-panel-sm font-semibold border transition-all',
                                            page === p
                                                ? 'bg-foreground text-background border-foreground'
                                                : 'hover:bg-muted/40 border-border'
                                        )}
                                    >
                                        {p}
                                    </button>
                            )}
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="h-9 px-3 rounded-lg text-panel-sm font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/40"
                        >
                            Próximo
                        </button>
                    </div>
                </div>
            )}

            {/* Drawer de detalhes */}
            <Sheet open={!!selected} onOpenChange={open => !open && setSelected(null)}>
                <SheetContent className="w-full sm:max-w-[650px] overflow-y-auto p-0">
                    {selected && (
                        <div className="flex flex-col">
                            {/* Header do drawer */}
                            <div className="p-6 border-b">
                                <div className="flex items-center gap-4">
                                    <div className={cn('size-16 rounded-2xl flex items-center justify-center text-white font-black text-xl shrink-0', getAvatarColor(selected.id))}>
                                        {getInitials(selected.full_name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <SheetTitle className="text-panel-lg font-black truncate">{selected.full_name}</SheetTitle>
                                        <p className="text-panel-sm text-muted-foreground mt-0.5">
                                            Desde {format(new Date(selected.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                        </p>
                                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                                            {selected.is_complete
                                                ? <div className="inline-flex items-center gap-1.5 text-panel-sm font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700"><CheckCircleIcon size={16} weight="duotone" /> Completo</div>
                                                : <div className="inline-flex items-center gap-1.5 text-panel-sm font-semibold px-3 py-1 rounded-full bg-amber-500/10 text-amber-700"><WarningCircleIcon size={16} weight="duotone" /> Incompleto</div>
                                            }
                                            {selected.has_own_account
                                                ? <div className="inline-flex items-center gap-1.5 text-panel-sm font-semibold px-3 py-1 rounded-full bg-blue-500/10 text-blue-700"><UserCircleIcon size={16} weight="duotone" /> Conta própria</div>
                                                : <div className="inline-flex items-center gap-1.5 text-panel-sm font-semibold px-3 py-1 rounded-full bg-muted text-muted-foreground"><BuildingsIcon size={16} weight="duotone" /> Criada pela academia</div>
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Contato */}
                                <div className="space-y-3">
                                    <h2 className="text-panel-md font-semibold border-b pb-2">Contato</h2>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <EnvelopeSimpleIcon size={20} weight="duotone" className="text-muted-foreground shrink-0" />
                                                <span className="text-panel-sm">{selected.email || <span className="italic text-muted-foreground">Sem email</span>}</span>
                                            </div>
                                            {selected.email && (
                                                <button onClick={() => copyToClipboard(selected.email, 'Email')} className="text-muted-foreground hover:text-foreground transition-colors ml-2 shrink-0">
                                                    <CopyIcon size={18} weight="duotone" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
                                            <div className="flex items-center gap-3">
                                                <PhoneIcon size={20} weight="duotone" className="text-muted-foreground shrink-0" />
                                                <span className="text-panel-sm">{formatPhone(selected.phone) ?? <span className="italic text-muted-foreground">Sem telefone</span>}</span>
                                            </div>
                                            {selected.phone && (
                                                <div className="flex items-center gap-1 ml-2 shrink-0">
                                                    <button
                                                        onClick={() => openWhatsApp(selected.phone!, selected.full_name, selected.id)}
                                                        disabled={openingChat}
                                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-green-500/10 text-green-700 hover:bg-green-500/20 transition-colors text-panel-sm font-semibold disabled:opacity-60"
                                                    >
                                                        {openingChat
                                                            ? <SpinnerGapIcon size={16} weight="bold" className="animate-spin" />
                                                            : <WhatsappLogoIcon size={16} weight="duotone" />
                                                        }
                                                        Conversar
                                                    </button>
                                                    <button onClick={() => copyToClipboard(selected.phone!, 'Telefone')} className="text-muted-foreground hover:text-foreground transition-colors">
                                                        <CopyIcon size={18} weight="duotone" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Dados pessoais */}
                                <div className="space-y-3">
                                    <h2 className="text-panel-md font-semibold border-b pb-2">Dados Pessoais</h2>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { icon: IdentificationCardIcon, label: 'CPF',        value: formatCpf(selected.cpf) },
                                            { icon: GenderIntersexIcon,     label: 'Sexo',       value: selected.sexo },
                                            { icon: CalendarBlankIcon,      label: 'Nascimento', value: selected.birth_date ? format(new Date(selected.birth_date), 'dd/MM/yyyy') : null },
                                            { icon: ScalesIcon,             label: 'Peso',       value: selected.weight ? `${selected.weight} kg` : null },
                                            { icon: UserCircleIcon,         label: 'Faixa',      value: selected.belt_color },
                                            { icon: BuildingsIcon,          label: 'Academia',   value: selected.tenant_name ?? selected.gym_name },
                                        ].map(({ icon: Icon, label, value }) => (
                                            <div key={label} className="p-4 rounded-xl border bg-muted/30">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Icon size={18} weight="duotone" className="text-muted-foreground" />
                                                    <span className="text-panel-sm font-semibold text-muted-foreground">{label}</span>
                                                </div>
                                                {label === 'Faixa' && value ? (() => {
                                                    const style = getBeltStyle(value as string);
                                                    return style ? (
                                                        <span className={cn(
                                                            'inline-flex items-center px-3 py-1.5 rounded-full text-panel-sm font-bold border',
                                                            style.bg, style.text, style.border
                                                        )}>
                                                            {value}
                                                        </span>
                                                    ) : (
                                                        <span className="text-panel-sm font-medium">{value}</span>
                                                    );
                                                })() : (
                                                    <span className="text-panel-sm font-medium">
                                                        {value ?? <span className="text-muted-foreground italic">—</span>}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Campos faltando */}
                                {!selected.is_complete && (
                                    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
                                        <WarningCircleIcon size={20} weight="duotone" className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-ui font-medium text-amber-800 dark:text-amber-300">Cadastro incompleto</p>
                                            <p className="text-caption text-amber-700 dark:text-amber-400">
                                                Faltam: {selected.missing_fields.join(', ')}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Inscrições */}
                                <div className="space-y-3">
                                    <h2 className="text-panel-md font-semibold border-b pb-2 flex items-center justify-between">
                                        Inscrições
                                        <Badge variant="secondary" className="rounded-full">{selected.registrations.length}</Badge>
                                    </h2>
                                    {selected.registrations.length > 0 ? (
                                        <div className="space-y-2">
                                            {selected.registrations.map(reg => {
                                                const cfg = STATUS_CONFIG[reg.status] ?? STATUS_CONFIG.pendente;
                                                return (
                                                    <div key={reg.id} className="p-4 rounded-xl border bg-muted/30">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-panel-sm font-semibold truncate">{reg.event_title}</p>
                                                                <p className="text-panel-sm text-muted-foreground truncate mt-0.5">{formatCategoryTitle({ categoria_completa: reg.category })}</p>
                                                            </div>
                                                            <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-panel-sm font-medium shrink-0', cfg.className)}>
                                                                {cfg.label}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between mt-3">
                                                            <span className="text-panel-sm text-muted-foreground">
                                                                {format(new Date(reg.created_at), "dd/MM/yy 'às' HH:mm")}
                                                            </span>
                                                            <span className="text-panel-sm font-semibold tabular-nums">
                                                                {reg.price > 0 ? `R$ ${reg.price.toFixed(2).replace('.', ',')}` : 'Grátis'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-panel-sm text-muted-foreground italic text-center py-6">
                                            Nenhuma inscrição registrada.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
            </>)}
        </div>
    );
}
