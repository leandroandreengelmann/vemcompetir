import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, MapPin, Pencil, Users, Info, PackageOpen } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function EventosPage() {
    // ... (logic remains same)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'academia/equipe') redirect('/login');

    if (!profile?.tenant_id) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Você não está vinculado a uma equipe / academia. Entre em contato com o suporte.
            </div>
        );
    }

    const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('event_date', { ascending: true });

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Meus Eventos"
                description="Gerencie os eventos da sua organização."
                rightElement={
                    <div className="flex gap-2">
                        <Button asChild variant="outline" pill>
                            <Link href="/academia-equipe/dashboard/eventos/disponiveis">
                                Eventos Disponíveis
                            </Link>
                        </Button>
                        <Button asChild pill>
                            <Link href="/academia-equipe/dashboard/eventos/novo">
                                <Plus className="mr-2 h-4 w-4" />
                                Novo Evento
                            </Link>
                        </Button>
                    </div>
                }
            />

            <Alert className="bg-primary/5 border-primary/20 rounded-2xl shadow-sm border-2">
                <Info className="h-4 w-4 text-primary" />
                <AlertTitle className="text-ui font-bold text-primary">Informação de Fluxo</AlertTitle>
                <AlertDescription className="text-caption font-medium opacity-80">
                    Novos eventos são enviados para conferência do administrador. Você será notificado quando o status mudar para <strong className="text-blue-600 dark:text-blue-400">Publicado</strong>.
                </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-ui font-medium">Total de Eventos</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-h2">{events?.length || 0}</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-premium rounded-3xl overflow-hidden">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl">Lista de Eventos</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table className="min-w-[600px] md:min-w-full">
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="pl-6 text-ui font-black">TÍTULO</TableHead>
                                    <TableHead className="hidden sm:table-cell text-ui font-black">DATA</TableHead>
                                    <TableHead className="hidden md:table-cell text-ui font-black">LOCAL</TableHead>
                                    <TableHead className="text-center text-ui font-black">STATUS</TableHead>
                                    <TableHead className="w-[120px] text-right pr-6 text-ui font-black">AÇÕES</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!events || events.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center border-none">
                                            <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-2xl border-2 border-dashed border-border/50">
                                                <PackageOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
                                                <p className="text-sm font-medium text-muted-foreground">Nenhum evento encontrado.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    events.map((event) => (
                                        <TableRow key={event.id} className="hover:bg-muted/10 transition-colors group">
                                            <TableCell className="pl-6 py-5">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-bold text-foreground text-body leading-tight">{event.title}</span>
                                                    {/* Sub-info visible only on mobile */}
                                                    <span className="text-caption text-muted-foreground font-medium sm:hidden">
                                                        {event.event_date ? format(new Date(event.event_date), "dd/MM/yy", { locale: ptBR }) : '-'}
                                                        {event.location && ` • ${event.location}`}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-foreground text-body font-bold hidden sm:table-cell">
                                                {event.event_date ? format(new Date(event.event_date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                                            </TableCell>
                                            <TableCell className="text-foreground hidden md:table-cell">
                                                <div className="flex items-center text-body font-bold">
                                                    <span className="truncate max-w-[250px]">{event.location || '-'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-4">
                                                {event.status === 'pendente' ? (
                                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full animate-pulse shadow-sm whitespace-nowrap">
                                                        Pendente
                                                    </Badge>
                                                ) : event.status === 'aprovado' ? (
                                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm whitespace-nowrap">
                                                        Aprovado
                                                    </Badge>
                                                ) : event.status === 'publicado' ? (
                                                    <Badge variant="default" className="bg-blue-600 text-white hover:bg-blue-700 border-none text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md whitespace-nowrap">
                                                        Publicado
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full whitespace-nowrap">
                                                        {event.status || 'Ativo'}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right pr-6 py-4">
                                                <div className="flex items-center justify-end gap-1 sm:gap-2">
                                                    <Button variant="ghost" size="icon" asChild pill title="Editar" className="h-10 w-10 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted/80 dark:hover:bg-muted/20 dark:hover:text-foreground transition-colors">
                                                        <Link href={`/academia-equipe/dashboard/eventos/${event.id}`}>
                                                            <Pencil className="h-4 w-4" />
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
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}
