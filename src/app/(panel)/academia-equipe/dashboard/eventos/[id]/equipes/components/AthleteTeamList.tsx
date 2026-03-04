import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { TeamAthlete } from '../../../equipes-actions';
import { formatCategoryTitle } from '@/lib/category-utils';

interface AthleteTeamListProps {
    athletes: TeamAthlete[];
}

const statusLabel: Record<string, { label: string; className: string }> = {
    pago: { label: 'Pago', className: 'text-emerald-700 bg-emerald-50 border-emerald-600/30' },
    confirmado: { label: 'Confirmado', className: 'text-emerald-700 bg-emerald-50 border-emerald-600/30' },
    pendente: { label: 'Pendente', className: 'text-amber-700 bg-amber-50 border-amber-600/30' },
    aguardando_pagamento: { label: 'Aguard. Pagamento', className: 'text-amber-700 bg-amber-50 border-amber-600/30' },
    cancelado: { label: 'Cancelado', className: 'text-destructive bg-destructive/10 border-destructive/30' },
};

export function AthleteTeamList({ athletes }: AthleteTeamListProps) {
    if (athletes.length === 0) {
        return (
            <div className="py-12 text-center text-muted-foreground text-ui">
                Nenhum atleta encontrado para esta equipe.
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="pl-6">Atleta</TableHead>
                    <TableHead>Faixa</TableHead>
                    <TableHead>Mestre</TableHead>
                    <TableHead>Categoria(s)</TableHead>
                    <TableHead className="pr-6 text-right">Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {athletes.map((athlete) => (
                    <TableRow key={athlete.id}>
                        <TableCell className="pl-6">
                            <p className="text-ui font-medium">{athlete.full_name}</p>
                            {athlete.sexo && (
                                <p className="text-caption text-muted-foreground">{athlete.sexo}</p>
                            )}
                        </TableCell>
                        <TableCell className="capitalize text-muted-foreground">
                            {athlete.belt_color || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                            {athlete.master_name || '-'}
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col gap-1">
                                {athlete.registrations.map((reg) => (
                                    <span key={reg.id} className="text-caption text-muted-foreground">
                                        {reg.category ? formatCategoryTitle(reg.category) : 'Sem categoria'}
                                    </span>
                                ))}
                            </div>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                            <div className="flex flex-col items-end gap-1">
                                {athlete.registrations.map((reg) => {
                                    const s = statusLabel[reg.status] ?? {
                                        label: reg.status,
                                        className: 'text-muted-foreground bg-muted border-border',
                                    };
                                    return (
                                        <Badge
                                            key={reg.id}
                                            variant="outline"
                                            className={`text-[10px] uppercase font-bold tracking-wider ${s.className}`}
                                        >
                                            {s.label}
                                        </Badge>
                                    );
                                })}
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
