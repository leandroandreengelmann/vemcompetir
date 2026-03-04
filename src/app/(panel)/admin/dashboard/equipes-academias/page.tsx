import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SectionHeader } from "@/components/layout/SectionHeader";

export default async function EquipesAcademiasPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (adminProfile?.role !== 'admin_geral') redirect('/login');

    const adminClient = createAdminClient();
    const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers();

    const authEntidades = authUsers.filter(u => u.user_metadata?.role === 'academia/equipe');

    const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', authEntidades.map(u => u.id));

    const tenantIds = profiles?.map(p => p.tenant_id).filter(Boolean) as string[];

    const { data: allMembers } = await supabase
        .from('profiles')
        .select('full_name, tenant_id, is_master, role')
        .in('tenant_id', tenantIds);

    const entidadesCompletas = authEntidades.map(user => {
        const profile = profiles?.find(p => p.id === user.id);
        const tId = profile?.tenant_id;

        const academyMembers = allMembers?.filter(m => m.tenant_id === tId) || [];
        const master = academyMembers.find(m => m.is_master);
        const athleteCount = academyMembers.filter(m => m.role === 'atleta').length;

        return {
            id: user.id,
            full_name: user.user_metadata?.full_name || profile?.full_name || profile?.gym_name || 'Sem nome',
            email: user.email || '-',
            created_at: user.created_at,
            status: 'Ativo',
            master_name: master?.full_name || '-',
            athlete_count: athleteCount
        };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Equipes / Academias"
                description="Gerencie as equipes e academias cadastradas na plataforma."
                rightElement={
                    <Button asChild pill>
                        <Link href="/admin/dashboard/equipes-academias/novo">
                            <Plus className="mr-2 h-4 w-4" />
                            Nova Entidade
                        </Link>
                    </Button>
                }
            />

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-label">Total de Entidades</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-h1">{entidadesCompletas.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-h2">Lista de Equipes e Academias</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Nome / Organização</TableHead>
                                <TableHead>E-mail</TableHead>
                                <TableHead>Mestre Responsável</TableHead>
                                <TableHead className="text-center">Atletas</TableHead>
                                <TableHead>Data de Cadastro</TableHead>
                                <TableHead className="text-right pr-6">Status</TableHead>
                                <TableHead className="w-[100px] text-right">Eventos</TableHead>
                                <TableHead className="w-[100px] text-right pr-6">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entidadesCompletas.map((entidade) => (
                                <TableRow key={entidade.id}>
                                    <TableCell className="pl-6 font-medium">
                                        {entidade.full_name}
                                    </TableCell>
                                    <TableCell className="text-caption text-muted-foreground">
                                        {entidade.email}
                                    </TableCell>
                                    <TableCell className="font-medium text-primary/80">
                                        {entidade.master_name}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="rounded-full text-xs font-bold px-2.5 shadow-xs">
                                            {entidade.athlete_count}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {entidade.created_at
                                            ? format(new Date(entidade.created_at), "dd/MM/yy", { locale: ptBR })
                                            : '-'}
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Badge variant="success" className="text-[10px] uppercase font-bold tracking-wider">
                                            {entidade.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link
                                            href={`/admin/dashboard/equipes-academias/${entidade.id}/eventos`}
                                            className="text-ui font-medium text-primary hover:underline"
                                        >
                                            Eventos
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button variant="ghost" size="icon" asChild pill>
                                            <Link href={`/admin/dashboard/equipes-academias/${entidade.id}`}>
                                                <Eye className="h-4 w-4" />
                                                <span className="sr-only">Visualizar Detalhes</span>
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {entidadesCompletas.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        Nenhuma entidade cadastrada.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
