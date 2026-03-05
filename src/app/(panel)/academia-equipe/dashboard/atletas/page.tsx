import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Pencil, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
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
import { createAdminClient } from '@/lib/supabase/admin';
import { Badge } from "@/components/ui/badge";
import { getBeltStyle } from '@/lib/belt-theme';
import { GenerateAccessButton } from './generate-access-button';

export default async function AthleteManagementPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: orgProfile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();

    const isAdmin = orgProfile?.role === 'admin_geral';
    const isAcademy = orgProfile?.role === 'academia/equipe';

    if (!isAdmin && !isAcademy) redirect('/login');

    if (isAcademy && !orgProfile.tenant_id) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Você não está vinculado a uma organização.
            </div>
        );
    }

    // Fetch list of athletes
    let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'atleta');

    // If academy role, filter by tenant_id
    if (isAcademy) {
        query = query.eq('tenant_id', orgProfile.tenant_id);
    }

    const { data: athletes } = await query.order('updated_at', { ascending: false });

    // Fetch emails via admin client
    const adminClient = createAdminClient();
    const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers();

    const athletesWithEmails = athletes?.map(a => {
        const authUser = authUsers.find(u => u.id === a.id);
        return {
            ...a,
            email: authUser?.email || '-',
            created_at: a.created_at || authUser?.created_at
        };
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-h1 tracking-tight">
                        {isAdmin ? 'Gestão Global de Atletas' : 'Meus Atletas'}
                    </h1>
                    <p className="text-muted-foreground text-caption mt-1">
                        {isAdmin
                            ? 'Visualize e gerencie todos os atletas cadastrados na plataforma.'
                            : 'Gerencie os atletas da sua equipe/organização.'}
                    </p>
                </div>
                {isAcademy && (
                    <Button pill asChild>
                        <Link href="/academia-equipe/dashboard/atletas/novo">
                            <Plus className="mr-2 h-4 w-4" />
                            Novo Atleta
                        </Link>
                    </Button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Atletas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-h2">{athletesWithEmails?.length || 0}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Lista de Atletas</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Nome</TableHead>
                                <TableHead>Faixa</TableHead>
                                <TableHead>E-mail</TableHead>
                                {isAdmin && <TableHead>Academia / Equipe</TableHead>}
                                <TableHead>Data de Cadastro</TableHead>
                                <TableHead className="text-right pr-6 w-[100px]">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!athletesWithEmails || athletesWithEmails.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isAdmin ? 6 : 5} className="h-24 text-center text-muted-foreground">
                                        Nenhum atleta encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                athletesWithEmails.map((athlete) => (
                                    <TableRow key={athlete.id}>
                                        <TableCell className="pl-6 font-medium">
                                            {athlete.full_name}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                style={getBeltStyle(athlete.belt_color || '')}
                                                className="text-label"
                                            >
                                                {athlete.belt_color || '-'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {athlete.email?.includes('@dummy.competir.com') ? (
                                                <GenerateAccessButton athleteId={athlete.id} athleteName={athlete.full_name} />
                                            ) : (
                                                athlete.email
                                            )}
                                        </TableCell>
                                        {isAdmin && (
                                            <TableCell className="font-medium text-primary/80">
                                                {athlete.gym_name || '-'}
                                            </TableCell>
                                        )}
                                        <TableCell className="text-muted-foreground">
                                            {athlete.created_at
                                                ? format(new Date(athlete.created_at), "dd/MM/yy", { locale: ptBR })
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button pill variant="ghost" size="icon" asChild title="Ver Perfil">
                                                    <Link href={`/academia-equipe/dashboard/atletas/${athlete.id}/perfil`}>
                                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                                        <span className="sr-only">Ver Perfil</span>
                                                    </Link>
                                                </Button>
                                                <Button pill variant="ghost" size="icon" asChild title="Editar">
                                                    <Link href={`/academia-equipe/dashboard/atletas/${athlete.id}`}>
                                                        <Pencil className="h-4 w-4 text-muted-foreground" />
                                                        <span className="sr-only">Editar</span>
                                                    </Link>
                                                </Button>
                                            </div>
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
