import { SectionHeader } from '@/components/layout/SectionHeader';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { listImports } from './actions';
import { UploadCsvDialog } from './components/upload-csv-dialog';
import { ImportRowActions } from './components/import-row-actions';
import { Button } from '@/components/ui/button';
import { EyeIcon } from '@phosphor-icons/react/dist/ssr';

export const dynamic = 'force-dynamic';

export default async function CatalogoJiuJitsuPage() {
    const imports = await listImports();

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Catálogo Jiu-Jitsu (LAB)"
                description="Área isolada para enviar CSVs de categorias e analisar/normalizar antes de virar gestor oficial. Não afeta o sistema atual."
                rightElement={
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" pill>
                            <Link href="/admin/dashboard/catalogo-jiu-jitsu/preview">
                                <EyeIcon size={20} weight="duotone" className="mr-2" />
                                Preview Adulto Masculino
                            </Link>
                        </Button>
                        <UploadCsvDialog />
                    </div>
                }
            />

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-panel-sm font-medium">CSVs Importados</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-panel-lg font-black">{imports.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-panel-sm font-medium">Total de Linhas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-panel-lg font-black">
                            {imports.reduce((acc, imp) => acc + (imp.total_rows || 0), 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-panel-sm font-medium">Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant="outline" className="rounded-full text-xs font-bold px-2.5 shadow-xs">
                            Isolado do sistema
                        </Badge>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-panel-md font-semibold">Importações</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Nome</TableHead>
                                <TableHead>Arquivo</TableHead>
                                <TableHead className="text-center">Linhas</TableHead>
                                <TableHead className="text-center">Colunas</TableHead>
                                <TableHead>Enviado em</TableHead>
                                <TableHead className="w-[100px] text-right pr-6">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {imports.map((imp) => (
                                <TableRow key={imp.id}>
                                    <TableCell className="pl-6 text-panel-sm font-medium">
                                        <Link
                                            href={`/admin/dashboard/catalogo-jiu-jitsu/${imp.id}`}
                                            className="hover:underline"
                                        >
                                            {imp.name}
                                        </Link>
                                        {imp.description && (
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                {imp.description}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {imp.filename || '-'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="rounded-full text-xs font-bold px-2.5 shadow-xs">
                                            {imp.total_rows}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center text-muted-foreground">
                                        {imp.headers?.length || 0}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {format(new Date(imp.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <ImportRowActions id={imp.id} name={imp.name} />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {imports.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        Nenhum CSV enviado ainda. Use o botão acima para começar.
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
