'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { createAthleteAction } from '../actions';
import { formatCPF, validateCPF, normalizeNumeric, formatPhone } from '@/lib/validation';

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
    const [cpfValue, setCpfValue] = useState('');

    const [cpfError, setCpfError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
            // Ensure normalized values are sent
            formData.set('cpf', normalizeNumeric(cpfValue));

            const result = await createAthleteAction(formData);

            if (result?.error) {
                setError(result.error);
                setLoading(false);
                return;
            }

            router.push('/academia-equipe/dashboard/atletas');
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro ao cadastrar o atleta.');
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 relative">
            <div className="w-full max-w-md space-y-10">
                <div className="space-y-6">
                    <Link
                        href="/academia-equipe/dashboard/atletas"
                        className="text-ui font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center w-fit"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para a lista
                    </Link>

                    <div className="space-y-2 text-center">
                        <h1 className="text-h1">Novo Atleta</h1>
                        <p className="text-caption text-muted-foreground">
                            Preencha os dados para cadastrar um novo atleta.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-destructive/15 text-destructive text-ui rounded-lg text-center animate-in fade-in zoom-in duration-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        {/* Organização (Fixa) */}
                        <div className="space-y-2">
                            <label className="text-label text-muted-foreground">
                                Academia / Equipe
                            </label>
                            <Input variant="lg"
                                value={academyName}
                                className="bg-muted/30 border-none cursor-not-allowed font-bold text-foreground text-lg disabled:opacity-100"
                                disabled
                            />
                        </div>

                        {/* Mestre (oculto quando o atleta é o próprio mestre) */}
                        {!isMaster && (
                            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                <label className="text-label text-muted-foreground">
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
                                                className="text-label text-primary hover:underline font-medium"
                                            >
                                                Voltar para a lista de mestres registrados
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label htmlFor="full_name" className="text-label text-muted-foreground">
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
                            <label htmlFor="birth_date" className="text-label text-muted-foreground">
                                Data de Nascimento
                            </label>
                            <Input variant="lg"
                                id="birth_date"
                                name="birth_date"
                                type="date"
                                className="bg-background"
                                disabled={loading}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="sexo" className="text-label text-muted-foreground">Sexo</label>
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

                            <div className="space-y-2">
                                <label htmlFor="cpf" className="text-label text-muted-foreground">CPF</label>
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
                                    className={`bg-background h-12 text-ui rounded-xl shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 ${cpfError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    required
                                    disabled={loading}
                                />
                                {cpfError && <p className="text-label text-red-500">{cpfError}</p>}
                            </div>
                        </div>



                        <div className="space-y-2">
                            <label htmlFor="weight" className="text-label text-muted-foreground">
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

                        <div className="space-y-2">
                            <label htmlFor="belt_color" className="text-label text-muted-foreground">
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

                        {/* Cargos e Permissões */}
                        <div className="space-y-4 pt-4">
                            <h3 className="text-h3">
                                Cargos e Permissões
                            </h3>

                            <div className="space-y-4">
                                <div className="flex items-start space-x-3 p-4 bg-muted/40 rounded-2xl border-2 border-transparent hover:border-primary/10 transition-all">
                                    <input
                                        type="checkbox"
                                        id="is_responsible"
                                        name="is_responsible"
                                        className="mt-1 h-5 w-5 rounded-md border-2 border-muted bg-background checked:bg-primary checked:border-primary transition-all cursor-pointer"
                                        disabled={loading}
                                    />
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        className="grid gap-1.5 leading-none cursor-pointer select-none"
                                        onClick={() => {
                                            const el = document.getElementById('is_responsible') as HTMLInputElement;
                                            if (el) el.checked = !el.checked;
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                const el = document.getElementById('is_responsible') as HTMLInputElement;
                                                if (el) el.checked = !el.checked;
                                            }
                                        }}
                                    >
                                        <label htmlFor="is_responsible" className="text-ui font-bold leading-none cursor-pointer">
                                            Responsável pela Academia/Equipe
                                        </label>
                                        <p className="text-caption text-muted-foreground">
                                            Permite que este atleta gerencie os dados da academia e outros atletas.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-3 p-4 bg-muted/40 rounded-2xl border-2 border-transparent hover:border-primary/10 transition-all">
                                    <input
                                        type="checkbox"
                                        id="is_master"
                                        name="is_master"
                                        checked={isMaster}
                                        onChange={(e) => setIsMaster(e.target.checked)}
                                        className="mt-1 h-5 w-5 rounded-md border-2 border-muted bg-background checked:bg-primary checked:border-primary transition-all cursor-pointer"
                                        disabled={loading}
                                    />
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        className="grid gap-1.5 leading-none cursor-pointer select-none"
                                        onClick={() => setIsMaster(!isMaster)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setIsMaster(!isMaster);
                                            }
                                        }}
                                    >
                                        <label htmlFor="is_master" className="text-ui font-bold leading-none cursor-pointer">
                                            Mestre da Academia
                                        </label>
                                        <p className="text-caption text-muted-foreground">
                                            Define este atleta como mestre/instrutor principal da equipe.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-4 pt-4">
                        <Button pill type="submit"
                            className="w-full max-w-[320px] h-12  transition-all hover:opacity-90 active:scale-[0.98]"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Cadastrando...
                                </>
                            ) : (
                                'Cadastrar Atleta'
                            )}
                        </Button>
                    </div>
                </form>
            </div >
        </div >
    );
}
