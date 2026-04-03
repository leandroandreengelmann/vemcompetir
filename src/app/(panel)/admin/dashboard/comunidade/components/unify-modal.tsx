'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { getMastersForAcademyAction, unifyGroupsAction } from '../actions';

interface Tenant { id: string; name: string; }
interface Master { id: string; full_name: string; }

export interface GroupKey {
    gym_name: string | null;
    master_name: string | null;
    count: number;
}

interface UnifyModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedGroups: GroupKey[];
    tenants: Tenant[];
}

export function UnifyModal({ isOpen, onClose, selectedGroups, tenants }: UnifyModalProps) {
    const [selectedTenantId, setSelectedTenantId] = useState('');
    const [masters, setMasters] = useState<Master[]>([]);
    const [selectedMasterId, setSelectedMasterId] = useState('');
    const [loadingMasters, setLoadingMasters] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const totalAthletes = selectedGroups.reduce((s, g) => s + g.count, 0);

    useEffect(() => {
        if (!selectedTenantId) { setMasters([]); setSelectedMasterId(''); return; }
        setLoadingMasters(true);
        getMastersForAcademyAction(selectedTenantId).then(({ data }) => {
            setMasters(data);
            setSelectedMasterId(data.length === 1 ? data[0].id : '');
            setLoadingMasters(false);
        });
    }, [selectedTenantId]);

    const selectedTenant = tenants.find(t => t.id === selectedTenantId);
    const selectedMaster = masters.find(m => m.id === selectedMasterId);
    const canConfirm = !!selectedTenantId && !!selectedMasterId;

    const handleConfirm = async () => {
        if (!canConfirm || !selectedTenant || !selectedMaster) return;
        setLoading(true);
        setError(null);
        const groups = selectedGroups.map(g => ({ gym_name: g.gym_name, master_name: g.master_name }));
        const result = await unifyGroupsAction(
            groups,
            selectedTenantId,
            selectedMasterId,
            selectedMaster.full_name,
            selectedTenant.name,
        );
        if (result.error) { setError(result.error); setLoading(false); return; }
        onClose();
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setSelectedTenantId('');
            setMasters([]);
            setSelectedMasterId('');
            setError(null);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Vincular atletas à academia</DialogTitle>
                    <DialogDescription>
                        {selectedGroups.length} grupo{selectedGroups.length !== 1 ? 's' : ''} selecionado{selectedGroups.length !== 1 ? 's' : ''} —{' '}
                        <strong>{totalAthletes} atleta{totalAthletes !== 1 ? 's' : ''}</strong> serão vinculados.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Grupos selecionados */}
                    <div className="rounded-lg border p-3 space-y-1.5 max-h-36 overflow-y-auto bg-muted/30">
                        {selectedGroups.map((g, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                    <span className="font-medium text-foreground">{g.gym_name || '(sem academia)'}</span>
                                    {' / '}
                                    {g.master_name || '(sem mestre)'}
                                </span>
                                <Badge variant="secondary" className="text-xs ml-2 shrink-0">
                                    {g.count} atleta{g.count !== 1 ? 's' : ''}
                                </Badge>
                            </div>
                        ))}
                    </div>

                    {/* Academia */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">
                            Academia oficial <span className="text-destructive">*</span>
                        </Label>
                        <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                            <SelectTrigger className="h-11 rounded-xl shadow-none">
                                <SelectValue placeholder="Selecione a academia" />
                            </SelectTrigger>
                            <SelectContent>
                                {tenants.map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Mestre */}
                    {selectedTenantId && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">
                                Mestre <span className="text-destructive">*</span>
                            </Label>
                            {loadingMasters ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground h-11">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando mestres...
                                </div>
                            ) : masters.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    Nenhum mestre cadastrado nesta academia.
                                </p>
                            ) : masters.length === 1 ? (
                                <div className="h-11 rounded-xl border bg-muted/30 px-3 flex items-center text-sm font-medium">
                                    {masters[0].full_name}
                                </div>
                            ) : (
                                <Select value={selectedMasterId} onValueChange={setSelectedMasterId}>
                                    <SelectTrigger className="h-11 rounded-xl shadow-none">
                                        <SelectValue placeholder="Selecione o mestre" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {masters.map(m => (
                                            <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-destructive/15 text-destructive text-sm rounded-lg text-center">
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button pill variant="ghost" onClick={() => handleOpenChange(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button pill onClick={handleConfirm} disabled={loading || !canConfirm} className="gap-2">
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Vincular {totalAthletes} atleta{totalAthletes !== 1 ? 's' : ''}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
