'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircleIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { claimAthleteAction } from './actions';

interface Master {
    id: string;
    full_name: string;
}

interface ClaimAthleteButtonProps {
    athleteId: string;
    athleteName: string;
    currentMasterName: string | null;
    masters: Master[];
}

export function ClaimAthleteButton({ athleteId, athleteName, currentMasterName, masters }: ClaimAthleteButtonProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 1 mestre → pré-selecionado; 2+ → sem seleção inicial (obrigatório escolher)
    const [selectedMasterId, setSelectedMasterId] = useState(masters.length === 1 ? masters[0].id : '');

    const mustChooseMaster = masters.length >= 2;
    const canConfirm = !mustChooseMaster || selectedMasterId !== '';

    const handleConfirm = async () => {
        if (!canConfirm) return;
        setLoading(true);
        setError(null);

        const master = masters.find(m => m.id === selectedMasterId);
        const masterId = master?.id ?? null;
        const masterName = master?.full_name ?? null;

        const result = await claimAthleteAction(athleteId, masterId, masterName);
        if (result?.error) {
            setError(result.error);
            setLoading(false);
            return;
        }
        setOpen(false);
        router.refresh();
    };

    const handleOpenChange = (v: boolean) => {
        setOpen(v);
        setError(null);
        if (v) setSelectedMasterId(masters.length === 1 ? masters[0].id : '');
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    pill
                    size="sm"
                    variant="outline"
                    className="h-9 gap-2 font-medium border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                >
                    <CheckCircleIcon size={16} weight="duotone" />
                    Este é meu atleta
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle>Confirmar vínculo</DialogTitle>
                    <DialogDescription>
                        Vincular <b>{athleteName}</b> à sua academia.
                        {mustChooseMaster && ' Selecione o mestre responsável para continuar.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Mestre atual informado pelo atleta */}
                    {currentMasterName && (
                        <div className="rounded-lg bg-muted/50 px-4 py-3 text-panel-sm">
                            <span className="text-muted-foreground">Mestre informado pelo atleta: </span>
                            <span className="font-medium">{currentMasterName}</span>
                        </div>
                    )}

                    {/* 1 mestre → mostra fixo */}
                    {masters.length === 1 && (
                        <div className="space-y-2">
                            <Label className="text-panel-sm font-medium">Mestre</Label>
                            <div className="h-11 rounded-xl border bg-muted/30 px-3 flex items-center text-panel-sm font-medium">
                                {masters[0].full_name}
                            </div>
                        </div>
                    )}

                    {/* 2+ mestres → obrigatório escolher */}
                    {masters.length >= 2 && (
                        <div className="space-y-2">
                            <Label className="text-panel-sm font-medium">
                                Mestre <span className="text-destructive">*</span>
                            </Label>
                            <Select value={selectedMasterId} onValueChange={setSelectedMasterId}>
                                <SelectTrigger className="h-11 rounded-xl shadow-none">
                                    <SelectValue placeholder="Selecione o mestre responsável" />
                                </SelectTrigger>
                                <SelectContent>
                                    {masters.map(m => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.full_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Sem mestres → informa que mantém o digitado */}
                    {masters.length === 0 && currentMasterName && (
                        <p className="text-panel-sm text-muted-foreground">
                            O mestre informado pelo atleta será mantido.
                        </p>
                    )}
                </div>

                {error && (
                    <div className="p-3 bg-destructive/15 text-destructive text-panel-sm rounded-lg text-center">
                        {error}
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button pill variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button pill onClick={handleConfirm} disabled={loading || !canConfirm} className="gap-2">
                        {loading && <SpinnerGapIcon size={16} weight="bold" className="animate-spin" />}
                        Confirmar vínculo
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
