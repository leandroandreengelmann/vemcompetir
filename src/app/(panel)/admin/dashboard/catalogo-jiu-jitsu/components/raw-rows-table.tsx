'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import type { JjLabRawRow } from '../actions';

interface Props {
    headers: string[];
    rows: JjLabRawRow[];
    totalRows: number;
}

export function RawRowsTable({ headers, rows, totalRows }: Props) {
    const [search, setSearch] = useState('');
    const [activeHeader, setActiveHeader] = useState<string | 'all'>('all');

    const filtered = useMemo(() => {
        if (!search.trim()) return rows;
        const q = search.trim().toLowerCase();
        return rows.filter((row) => {
            const data = row.data || {};
            if (activeHeader === 'all') {
                return Object.values(data).some((v) => String(v ?? '').toLowerCase().includes(q));
            }
            return String(data[activeHeader] ?? '').toLowerCase().includes(q);
        });
    }, [rows, search, activeHeader]);

    return (
        <div className="space-y-3">
            <div className="flex flex-col md:flex-row gap-2 px-4 pt-4">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar em qualquer coluna..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-background"
                        variant="lg"
                    />
                </div>
                <select
                    value={activeHeader}
                    onChange={(e) => setActiveHeader(e.target.value)}
                    className="text-sm border rounded-lg px-3 py-2 bg-background"
                >
                    <option value="all">Todas as colunas</option>
                    {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                    ))}
                </select>
            </div>

            <div className="flex items-center gap-2 px-4 text-xs text-muted-foreground">
                <Badge variant="outline" className="rounded-full">
                    {filtered.length} de {rows.length} carregadas
                </Badge>
                {rows.length < totalRows && (
                    <Badge variant="outline" className="rounded-full text-orange-600 border-orange-300">
                        Total no banco: {totalRows} (mostrando primeiras {rows.length})
                    </Badge>
                )}
            </div>

            <div className="overflow-auto max-h-[600px] border-t">
                <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0 z-10">
                        <tr>
                            <th className="px-3 py-2 text-left font-semibold w-12">#</th>
                            {headers.map((h) => (
                                <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((row) => (
                            <tr key={row.id} className="border-t hover:bg-muted/40">
                                <td className="px-3 py-1.5 text-muted-foreground">{row.row_index + 1}</td>
                                {headers.map((h) => (
                                    <td key={h} className="px-3 py-1.5 whitespace-nowrap">
                                        {String(row.data?.[h] ?? '')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={headers.length + 1} className="text-center py-12 text-muted-foreground">
                                    Nenhuma linha corresponde à busca.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
