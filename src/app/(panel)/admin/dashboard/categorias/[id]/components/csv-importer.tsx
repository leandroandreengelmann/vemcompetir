'use client';

import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileArrowUpIcon, SpinnerGapIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { importCategoriesBatch, CategoryRow } from '../../../../actions/categories';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CSVImporterProps {
    tableId: string;
}

export function CSVImporter({ tableId }: CSVImporterProps) {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<{ imported: number; duplicates: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setStats(null);

        try {
            const text = await file.text();
            const rows = parseCSV(text);

            if (rows.length === 0) {
                toast.error('Nenhuma linha válida encontrada no CSV.');
                setLoading(false);
                return;
            }

            const result = await importCategoriesBatch(tableId, rows);

            if (result.error) {
                toast.error(result.error);
            } else {
                if (result.success) {
                    setStats({
                        imported: result.imported || 0,
                        duplicates: result.duplicates || 0
                    });
                    toast.success('Importação concluída!');
                    router.refresh();
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            }
        } catch (error) {
            console.error(error);
            toast.error('Erro ao processar o arquivo.');
        } finally {
            setLoading(false);
        }
    };

    const parseCSV = (text: string): Partial<CategoryRow>[] => {
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length === 0) return [];

        // Detect separator
        const headerLine = lines[0];
        const separator = headerLine.includes(';') ? ';' : ',';

        const headers = headerLine.split(separator).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));

        // Map CSV headers to keys
        // Required: sexo, divisao_idade, idade, faixa, categoria_peso
        // Optional: peso_min_kg, peso_max_kg, uniforme, categoria_completa, tipo_pesagem (legado -> uniforme)

        const headerMap: Record<string, string> = {
            'sexo': 'sexo',
            'genero': 'sexo',
            'gênero': 'sexo',
            'divisao_idade': 'divisao_idade',
            'divisao': 'divisao_idade',
            'divisão': 'divisao_idade',
            'idade': 'idade',
            'age': 'idade',
            'faixa': 'faixa',
            'belt': 'faixa',
            'categoria_peso': 'categoria_peso',
            'peso': 'categoria_peso',
            'weight': 'categoria_peso',
            'peso_min_kg': 'peso_min_kg',
            'peso_min': 'peso_min_kg',
            'peso_max_kg': 'peso_max_kg',
            'peso_max': 'peso_max_kg',
            'uniforme': 'uniforme',
            'tipo_pesagem': 'uniforme',
            'categoria_completa': 'categoria_completa',
            'categoria': 'categoria_completa'
        };

        const mappedHeaders = headers.map(h => headerMap[h] || h);

        const dataStart = 1;
        const result: Partial<CategoryRow>[] = [];

        for (let i = dataStart; i < lines.length; i++) {
            const line = lines[i];
            // Basic split, might fail with quoted separators but assuming simple CSV per prompt examples
            const values = line.split(separator).map(v => v.trim().replace(/^"|"$/g, ''));

            if (values.length < 5) continue; // Skip malformed lines

            const row: any = {};
            mappedHeaders.forEach((key, index) => {
                let val = values[index];
                if (key === 'uniforme' && val === 'Kimono liso') val = 'Kimono'; // Normalization

                if (key === 'peso_min_kg' || key === 'peso_max_kg') {
                    // Normalize decimal , to .
                    if (val) val = val.replace(',', '.');
                    row[key] = val ? parseFloat(val) : null;
                } else if (key) {
                    row[key] = val;
                }
            });

            // Set default if missing
            if (!row.uniforme) row.uniforme = 'Kimono';

            // Required check
            if (row.sexo && row.divisao_idade && row.idade && row.faixa && row.categoria_peso) {
                result.push(row);
            }
        }

        return result;
    };

    return (
        <div className="border p-4 rounded-lg bg-muted/50">
            <h3 className="text-panel-sm font-semibold mb-2 flex items-center gap-2">
                <FileArrowUpIcon size={20} weight="duotone" />
                Importar CSV
            </h3>

            <div className="flex gap-4 items-end">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="csv_file" className="text-panel-sm font-medium leading-none">Arquivo (.csv)</Label>
                    <Input
                        id="csv_file"
                        type="file"
                        accept=".csv"
                        className="cursor-pointer bg-background pt-2.5"
                        variant="lg"
                        onChange={handleFileUpload}
                        ref={fileInputRef}
                        disabled={loading}
                    />
                </div>
                {loading && (
                    <div className="flex items-center text-panel-sm text-muted-foreground pb-4">
                        <SpinnerGapIcon size={20} weight="bold" className="mr-2 animate-spin" /> Processando...
                    </div>
                )}
            </div>

            {stats && (
                <div className="mt-4">
                    <Alert className={stats.duplicates > 0 ? "border-orange-500 text-orange-600 bg-orange-50" : "border-green-500 text-green-600 bg-green-50"}>
                        <WarningCircleIcon size={20} weight="duotone" />
                        <AlertTitle>Resultado da Importação</AlertTitle>
                        <AlertDescription>
                            {stats.imported} novas categorias inseridas.
                            {stats.duplicates > 0 && ` ${stats.duplicates} duplicadas ignoradas.`}
                        </AlertDescription>
                    </Alert>
                </div>
            )}

            <div className="mt-4 text-panel-sm text-muted-foreground">
                <p>Colunas obrigatórias: sexo, divisao_idade, idade, faixa, categoria_peso.</p>
                <p>Separadores aceitos: vírgula (,) ou ponto-e-vírgula (;).</p>
            </div>
        </div>
    );
}
