import Link from 'next/link';
import { requireRole } from '@/lib/auth-guards';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CaretLeftIcon, ClipboardTextIcon, MagnifyingGlassIcon, TrophyIcon, MapPinIcon } from '@phosphor-icons/react/dist/ssr';
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AthleteProfileForm } from '../profile-form';
import { AthletePageHeader } from '../components/athlete-page-header';
import { ReactivatePaymentButton } from './ReactivatePaymentButton';
import { CancelRegistrationWrapper } from './CancelRegistrationWrapper';
import { PassportButton } from './PassportButton';
import { ChangeCategoryButton } from './ChangeCategoryButton';

const BELTS = [
    'Branca', 'Cinza e branca', 'Cinza', 'Cinza e preta', 'Amarela e branca', 'Amarela', 'Amarela e preta',
    'Laranja e branca', 'Laranja', 'Laranja e preta', 'Verde e branca', 'Verde', 'Verde e preta',
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
    registration_number,
    event: events(id, title, event_date, location, image_path, category_change_deadline_days),
        category: category_rows(categoria_completa, faixa, categoria_peso)
        `)
        .eq('athlete_id', user.id)
        .neq('status', 'carrinho')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("ERRO AO BUSCAR INSCRIÇÕES:", JSON.stringify(error, null, 2));
    }

    const inscricoes = inscricoesData || [];

    const isProfileIncomplete = !profile?.weight || !profile?.belt_color || !profile?.gym_name;

    const getBeltBadgeClass = (faixa?: string) => {
        const lower = (faixa || '').toLowerCase();
        if (lower.includes('azul')) return 'bg-blue-500 text-white border-blue-600';
        if (lower.includes('roxa')) return 'bg-purple-500 text-white border-purple-600';
        if (lower.includes('marrom')) return 'bg-amber-800 text-white border-amber-900';
        if (lower.includes('preta')) return 'bg-slate-900 text-white border-slate-950';
        if (lower.includes('cinza')) return 'bg-gray-400 text-white border-gray-500';
        if (lower.includes('amarela')) return 'bg-yellow-400 text-yellow-950 border-yellow-500';
        if (lower.includes('laranja')) return 'bg-orange-500 text-white border-orange-600';
        if (lower.includes('verde')) return 'bg-green-600 text-white border-green-700';
        return 'bg-white text-slate-800 border-slate-200'; // branca
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'agendado':
                return <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 uppercase text-panel-sm whitespace-nowrap px-2 py-0.5 tracking-wider font-bold">Pagamento Agendado</Badge>;
            case 'isento':
                return <Badge className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 uppercase text-panel-sm whitespace-nowrap px-2 py-0.5 tracking-wider font-bold">Pago pela Academia</Badge>;
            case 'pago':
            case 'confirmado':
                return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 uppercase text-panel-sm whitespace-nowrap px-2 py-0.5 tracking-wider font-bold">Confirmada</Badge>;
            case 'aguardando_pagamento':
            case 'pendente':
                return <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 uppercase text-panel-sm whitespace-nowrap px-2 py-0.5 tracking-wider font-bold">Aguardando Pagamento</Badge>;
            case 'cancelado':
            case 'reembolsado':
                return <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 uppercase text-panel-sm whitespace-nowrap px-2 py-0.5 tracking-wider font-bold">Cancelada</Badge>;
            default:
                return <Badge variant="outline" className="uppercase text-panel-sm whitespace-nowrap px-2 py-0.5 tracking-wider font-bold">{status.replace('_', ' ')}</Badge>;
        }
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] p-4 md:p-8 flex flex-col md:max-w-5xl md:mx-auto w-full">
            <AthletePageHeader
                title="Minhas Inscrições"
                description="Gerencie suas participações"
                backHref="/atleta/dashboard"
                beltColor={profile?.belt_color || 'branca'}
            />

            {/* Stats — desktop only, só aparece se tiver inscrições */}
            {inscricoes.length > 0 && (
                <div className="hidden md:flex items-center gap-3 -mt-2 mb-2 flex-wrap">
                    {(() => {
                        const confirmadas = inscricoes.filter((i: any) => ['pago', 'confirmado', 'isento'].includes(i.status)).length;
                        const pendentes = inscricoes.filter((i: any) => ['aguardando_pagamento', 'pendente'].includes(i.status)).length;
                        return (
                            <>
                                <span className="text-panel-sm font-semibold text-muted-foreground">
                                    {inscricoes.length} {inscricoes.length === 1 ? 'inscrição' : 'inscrições'}
                                </span>
                                {confirmadas > 0 && (
                                    <span className="inline-flex items-center gap-1.5 text-panel-sm font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        {confirmadas} confirmada{confirmadas > 1 ? 's' : ''}
                                    </span>
                                )}
                                {pendentes > 0 && (
                                    <span className="inline-flex items-center gap-1.5 text-panel-sm font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                        {pendentes} aguardando
                                    </span>
                                )}
                            </>
                        );
                    })()}
                </div>
            )}

            {/* Main Content */}
            <div className={`flex-1 flex flex-col items-center ${inscricoes.length === 0 ? 'justify-center max-w-2xl' : 'max-w-4xl'} mx-auto w-full pb-20`}>
                {inscricoes.length === 0 ? (
                    <div className="text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
                        <div className="mx-auto bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-6">
                            <ClipboardTextIcon size={40} weight="duotone" className="text-primary" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-panel-md font-bold text-foreground">
                                Você não está inscrito em nenhum campeonato
                            </h2>
                            <p className="text-panel-sm text-muted-foreground max-w-xs mx-auto">
                                Seus eventos ativos e seu histórico aparecerão aqui assim que você concluir uma inscrição.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 pt-4">
                            <Button pill asChild className="w-full h-12  font-bold gap-2 shadow-sm transition-all active:scale-[0.98]">
                                <Link href="/atleta/dashboard/campeonatos">
                                    <MagnifyingGlassIcon size={16} weight="duotone" />
                                    Explorar Campeonatos
                                </Link>
                            </Button>
                            <Button pill variant="outline" asChild className="w-full h-12 font-bold border-2">
                                <Link href="/atleta/dashboard">
                                    Voltar ao Dashboard
                                </Link>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="w-full space-y-4 pt-4">
                        <h2 className="text-panel-sm font-bold text-brand-950 mb-2">Histórico de Inscrições</h2>
                        <div className="grid gap-4 w-full">
                            {inscricoes.map((inscricao: any) => (
                                <div key={inscricao.id}>
                                    <Card className="overflow-hidden border-none shadow-premium w-full bg-white flex flex-col sm:flex-row">
                                        {/* Imagem do Evento */}
                                        <div className="sm:w-32 sm:h-auto sm:relative bg-muted shrink-0">
                                            {inscricao.event?.image_path ? (
                                                <img
                                                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-images/${inscricao.event.image_path}`}
                                                    alt={inscricao.event.title || 'Evento'}
                                                    className="w-full h-auto sm:absolute sm:inset-0 sm:h-full sm:object-cover transition-transform duration-500 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="h-24 sm:h-32 flex items-center justify-center bg-primary/5 group-hover:bg-primary/10 transition-colors">
                                                    <TrophyIcon size={32} weight="duotone" className="text-primary/20" />
                                                </div>
                                            )}
                                        </div>
                                        {/* Detalhes da Inscrição */}
                                        <div className="p-4 flex-1 flex flex-col justify-center gap-3">
                                            {/* Título + badge de status */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-panel-lg leading-tight text-brand-950 group-hover:text-primary transition-colors">
                                                        {inscricao.event?.title}
                                                    </h3>
                                                    {inscricao.registration_number != null && (
                                                        <span className="text-panel-sm font-mono font-bold text-muted-foreground">
                                                            Inscrição #{String(inscricao.registration_number).padStart(3, '0')}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="shrink-0">{getStatusBadge(inscricao.status)}</div>
                                            </div>

                                            {/* Data */}
                                            {inscricao.event?.event_date && (
                                                <span className="text-panel-sm font-medium text-brand-950/70">
                                                    {format(new Date(inscricao.event.event_date), "dd 'de' MMM, yyyy", { locale: ptBR })}
                                                </span>
                                            )}

                                            {/* Categoria */}
                                            <div className="bg-[#f8f9fa] rounded-md p-3 border border-slate-100">
                                                <span className="text-panel-sm font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Categoria Inscrita</span>
                                                <p className="text-panel-sm font-bold text-slate-700 mb-2">
                                                    {inscricao.category?.categoria_completa || 'Categoria não informada no sistema'}
                                                </p>
                                                {inscricao.category?.faixa && (
                                                    <span className={`inline-block text-panel-sm font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getBeltBadgeClass(inscricao.category.faixa)}`}>
                                                        {inscricao.category.faixa}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Botões de ação */}
                                            {['aguardando_pagamento', 'pendente'].includes(inscricao.status) && (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <ReactivatePaymentButton registrationId={inscricao.id} />
                                                    <CancelRegistrationWrapper registrationId={inscricao.id} />
                                                </div>
                                            )}
                                            {['pago', 'confirmado', 'isento'].includes(inscricao.status) && (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <PassportButton registrationId={inscricao.id} />
                                                    <ChangeCategoryButton
                                                        registrationId={inscricao.id}
                                                        event={inscricao.event}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                </div>
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
