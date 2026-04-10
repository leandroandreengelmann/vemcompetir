'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DownloadSimpleIcon, CircleNotchIcon } from '@phosphor-icons/react';
import { exportEventRegistrationsCSV } from './actions';

interface ExportButtonProps {
    eventId: string;
    eventTitle: string;
    disabled?: boolean;
}

export function ExportButton({ eventId, eventTitle, disabled }: ExportButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleExport = async () => {
        setLoading(true);
        try {
            const result = await exportEventRegistrationsCSV(eventId);
            if ('error' in result) {
                alert(result.error);
                return;
            }

            // Gerar download do CSV
            const bom = '\uFEFF'; // BOM para Excel reconhecer UTF-8
            const blob = new Blob([bom + result.csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const safeName = eventTitle.replace(/[^a-zA-Z0-9À-ú ]/g, '').replace(/\s+/g, '_');
            link.href = url;
            link.download = `inscricoes_${safeName}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch {
            alert('Erro ao exportar.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            pill
            className="font-bold text-xs"
            onClick={handleExport}
            disabled={disabled || loading}
        >
            {loading ? (
                <CircleNotchIcon size={14} weight="bold" className="mr-1.5 animate-spin" />
            ) : (
                <DownloadSimpleIcon size={14} weight="bold" className="mr-1.5" />
            )}
            Exportar CSV
        </Button>
    );
}
