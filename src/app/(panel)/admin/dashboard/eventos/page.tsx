import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Plus, Pencil, Building2 } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Button } from "@/components/ui/button";

export default async function AdminGlobalEventsPage() {
    const supabase = await createClient();

    // 1. Check if the logged-in user is a super admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (adminProfile?.role !== 'admin_geral') redirect('/login');

    const adminClient = createAdminClient();

    // 2. Fetch all events and all academy profiles separately for safe mapping
    const { data: events, error: eventsError } = await adminClient
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });

    const { data: profiles, error: profilesError } = await adminClient
        .from('profiles')
        .select('gym_name, full_name, tenant_id')
        .eq('role', 'academia/equipe');

    if (eventsError || profilesError) {
        console.error("Error fetching data:", eventsError || profilesError);
    }

    // Map tenant_id to gym name
    const academyMap = new Map();
    profiles?.forEach(p => {
        if (p.tenant_id && !academyMap.has(p.tenant_id)) {
            academyMap.set(p.tenant_id, p.gym_name || p.full_name);
        }
    });

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Gestão Global de Eventos"
                description="Visualize e gerencie todos os eventos cadastrados na plataforma."
                rightElement={
                    <Button asChild pill>
                        <Link href="/admin/dashboard/eventos/novo">
                            <Plus className="mr-2 h-4 w-4" />
                            Novo Evento
                        </Link>
                    </Button>
                }
            />

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-label">Total de Eventos</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-h1">{events?.length || 0}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-h2">Todos os Eventos</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Título</TableHead>
                                <TableHead>Academia / Equipe</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Local</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right pr-6">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!events || events.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        Nenhum evento cadastrado no sistema.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                events.map((event) => {
                                    const gymName = academyMap.get(event.tenant_id) || 'Desconhecida';

                                    return (
                                        <TableRow key={event.id}>
                                            <TableCell className="pl-6 font-medium">{event.title}</TableCell>
                                            <TableCell>
                                                <span className="text-ui font-medium">{gymName}</span>
                                            </TableCell>
                                            <TableCell className="text-caption text-muted-foreground">
                                                {event.event_date ? format(new Date(event.event_date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}
                                            </TableCell>
                                            <TableCell className="text-caption text-muted-foreground">
                                                {event.location || '-'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {event.status === 'pendente' ? (
                                                    <Badge variant="pending" className="text-[10px] uppercase font-bold tracking-wider">
                                                        Pendente
                                                    </Badge>
                                                ) : event.status === 'aprovado' ? (
                                                    <Badge variant="success" className="text-[10px] uppercase font-bold tracking-wider">
                                                        Aprovado
                                                    </Badge>
                                                ) : event.status === 'publicado' ? (
                                                    <Badge variant="info" className="text-[10px] uppercase font-bold tracking-wider">
                                                        Publicado
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold">
                                                        {event.status || 'Ativo'}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Button variant="ghost" size="icon" asChild pill>
                                                    <Link href={`/admin/dashboard/eventos/${event.id}/editar`}>
                                                        <Pencil className="h-4 w-4" />
                                                        <span className="sr-only">Editar</span>
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
