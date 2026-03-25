import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, CalendarIcon, PlusIcon, PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr';
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

export default async function AdminAcademyEventsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
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

    // 2. Fetch the target academy profile using admin client to get tenant_id
    const { data: targetProfile } = await adminClient
        .from('profiles')
        .select('id, full_name, gym_name, tenant_id')
        .eq('id', id)
        .single();

    if (!targetProfile || !targetProfile.tenant_id) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Academia não encontrada ou sem tenant vinculado.
            </div>
        );
    }

    const academyName = targetProfile.gym_name || targetProfile.full_name || 'Academia';

    // 3. Fetch events for this tenant
    const { data: events } = await adminClient
        .from('events')
        .select('*')
        .eq('tenant_id', targetProfile.tenant_id)
        .order('event_date', { ascending: true });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <Link
                    href="/admin/dashboard/equipes-academias"
                    className="text-ui font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center w-fit"
                >
                    <ArrowLeftIcon size={20} weight="duotone" className="mr-2" />
                    Voltar para Academias
                </Link>

                <SectionHeader
                    title={`Eventos - ${academyName}`}
                    description={`Listagem de eventos cadastrados pela organização ${academyName}.`}
                    rightElement={
                        <Button asChild pill>
                            <Link href={`/admin/dashboard/eventos/novo?academyId=${targetProfile.id}`}>
                                <PlusIcon size={20} weight="bold" className="mr-2" />
                                Novo Evento
                            </Link>
                        </Button>
                    }
                />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-panel-sm font-medium">Total de Eventos</CardTitle>
                        <CalendarIcon size={20} weight="duotone" className="text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-panel-lg font-black">{events?.length || 0}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-panel-md font-semibold">Lista de Eventos</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Título</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Local</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right pr-6">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!events || events.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        Nenhum evento encontrado para esta academia.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                events.map((event) => (
                                    <TableRow key={event.id}>
                                        <TableCell className="pl-6 text-panel-sm font-medium">{event.title}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {event.event_date ? format(new Date(event.event_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '-'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {event.location || '-'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {event.status === 'pendente' ? (
                                                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-amber-600 border-amber-600/30 bg-amber-50">
                                                    Pendente
                                                </Badge>
                                            ) : event.status === 'aprovado' ? (
                                                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 border-emerald-600/30 bg-emerald-50">
                                                    Aprovado
                                                </Badge>
                                            ) : event.status === 'publicado' ? (
                                                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-blue-600 border-blue-600/30 bg-blue-50">
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
                                                    <PencilSimpleIcon size={20} weight="duotone" />
                                                    <span className="sr-only">Editar</span>
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
