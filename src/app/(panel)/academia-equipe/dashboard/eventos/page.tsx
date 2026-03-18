import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusIcon, PencilSimpleIcon, InfoIcon, PackageIcon } from '@phosphor-icons/react/dist/ssr';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { getEventStatusClasses, getEventStatusVariant, EVENT_STATUS_BASE_CLASSES } from '@/lib/event-status';
import { cn } from '@/lib/utils';

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
                                <PlusIcon size={20} weight="duotone" className="mr-2" />
                                Novo Evento
                            </Link>
                        </Button>
                    </div>
                }
            />

            <Alert className="bg-muted/30 border rounded-xl">
                <InfoIcon size={20} weight="duotone" className="text-muted-foreground" />
                <AlertTitle className="text-panel-sm font-semibold">Informação de Fluxo</AlertTitle>
                <AlertDescription className="text-panel-sm font-medium opacity-80">
                    Novos eventos são enviados para conferência do administrador. Você será notificado quando o status mudar para <strong className="text-blue-600 dark:text-blue-400">Publicado</strong>.
                </AlertDescription>
            </Alert>

            <Card className="border-none shadow-premium rounded-3xl overflow-hidden">
                <CardHeader className="pb-4">
                    <CardTitle className="text-panel-md font-semibold">Lista de Eventos</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table className="min-w-[600px] md:min-w-full">
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="pl-6 text-panel-sm font-black">TÍTULO</TableHead>
                                    <TableHead className="hidden sm:table-cell text-panel-sm font-black">DATA</TableHead>
                                    <TableHead className="hidden md:table-cell text-panel-sm font-black">LOCAL</TableHead>
                                    <TableHead className="text-center text-panel-sm font-black">STATUS</TableHead>
                                    <TableHead className="w-[120px] text-right pr-6 text-panel-sm font-black">AÇÕES</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!events || events.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center border-none">
                                            <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-2xl border-2 border-dashed border-border/50">
                                                <PackageIcon size={40} weight="duotone" className="text-muted-foreground/30 mb-3" />
                                                <p className="text-panel-sm font-medium text-muted-foreground">Nenhum evento encontrado.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    events.map((event) => (
                                        <TableRow key={event.id} className="hover:bg-muted/10 transition-colors group">
                                            <TableCell className="pl-6 py-5">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-bold text-foreground text-panel-sm leading-tight">{event.title}</span>
                                                    {/* Sub-info visible only on mobile */}
                                                    <span className="text-panel-sm text-muted-foreground font-medium sm:hidden">
                                                        {event.event_date ? format(new Date(event.event_date), "dd/MM/yy", { locale: ptBR }) : '-'}
                                                        {event.location && ` • ${event.location}`}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-foreground text-panel-sm font-bold hidden sm:table-cell">
                                                {event.event_date ? format(new Date(event.event_date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                                            </TableCell>
                                            <TableCell className="text-foreground hidden md:table-cell">
                                                <div className="flex items-center text-panel-sm font-bold">
                                                    <span className="truncate max-w-[250px]">{event.location || '-'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-4">
                                                <Badge
                                                    variant={getEventStatusVariant(event.status)}
                                                    className={cn(EVENT_STATUS_BASE_CLASSES, getEventStatusClasses(event.status))}
                                                >
                                                    {event.status || 'Ativo'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6 py-4">
                                                <div className="flex items-center justify-end gap-1 sm:gap-2">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" asChild pill className="h-10 w-10 sm:h-9 sm:w-9 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                                                <Link href={`/academia-equipe/dashboard/eventos/${event.id}`}>
                                                                    <PencilSimpleIcon size={20} weight="duotone" />
                                                                    <span className="sr-only">Editar</span>
                                                                </Link>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">Editar evento</TooltipContent>
                                                    </Tooltip>
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
