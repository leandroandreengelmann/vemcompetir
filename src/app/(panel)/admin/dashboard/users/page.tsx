import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { createOrganizerAction, createGymAction } from './actions';

export default async function UserManagementPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (adminProfile?.role !== 'admin_geral') redirect('/login');

    // Fetch list of accounts
    const { data: accounts } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['organizador', 'academia'])
        .order('updated_at', { ascending: false });

    // Fetch emails from auth via admin client
    const adminClient = createAdminClient();
    const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers();

    // Map emails to profiles
    const accountsWithEmails = accounts?.map(acc => {
        const authUser = authUsers.find(u => u.id === acc.id);
        return { ...acc, email: authUser?.email || '-' };
    });

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Gestão de Contas"
                description="Criação e monitoramento de perfis administrativos de Organizadores e Academias."
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
                {/* Formulários de Criação */}
                <div>
                    <Tabs defaultValue="organizador" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="organizador">Organizador</TabsTrigger>
                            <TabsTrigger value="academia">Academia / Equipe</TabsTrigger>
                        </TabsList>

                        <TabsContent value="organizador">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-panel-md font-semibold">Novo Organizador</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form action={createOrganizerAction} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="o-name">Nome Completo</Label>
                                            <Input id="o-name" name="full_name" placeholder="Nome do Organizador" required variant="lg" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="o-email">E-mail</Label>
                                            <Input id="o-email" name="email" type="email" placeholder="email@exemplo.com" required variant="lg" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="o-pass">Senha</Label>
                                            <Input id="o-pass" name="password" type="password" placeholder="Mínimo 6 caracteres" required minLength={6} variant="lg" />
                                        </div>
                                        <Button type="submit" pill className="w-full">Criar Conta</Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="academia">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-panel-md font-semibold">Nova Academia</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form action={createGymAction} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="g-name">Nome da Academia</Label>
                                            <Input id="g-name" name="gym_name" placeholder="Ex: Arena Competition" required variant="lg" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="g-email">E-mail</Label>
                                            <Input id="g-email" name="email" type="email" placeholder="email@exemplo.com" required variant="lg" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="g-pass">Senha</Label>
                                            <Input id="g-pass" name="password" type="password" placeholder="Mínimo 6 caracteres" required minLength={6} variant="lg" />
                                        </div>
                                        <Button type="submit" pill className="w-full">Criar Conta</Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Listagem */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-panel-md font-semibold flex items-center justify-between">
                                Contas Criadas
                                <span className="text-panel-sm font-normal text-muted-foreground">
                                    {accounts?.length || 0} registros
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6">Tipo</TableHead>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>E-mail</TableHead>
                                        <TableHead className="text-right pr-6">Última Atualização</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {accountsWithEmails?.map((acc) => (
                                        <TableRow key={acc.id}>
                                            <TableCell className="pl-6 capitalize text-panel-sm font-medium">
                                                {acc.role === 'academia' ? 'Academia' : 'Organizador'}
                                            </TableCell>
                                            <TableCell>
                                                {acc.gym_name || acc.full_name || 'Sem nome'}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-panel-sm">
                                                {acc.email}
                                            </TableCell>
                                            <TableCell className="text-right pr-6 text-muted-foreground text-sm">
                                                {acc.updated_at ? format(new Date(acc.updated_at), 'dd/MM/yy HH:mm', { locale: ptBR }) : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(!accountsWithEmails || accountsWithEmails.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                                Nenhuma conta encontrada.
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
