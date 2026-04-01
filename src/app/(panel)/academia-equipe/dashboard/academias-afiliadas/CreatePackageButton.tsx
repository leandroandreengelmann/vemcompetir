'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusIcon, SpinnerGapIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { toast } from 'sonner';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { createInscriptionPackageAction } from './package-actions';
import { cn } from '@/lib/utils';

interface Tenant {
    id: string;
    name: string;
}

interface Event {
    id: string;
    title: string;
    event_date: string;
}

interface CreatePackageButtonProps {
    ownedEvents: Event[];
    allTenants: Tenant[];
}

const DIVISION_OPTIONS = ['Adulto', 'Master', 'Juvenil', 'Infantil', 'Absoluto'];

export function CreatePackageButton({ ownedEvents, allTenants }: CreatePackageButtonProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [excludedDivisions, setExcludedDivisions] = useState<string[]>([]);
    const [eventId, setEventId] = useState('');
    const [tenantId, setTenantId] = useState('');

    const toggleDivision = (div: string) => {
        setExcludedDivisions(prev =>
            prev.includes(div) ? prev.filter(d => d !== div) : [...prev, div]
        );
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        // Remove any stale entries and append each excluded division
        excludedDivisions.forEach(div => formData.append('excluded_divisions', div));

        const result = await createInscriptionPackageAction(formData);
        if (result?.error) {
            setError(result.error);
            setLoading(false);
            return;
        }

        setOpen(false);
        setLoading(false);
        if (result?.warning) {
            toast.custom(() => (
                <div className="flex items-start gap-3 w-[356px] bg-amber-500 rounded-xl px-5 py-4 shadow-xl shadow-amber-500/25 text-white">
                    <WarningCircleIcon size={22} weight="duotone" className="shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                        <p className="text-[13px] font-bold leading-none">Pacote criado com sucesso!</p>
                        <p className="text-[12px] font-medium opacity-90 leading-snug mt-1">{result.warning}</p>
                    </div>
                </div>
            ), { duration: 8000 });
        } else {
            toast.success('Pacote criado com sucesso!');
        }
        router.refresh();
    };

    const handleOpenChange = (v: boolean) => {
        setOpen(v);
        setError(null);
        setExcludedDivisions([]);
        setEventId('');
        setTenantId('');
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button pill size="sm" variant="outline" className="gap-2 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
                    <PlusIcon size={15} weight="bold" />
                    Criar Pacote
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Criar Pacote de Inscrições</DialogTitle>
                    <DialogDescription>
                        Ceda inscrições de um evento seu para outra academia.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    {/* Evento */}
                    <div className="space-y-2">
                        <label className="text-panel-sm font-semibold text-muted-foreground">
                            Evento<span className="text-destructive ml-0.5">*</span>
                        </label>
                        <Select value={eventId} onValueChange={(v) => { setEventId(v); }} name="event_id" required>
                            <SelectTrigger className="h-11 rounded-xl shadow-none">
                                <SelectValue placeholder="Selecione o evento" />
                            </SelectTrigger>
                            <SelectContent>
                                {ownedEvents.length === 0 ? (
                                    <SelectItem value="none" disabled>Nenhum evento ativo</SelectItem>
                                ) : (
                                    ownedEvents.map(ev => (
                                        <SelectItem key={ev.id} value={ev.id}>
                                            {ev.title} — {new Date(ev.event_date).toLocaleDateString('pt-BR')}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        <input type="hidden" name="event_id" value={eventId} />
                    </div>

                    {/* Academia beneficiada */}
                    <div className="space-y-2">
                        <label className="text-panel-sm font-semibold text-muted-foreground">
                            Academia beneficiada<span className="text-destructive ml-0.5">*</span>
                        </label>
                        <Select value={tenantId} onValueChange={(v) => { setTenantId(v); }} name="assigned_to_tenant_id" required>
                            <SelectTrigger className="h-11 rounded-xl shadow-none">
                                <SelectValue placeholder="Selecione a academia" />
                            </SelectTrigger>
                            <SelectContent>
                                {allTenants.map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <input type="hidden" name="assigned_to_tenant_id" value={tenantId} />
                    </div>

                    {/* Divisões excluídas */}
                    <div className="space-y-2">
                        <label className="text-panel-sm font-semibold text-muted-foreground">
                            Divisões não permitidas
                            <span className="ml-1 font-normal text-xs">(deixe vazio para permitir todas)</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {DIVISION_OPTIONS.map(div => {
                                const active = excludedDivisions.includes(div);
                                return (
                                    <button
                                        key={div}
                                        type="button"
                                        onClick={() => toggleDivision(div)}
                                        className={cn(
                                            'px-3 py-1.5 rounded-full text-panel-sm font-semibold border transition-all',
                                            active
                                                ? 'bg-destructive/10 text-destructive border-destructive/40'
                                                : 'bg-muted/40 text-muted-foreground border-border hover:border-destructive/40 hover:text-destructive'
                                        )}
                                    >
                                        {div}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* Quantidade */}
                        <div className="space-y-2">
                            <label className="text-panel-sm font-semibold text-muted-foreground">
                                Nº de inscrições<span className="text-destructive ml-0.5">*</span>
                            </label>
                            <Input
                                variant="lg"
                                name="total_credits"
                                type="number"
                                min={1}
                                placeholder="Ex: 5"
                                className="bg-background"
                                required
                                disabled={loading}
                            />
                        </div>

                        {/* Valor */}
                        <div className="space-y-2">
                            <label className="text-panel-sm font-semibold text-muted-foreground">
                                Valor cobrado (R$)
                            </label>
                            <Input
                                variant="lg"
                                name="price_paid"
                                type="number"
                                min={0}
                                step="0.01"
                                placeholder="0 = grátis"
                                className="bg-background"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Observação */}
                    <div className="space-y-2">
                        <label className="text-panel-sm font-semibold text-muted-foreground">
                            Observação
                        </label>
                        <Input
                            variant="lg"
                            name="notes"
                            placeholder="Opcional"
                            className="bg-background"
                            disabled={loading}
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-destructive/15 text-destructive text-panel-sm rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0 pt-2">
                        <Button pill type="button" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button pill type="submit" disabled={loading || !eventId || !tenantId} className="gap-2">
                            {loading && <SpinnerGapIcon size={16} weight="bold" className="animate-spin" />}
                            Criar Pacote
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
