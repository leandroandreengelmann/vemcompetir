import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getImport, getImportRows, listNotes } from '../actions';
import { RawRowsTable } from '../components/raw-rows-table';
import { NotesPanel } from '../components/notes-panel';

export const dynamic = 'force-dynamic';

export default async function ImportDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [imp, rows, notes] = await Promise.all([
        getImport(id),
        getImportRows(id, 1000, 0),
        listNotes(id),
    ]);

    if (!imp) notFound();

    return (
        <div className="space-y-6">
            <Button asChild variant="ghost" size="sm" pill>
                <Link href="/admin/dashboard/catalogo-jiu-jitsu" className="inline-flex items-center gap-1">
                    <ArrowLeftIcon size={16} weight="bold" /> Voltar
                </Link>
            </Button>

            <SectionHeader
                title={imp.name}
                description={imp.description || 'Sem descrição.'}
                rightElement={
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-full">
                            {imp.total_rows} linhas
                        </Badge>
                        <Badge variant="outline" className="rounded-full">
                            {imp.headers.length} colunas
                        </Badge>
                        <Badge variant="outline" className="rounded-full">
                            {format(new Date(imp.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                        </Badge>
                    </div>
                }
            />

            <Card>
                <CardHeader>
                    <CardTitle className="text-panel-md font-semibold">Linhas</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <RawRowsTable headers={imp.headers} rows={rows} totalRows={imp.total_rows} />
                </CardContent>
            </Card>

            <NotesPanel importId={imp.id} notes={notes} />
        </div>
    );
}
