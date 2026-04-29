'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileArrowUpIcon, UploadSimpleIcon, FileCsvIcon, XIcon } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { createImport } from '../actions';
import { parseCsv, type ParsedCsv } from '../lib/parse-csv';

export function UploadCsvDialog() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [filename, setFilename] = useState<string | null>(null);
    const [parsed, setParsed] = useState<ParsedCsv | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const previewRows = useMemo(() => parsed?.rows.slice(0, 8) ?? [], [parsed]);

    function reset() {
        setName('');
        setDescription('');
        setFilename(null);
        setParsed(null);
        if (fileRef.current) fileRef.current.value = '';
    }

    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            const result = parseCsv(text);
            if (!result.headers.length || !result.rows.length) {
                toast.error('CSV vazio ou sem cabeçalho.');
                return;
            }
            setParsed(result);
            setFilename(file.name);
            if (!name) setName(file.name.replace(/\.csv$/i, ''));
        } catch (err) {
            console.error(err);
            toast.error('Erro ao ler o arquivo.');
        }
    }

    function clearFile() {
        setParsed(null);
        setFilename(null);
        if (fileRef.current) fileRef.current.value = '';
    }

    async function handleSubmit() {
        if (!parsed) return toast.error('Envie um CSV.');
        if (!name.trim()) return toast.error('Dê um nome para esse import.');
        setLoading(true);
        try {
            const result = await createImport({
                name,
                description,
                filename: filename ?? undefined,
                separator: parsed.separator,
                headers: parsed.headers,
                rows: parsed.rows,
            });
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('CSV importado!');
                setOpen(false);
                reset();
                router.refresh();
            }
        } catch (err) {
            console.error(err);
            toast.error('Erro ao importar.');
        } finally {
            setLoading(false);
        }
    }

    const sepLabel = parsed?.separator === '\t' ? '\\t (tab)' : parsed?.separator;

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                setOpen(o);
                if (!o) reset();
            }}
        >
            <DialogTrigger asChild>
                <Button pill>
                    <UploadSimpleIcon size={20} weight="bold" className="mr-2" />
                    Enviar CSV
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <DialogTitle>Enviar CSV de Categorias</DialogTitle>
                    <DialogDescription>
                        Aceita qualquer formato. As linhas são guardadas exatamente como vieram, sem afetar o sistema.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    {/* Step 1: arquivo */}
                    <section className="space-y-2">
                        <div className="flex items-baseline justify-between">
                            <h3 className="text-sm font-semibold">1. Arquivo</h3>
                            {parsed && (
                                <button
                                    type="button"
                                    onClick={clearFile}
                                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                                >
                                    <XIcon size={12} weight="bold" /> Trocar arquivo
                                </button>
                            )}
                        </div>

                        {!parsed ? (
                            <label
                                htmlFor="jj_lab_file"
                                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-input rounded-xl p-8 cursor-pointer hover:bg-muted/30 transition-colors"
                            >
                                <FileArrowUpIcon size={32} weight="duotone" className="text-muted-foreground" />
                                <span className="text-sm font-medium">Clique para selecionar um CSV</span>
                                <span className="text-xs text-muted-foreground">.csv até qualquer tamanho</span>
                                <Input
                                    id="jj_lab_file"
                                    type="file"
                                    accept=".csv,text/csv"
                                    ref={fileRef}
                                    onChange={handleFile}
                                    className="hidden"
                                />
                            </label>
                        ) : (
                            <div className="flex items-center gap-3 border rounded-xl px-4 py-3 bg-muted/30">
                                <FileCsvIcon size={28} weight="duotone" className="text-primary shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{filename}</p>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                        <Badge variant="outline" className="rounded-full text-[10px] py-0 px-2">
                                            {parsed.rows.length} linhas
                                        </Badge>
                                        <Badge variant="outline" className="rounded-full text-[10px] py-0 px-2">
                                            {parsed.headers.length} colunas
                                        </Badge>
                                        <Badge variant="outline" className="rounded-full text-[10px] py-0 px-2">
                                            sep: <span className="ml-1 font-mono">{sepLabel}</span>
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Step 2: metadados */}
                    {parsed && (
                        <section className="space-y-3">
                            <h3 className="text-sm font-semibold">2. Identificação</h3>
                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="jj_lab_name" className="text-xs leading-none text-muted-foreground">
                                        Nome
                                    </Label>
                                    <Input
                                        id="jj_lab_name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Ex: Categorias CBJJ 2026"
                                        variant="lg"
                                        className="bg-background"
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="jj_lab_desc" className="text-xs leading-none text-muted-foreground">
                                        Descrição (opcional)
                                    </Label>
                                    <Input
                                        id="jj_lab_desc"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="De onde veio, formato, observações..."
                                        variant="lg"
                                        className="bg-background"
                                    />
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Step 3: preview */}
                    {parsed && (
                        <section className="space-y-2">
                            <div className="flex items-baseline justify-between">
                                <h3 className="text-sm font-semibold">3. Pré-visualização</h3>
                                <span className="text-xs text-muted-foreground">
                                    {previewRows.length} de {parsed.rows.length} linhas
                                </span>
                            </div>
                            <div className="border rounded-xl overflow-hidden bg-background">
                                <div className="overflow-auto max-h-72">
                                    <table className="w-full text-xs">
                                        <thead className="bg-muted sticky top-0 z-10">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-semibold w-10 text-muted-foreground">#</th>
                                                {parsed.headers.map((h) => (
                                                    <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewRows.map((row, i) => (
                                                <tr key={i} className="border-t hover:bg-muted/30">
                                                    <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                                                    {parsed.headers.map((h) => (
                                                        <td
                                                            key={h}
                                                            className="px-3 py-1.5 whitespace-nowrap max-w-[280px] truncate"
                                                            title={row[h] ?? ''}
                                                        >
                                                            {row[h] ?? ''}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>
                    )}
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-muted/20">
                    <Button
                        type="button"
                        variant="outline"
                        pill
                        onClick={() => setOpen(false)}
                        className="w-full sm:w-auto"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading || !parsed}
                        pill
                        className="w-full sm:w-auto"
                    >
                        {loading ? 'Salvando...' : 'Salvar import'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
