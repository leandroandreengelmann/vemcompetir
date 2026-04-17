'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, CircleNotchIcon, CheckCircleIcon } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { showToast } from '@/lib/toast';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { createAthleteAction } from '../actions';
import { formatCPF, validateCPF, normalizeNumeric, formatPhone } from '@/lib/validation';

function isUnder18(dateStr: string): boolean {
    if (!dateStr) return false;
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age < 18;
}

interface Master {
    id: string;
    full_name: string;
}

interface NovoAtletaFormProps {
    academyName: string;
    masters: Master[];
}

export default function NovoAtletaForm({ academyName, masters }: NovoAtletaFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isManualMaster, setIsManualMaster] = useState(masters.length === 0);
    const [isMaster, setIsMaster] = useState(false);
    const [isResponsible, setIsResponsible] = useState(false);
    const [cpfValue, setCpfValue] = useState('');
    const [cpfError, setCpfError] = useState<string | null>(null);
    const [birthDateValue, setBirthDateValue] = useState('');
    const [hasGuardian, setHasGuardian] = useState(false);
    const [guardianCpfValue, setGuardianCpfValue] = useState('');
    const [guardianPhoneValue, setGuardianPhoneValue] = useState('');

    const isMinor = isUnder18(birthDateValue);

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
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
            formData.set('cpf', normalizeNumeric(cpfValue));

            const result = await createAthleteAction(formData);

            if (result?.error) {
                setError(result.error);
                setLoading(false);
                return;
            }

            showToast.success('Atleta cadastrado', 'O novo atleta já aparece na lista.');
            router.push('/academia-equipe/dashboard/atletas');
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro ao cadastrar o atleta.');
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
                        <h1 className="text-panel-lg font-bold">Novo Atleta</h1>
                        <p className="text-panel-sm text-muted-foreground">
                            Preencha os dados para cadastrar um novo atleta.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-destructive/15 text-destructive text-panel-sm rounded-lg text-center animate-in fade-in zoom-in duration-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Linha 1: Academia + Mestre */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-panel-sm font-semibold text-muted-foreground">
                                Academia / Equipe
                            </label>
                            <Input variant="lg"
                                value={academyName}
                                className="bg-muted/30 border-none cursor-not-allowed font-bold text-foreground text-panel-sm disabled:opacity-100"
                                disabled
                            />
                        </div>

                        {!isMaster ? (
                            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                <label className="text-panel-sm font-semibold text-muted-foreground">
                                    Mestre / Professor
                                </label>
                                {!isManualMaster && masters.length > 0 ? (
                                    <Select
                                        name="master_id"
                                        required
                                        disabled={loading}
                                        onValueChange={(value) => {
                                            if (value === 'manual') setIsManualMaster(true);
                                        }}
                                    >
                                        <SelectTrigger className="bg-background h-12 rounded-xl focus:ring-0 focus:ring-offset-0 transition-all">
                                            <SelectValue placeholder="Selecione o mestre" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-muted">
                                            {masters.map((master) => (
                                                <SelectItem key={master.id} value={master.id} className="rounded-lg">
                                                    {master.full_name}
                                                </SelectItem>
                                            ))}
                                            <SelectItem value="manual" className="font-semibold text-primary">Meu mestre não está na lista</SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="space-y-2">
                                        <Input variant="lg"
                                            name="master_name"
                                            placeholder="Digite o nome do mestre"
                                            aria-label="Introduza o nome do mestre"
                                            className="bg-background"
                                            required
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
                        ) : (
                            <div />
                        )}
                    </div>

                    {/* Linha 2: Nome + Data de Nascimento */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="full_name" className="text-panel-sm font-semibold text-muted-foreground">
                                Nome Completo do Atleta
                            </label>
                            <Input variant="lg"
                                id="full_name"
                                name="full_name"
                                placeholder="Ex: João Silva"
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
                                className="bg-background"
                                disabled={loading}
                                value={birthDateValue}
                                onChange={(e) => {
                                    setBirthDateValue(e.target.value);
                                    if (!isUnder18(e.target.value)) setHasGuardian(false);
                                }}
                            />
                        </div>
                    </div>

                    {/* Responsável Legal — visível apenas para menores de 18 */}
                    {isMinor && (
                        <div className="border-2 border-amber-200 bg-amber-50/40 rounded-2xl p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-start space-x-3">
                                <Checkbox
                                    id="has_guardian"
                                    name="has_guardian"
                                    checked={hasGuardian}
                                    onCheckedChange={(v) => setHasGuardian(!!v)}
                                    disabled={loading}
                                    className="mt-1"
                                />
                                <div>
                                    <label htmlFor="has_guardian" className="text-panel-sm font-bold leading-none cursor-pointer text-amber-900">
                                        Adicionar responsável legal
                                    </label>
                                    <p className="text-panel-sm text-amber-700 mt-1">
                                        Atleta menor de 18 anos. Cadastre os dados do responsável legal.
                                    </p>
                                </div>
                            </div>

                            {hasGuardian && (
                                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                    <div className="space-y-2">
                                        <label className="text-panel-sm font-semibold text-muted-foreground">Vínculo com o atleta (opcional)</label>
                                        <Select name="guardian_relationship" disabled={loading}>
                                            <SelectTrigger className="bg-background h-12 rounded-xl focus:ring-0 focus:ring-offset-0">
                                                <SelectValue placeholder="Selecione o vínculo" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="pai">Pai</SelectItem>
                                                <SelectItem value="mae">Mãe</SelectItem>
                                                <SelectItem value="irmao">Irmão / Irmã</SelectItem>
                                                <SelectItem value="tio">Tio / Tia</SelectItem>
                                                <SelectItem value="padrinho">Padrinho / Madrinha</SelectItem>
                                                <SelectItem value="outro">Outro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="guardian_name" className="text-panel-sm font-semibold text-muted-foreground">
                                            Nome completo <span className="text-destructive ml-0.5">*</span>
                                        </label>
                                        <Input variant="lg"
                                            id="guardian_name"
                                            name="guardian_name"
                                            placeholder="Nome do responsável"
                                            className="bg-background"
                                            required={hasGuardian}
                                            disabled={loading}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label htmlFor="guardian_cpf" className="text-panel-sm font-semibold text-muted-foreground">
                                                CPF <span className="text-destructive ml-0.5">*</span>
                                            </label>
                                            <Input variant="lg"
                                                id="guardian_cpf"
                                                name="guardian_cpf"
                                                value={guardianCpfValue}
                                                onChange={(e) => setGuardianCpfValue(formatCPF(e.target.value))}
                                                placeholder="000.000.000-00"
                                                className="bg-background"
                                                required={hasGuardian}
                                                disabled={loading}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="guardian_phone" className="text-panel-sm font-semibold text-muted-foreground">
                                                Telefone / WhatsApp <span className="text-destructive ml-0.5">*</span>
                                            </label>
                                            <Input variant="lg"
                                                id="guardian_phone"
                                                name="guardian_phone"
                                                value={guardianPhoneValue}
                                                onChange={(e) => setGuardianPhoneValue(formatPhone(e.target.value))}
                                                placeholder="(00) 00000-0000"
                                                className="bg-background"
                                                required={hasGuardian}
                                                disabled={loading}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Linha 3: Sexo + CPF + Peso + Faixa */}
                    <div className="grid grid-cols-6 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="sexo" className="text-panel-sm font-semibold text-muted-foreground">Sexo</label>
                            <Select name="sexo" required disabled={loading}>
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
                                placeholder="Ex: 85.5"
                                className="bg-background"
                                disabled={loading}
                            />
                        </div>

                        <div className="col-span-2 space-y-2">
                            <label htmlFor="belt_color" className="text-panel-sm font-semibold text-muted-foreground">
                                Faixa
                            </label>
                            <Select name="belt_color" disabled={loading}>
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

                    {/* Linha 4: Cargos e Permissões lado a lado */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="flex items-start space-x-3 p-4 bg-muted/40 rounded-2xl border-2 border-transparent hover:border-primary/10 transition-all">
                            <Checkbox
                                id="is_responsible"
                                name="is_responsible"
                                checked={isResponsible}
                                onCheckedChange={(v) => setIsResponsible(!!v)}
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

                        <div className="flex items-start space-x-3 p-4 bg-muted/40 rounded-2xl border-2 border-transparent hover:border-primary/10 transition-all">
                            <Checkbox
                                id="is_master"
                                name="is_master"
                                checked={isMaster}
                                onCheckedChange={(v) => setIsMaster(!!v)}
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
                    </div>

                    <div className="flex flex-col items-center gap-4 pt-2">
                        <Button pill type="submit"
                            className="w-full max-w-[320px] h-12 transition-all hover:opacity-90 active:scale-[0.98]"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <CircleNotchIcon size={20} weight="bold" className="mr-2 animate-spin" />
                                    Cadastrando...
                                </>
                            ) : (
                                'Cadastrar Atleta'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
