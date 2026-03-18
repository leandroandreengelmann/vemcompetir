'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, CircleNotchIcon, TrashIcon, CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { updateAthleteAction, deleteAthleteAction, unlinkSuggestedMasterAction } from '../actions';
import { formatCPF, validateCPF, normalizeNumeric, formatPhone } from '@/lib/validation';
import { toast } from 'sonner';

interface EditAthleteFormProps {
    athlete: {
        id: string;
        full_name: string | null;
        email?: string;
        birth_date?: string | null;
        belt_color?: string | null;
        weight?: number | null;
        is_responsible?: boolean;
        is_master?: boolean;
        phone?: string | null;
        master_id?: string | null;
        master_name?: string | null;
        cpf?: string | null;
        sexo?: string | null;
    };
    masters: { id: string; full_name: string }[];
    suggestedMasters: string[];
    linkedSuggestions: string[];
    isGlobalAdmin?: boolean;
}

export default function EditAthleteForm({ athlete, masters, suggestedMasters = [], linkedSuggestions = [], isGlobalAdmin = false }: EditAthleteFormProps) {
    const router = useRouter();
    const [isPendingUnlink, startUnlink] = useTransition();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isManualMaster, setIsManualMaster] = useState(!!athlete.master_name && !athlete.master_id);
    const [isMasterChecked, setIsMasterChecked] = useState(!!athlete.is_master);
    const [isResponsibleChecked, setIsResponsibleChecked] = useState(!!athlete.is_responsible);
    const [selectedSuggestedMasterName, setSelectedSuggestedMasterName] = useState<string>('');
    const [cpfValue, setCpfValue] = useState(athlete.cpf ? formatCPF(athlete.cpf) : '');
    const [phoneValue, setPhoneValue] = useState(athlete.phone ? formatPhone(athlete.phone) : '');
    const [cpfError, setCpfError] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const handleSubmit = async (e: { preventDefault(): void; currentTarget: HTMLFormElement }) => {
        e.preventDefault();

        if (cpfValue && !validateCPF(cpfValue)) {
            setCpfError('CPF inválido.');
            setError('Por favor, corrija o CPF informado.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const formData = new FormData(e.currentTarget);
            formData.append('id', athlete.id);
            formData.set('cpf', normalizeNumeric(cpfValue));
            formData.set('phone', normalizeNumeric(phoneValue));

            const result = await updateAthleteAction(formData);

            if (result?.error) {
                setError(result.error);
                setLoading(false);
                return;
            }

            toast.custom(() => (
                <div className="flex items-center gap-3 w-[356px] bg-emerald-600 rounded-xl px-5 py-4 shadow-xl shadow-emerald-600/20 text-white animate-in slide-in-from-right-2 z-[100]">
                    <CheckCircleIcon size={24} weight="duotone" className="shrink-0" />
                    <p className="text-panel-sm font-bold">Atleta atualizado com sucesso!</p>
                </div>
            ), { duration: 4000 });

            router.push('/academia-equipe/dashboard/atletas');
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro ao atualizar.');
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            const result = await deleteAthleteAction(athlete.id);
            if (result?.error) {
                setError(result.error);
                setLoading(false);
                return;
            }

            toast.custom(() => (
                <div className="flex items-center gap-3 w-[356px] bg-foreground rounded-xl px-5 py-4 shadow-xl text-background animate-in slide-in-from-right-2 z-[100]">
                    <WarningCircleIcon size={24} weight="duotone" className="shrink-0" />
                    <p className="text-panel-sm font-bold">Atleta excluído.</p>
                </div>
            ), { duration: 4000 });

            router.push('/academia-equipe/dashboard/atletas');
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Erro ao excluir.');
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-8 px-4 relative">
            <div className="w-full max-w-2xl space-y-8">
                <div className="space-y-4">
                    <Link
                        href="/academia-equipe/dashboard/atletas"
                        className="text-panel-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center w-fit"
                    >
                        <ArrowLeftIcon size={24} weight="duotone" className="mr-2" />
                        Voltar para a lista
                    </Link>

                    <div className="space-y-1 text-center">
                        <h1 className="text-panel-lg font-bold tracking-tight">Editar Atleta</h1>
                        <p className="text-panel-sm text-muted-foreground">
                            Atualize os dados do atleta.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-destructive/15 text-destructive text-panel-sm rounded-lg text-center animate-in fade-in zoom-in duration-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Linha 1: Mestre (full width) */}
                    {!isMasterChecked && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                            <label className="text-panel-sm font-semibold text-muted-foreground">
                                Mestre / Professor Responsável
                            </label>
                            {!isManualMaster && masters.length > 0 ? (
                                <Select
                                    name="master_id"
                                    defaultValue={athlete.master_id || undefined}
                                    disabled={loading}
                                    onValueChange={(value) => {
                                        if (value === 'manual') setIsManualMaster(true);
                                    }}
                                >
                                    <SelectTrigger className="bg-background h-12 rounded-xl focus:ring-0 focus:ring-offset-0 transition-all">
                                        <SelectValue placeholder="Selecione o mestre" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="none">Sem mestre definido</SelectItem>
                                        {masters.map((m) => (
                                            <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                                        ))}
                                        <SelectItem value="manual" className="font-semibold text-primary">Meu mestre não está na lista</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="space-y-2">
                                    <Input variant="lg"
                                        name="master_name"
                                        defaultValue={athlete.master_name || ''}
                                        placeholder="Digite o nome do mestre"
                                        aria-label="Introduza o nome do mestre"
                                        className="bg-background"
                                        required={isManualMaster}
                                        disabled={loading}
                                    />
                                    {masters.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setIsManualMaster(false)}
                                            className="text-panel-sm font-semibold text-primary hover:underline"
                                        >
                                            Voltar para a lista
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Linha 2: Nome + Data de Nascimento */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="full_name" className="text-panel-sm font-semibold text-muted-foreground">
                                Nome Completo
                            </label>
                            <Input variant="lg"
                                id="full_name"
                                name="full_name"
                                defaultValue={athlete.full_name || ''}
                                className="bg-background"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="birth_date" className="text-panel-sm font-semibold text-muted-foreground">
                                Data de Nascimento
                            </label>
                            <Input variant="lg"
                                id="birth_date"
                                name="birth_date"
                                type="date"
                                defaultValue={athlete.birth_date || ''}
                                className="bg-background"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Linha 3: Sexo + CPF + Peso + Faixa */}
                    <div className="grid grid-cols-6 gap-4">
                        <div className="col-span-2 space-y-2">
                            <label htmlFor="sexo" className="text-panel-sm font-semibold text-muted-foreground">Sexo</label>
                            <Select name="sexo" defaultValue={athlete.sexo || undefined} required disabled={loading}>
                                <SelectTrigger className="bg-background h-12 rounded-xl focus:ring-0 focus:ring-offset-0">
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="Masculino">Masculino</SelectItem>
                                    <SelectItem value="Feminino">Feminino</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-2 space-y-2">
                            <label htmlFor="cpf" className="text-panel-sm font-semibold text-muted-foreground">CPF</label>
                            <Input variant="lg"
                                id="cpf"
                                name="cpf"
                                value={cpfValue}
                                onChange={(e) => {
                                    const formatted = formatCPF(e.target.value);
                                    setCpfValue(formatted);
                                    if (formatted.length === 14) {
                                        if (!validateCPF(formatted)) {
                                            setCpfError('CPF inválido');
                                        } else {
                                            setCpfError(null);
                                        }
                                    } else {
                                        setCpfError(null);
                                    }
                                }}
                                placeholder="000.000.000-00"
                                className={`bg-background h-12 text-panel-sm rounded-xl shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 ${cpfError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                required
                                disabled={loading}
                            />
                            {cpfError && <p className="text-panel-sm font-semibold text-red-500">{cpfError}</p>}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="weight" className="text-panel-sm font-semibold text-muted-foreground">
                                Peso (kg)
                            </label>
                            <Input variant="lg"
                                id="weight"
                                name="weight"
                                type="number"
                                step="0.1"
                                defaultValue={athlete.weight || ''}
                                placeholder="Ex: 85.5"
                                className="bg-background"
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="belt_color" className="text-panel-sm font-semibold text-muted-foreground">
                                Faixa
                            </label>
                            <Select name="belt_color" defaultValue={athlete.belt_color || undefined} disabled={loading}>
                                <SelectTrigger className="bg-background h-12 rounded-xl focus:ring-0 focus:ring-offset-0">
                                    <SelectValue placeholder="Selecione a faixa" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-muted">
                                    <SelectItem value="Branca">Branca</SelectItem>
                                    <SelectItem value="Cinza e branca">Cinza e branca</SelectItem>
                                    <SelectItem value="Cinza">Cinza</SelectItem>
                                    <SelectItem value="Cinza e preta">Cinza e preta</SelectItem>
                                    <SelectItem value="Amarela e branca">Amarela e branca</SelectItem>
                                    <SelectItem value="Amarela">Amarela</SelectItem>
                                    <SelectItem value="Amarela e preta">Amarela e preta</SelectItem>
                                    <SelectItem value="Laranja e branca">Laranja e branca</SelectItem>
                                    <SelectItem value="Laranja">Laranja</SelectItem>
                                    <SelectItem value="Laranja e preta">Laranja e preta</SelectItem>
                                    <SelectItem value="Verde e branca">Verde e branca</SelectItem>
                                    <SelectItem value="Verde">Verde</SelectItem>
                                    <SelectItem value="Verde e preta">Verde e preta</SelectItem>
                                    <SelectItem value="Azul">Azul</SelectItem>
                                    <SelectItem value="Roxa">Roxa</SelectItem>
                                    <SelectItem value="Marrom">Marrom</SelectItem>
                                    <SelectItem value="Preta">Preta</SelectItem>
                                    <SelectItem value="Coral">Coral</SelectItem>
                                    <SelectItem value="Vermelha">Vermelha</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Telefone — só aparece se o atleta tem conta real */}
                    {!athlete.email?.includes('@dummy.competir.com') && (
                        <div className="space-y-2">
                            <label htmlFor="phone" className="text-panel-sm font-semibold text-muted-foreground">
                                Telefone/WhatsApp
                            </label>
                            <Input variant="lg"
                                id="phone"
                                name="phone"
                                type="tel"
                                value={phoneValue}
                                onChange={(e) => setPhoneValue(formatPhone(e.target.value))}
                                placeholder="(00) 00000-0000"
                                className="bg-background h-12 rounded-xl shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                disabled={loading}
                            />
                        </div>
                    )}

                    {/* Linha 4: Cargos e Permissões lado a lado */}
                    <div className="pt-2">
                        {isGlobalAdmin ? (
                            <div className="space-y-2">
                                <label className="text-panel-sm font-semibold text-muted-foreground">Cargos e Permissões</label>
                                {(!athlete.is_responsible && !athlete.is_master) ? (
                                    <p className="text-panel-sm text-muted-foreground italic p-4">
                                        Este atleta não possui cargos especiais.
                                    </p>
                                ) : (
                                    <div className="flex gap-2 flex-wrap p-4 bg-muted/20 border rounded-2xl">
                                        {athlete.is_responsible && <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">Responsável pela Equipe</Badge>}
                                        {athlete.is_master && <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">Mestre da Academia</Badge>}
                                    </div>
                                )}
                                {athlete.is_responsible && <input type="hidden" name="is_responsible" value="on" />}
                                {athlete.is_master && <input type="hidden" name="is_master" value="on" />}
                                {athlete.master_id && <input type="hidden" name="master_id" value={athlete.master_id} />}
                                {athlete.master_name && <input type="hidden" name="master_name" value={athlete.master_name} />}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-start space-x-3 p-4 bg-muted/40 rounded-2xl border-2 border-transparent hover:border-primary/10 transition-all">
                                    <Checkbox
                                        id="is_responsible"
                                        name="is_responsible"
                                        checked={isResponsibleChecked}
                                        onCheckedChange={(v) => setIsResponsibleChecked(!!v)}
                                        disabled={loading}
                                        className="mt-1"
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <label htmlFor="is_responsible" className="text-panel-sm font-bold leading-none cursor-pointer">
                                            Responsável pela Academia/Equipe
                                        </label>
                                        <p className="text-panel-sm text-muted-foreground">
                                            Permite que este atleta gerencie os dados da academia e outros atletas.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col space-y-3 p-4 bg-muted/40 rounded-2xl border-2 border-transparent hover:border-primary/10 transition-all">
                                    <div className="flex items-start space-x-3">
                                        <Checkbox
                                            id="is_master"
                                            name="is_master"
                                            checked={isMasterChecked}
                                            onCheckedChange={(v) => setIsMasterChecked(!!v)}
                                            disabled={loading}
                                            className="mt-1"
                                        />
                                        <div className="grid gap-1.5 leading-none">
                                            <label htmlFor="is_master" className="text-panel-sm font-bold leading-none cursor-pointer">
                                                Mestre da Academia
                                            </label>
                                            <p className="text-panel-sm text-muted-foreground">
                                                Define este atleta como mestre/instrutor principal da equipe.
                                            </p>
                                        </div>
                                    </div>

                                    {isMasterChecked && (
                                        <>
                                            {linkedSuggestions.length > 0 ? (
                                                <div className="pl-8 pt-2 animate-in slide-in-from-top-2 duration-300">
                                                    <div className="p-3 bg-muted/50 border rounded-xl flex items-center justify-between gap-4">
                                                        <div className="min-w-0">
                                                            <p className="text-panel-sm font-medium text-muted-foreground">Vinculado à sugestão:</p>
                                                            <p className="text-panel-sm font-bold text-foreground truncate">{linkedSuggestions[0]}</p>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            pill
                                                            className="h-8 px-4 text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive hover:text-white transition-all shrink-0 shadow-sm"
                                                            disabled={isPendingUnlink || loading}
                                                            onClick={() => {
                                                                startUnlink(async () => {
                                                                    const res = await unlinkSuggestedMasterAction(athlete.id, linkedSuggestions[0]);
                                                                    if (res.error) {
                                                                        toast.custom(() => (
                                                                            <div className="flex items-center gap-3 w-[356px] bg-red-600 rounded-xl px-5 py-4 shadow-xl shadow-red-600/20 text-white animate-in slide-in-from-right-2 z-[100]">
                                                                                <WarningCircleIcon size={24} weight="duotone" className="shrink-0" />
                                                                                <p className="text-panel-sm font-bold">{res.error}</p>
                                                                            </div>
                                                                        ), { duration: 5000 });
                                                                    } else {
                                                                        toast.custom(() => (
                                                                            <div className="flex items-center gap-3 w-[356px] bg-emerald-600 rounded-xl px-5 py-4 shadow-xl shadow-emerald-600/20 text-white animate-in slide-in-from-right-2 z-[100]">
                                                                                <CheckCircleIcon size={24} weight="duotone" className="shrink-0" />
                                                                                <p className="text-panel-sm font-bold">Desvinculado com sucesso!</p>
                                                                            </div>
                                                                        ), { duration: 4000 });
                                                                    }
                                                                });
                                                            }}
                                                        >
                                                            {isPendingUnlink ? <CircleNotchIcon size={16} weight="bold" className="animate-spin" /> : 'Desvincular'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : suggestedMasters.length > 0 ? (
                                                <div className="pl-8 pt-2 animate-in slide-in-from-top-2 duration-300">
                                                    <label className="text-panel-sm font-semibold text-muted-foreground mb-2 block">
                                                        Vincular Sugestão de Alunos?
                                                    </label>
                                                    <p className="text-xs text-muted-foreground mb-3">
                                                        Alunos desta equipe citaram estes nomes. Se este for o mestre citado, escolha na lista para vinculá-los automaticamente.
                                                    </p>
                                                    <Select
                                                        value={selectedSuggestedMasterName}
                                                        onValueChange={setSelectedSuggestedMasterName}
                                                        disabled={loading}
                                                    >
                                                        <SelectTrigger className="bg-background rounded-xl focus:ring-primary focus:border-primary h-12 text-panel-sm px-4">
                                                            <SelectValue placeholder="Não vincular nenhum nome sugerido" />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl">
                                                            <SelectItem value="none" className="text-muted-foreground italic">Não vincular nenhum nome sugerido</SelectItem>
                                                            {suggestedMasters.map((name, idx) => (
                                                                <SelectItem key={idx} value={name}>
                                                                    Vincular a sugestão: "{name}"
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <input type="hidden" name="suggested_master_name" value={selectedSuggestedMasterName !== 'none' ? selectedSuggestedMasterName : ''} />
                                                </div>
                                            ) : null}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Botões */}
                    <div className="flex flex-row items-center justify-center gap-4 pt-2">
                        <Button pill type="button"
                            variant="destructive"
                            className="flex-1 h-12 font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                            disabled={loading}
                            onClick={() => setDeleteDialogOpen(true)}
                        >
                            <TrashIcon size={16} weight="duotone" className="mr-2" />
                            Excluir
                        </Button>

                        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                            <DialogContent showCloseButton={false}>
                                <DialogHeader>
                                    <DialogTitle>Excluir atleta?</DialogTitle>
                                    <DialogDescription>
                                        Esta ação não pode ser desfeita. O atleta <strong>{athlete.full_name}</strong> será removido permanentemente da plataforma, incluindo todas as suas inscrições.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <Button pill variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                                        Cancelar
                                    </Button>
                                    <Button pill variant="destructive" onClick={handleDelete}>
                                        Sim, excluir
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Button pill type="submit"
                            className="flex-1 h-12 font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <CircleNotchIcon size={16} weight="bold" className="mr-2 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                'Salvar Alterações'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
