import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, PencilSimpleIcon, UserIcon, UsersIcon, ShieldCheckIcon, GraduationCapIcon, MapPinIcon, EnvelopeIcon, CreditCardIcon, PhoneIcon } from '@phosphor-icons/react/dist/ssr';
import DeleteAcademyButton from '../components/DeleteAcademyButton';
import DeleteAthleteButton from '../components/DeleteAthleteButton';
import FinancialModuleToggle from '../components/FinancialModuleToggle';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function AcademyDetailPage(props: PageProps) {
    const params = await props.params;
    const { id } = params;

    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) redirect('/login');

    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single();
    if (adminProfile?.role !== 'admin_geral') redirect('/login');

    const adminClient = createAdminClient();

    // 1. Dados da Academia (User Auth e Perfil)
    const { data: { user: academyUser }, error: authError } = await adminClient.auth.admin.getUserById(id);
    if (authError || !academyUser) notFound();

    const { data: academyProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

    const tenantId = academyUser.user_metadata?.tenant_id || academyProfile?.tenant_id;

    const { data: tenant } = await adminClient
        .from('tenants')
        .select('financial_module_enabled, financial_module_enabled_at')
        .eq('id', tenantId)
        .single();

    // 2. Buscar Membros (Atletas) vinculados a esta academia
    const { data: members } = await supabase
        .from('profiles')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('role', 'atleta');

    const masters = members?.filter(m => m.is_master) || [];
    const responsibles = members?.filter(m => m.is_responsible) || [];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <Link
                        href="/admin/dashboard/equipes-academias"
                        className="text-ui font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center w-fit mb-2"
                    >
                        <ArrowLeftIcon size={20} weight="duotone" className="mr-2" />
                        Voltar para a lista
                    </Link>
                    <h1 className="text-panel-lg font-black tracking-tight">{academyUser.user_metadata?.full_name || 'Academia/Equipe'}</h1>
                    <p className="text-panel-sm text-muted-foreground">Visualização detalhada da organização.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button pill asChild>
                        <Link href={`/admin/dashboard/equipes-academias/${id}/editar`}>
                            <PencilSimpleIcon size={20} weight="duotone" className="mr-2" />
                            Editar Dados
                        </Link>
                    </Button>
                    <DeleteAcademyButton
                        academyId={id}
                        academyName={academyUser.user_metadata?.full_name || 'Academia/Equipe'}
                    />
                </div>
            </div>

            <FinancialModuleToggle
                tenantId={tenantId}
                initialEnabled={!!tenant?.financial_module_enabled}
                enabledAt={tenant?.financial_module_enabled_at ?? null}
            />

            <div className="grid gap-6 md:grid-cols-3">
                {/* Dados Gerais */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-panel-md font-semibold flex items-center">
                            <ShieldCheckIcon size={20} weight="duotone" className="mr-2 text-primary" />
                            Dados da Organização
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-1">
                            <span className="text-panel-sm text-muted-foreground">Nome da Organização</span>
                            <div className="flex items-center text-panel-sm font-medium">
                                <UsersIcon size={20} weight="duotone" className="mr-2 text-muted-foreground" />
                                {academyUser.user_metadata?.full_name || '-'}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-panel-sm text-muted-foreground">E-mail de Acesso</span>
                            <div className="flex items-center text-panel-sm font-medium">
                                <EnvelopeIcon size={20} weight="duotone" className="mr-2 text-muted-foreground" />
                                {academyUser.email || '-'}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-panel-sm text-muted-foreground">Documento (CPF/CNPJ)</span>
                            <div className="flex items-center text-panel-sm font-medium">
                                <CreditCardIcon size={20} weight="duotone" className="mr-2 text-muted-foreground" />
                                {academyUser.user_metadata?.document || '-'}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-panel-sm text-muted-foreground">Endereço Completo</span>
                            <div className="flex items-start text-panel-sm font-medium">
                                <MapPinIcon size={20} weight="duotone" className="mr-2 text-muted-foreground mt-0.5" />
                                <div>
                                    {academyUser.user_metadata?.address_street && (
                                        <>
                                            {academyUser.user_metadata.address_street}, {academyUser.user_metadata.address_number} <br />
                                            {academyUser.user_metadata.address_city} - {academyUser.user_metadata.address_state} <br />
                                            CEP: {academyUser.user_metadata.address_zip_code}
                                        </>
                                    )}
                                    {!academyUser.user_metadata?.address_street && '-'}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Resumo de Equipe */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-panel-md font-semibold flex items-center">
                            <UsersIcon size={20} weight="duotone" className="mr-2 text-primary" />
                            Equipe Técnica
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
                            <div className="flex items-center gap-2">
                                <GraduationCapIcon size={20} weight="duotone" className="text-primary" />
                                <span className="text-panel-sm font-medium">Mestres</span>
                            </div>
                            <Badge variant="secondary" className="rounded-full">{masters.length}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
                            <div className="flex items-center gap-2">
                                <UserIcon size={20} weight="duotone" className="text-primary" />
                                <span className="text-panel-sm font-medium">Responsáveis</span>
                            </div>
                            <Badge variant="secondary" className="rounded-full">{responsibles.length}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
                            <div className="flex items-center gap-2">
                                <UsersIcon size={20} weight="duotone" className="text-muted-foreground" />
                                <span className="text-panel-sm font-medium">Total de Atletas</span>
                            </div>
                            <Badge variant="outline" className="rounded-full border-muted text-muted-foreground">{members?.length || 0}</Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Lista Completa de Atletas */}
            <Card>
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-panel-md font-semibold flex items-center justify-between">
                        <div className="flex items-center">
                            <UsersIcon size={20} weight="duotone" className="mr-2 text-primary" />
                            Atletas Vinculados
                        </div>
                        <Badge variant="secondary" className="rounded-full">{members?.length || 0}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-6 text-panel-sm font-semibold">Nome</TableHead>
                                <TableHead className="text-panel-sm font-semibold">CPF</TableHead>
                                <TableHead className="text-panel-sm font-semibold text-center w-28">Faixa</TableHead>
                                <TableHead className="w-12 pr-6" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members && members.length > 0 ? members.map((member) => (
                                <TableRow key={member.id}>
                                    <TableCell className="pl-6 text-panel-sm font-medium">{member.full_name}</TableCell>
                                    <TableCell className="text-panel-sm text-muted-foreground">{member.cpf || '-'}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="rounded-full font-normal">{member.belt_color || '-'}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <DeleteAthleteButton
                                            athleteId={member.id}
                                            athleteName={member.full_name}
                                            academyId={id}
                                        />
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-6 text-panel-sm text-muted-foreground italic">
                                        Nenhum atleta vinculado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Listas de Pessoas Chave */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Mestres */}
                <Card>
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-panel-md font-semibold flex items-center justify-between">
                            <div className="flex items-center">
                                <GraduationCapIcon size={20} weight="duotone" className="mr-2 text-primary" />
                                Mestres da Academia
                            </div>
                            <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary border-none">OFICIAL</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="pl-6 text-panel-sm font-semibold">Nome</TableHead>
                                    <TableHead className="text-panel-sm font-semibold text-center w-24">Faixa</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {masters.length > 0 ? masters.map((master) => (
                                    <TableRow key={master.id}>
                                        <TableCell className="pl-6 text-panel-sm font-medium">{master.full_name}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="rounded-full font-normal">{master.belt_color || '-'}</Badge>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center py-6 text-panel-sm text-muted-foreground italic">
                                            Nenhum mestre vinculado.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Responsáveis */}
                <Card>
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-panel-md font-semibold flex items-center justify-between">
                            <div className="flex items-center">
                                <UserIcon size={20} weight="duotone" className="mr-2 text-primary" />
                                Responsáveis Administrativos
                            </div>
                            <Badge variant="secondary" className="rounded-full bg-blue-100 text-blue-700 border-none dark:bg-blue-900/30 dark:text-blue-300">ADMIN</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="pl-6 text-panel-sm font-semibold">Nome</TableHead>
                                    <TableHead className="text-panel-sm font-semibold px-4 text-center">Contato</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {responsibles.length > 0 ? responsibles.map((resp) => (
                                    <TableRow key={resp.id}>
                                        <TableCell className="pl-6 text-panel-sm font-medium">{resp.full_name}</TableCell>
                                        <TableCell className="text-center">
                                            {resp.phone && (
                                                <a href={`https://wa.me/${resp.phone.replace(/\D/g, '')}`} target="_blank" className="inline-flex items-center text-primary hover:underline text-panel-sm font-medium">
                                                    <PhoneIcon size={20} weight="duotone" className="mr-1" />
                                                    {resp.phone}
                                                </a>
                                            )}
                                            {!resp.phone && <span className="text-muted-foreground text-panel-sm">-</span>}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center py-6 text-muted-foreground text-panel-sm italic">
                                            Nenhum responsável administrativo.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
