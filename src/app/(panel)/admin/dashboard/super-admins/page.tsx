import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/layout/SectionHeader";
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
import { SuperAdminForm } from './SuperAdminForm';
import { SuperAdminActions } from './SuperAdminActions';

export default async function SuperAdminsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (adminProfile?.role !== 'admin_geral') redirect('/login');

    // Lista de super admins
    const { data: admins } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'admin_geral')
        .order('full_name', { ascending: true });

    // E-mails e datas vêm do Auth (auth.users). Buscamos por ID (poucos admins) —
    // listUsers() é paginado (50/página) e não encontraria contas fora da 1ª página.
    const adminClient = createAdminClient();
    const adminsWithDetails = await Promise.all(
        (admins ?? []).map(async (a) => {
            const { data: { user: authUser } } = await adminClient.auth.admin.getUserById(a.id);
            return {
                ...a,
                email: authUser?.email || '-',
                created_at: authUser?.created_at || null,
                isCurrent: a.id === user.id,
            };
        })
    );

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Super Admins"
                description="Crie novas contas com acesso total ao painel administrativo."
                rightElement={
                    <Button asChild variant="ghost" pill className="gap-2">
                        <Link href="/admin/dashboard">
                            <CaretLeftIcon size={20} weight="bold" />
                            Voltar para o Painel
                        </Link>
                    </Button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <SuperAdminForm />
                </div>

                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-panel-md font-semibold flex items-center justify-between">
                                Super Admins ativos
                                <span className="text-panel-sm font-normal text-muted-foreground">
                                    {adminsWithDetails?.length || 0} registros
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6">Nome</TableHead>
                                        <TableHead>E-mail</TableHead>
                                        <TableHead className="text-right">Criado em</TableHead>
                                        <TableHead className="w-12 pr-6"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {adminsWithDetails?.map((a) => (
                                        <TableRow key={a.id}>
                                            <TableCell className="pl-6 text-panel-sm font-medium">
                                                {a.full_name || 'Sem nome'}
                                                {a.isCurrent && (
                                                    <span className="ml-2 text-xs text-muted-foreground">(você)</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-panel-sm">
                                                {a.email}
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground text-sm">
                                                {a.created_at ? format(new Date(a.created_at), 'dd/MM/yy HH:mm', { locale: ptBR }) : '-'}
                                            </TableCell>
                                            <TableCell className="pr-6 text-right">
                                                <SuperAdminActions
                                                    admin={{ id: a.id, full_name: a.full_name, email: a.email, isCurrent: a.isCurrent }}
                                                    canRevoke={(adminsWithDetails?.length ?? 0) > 1}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(!adminsWithDetails || adminsWithDetails.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                Nenhum super admin encontrado.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
