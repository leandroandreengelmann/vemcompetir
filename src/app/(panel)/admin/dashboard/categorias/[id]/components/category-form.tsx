'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { createCategoryRow, updateCategoryRow, CategoryRow } from '../../../../actions/categories';
import { SpinnerGapIcon } from '@phosphor-icons/react';

interface CategoryFormProps {
    tableId: string;
    initialData?: CategoryRow | null;
    onCancelEdit?: () => void;
    onSuccess?: () => void;
}

export function CategoryForm({ tableId, initialData, onCancelEdit, onSuccess }: CategoryFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form state
    const [formData, setFormData] = useState<Partial<CategoryRow>>({
        sexo: '', // Masculino | Feminino
        divisao_idade: '',
        idade: '',
        faixa: '',
        categoria_peso: '',
        peso_min_kg: null,
        peso_max_kg: null,
        uniforme: 'Kimono',
        categoria_completa: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                sexo: initialData.sexo,
                divisao_idade: initialData.divisao_idade,
                idade: initialData.idade,
                faixa: initialData.faixa,
                categoria_peso: initialData.categoria_peso,
                peso_min_kg: initialData.peso_min_kg,
                peso_max_kg: initialData.peso_max_kg,
                uniforme: initialData.uniforme,
                categoria_completa: initialData.categoria_completa
            });
        } else {
            setFormData({
                sexo: '',
                divisao_idade: '',
                idade: '',
                faixa: '',
                categoria_peso: '',
                peso_min_kg: null,
                peso_max_kg: null,
                uniforme: 'Kimono',
                categoria_completa: ''
            });
        }
    }, [initialData]);

    const handleChange = (field: keyof CategoryRow, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const generateFullName = () => {
        // {divisao_idade} • {idade_humanizada} • {sexo} • {faixa} • {categoria_peso} • {uniforme}
        const { divisao_idade, idade, sexo, faixa, categoria_peso, uniforme } = formData;

        if (!divisao_idade || !idade || !sexo || !faixa || !categoria_peso || !uniforme) {
            toast.warning('Preencha os campos obrigatórios para gerar o nome completo.');
            return;
        }

        let idadeHuman = idade;
        if (!idade.toLowerCase().includes('anos')) {
            if (/^\d+$/.test(idade)) idadeHuman = `${idade} anos`;
            else if (idade.includes('ou mais')) idadeHuman = idade.replace(/(\d+)\s*ou mais/, '$1 anos ou mais');
            else idadeHuman = idade.replace(/(\d+)/g, '$1 anos');
        }

        const fullName = `${divisao_idade} • ${idadeHuman} • ${sexo} • ${faixa} • ${categoria_peso} • ${uniforme}`;
        handleChange('categoria_completa', fullName);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Validations
        if (!formData.sexo || !formData.uniforme || !formData.divisao_idade || !formData.idade || !formData.faixa || !formData.categoria_peso) {
            toast.error('Preencha todos os campos obrigatórios.');
            setLoading(false);
            return;
        }

        try {
            let result;
            if (initialData) {
                result = await updateCategoryRow(initialData.id, tableId, formData);
            } else {
                result = await createCategoryRow(tableId, formData);
            }

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(initialData ? 'Categoria atualizada!' : 'Categoria adicionada!');
                if (!initialData) {
                    setFormData({
                        sexo: '',
                        divisao_idade: '',
                        idade: '',
                        faixa: '',
                        categoria_peso: '',
                        peso_min_kg: null,
                        peso_max_kg: null,
                        uniforme: 'Kimono',
                        categoria_completa: ''
                    });
                }
                router.refresh();
                if (onSuccess) onSuccess();
            }
        } catch (error) {
            toast.error('Erro ao salvar categoria.');
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        if (initialData && onCancelEdit) {
            onCancelEdit();
            return;
        }
        setFormData({
            sexo: '',
            divisao_idade: '',
            idade: '',
            faixa: '',
            categoria_peso: '',
            peso_min_kg: null,
            peso_max_kg: null,
            uniforme: 'Kimono',
            categoria_completa: ''
        });
    };

    return (
        <form onSubmit={handleSubmit} className={`space-y-4 border p-4 rounded-lg shadow-sm ${initialData ? 'bg-amber-50/50 border-amber-200' : 'bg-card'}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-panel-md font-semibold">
                    {initialData ? 'Editar Categoria' : 'Cadastro Manual'}
                </h3>
                {initialData && (
                    <Button variant="ghost" size="sm" onClick={onCancelEdit} type="button">Cancelar Edição</Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="sexo" className="text-panel-sm font-medium leading-none">Sexo *</Label>
                    <Select value={formData.sexo} onValueChange={(val) => handleChange('sexo', val)}>
                        <SelectTrigger id="sexo" className="h-12 rounded-xl px-4 bg-background">
                            <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Masculino">Masculino</SelectItem>
                            <SelectItem value="Feminino">Feminino</SelectItem>
                            <SelectItem value="Misto">Misto</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="uniforme" className="text-panel-sm font-medium leading-none">Uniforme *</Label>
                    <Select value={formData.uniforme} onValueChange={(val) => handleChange('uniforme', val)}>
                        <SelectTrigger id="uniforme" className="h-12 rounded-xl px-4 bg-background">
                            <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Kimono">Kimono</SelectItem>
                            <SelectItem value="No-Gi">No-Gi</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="categoria_peso" className="text-panel-sm font-medium leading-none">Categoria de Peso *</Label>
                    <Input variant="lg"
                        id="categoria_peso"
                        value={formData.categoria_peso}
                        onChange={(e) => handleChange('categoria_peso', e.target.value)}
                        placeholder="Ex: Galo, Leve, Pesado"
                        
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="divisao_idade" className="text-panel-sm font-medium leading-none">Divisão de Idade *</Label>
                    <Input variant="lg"
                        id="divisao_idade"
                        value={formData.divisao_idade}
                        onChange={(e) => handleChange('divisao_idade', e.target.value)}
                        placeholder="Ex: Juvenil 1, Adulto"
                        
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="idade" className="text-panel-sm font-medium leading-none">Idade (Descritivo) *</Label>
                    <Input variant="lg"
                        id="idade"
                        value={formData.idade}
                        onChange={(e) => handleChange('idade', e.target.value)}
                        placeholder="Ex: 16, 18 a 29"
                        
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="faixa" className="text-panel-sm font-medium leading-none">Faixa *</Label>
                    <Input variant="lg"
                        id="faixa"
                        value={formData.faixa}
                        onChange={(e) => handleChange('faixa', e.target.value)}
                        placeholder="Ex: Azul, Marrom"
                        
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="peso_min_kg" className="text-panel-sm font-medium leading-none">Peso Mín (kg)</Label>
                    <Input variant="lg"
                        id="peso_min_kg"
                        type="number"
                        step="0.01"
                        value={formData.peso_min_kg ?? ''}
                        onChange={(e) => handleChange('peso_min_kg', e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="0.00"
                        
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="peso_max_kg" className="text-panel-sm font-medium leading-none">Peso Máx (kg)</Label>
                    <Input variant="lg"
                        id="peso_max_kg"
                        type="number"
                        step="0.01"
                        value={formData.peso_max_kg ?? ''}
                        onChange={(e) => handleChange('peso_max_kg', e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="0.00"
                        
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="categoria_completa" className="text-panel-sm font-medium leading-none">Categoria Completa (Gerado Automaticamente)</Label>
                <div className="flex gap-2">
                    <Input variant="lg"
                        id="categoria_completa"
                        value={formData.categoria_completa}
                        onChange={(e) => handleChange('categoria_completa', e.target.value)}
                        placeholder="Preencha os campos ou digite manualmente"
                        
                    />
                    <Button type="button" variant="outline" pill onClick={generateFullName} className="h-12 px-6">gerar</Button>
                </div>
            </div>

            <div className="flex justify-center gap-4 pt-6">
                <Button type="button" variant="outline" pill onClick={handleClear} className="h-12 px-6">
                    {initialData ? 'Cancelar' : 'Limpar'}
                </Button>
                <Button
                    type="submit"
                    disabled={loading}
                    pill
                    className="w-full max-w-[320px] h-12 font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                >
                    {loading && <SpinnerGapIcon size={20} weight="bold" className="mr-2 animate-spin" />}
                    {initialData ? 'Salvar Edição' : 'Adicionar Categoria'}
                </Button>
            </div>
        </form>
    );
}
