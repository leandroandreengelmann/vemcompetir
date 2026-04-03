"use client";

import { useState } from "react";
import { UsersIcon, CheckCircleIcon, XCircleIcon, TrashIcon, MagnifyingGlassIcon, LinkIcon } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { AthleteListModal, type AthleteDetail } from "./athlete-list-modal";
import { RegisterGymModal } from "./register-gym-modal";
import { UnifyModal, type GroupKey } from "./unify-modal";
import { Button } from "@/components/ui/button";
import { dismissSuggestionAction } from "../actions";

interface Tenant { id: string; name: string; }

interface Suggestion {
    gym_name: string;
    master_name: string;
    count: number;
    isGymRegistered: boolean;
    isMasterRegistered: boolean;
    athletes: AthleteDetail[];
}

interface SuggestionsContentProps {
    suggestions: Suggestion[];
    tenants: Tenant[];
}

export function SuggestionsContent({ suggestions, tenants }: SuggestionsContentProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
    const [registerSuggestion, setRegisterSuggestion] = useState<Suggestion | null>(null);
    const [dismissSuggestion, setDismissSuggestion] = useState<Suggestion | null>(null);
    const [unifyOpen, setUnifyOpen] = useState(false);
    const [dismissing, setDismissing] = useState(false);

    const groupKey = (s: Suggestion) => `${s.gym_name ?? ''}|${s.master_name ?? ''}`;

    const filtered = searchTerm
        ? suggestions.filter(s =>
            s.gym_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.master_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : suggestions;

    const toggleSelect = (key: string) => {
        setSelectedKeys(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedKeys.size === filtered.length) {
            setSelectedKeys(new Set());
        } else {
            setSelectedKeys(new Set(filtered.map(groupKey)));
        }
    };

    const selectedGroups: GroupKey[] = suggestions
        .filter(s => selectedKeys.has(groupKey(s)))
        .map(s => ({ gym_name: s.gym_name || null, master_name: s.master_name || null, count: s.count }));

    const handleDismiss = async () => {
        if (!dismissSuggestion) return;
        setDismissing(true);
        const result = await dismissSuggestionAction(dismissSuggestion.gym_name, dismissSuggestion.master_name);
        if (result.error) alert(result.error);
        setDismissing(false);
        setDismissSuggestion(null);
    };

    const allFilteredSelected = filtered.length > 0 && filtered.every(s => selectedKeys.has(groupKey(s)));

    return (
        <>
            <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden">
                <CardHeader className="border-b bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-panel-md font-semibold flex items-center gap-2">
                            <UsersIcon size={20} weight="duotone" className="text-muted-foreground" />
                            Termos Mais Utilizados
                        </CardTitle>
                        {selectedKeys.size > 0 && (
                            <Button
                                pill
                                size="sm"
                                className="gap-2"
                                onClick={() => setUnifyOpen(true)}
                            >
                                <LinkIcon size={15} weight="bold" />
                                Vincular {selectedKeys.size} grupo{selectedKeys.size !== 1 ? 's' : ''} selecionado{selectedKeys.size !== 1 ? 's' : ''}
                            </Button>
                        )}
                    </div>
                    <div className="relative">
                        <MagnifyingGlassIcon
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                            placeholder="Buscar por academia ou mestre..."
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setSelectedKeys(new Set()); }}
                            className="pl-9 h-9 rounded-xl shadow-none"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-10 pl-4">
                                    <Checkbox
                                        checked={allFilteredSelected}
                                        onCheckedChange={toggleAll}
                                        aria-label="Selecionar todos"
                                    />
                                </TableHead>
                                <TableHead className="font-semibold">Academia (Texto)</TableHead>
                                <TableHead className="font-semibold text-panel-sm">Mestre (Texto)</TableHead>
                                <TableHead className="text-center font-semibold w-32">Citações</TableHead>
                                <TableHead className="w-12" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length > 0 ? (
                                filtered.map((item, idx) => {
                                    const key = groupKey(item);
                                    const isSelected = selectedKeys.has(key);
                                    return (
                                        <TableRow
                                            key={idx}
                                            className={`group transition-colors cursor-pointer ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
                                            onClick={() => setSelectedSuggestion(item)}
                                        >
                                            <TableCell className="pl-4" onClick={e => { e.stopPropagation(); toggleSelect(key); }}>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleSelect(key)}
                                                    aria-label="Selecionar grupo"
                                                />
                                            </TableCell>
                                            <TableCell className="text-panel-sm font-medium">
                                                <div className="flex items-center gap-2">
                                                    {item.gym_name || <span className="text-muted-foreground italic">Não informado</span>}
                                                    {item.isGymRegistered ? (
                                                        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100 flex items-center gap-1">
                                                            <CheckCircleIcon size={14} weight="duotone" />
                                                            <span>Cadastrada</span>
                                                        </Badge>
                                                    ) : item.gym_name ? (
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1">
                                                                <XCircleIcon size={14} weight="duotone" />
                                                                <span>Não Cadastrada</span>
                                                            </Badge>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={(e) => { e.stopPropagation(); setRegisterSuggestion(item); }}
                                                            >
                                                                + Cadastrar
                                                            </Button>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {item.master_name || <span className="text-muted-foreground italic">Não informado</span>}
                                                    {item.isMasterRegistered ? (
                                                        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100 flex items-center gap-1">
                                                            <CheckCircleIcon size={14} weight="duotone" />
                                                            <span>Cadastrado</span>
                                                        </Badge>
                                                    ) : item.master_name ? (
                                                        <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1">
                                                            <XCircleIcon size={14} weight="duotone" />
                                                            <span>Não Cadastrado</span>
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary border-none text-panel-sm font-bold">
                                                    {item.count} {item.count === 1 ? 'atleta' : 'atletas'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="pr-4 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={(e) => { e.stopPropagation(); setDismissSuggestion(item); }}
                                                    pill
                                                >
                                                    <TrashIcon size={18} weight="duotone" />
                                                    <span className="sr-only">Dispensar sugestão</span>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                                        {searchTerm ? 'Nenhum resultado para a busca.' : 'Nenhuma sugestão manual encontrada até o momento.'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AthleteListModal
                isOpen={!!selectedSuggestion}
                onClose={() => setSelectedSuggestion(null)}
                suggestion={selectedSuggestion}
            />

            <RegisterGymModal
                isOpen={!!registerSuggestion}
                onClose={() => setRegisterSuggestion(null)}
                suggestion={registerSuggestion}
            />

            <UnifyModal
                isOpen={unifyOpen}
                onClose={() => { setUnifyOpen(false); setSelectedKeys(new Set()); }}
                selectedGroups={selectedGroups}
                tenants={tenants}
            />

            <Dialog open={!!dismissSuggestion} onOpenChange={(open) => !open && setDismissSuggestion(null)}>
                <DialogContent className="sm:max-w-[425px] rounded-2xl border-primary/10">
                    <DialogHeader className="flex flex-col items-center text-center space-y-3">
                        <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
                            <AlertTriangle className="size-6 text-destructive" />
                        </div>
                        <DialogTitle className="text-h2">Dispensar sugestão?</DialogTitle>
                        <DialogDescription className="text-ui text-muted-foreground">
                            Os dados de academia/mestre de{' '}
                            <strong>{dismissSuggestion?.count} {dismissSuggestion?.count === 1 ? 'atleta' : 'atletas'}</strong>{' '}
                            serão removidos. Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center gap-3">
                        <Button type="button" variant="outline" pill onClick={() => setDismissSuggestion(null)} className="w-full sm:w-auto px-8" disabled={dismissing}>
                            Cancelar
                        </Button>
                        <Button type="button" variant="destructive" pill onClick={handleDismiss} className="w-full sm:w-auto px-8 font-bold" disabled={dismissing}>
                            {dismissing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sim, dispensar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
