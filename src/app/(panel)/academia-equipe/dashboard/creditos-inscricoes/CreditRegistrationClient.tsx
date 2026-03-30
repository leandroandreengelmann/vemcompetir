'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import {
    TicketIcon, UserPlusIcon, MagnifyingGlassIcon, SpinnerGapIcon,
    UsersIcon, WarningIcon,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { registerWithCreditAction, getEventCategoriesAction } from './actions';
import { formatFullCategoryName } from '@/lib/category-utils';
import { cn } from '@/lib/utils';

interface Athlete {
    id: string;
    full_name: string;
    belt_color: string;
    sexo: string;
    birth_date: string;
    weight: number | null;
}

interface Category {
    id: string;
    categoria_completa: string;
    divisao_idade: string;
    faixa: string;
    categoria_peso: string;
    sexo: string;
    peso_min_kg?: number;
    peso_max_kg?: number;
}

interface Package {
    id: string;
    total_credits: number;
    used_credits: number;
    excluded_divisions: string[];
    notes: string | null;
    creator: { name: string } | null;
    event: {
        id: string;
        title: string;
        event_date: string;
    } | null;
}

interface Props {
    packages: Package[];
    athletes: Athlete[];
}

export default function CreditRegistrationClient({ packages, athletes }: Props) {
    const router = useRouter();
    const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
    const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'athlete' | 'category' | 'confirm'>('athlete');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activePackages = packages.filter(pkg => {
        if (!pkg.event) return false;
        const eventDate = new Date(pkg.event.event_date);
        return pkg.used_credits < pkg.total_credits && eventDate >= today;
    });

    const inactivePackages = packages.filter(pkg => {
        if (!pkg.event) return true;
        const eventDate = new Date(pkg.event.event_date);
        return pkg.used_credits >= pkg.total_credits || eventDate < today;
    });

    const filteredAthletes = useMemo(() => {
        if (!search.trim()) return athletes;
        const q = search.toLowerCase();
        return athletes.filter(a => a.full_name.toLowerCase().includes(q));
    }, [athletes, search]);

    const availableCategories = useMemo(() => {
        const excluded = selectedPkg?.excluded_divisions ?? [];
        if (excluded.length === 0) return categories;
        return categories.filter(cat => {
            const div = cat.divisao_idade ?? '';
            return !excluded.some(ex => ex.toLowerCase() === div.toLowerCase());
        });
    }, [categories, selectedPkg]);

    const handleOpenDialog = async (pkg: Package) => {
        setSelectedPkg(pkg);
        setSelectedAthlete(null);
        setSelectedCategoryId('');
        setCategories([]);
        setSearch('');
        setStep('athlete');
        setError(null);

        if (pkg.event?.id) {
            setLoadingCategories(true);
            const cats = await getEventCategoriesAction(pkg.event.id);
            setCategories(cats as Category[]);
            setLoadingCategories(false);
        }
    };

    const handleCloseDialog = () => {
        setSelectedPkg(null);
        setError(null);
    };

    const handleSelectAthlete = (athlete: Athlete) => {
        setSelectedAthlete(athlete);
        setSelectedCategoryId('');
        setStep('category');
    };

    const handleConfirm = async () => {
        if (!selectedPkg || !selectedAthlete || !selectedCategoryId || !selectedPkg.event) return;
        setLoading(true);
        setError(null);

        const result = await registerWithCreditAction(
            selectedPkg.id,
            selectedPkg.event.id,
            selectedAthlete.id,
            selectedCategoryId,
        );

        if (result?.error) {
            setError(result.error);
            setLoading(false);
            return;
        }

        handleCloseDialog();
        setLoading(false);
        toast.success('Atleta inscrito com sucesso!');
        router.refresh();
    };

    const creditsLeft = (pkg: Package) => pkg.total_credits - pkg.used_credits;

    if (packages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <TicketIcon size={40} weight="duotone" className="text-muted-foreground/40" />
                <p className="text-panel-sm text-muted-foreground">
                    Nenhum pacote de créditos recebido ainda.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Pacotes ativos */}
            {activePackages.length > 0 && (
                <div className="space-y-4">
                    {activePackages.map(pkg => (
                        <Card key={pkg.id} className="shadow-none">
                            <CardHeader className="pb-3 border-b">
                                <CardTitle className="text-panel-md font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span>{pkg.event?.title}</span>
                                        <span className="text-panel-sm font-normal text-muted-foreground">
                                            — {pkg.event ? new Date(pkg.event.event_date).toLocaleDateString('pt-BR') : ''}
                                        </span>
                                    </div>
                                    <Badge className="rounded-full font-bold tabular-nums bg-primary/10 text-primary border-none w-fit">
                                        {creditsLeft(pkg)} / {pkg.total_credits} créditos
                                    </Badge>
                                </CardTitle>
                                <div className="flex flex-col gap-1 mt-1">
                                    {pkg.creator && (
                                        <p className="text-panel-sm text-muted-foreground flex items-center gap-1.5">
                                            Cedido por: <span className="font-medium text-foreground">{pkg.creator.name}</span>
                                        </p>
                                    )}
                                    {pkg.excluded_divisions?.length > 0 && (
                                        <p className="text-panel-sm text-muted-foreground">
                                            Divisões não permitidas:{' '}
                                            <span className="font-medium text-foreground">{pkg.excluded_divisions.join(', ')}</span>
                                        </p>
                                    )}
                                    {pkg.notes && (
                                        <p className="text-panel-sm text-muted-foreground italic">"{pkg.notes}"</p>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <Button pill size="sm" className="gap-2" asChild>
                                    <Link href={`/academia-equipe/dashboard/creditos-inscricoes/${pkg.id}/inscrever`}>
                                        <UserPlusIcon size={15} weight="duotone" />
                                        Inscrever Atleta
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pacotes esgotados / expirados */}
            {inactivePackages.length > 0 && (
                <div className="space-y-2">
                    <p className="text-panel-sm font-semibold text-muted-foreground px-1">Histórico</p>
                    <div className="space-y-3">
                        {inactivePackages.map(pkg => {
                            const expired = pkg.event && new Date(pkg.event.event_date) < today;
                            return (
                                <Card key={pkg.id} className="shadow-none opacity-60">
                                    <CardContent className="py-4 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-panel-sm font-medium truncate">{pkg.event?.title ?? '—'}</span>
                                            {pkg.event && (
                                                <span className="text-panel-sm text-muted-foreground hidden sm:inline">
                                                    — {new Date(pkg.event.event_date).toLocaleDateString('pt-BR')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge variant="secondary" className="rounded-full tabular-nums">
                                                {pkg.used_credits} / {pkg.total_credits}
                                            </Badge>
                                            <Badge variant="outline" className="rounded-full text-[10px]">
                                                {expired ? 'Expirado' : 'Esgotado'}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty state para ativos */}
            {activePackages.length === 0 && inactivePackages.length > 0 && (
                <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/30 text-panel-sm text-muted-foreground">
                    <WarningIcon size={16} weight="duotone" className="shrink-0" />
                    Todos os créditos foram utilizados ou os eventos já passaram.
                </div>
            )}

            {/* Dialog de inscrição */}
            <Dialog open={!!selectedPkg} onOpenChange={(v) => !v && handleCloseDialog()}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <TicketIcon size={18} weight="duotone" className="text-primary" />
                            Inscrever com Crédito
                        </DialogTitle>
                        <DialogDescription>
                            {selectedPkg?.event?.title}
                            {selectedPkg?.excluded_divisions?.length > 0 && (
                                <> — divisões excluídas: <strong>{selectedPkg.excluded_divisions.join(', ')}</strong></>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedPkg && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20 text-panel-sm">
                            <TicketIcon size={16} weight="duotone" className="text-primary" />
                            <span className="font-semibold text-primary">
                                {creditsLeft(selectedPkg)} crédito{creditsLeft(selectedPkg) !== 1 ? 's' : ''} restante{creditsLeft(selectedPkg) !== 1 ? 's' : ''}
                            </span>
                        </div>
                    )}

                    {/* Step: selecionar atleta */}
                    {step === 'athlete' && (
                        <div className="space-y-3">
                            <div className="relative">
                                <MagnifyingGlassIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar atleta..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="pl-9 h-10 rounded-xl bg-background"
                                />
                            </div>
                            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                                {athletes.length === 0 ? (
                                    <p className="text-panel-sm text-muted-foreground text-center py-6">
                                        Nenhum atleta cadastrado nesta academia.
                                    </p>
                                ) : filteredAthletes.length === 0 ? (
                                    <p className="text-panel-sm text-muted-foreground text-center py-6">
                                        Nenhum atleta encontrado.
                                    </p>
                                ) : (
                                    filteredAthletes.map(a => (
                                        <button
                                            key={a.id}
                                            type="button"
                                            onClick={() => handleSelectAthlete(a)}
                                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border bg-background hover:border-primary hover:bg-primary/5 transition-all text-left"
                                        >
                                            <div className="flex items-center gap-2">
                                                <UsersIcon size={15} weight="duotone" className="text-muted-foreground shrink-0" />
                                                <span className="text-panel-sm font-medium">{a.full_name}</span>
                                            </div>
                                            <Badge variant="outline" className="rounded-full text-[10px] font-semibold">
                                                {a.belt_color || '—'}
                                            </Badge>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step: selecionar categoria */}
                    {step === 'category' && selectedAthlete && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 text-panel-sm">
                                <UsersIcon size={15} weight="duotone" className="text-muted-foreground" />
                                <span className="font-medium">{selectedAthlete.full_name}</span>
                                <button
                                    type="button"
                                    onClick={() => { setStep('athlete'); setSelectedCategoryId(''); }}
                                    className="ml-auto text-xs text-primary hover:underline"
                                >
                                    Trocar
                                </button>
                            </div>
                            <div className="space-y-2">
                                <label className="text-panel-sm font-semibold text-muted-foreground">
                                    Categoria<span className="text-destructive ml-0.5">*</span>
                                </label>
                                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId} disabled={loadingCategories}>
                                    <SelectTrigger className="h-11 rounded-xl shadow-none">
                                        <SelectValue placeholder={loadingCategories ? "Carregando categorias..." : "Selecione a categoria"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {loadingCategories ? (
                                            <SelectItem value="loading" disabled>Carregando...</SelectItem>
                                        ) : availableCategories.length === 0 ? (
                                            <SelectItem value="none" disabled>Nenhuma categoria disponível</SelectItem>
                                        ) : (
                                            availableCategories.map(cat => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    {formatFullCategoryName(cat)}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            {selectedCategoryId && (
                                <Button pill className="w-full gap-2" onClick={() => setStep('confirm')}>
                                    Continuar
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Step: confirmar */}
                    {step === 'confirm' && selectedAthlete && selectedCategoryId && (
                        <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-panel-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Atleta</span>
                                <span className="font-semibold">{selectedAthlete.full_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Evento</span>
                                <span className="font-semibold">{selectedPkg?.event?.title}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Categoria</span>
                                <span className="font-semibold text-right max-w-[200px]">
                                    {formatFullCategoryName(availableCategories.find(c => c.id === selectedCategoryId)!)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Pagamento</span>
                                <Badge className="rounded-full bg-emerald-500/10 text-emerald-700 border-none text-[10px] font-bold">
                                    ISENTO — uso de crédito
                                </Badge>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-destructive/15 text-destructive text-panel-sm rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    {step === 'confirm' && (
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button pill variant="ghost" onClick={() => setStep('category')} disabled={loading}>
                                Voltar
                            </Button>
                            <Button pill onClick={handleConfirm} disabled={loading} className="gap-2">
                                {loading && <SpinnerGapIcon size={16} weight="bold" className="animate-spin" />}
                                Confirmar Inscrição
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
