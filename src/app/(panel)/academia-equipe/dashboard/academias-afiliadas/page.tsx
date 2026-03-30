import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { TreeStructureIcon, BuildingsIcon, InfoIcon } from '@phosphor-icons/react/dist/ssr';
import { RegisterAcademyButton } from './RegisterAcademyButton';

export default async function AcademiasAfiliadasPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'academia/equipe' || !profile.tenant_id) {
        redirect('/academia-equipe/dashboard');
    }

    const { data: hubTenant } = await supabase
        .from('tenants')
        .select('can_register_academies, name')
        .eq('id', profile.tenant_id)
        .single();

    if (!hubTenant?.can_register_academies) {
        redirect('/academia-equipe/dashboard');
    }

    const adminClient = createAdminClient();

    // Academias cadastradas por este hub
    const { data: affiliatedTenants } = await adminClient
        .from('tenants')
        .select('id, name, owner_id, created_at')
        .eq('registered_by_tenant_id', profile.tenant_id)
        .order('name');

    // Fetch owner emails das afiliadas
    const ownerIds = affiliatedTenants?.map(t => t.owner_id).filter(Boolean) ?? [];
    const ownerEmails: Record<string, string> = {};

    if (ownerIds.length > 0) {
        for (const ownerId of ownerIds) {
            const { data: { user: ownerUser } } = await adminClient.auth.admin.getUserById(ownerId);
            if (ownerUser?.email) {
                ownerEmails[ownerId] = ownerUser.email;
            }
        }
    }


    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-panel-lg font-black tracking-tight">Academias Afiliadas</h1>
                    <p className="text-panel-sm text-muted-foreground mt-1">
                        Academias registradas e vinculadas à {hubTenant.name}.
                    </p>
                </div>
                <RegisterAcademyButton />
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl border bg-muted/40 text-panel-sm text-muted-foreground">
                <InfoIcon size={18} weight="duotone" className="text-primary shrink-0 mt-0.5" />
                <p>
                    O cadastro de academias afiliadas é uma forma de <span className="font-semibold text-foreground">indicar novas academias</span> para a plataforma e <span className="font-semibold text-foreground">ceder benefícios exclusivos</span> a elas. As academias afiliadas operam de forma independente, com acesso completo ao painel.
                </p>
            </div>

            <Card className="shadow-none">
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-panel-md font-semibold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BuildingsIcon size={20} weight="duotone" className="text-primary" />
                            Academias Cadastradas
                        </div>
                        <Badge variant="secondary" className="rounded-full">
                            {affiliatedTenants?.length ?? 0}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-6 text-panel-sm font-semibold">Nome</TableHead>
                                <TableHead className="text-panel-sm font-semibold">E-mail</TableHead>
                                <TableHead className="text-panel-sm font-semibold text-right pr-6">Cadastrada em</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {affiliatedTenants && affiliatedTenants.length > 0 ? (
                                affiliatedTenants.map((tenant) => (
                                    <TableRow key={tenant.id}>
                                        <TableCell className="pl-6 text-panel-sm font-medium">{tenant.name}</TableCell>
                                        <TableCell className="text-panel-sm text-muted-foreground">
                                            {ownerEmails[tenant.owner_id] ?? '-'}
                                        </TableCell>
                                        <TableCell className="text-panel-sm text-muted-foreground text-right pr-6">
                                            {new Date(tenant.created_at).toLocaleDateString('pt-BR')}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-10 text-panel-sm text-muted-foreground italic">
                                        Nenhuma academia afiliada cadastrada ainda.
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
