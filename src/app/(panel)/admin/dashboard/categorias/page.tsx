import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SectionHeader } from "@/components/layout/SectionHeader";
import { getCategoryTables } from '../../actions/categories';
import { CreateTableDialog } from './components/create-table-dialog';
import { CategoryTableActions } from './components/category-table-actions';

export default async function CategoryListPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    // Fetch data using server action (which handles auth check too)
    const tables = await getCategoryTables();

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Tabelas de Categorias"
                description="Gerencie os grupos de categorias de Jiu-Jitsu para seus campeonatos."
                rightElement={<CreateTableDialog />}
            />

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-ui font-medium">Total de Tabelas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-h1">{tables.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-h2">Listagem de Tabelas</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Nome</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead className="text-center">Categorias</TableHead>
                                <TableHead>Última Atualização</TableHead>
                                <TableHead className="w-[100px] text-right pr-6">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tables.map((table) => (
                                <TableRow key={table.id}>
                                    <TableCell className="pl-6 text-ui font-medium">
                                        {table.name}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {table.description || '-'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="rounded-full text-xs font-bold px-2.5 shadow-xs">
                                            {table.count}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {table.updated_at
                                            ? format(new Date(table.updated_at), "dd/MM/yy HH:mm", { locale: ptBR })
                                            : '-'}
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <CategoryTableActions table={table} />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {tables.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        Nenhuma tabela encontrada.
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
