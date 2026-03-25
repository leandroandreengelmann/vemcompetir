"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export interface AthleteDetail {
    id: string;
    full_name: string;
    cpf: string;
    belt_color: string;
    events: string[];
}

interface AthleteListModalProps {
    isOpen: boolean;
    onClose: () => void;
    suggestion: {
        gym_name: string;
        master_name: string;
        athletes: AthleteDetail[];
    } | null;
}

export function AthleteListModal({ isOpen, onClose, suggestion }: AthleteListModalProps) {
    if (!suggestion) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl md:max-w-5xl lg:max-w-6xl w-[95vw] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-panel-md font-semibold">
                        Atletas sugerindo: <span className="text-primary">{suggestion.gym_name || 'Sem Academia'}</span>
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">
                        Mestre citado: <span className="font-normal">{suggestion.master_name || 'Sem Mestre'}</span>
                    </p>
                </DialogHeader>

                <div className="mt-6 border rounded-md overflow-hidden bg-white">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="font-semibold text-panel-sm">Atleta</TableHead>
                                <TableHead className="font-semibold text-ui w-32">CPF</TableHead>
                                <TableHead className="font-semibold text-ui w-24">Faixa</TableHead>
                                <TableHead className="font-semibold text-panel-sm">Eventos</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {suggestion.athletes && suggestion.athletes.length > 0 ? (
                                suggestion.athletes.map((athlete) => (
                                    <TableRow key={athlete.id} className="group">
                                        <TableCell className="font-medium">{athlete.full_name}</TableCell>
                                        <TableCell className="text-muted-foreground tabular-nums text-sm">
                                            {athlete.cpf ? athlete.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize shrink-0">
                                                {athlete.belt_color || 'N/A'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {athlete.events && athlete.events.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {athlete.events.map((evt, idx) => (
                                                        <Badge key={idx} variant="secondary" className="bg-primary/5 font-normal whitespace-nowrap">
                                                            {evt}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground italic text-sm">Nenhum evento</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        Nenhum detalhe de atleta encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
