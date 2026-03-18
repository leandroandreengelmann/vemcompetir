import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBeltStyle } from '@/lib/belt-theme';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { createAdminClient } from '@/lib/supabase/admin';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
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

interface ProfilePageProps {
    params: Promise<{ id: string }>;
}

function calculateAge(birthDateStr: string | null) {
    if (!birthDateStr) return '-';
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

const getStatusBadgeVariant = (status: string) => {
    switch (status) {
        case 'pago':
        case 'isento':
        case 'confirmado':
            return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
        case 'pendente':
            return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
        case 'carrinho':
            return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
        case 'cancelado':
            return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
        default:
            return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'pago': return 'Pago';
        case 'isento': return 'Isento';
        case 'confirmado': return 'Confirmado';
        case 'pendente': return 'Pendente';
        case 'carrinho': return 'No Carrinho';
        case 'cancelado': return 'Cancelado';
        default: return status;
    }
};

export default async function AthleteProfilePage(props: ProfilePageProps) {
    const params = await props.params;
    const { id } = params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: orgProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    const isConfiguredAcademy = orgProfile?.role === 'academia/equipe' && orgProfile?.tenant_id;
    const isGlobalAdmin = orgProfile?.role === 'admin_geral';

    if (!isConfiguredAcademy && !isGlobalAdmin) {
        redirect('/academia-equipe/dashboard');
    }

    // Fetch athlete profile and verify tenant
    let query = supabase
        .from('profiles')
        .select('*')
        .eq('id', id);

    if (isConfiguredAcademy) {
        query = query.eq('tenant_id', orgProfile.tenant_id);
    }

    const { data: athleteProfile, error } = await query.single();

    if (error || !athleteProfile) {
        notFound();
    }

    const adminSupabase = createAdminClient();

    // Fetch event registrations using admin client to bypass RLS rules that might hide past registrations
    const { data: registrations } = await adminSupabase
        .from('event_registrations')
        .select(`
            id,
            status,
            created_at,
            event:events ( id, title ),
            category:category_rows ( id, categoria_completa )
        `)
        .eq('athlete_id', athleteProfile.id)
        .order('created_at', { ascending: false });

    const age = calculateAge(athleteProfile.birth_date);

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header / Actions */}
            <div className="flex items-center gap-4">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" asChild className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <Link href="/academia-equipe/dashboard/atletas">
                                <ArrowLeftIcon size={24} weight="duotone" />
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Voltar para lista de atletas</TooltipContent>
                </Tooltip>
                <div>
                    <h1 className="text-panel-lg font-bold tracking-tight">Perfil do Atleta</h1>
                    <p className="text-panel-sm text-muted-foreground">Visualização detalhada e histórico de inscrições</p>
                </div>
            </div>

            {/* Profile Info Card (Premium Layout) */}
            <Card className="overflow-hidden border-border/50 shadow-sm rounded-2xl">
                <div className="p-8 sm:p-10 flex flex-col sm:flex-row gap-8 items-start sm:items-center relative bg-gradient-to-br from-card to-muted/20">

                    {/* Abstract pattern behind */}
                    <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-bl-full -z-10 pointer-events-none" />

                    {/* Avatar Stub */}
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-muted flex items-center justify-center border-4 border-background shadow-lg shrink-0 overflow-hidden text-muted-foreground font-black text-4xl uppercase tracking-tighter">
                        {athleteProfile.full_name?.substring(0, 2) || 'AT'}
                    </div>

                    <div className="flex flex-col gap-4 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-panel-lg font-black text-foreground tracking-tight">
                                    {athleteProfile.full_name}
                                </h2>
                                <p className="text-panel-sm text-muted-foreground font-medium mt-1">
                                    {athleteProfile.gym_name || orgProfile?.gym_name || 'Academia não informada'}
                                </p>
                            </div>
                            <Badge
                                variant="outline"
                                style={getBeltStyle(athleteProfile.belt_color || '')}
                                className="px-4 py-1.5 text-panel-sm font-bold uppercase tracking-wider self-start sm:self-auto border-2 border-border/50"
                            >
                                {athleteProfile.belt_color || 'Faixa não informada'}
                            </Badge>
                        </div>

                        {/* Details grid */}
                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                            <div className="flex items-center text-panel-sm">
                                <span className="font-semibold text-muted-foreground mr-1.5">Idade:</span>
                                <span className="font-medium text-foreground">{age !== '-' ? `${age} anos` : 'N/A'}</span>
                            </div>
                            <div className="flex items-center text-panel-sm">
                                <span className="font-semibold text-muted-foreground mr-1.5">Peso:</span>
                                <span className="font-medium text-foreground">{athleteProfile.weight ? `${athleteProfile.weight} kg` : 'N/A'}</span>
                            </div>
                            <div className="flex items-center text-panel-sm">
                                <span className="font-semibold text-muted-foreground mr-1.5">Sexo:</span>
                                <span className="font-medium text-foreground capitalize">{athleteProfile.sexo || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Registrations History */}
            <Card className="rounded-2xl shadow-sm border-border/50">
                <CardHeader className="pb-4">
                    <CardTitle className="text-panel-md flex items-center gap-2">
                        Histórico de Campeonatos
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="pl-6 h-12">Evento</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Data de Inscrição</TableHead>
                                <TableHead className="text-right pr-6">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!registrations || registrations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                        Este atleta ainda não possui inscrições.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                registrations.map((reg) => (
                                    <TableRow key={reg.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-medium pl-6">
                                            {/* @ts-ignore - Supabase join typing */}
                                            {reg.event?.title || 'Evento Desconhecido'}
                                        </TableCell>
                                        <TableCell className="text-panel-sm text-muted-foreground max-w-[250px] truncate">
                                            {/* @ts-ignore */}
                                            {reg.category?.categoria_completa || '-'}
                                        </TableCell>
                                        <TableCell className="text-panel-sm text-muted-foreground">
                                            {format(new Date(reg.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Badge variant="outline" className={`font-semibold border uppercase text-panel-sm tracking-wider px-2 py-0.5 ${getStatusBadgeVariant(reg.status)}`}>
                                                {getStatusLabel(reg.status)}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
