import Link from 'next/link';
import { requireRole } from '@/lib/auth-guards';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ClipboardList, Search, Trophy, Calendar, MapPin } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AthleteProfileForm } from '../profile-form';
import { AthletePageHeader } from '../components/athlete-page-header';
import { ReactivatePaymentButton } from './ReactivatePaymentButton';
import { CancelRegistrationButton } from './CancelRegistrationButton';

const BELTS = [
    'Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde',
    'Azul', 'Roxa', 'Marrom', 'Preta', 'Coral', 'Vermelha'
];

export default async function AthleteInscricoes() {
    const { user } = await requireRole('atleta');
    const supabase = await createClient();

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, role, belt_color, avatar_url, weight, birth_date, gym_name, tenant_id, master_id, master_name')
        .eq('id', user.id)
        .single();

    const { data: inscricoesData, error } = await supabase
        .from('event_registrations')
        .select(`
id,
    status,
    created_at,
    event: events(id, title, event_date, location, image_path),
        category: category_rows(categoria_completa, faixa, categoria_peso)
        `)
        .eq('athlete_id', user.id)
        .neq('status', 'carrinho')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("ERRO AO BUSCAR INSCRIÇÕES:", JSON.stringify(error, null, 2));
    }

    const inscricoes = inscricoesData || [];

    const isProfileIncomplete = !profile?.weight || !profile?.birth_date || !profile?.belt_color || !profile?.gym_name;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pago':
            case 'confirmado':
                return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 uppercase text-[10px] whitespace-nowrap px-2 py-0.5 tracking-wider font-bold">Confirmada</Badge>;
            case 'aguardando_pagamento':
            case 'pendente':
                return <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 uppercase text-[10px] whitespace-nowrap px-2 py-0.5 tracking-wider font-bold">Aguardando Pagamento</Badge>;
            case 'cancelado':
            case 'reembolsado':
                return <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 uppercase text-[10px] whitespace-nowrap px-2 py-0.5 tracking-wider font-bold">Cancelada</Badge>;
            default:
                return <Badge variant="outline" className="uppercase text-[10px] whitespace-nowrap px-2 py-0.5 tracking-wider font-bold">{status.replace('_', ' ')}</Badge>;
        }
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] p-4 flex flex-col">
            <AthletePageHeader
                title="Minhas Inscrições"
                description="Gerencie suas participações"
                backHref="/atleta/dashboard"
                beltColor={profile?.belt_color || 'branca'}
            />

            {/* Main Content */}
            <div className={`flex - 1 flex flex - col items - center ${inscricoes.length === 0 ? 'justify-center max-w-2xl' : 'max-w-4xl'} mx - auto w - full pb - 20`}>
                {inscricoes.length === 0 ? (
                    <div className="text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
                        <div className="mx-auto bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-6">
                            <ClipboardList className="h-10 w-10 text-primary" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-h2 text-foreground">
                                Você não está inscrito em nenhum campeonato
                            </h2>
                            <p className="text-ui text-muted-foreground max-w-xs mx-auto">
                                Seus eventos ativos e seu histórico aparecerão aqui assim que você concluir uma inscrição.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 pt-4">
                            <Button pill asChild className="w-full h-12  font-bold gap-2 shadow-sm transition-all active:scale-[0.98]">
                                <Link href="/atleta/dashboard/campeonatos">
                                    <Search className="h-4 w-4" />
                                    Explorar Campeonatos
                                </Link>
                            </Button>
                            <Button pill variant="ghost" asChild className="w-full h-12  font-bold text-muted-foreground hover:text-primary transition-all">
                                <Link href="/atleta/dashboard">
                                    Voltar ao Dashboard
                                </Link>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="w-full space-y-4 pt-4">
                        <h2 className="text-h3 font-bold text-brand-950 mb-2">Histórico de Inscrições</h2>
                        <div className="grid gap-4 w-full">
                            {inscricoes.map((inscricao: any) => (
                                <Link key={inscricao.id} href={`/ atleta / dashboard / campeonatos / ${inscricao.event?.id} `} className="block group">
                                    <Card className="overflow-hidden border-none shadow-premium hover:shadow-xl transition-all active:scale-[0.98] w-full bg-white flex flex-col sm:flex-row">
                                        {/* Imagem do Evento */}
                                        <div className="sm:w-32 sm:h-auto h-32 bg-muted relative shrink-0">
                                            {inscricao.event?.image_path ? (
                                                <img
                                                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL} /storage/v1 / object / public / event - images / ${inscricao.event.image_path} `}
                                                    alt={inscricao.event.title || 'Evento'}
                                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center bg-primary/5 group-hover:bg-primary/10 transition-colors">
                                                    <Trophy className="h-8 w-8 text-primary/20" />
                                                </div>
                                            )}
                                        </div>
                                        {/* Detalhes da Inscrição */}
                                        <div className="p-5 flex-1 flex flex-col justify-center">
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                                                <h3 className="font-bold text-lg leading-tight line-clamp-2 text-brand-950 group-hover:text-primary transition-colors">
                                                    {inscricao.event?.title}
                                                </h3>
                                                <div className="shrink-0 flex items-center gap-2">
                                                    {['aguardando_pagamento', 'pendente'].includes(inscricao.status) && (
                                                        <>
                                                            <ReactivatePaymentButton registrationId={inscricao.id} />
                                                            <CancelRegistrationButton registrationId={inscricao.id} />
                                                        </>
                                                    )}
                                                    {getStatusBadge(inscricao.status)}
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-3">
                                                {inscricao.event?.event_date && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="h-4 w-4 shrink-0 text-brand-950/40" />
                                                        <span className="font-medium text-brand-950/70">{format(new Date(inscricao.event.event_date), "dd 'de' MMM, yyyy", { locale: ptBR })}</span>
                                                    </div>
                                                )}
                                                {inscricao.event?.city && (
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="h-4 w-4 shrink-0 text-brand-950/40" />
                                                        <span className="font-medium text-brand-950/70">{inscricao.event.city}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="bg-[#f8f9fa] rounded-md p-3 border border-slate-100 mt-auto">
                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Categoria Inscrita</span>
                                                <p className="text-sm font-bold text-slate-700">
                                                    {inscricao.category?.categoria_completa || 'Categoria não informada no sistema'}
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Incomplete Profile Warning Modal */}
            {isProfileIncomplete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <AthleteProfileForm profile={profile} user={user} belts={BELTS} />
                </div>
            )}
        </div>
    );
}
