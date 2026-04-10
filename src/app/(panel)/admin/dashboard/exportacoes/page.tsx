import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth-guards';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExportButton } from './export-button';

export default async function ExportacoesPage() {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const { data: events } = await admin
        .from('events')
        .select('id, title, event_date')
        .order('event_date', { ascending: false });

    // Buscar contagem de inscrições confirmadas por evento
    const { data: counts } = await admin
        .from('event_registrations')
        .select('event_id')
        .in('status', ['pago', 'confirmado', 'isento']);

    const countMap = new Map<string, number>();
    (counts || []).forEach((r: any) => {
        countMap.set(r.event_id, (countMap.get(r.event_id) || 0) + 1);
    });

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Exportações"
                description="Exporte dados de inscrições dos eventos em CSV."
            />

            <Card className="border-none shadow-premium rounded-3xl overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="pl-6">Evento</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead className="text-center">Inscrições Confirmadas</TableHead>
                                <TableHead className="text-right pr-6">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(events || []).map((event) => {
                                const count = countMap.get(event.id) || 0;
                                return (
                                    <TableRow key={event.id} className="hover:bg-muted/10 transition-colors">
                                        <TableCell className="pl-6 py-4 font-bold text-panel-sm">
                                            {event.title}
                                        </TableCell>
                                        <TableCell className="text-panel-sm text-muted-foreground">
                                            {event.event_date
                                                ? format(new Date(event.event_date), "dd/MM/yyyy", { locale: ptBR })
                                                : '—'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="font-bold">
                                                {count}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <ExportButton eventId={event.id} eventTitle={event.title} disabled={count === 0} />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
