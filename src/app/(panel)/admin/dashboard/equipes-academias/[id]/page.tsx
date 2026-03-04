import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, User, Users, ShieldCheck, GraduationCap, MapPin, Mail, CreditCard, Phone } from 'lucide-react';
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
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para a lista
                    </Link>
                    <h1 className="text-h1 tracking-tight">{academyUser.user_metadata?.full_name || 'Academia/Equipe'}</h1>
                    <p className="text-caption text-muted-foreground">Visualização detalhada da organização.</p>
                </div>
                <Button pill asChild>
                    <Link href={`/admin/dashboard/equipes-academias/${id}/editar`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar Dados
                    </Link>
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Dados Gerais */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-h3 flex items-center">
                            <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
                            Dados da Organização
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-1">
                            <span className="text-label text-muted-foreground">Nome da Organização</span>
                            <div className="flex items-center text-ui font-medium">
                                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                                {academyUser.user_metadata?.full_name || '-'}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-label text-muted-foreground">E-mail de Acesso</span>
                            <div className="flex items-center text-ui font-medium">
                                <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                                {academyUser.email || '-'}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-label text-muted-foreground">Documento (CPF/CNPJ)</span>
                            <div className="flex items-center text-ui font-medium">
                                <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
                                {academyUser.user_metadata?.document || '-'}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-label text-muted-foreground">Endereço Completo</span>
                            <div className="flex items-start text-ui font-medium">
                                <MapPin className="mr-2 h-4 w-4 text-muted-foreground mt-0.5" />
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
                        <CardTitle className="text-h3 flex items-center">
                            <Users className="mr-2 h-5 w-5 text-primary" />
                            Equipe Técnica
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
                            <div className="flex items-center gap-2">
                                <GraduationCap className="h-4 w-4 text-primary" />
                                <span className="text-ui font-medium">Mestres</span>
                            </div>
                            <Badge variant="secondary" className="rounded-full">{masters.length}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" />
                                <span className="text-ui font-medium">Responsáveis</span>
                            </div>
                            <Badge variant="secondary" className="rounded-full">{responsibles.length}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl text-caption text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                <span className="text-ui font-medium">Total de Atletas</span>
                            </div>
                            <Badge variant="outline" className="rounded-full border-muted text-muted-foreground">{members?.length || 0}</Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Listas de Pessoas Chave */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Mestres */}
                <Card>
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-h3 flex items-center justify-between">
                            <div className="flex items-center">
                                <GraduationCap className="mr-2 h-5 w-5 text-primary" />
                                Mestres da Academia
                            </div>
                            <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary border-none">OFICIAL</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="pl-6 text-ui font-semibold">Nome</TableHead>
                                    <TableHead className="text-ui font-semibold text-center w-24">Faixa</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {masters.length > 0 ? masters.map((master) => (
                                    <TableRow key={master.id}>
                                        <TableCell className="pl-6 text-ui font-medium">{master.full_name}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="rounded-full font-normal">{master.belt_color || '-'}</Badge>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center py-6 text-caption text-muted-foreground italic">
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
                        <CardTitle className="text-h3 flex items-center justify-between">
                            <div className="flex items-center">
                                <User className="mr-2 h-5 w-5 text-primary" />
                                Responsáveis Administrativos
                            </div>
                            <Badge variant="secondary" className="rounded-full bg-blue-100 text-blue-700 border-none dark:bg-blue-900/30 dark:text-blue-300">ADMIN</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="pl-6 text-ui font-semibold">Nome</TableHead>
                                    <TableHead className="text-ui font-semibold px-4 text-center">Contato</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {responsibles.length > 0 ? responsibles.map((resp) => (
                                    <TableRow key={resp.id}>
                                        <TableCell className="pl-6 text-ui font-medium">{resp.full_name}</TableCell>
                                        <TableCell className="text-center">
                                            {resp.phone && (
                                                <a href={`https://wa.me/${resp.phone.replace(/\D/g, '')}`} target="_blank" className="inline-flex items-center text-primary hover:underline text-ui font-medium">
                                                    <Phone className="mr-1 h-3 w-3" />
                                                    {resp.phone}
                                                </a>
                                            )}
                                            {!resp.phone && <span className="text-muted-foreground text-ui">-</span>}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center py-6 text-muted-foreground text-caption italic">
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
