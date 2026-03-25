"use client";

import { useState } from "react";
import { UsersIcon, CheckCircleIcon, XCircleIcon, TrashIcon } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { AthleteListModal, type AthleteDetail } from "./athlete-list-modal";
import { RegisterGymModal } from "./register-gym-modal";
import { Button } from "@/components/ui/button";
import { dismissSuggestionAction } from "../actions";

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
}

export function SuggestionsContent({ suggestions }: SuggestionsContentProps) {
    const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
    const [registerSuggestion, setRegisterSuggestion] = useState<Suggestion | null>(null);
    const [dismissSuggestion, setDismissSuggestion] = useState<Suggestion | null>(null);
    const [dismissing, setDismissing] = useState(false);

    const handleDismiss = async () => {
        if (!dismissSuggestion) return;
        setDismissing(true);
        const result = await dismissSuggestionAction(dismissSuggestion.gym_name, dismissSuggestion.master_name);
        if (result.error) {
            alert(result.error);
        }
        setDismissing(false);
        setDismissSuggestion(null);
    };

    return (
        <>
            <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden">
                <CardHeader className="border-b bg-muted/20">
                    <CardTitle className="text-panel-md font-semibold flex items-center gap-2">
                        <UsersIcon size={20} weight="duotone" className="text-muted-foreground" />
                        Termos Mais Utilizados
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-6 font-semibold">Academia (Texto)</TableHead>
                                <TableHead className="font-semibold text-panel-sm">Mestre (Texto)</TableHead>
                                <TableHead className="text-center font-semibold w-32">Citações</TableHead>
                                <TableHead className="w-12" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {suggestions && suggestions.length > 0 ? (
                                suggestions.map((item, idx) => (
                                    <TableRow
                                        key={idx}
                                        className="group transition-colors cursor-pointer hover:bg-muted/30"
                                        onClick={() => setSelectedSuggestion(item)}
                                    >
                                        <TableCell className="pl-6 text-panel-sm font-medium">
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
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setRegisterSuggestion(item);
                                                            }}
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
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDismissSuggestion(item);
                                                }}
                                                pill
                                            >
                                                <TrashIcon size={18} weight="duotone" />
                                                <span className="sr-only">Dispensar sugestão</span>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic">
                                        Nenhuma sugestão manual encontrada até o momento.
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
                        <Button
                            type="button"
                            variant="outline"
                            pill
                            onClick={() => setDismissSuggestion(null)}
                            className="w-full sm:w-auto px-8"
                            disabled={dismissing}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            pill
                            onClick={handleDismiss}
                            className="w-full sm:w-auto px-8 font-bold"
                            disabled={dismissing}
                        >
                            {dismissing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sim, dispensar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
