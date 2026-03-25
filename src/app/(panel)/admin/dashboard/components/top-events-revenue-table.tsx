import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TopEvent {
    id: string;
    title: string;
    date: string;
    inscritos: number;
    receita: number;
}

interface TopEventsRevenueTableProps {
    data: TopEvent[];
}

export function TopEventsRevenueTable({ data }: TopEventsRevenueTableProps) {
    const formatter = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-panel-md font-semibold">Ranking de Campeonatos</CardTitle>
                <CardDescription>Eventos com maior faturamento bruto.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Evento</TableHead>
                            <TableHead className="text-center">Inscritos</TableHead>
                            <TableHead className="text-right">Faturamento</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.slice(0, 5).map((event) => (
                            <TableRow key={event.id}>
                                <TableCell className="font-medium text-panel-sm">{event.title}</TableCell>
                                <TableCell className="text-center">{event.inscritos}</TableCell>
                                <TableCell className="text-right text-emerald-600 font-medium">
                                    {formatter.format(event.receita)}
                                </TableCell>
                            </TableRow>
                        ))}
                        {data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                                    Nenhum evento com receita ainda.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
