'use client';

import { useState } from 'react';
import { FileText, Loader2, Medal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { pdf } from '@react-pdf/renderer';
import { TeamScoringPDF } from './team-scoring-pdf';
import { ScoringConfig, TeamSummary } from '../../../equipes-actions';
import { saveScoringConfigAction } from '../../../equipes-actions';

interface ScoringConfigModalProps {
    eventId: string;
    eventTitle: string;
    teams: TeamSummary[];
    initialConfig?: ScoringConfig;
}

export function ScoringConfigModal({ eventId, eventTitle, teams, initialConfig }: ScoringConfigModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState<ScoringConfig>(
        initialConfig ?? { gold: 12, silver: 5, bronze: 3, fourth: 0, lines_per_column: 10 }
    );

    const handleChange = (field: keyof ScoringConfig, value: string) => {
        setConfig(prev => ({ ...prev, [field]: Number(value) || 0 }));
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            await saveScoringConfigAction(eventId, config);

            const logoUrl = typeof window !== 'undefined'
                ? `${window.location.origin}/logo-white.png`
                : undefined;

            const blob = await pdf(
                <TeamScoringPDF
                    eventTitle={eventTitle}
                    teams={teams}
                    config={config}
                    logoUrl={logoUrl}
                />
            ).toBlob();

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pontuacao-equipes-${eventId}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            setOpen(false);
        } catch (err) {
            console.error('Erro ao gerar PDF:', err);
        } finally {
            setLoading(false);
        }
    };

    const totalSlots = (config.lines_per_column || 10) * 2;

    return (
        <>
            <Button
                variant="outline"
                pill
                onClick={() => setOpen(true)}
                className="gap-2"
            >
                <FileText className="h-4 w-4" />
                PDF de Pontuação
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-panel-md font-bold tracking-tight">Configurar Pontuação por Medalha</DialogTitle>
                    </DialogHeader>

                    {/* Medal point values */}
                    <div className="grid grid-cols-2 gap-4 py-2">
                        {(
                            [
                                { key: 'gold', label: 'Ouro', iconClass: 'text-amber-500' },
                                { key: 'silver', label: 'Prata', iconClass: 'text-slate-400' },
                                { key: 'bronze', label: 'Bronze', iconClass: 'text-orange-700' },
                                { key: 'fourth', label: '4º Lugar (0 = não usar)', iconClass: 'text-muted-foreground' },
                            ] as { key: keyof ScoringConfig; label: string; iconClass: string }[]
                        ).map(({ key, label, iconClass }) => (
                            <div key={key} className="space-y-1">
                                <Label className="text-panel-sm font-semibold">
                                    <Medal className={`h-4 w-4 ${iconClass}`} />
                                    {label}
                                </Label>
                                <Input
                                    type="number"
                                    min={0}
                                    variant="lg"
                                    value={config[key]}
                                    onChange={e => handleChange(key, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Divider */}
                    <div className="border-t pt-3 space-y-1">
                        <Label className="text-panel-sm font-semibold">Linhas por coluna (por medalha)</Label>
                        <Input
                            type="number"
                            min={1}
                            max={50}
                            variant="lg"
                            value={config.lines_per_column}
                            onChange={e => handleChange('lines_per_column', e.target.value)}
                        />
                        <p className="text-panel-sm text-muted-foreground pt-0.5">
                            2 colunas × {config.lines_per_column || 10} linhas = <strong>{totalSlots} slots por medalha</strong>
                        </p>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button variant="outline" pill onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                        <Button pill onClick={handleGenerate} disabled={loading} className="gap-2">
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Gerar PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
