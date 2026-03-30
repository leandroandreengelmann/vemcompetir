import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { UserIcon, ArrowRightIcon, TrophyIcon, ClipboardTextIcon, SealCheckIcon } from '@phosphor-icons/react/dist/ssr';
import { AthleteProfileForm } from './profile-form';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getBeltColor, hexToHsl } from '@/lib/belt-theme';
import { BeltKnot } from '@/components/athlete/belt-knot';
import { InterestNotificationWrapper } from './components/interest-notification';

const BELTS = [
    'Branca', 'Cinza e branca', 'Cinza', 'Cinza e preta', 'Amarela e branca', 'Amarela', 'Amarela e preta',
    'Laranja e branca', 'Laranja', 'Laranja e preta', 'Verde e branca', 'Verde', 'Verde e preta',
    'Azul', 'Roxa', 'Marrom', 'Preta', 'Coral', 'Vermelha'
];

export default async function AthleteDashboard() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, role, belt_color, avatar_url, weight, birth_date, gym_name, tenant_id, master_id, master_name')
        .eq('id', user.id)
        .single();

    // Redirect if user is not an athlete (to prevent tenant overwrite)
    if (profile?.role === 'academia/equipe') {
        redirect('/academia-equipe/dashboard');
    }

    // Busca nome da academia se o atleta estiver vinculado
    let verifiedByAcademy: string | null = null;
    if (profile?.tenant_id) {
        const { data: tenant } = await supabase
            .from('tenants')
            .select('name')
            .eq('id', profile.tenant_id)
            .single();
        verifiedByAcademy = tenant?.name ?? null;
    }

    const isProfileIncomplete = !profile?.weight || !profile?.birth_date || !profile?.belt_color || !profile?.gym_name;

    // Calcular cores dinâmicas
    const beltColor = profile?.belt_color || 'branca';
    const activeHex = getBeltColor(beltColor);
    const activeHsl = hexToHsl(activeHex);

    // Lógica para modo contraste (faixa branca)
    const isWhiteBelt = beltColor.toLowerCase().trim() === 'branca' || beltColor.toLowerCase().trim() === 'white';

    // Classes condicionais
    const cardPrimaryClasses = "h-40 md:h-60 shadow-none active:scale-[0.98] transition-all duration-300 relative overflow-hidden";
    const cardSecondaryClasses = "h-40 md:h-48 shadow-none active:scale-[0.98] transition-all duration-300 relative overflow-hidden";
    const getCardClasses = (isWhite: boolean, isPrimary: boolean = false) =>
        `${isPrimary ? cardPrimaryClasses : cardSecondaryClasses} ${isWhite
            ? "bg-card border-brand-950/20 border-2 hover:bg-muted/40"
            : "bg-primary border-white/10 hover:brightness-110"}`;

    const getTitleClasses = (isWhite: boolean) =>
        `text-panel-md font-bold leading-tight ${isWhite ? "text-foreground" : "text-primary-foreground"}`;

    const getDescClasses = (isWhite: boolean) =>
        `text-panel-sm ${isWhite ? "text-muted-foreground" : "text-primary-foreground/80"}`;

    const getIconClasses = (isWhite: boolean) =>
        `absolute bottom-3 right-3 h-6 w-6 transition-all ${isWhite ? "text-brand-950" : "text-primary-foreground opacity-80 group-hover:opacity-100 group-hover:translate-x-1"}`;

    return (
        <div
            className="min-h-screen md:h-screen md:overflow-hidden bg-[#FAFAFA] relative flex flex-col items-center justify-center p-4 pt-20 md:pt-8"
            style={{ '--primary': activeHsl } as React.CSSProperties}
        >
            {/* Header: Avatar (Left) and Belt (Right) — mobile only */}
            <div className="md:hidden absolute top-4 left-4 right-4 flex items-start justify-between">
                {/* Left: Avatar + Greeting */}
                <div className="flex flex-col">
                    <Avatar className="h-10 w-10 shadow-sm border border-gray-100">
                        {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name || 'Avatar'} />}
                        <AvatarFallback className="bg-brand-950 text-white">
                            <UserIcon size={20} weight="duotone" />
                        </AvatarFallback>
                    </Avatar>
                    <span className={`mt-9 text-panel-sm font-semibold ${isWhiteBelt ? "text-brand-950" : "text-primary"}`}>
                        Olá, {profile?.full_name?.split(' ')[0] || 'Atleta'}
                    </span>
                    {verifiedByAcademy && (
                        <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 w-fit">
                            <SealCheckIcon size={48} weight="fill" />
                            {verifiedByAcademy}
                        </span>
                    )}
                </div>

                {/* Right: Belt Illustration */}
                <div className="animate-in fade-in slide-in-from-top-2 duration-700">
                    <BeltKnot beltColor={beltColor} />
                </div>
            </div>

            {/* Interest Notification */}
            {/* We'll fetch this from a client component or pass it as prop if we had the event data here. 
                For now, let's inject a server-side check. */}
            <InterestNotificationWrapper beltColor={beltColor} />


            {/* Badge verificado — desktop (abaixo do header mobile que é hidden) */}
            {verifiedByAcademy && (
                <div className="hidden md:flex items-center gap-1.5 mb-2 text-sm font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 z-10">
                    <SealCheckIcon size={48} weight="fill" />
                    Verificado por {verifiedByAcademy}
                </div>
            )}

            {/* Main Content: Navigation Cards */}
            <div className="w-full max-w-lg md:max-w-xl grid grid-cols-2 gap-4 md:gap-5 p-4 md:p-0 z-10">
                {/* Card 1: Campeonatos — card primário, ocupa largura total no desktop */}
                <Link href="/atleta/dashboard/campeonatos" className="block group col-span-1 md:col-span-2">
                    <Card className={getCardClasses(isWhiteBelt, true)}>
                        <CardHeader className="h-full flex flex-col p-4 pb-12">
                            <div className="flex flex-col gap-1">
                                <CardTitle className={getTitleClasses(isWhiteBelt)}>
                                    Campeonatos
                                </CardTitle>
                                <CardDescription className={getDescClasses(isWhiteBelt)}>
                                    Ver eventos disponíveis
                                </CardDescription>
                            </div>
                            <ArrowRightIcon weight="duotone" className={getIconClasses(isWhiteBelt)} />
                        </CardHeader>
                        {/* Ícone decorativo — visível apenas no desktop */}
                        <TrophyIcon size={96} weight="duotone" className={`hidden md:block absolute bottom-4 right-6 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6 ${
                            isWhiteBelt ? 'text-brand-950/8' : 'text-white/10'
                        }`} />
                    </Card>
                </Link>

                {/* Card 2: Minhas Inscrições */}
                <Link href="/atleta/dashboard/inscricoes" className="block group col-span-1">
                    <Card className={getCardClasses(isWhiteBelt)}>
                        <CardHeader className="h-full flex flex-col p-4 pb-12">
                            <div className="flex flex-col gap-1">
                                <CardTitle className={getTitleClasses(isWhiteBelt)}>
                                    Minhas Inscrições
                                </CardTitle>
                                <CardDescription className={getDescClasses(isWhiteBelt)}>
                                    Acompanhar histórico
                                </CardDescription>
                            </div>
                            <ArrowRightIcon weight="duotone" className={getIconClasses(isWhiteBelt)} />
                        </CardHeader>
                        <ClipboardTextIcon size={64} weight="duotone" className={`hidden md:block absolute bottom-4 right-4 ${
                            isWhiteBelt ? 'text-brand-950/8' : 'text-white/10'
                        }`} />
                    </Card>
                </Link>

                {/* Card 3: Meu Perfil — largura total no mobile, metade no desktop */}
                <Link href="/atleta/dashboard/perfil" className="block group col-span-2 w-3/4 mx-auto md:col-span-1 md:w-full md:mx-0">
                    <Card className={getCardClasses(isWhiteBelt)}>
                        <CardHeader className="h-full flex flex-col p-4 pb-12">
                            <div className="flex flex-col gap-1">
                                <CardTitle className={getTitleClasses(isWhiteBelt)}>
                                    Meu Perfil
                                </CardTitle>
                                <CardDescription className={getDescClasses(isWhiteBelt)}>
                                    Gerenciar dados
                                </CardDescription>
                            </div>
                            <ArrowRightIcon weight="duotone" className={getIconClasses(isWhiteBelt)} />
                        </CardHeader>
                        <UserIcon size={64} weight="duotone" className={`hidden md:block absolute bottom-4 right-4 ${
                            isWhiteBelt ? 'text-brand-950/8' : 'text-white/10'
                        }`} />
                    </Card>
                </Link>
            </div>

            {/* Incomplete Profile Warning Modal */}
            {isProfileIncomplete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <Card className="w-full max-w-xl animate-in zoom-in-95 fade-in duration-300 shadow-2xl overflow-hidden border-none rounded-2xl">
                        <CardHeader className="bg-slate-900 text-white py-6">
                            <CardTitle className="text-panel-lg font-bold">Complete seu perfil</CardTitle>
                            <CardDescription className="text-panel-sm text-slate-300">
                                Precisamos destes dados para suas futuras inscrições em eventos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 md:p-8 bg-white max-h-[80vh] overflow-y-auto">
                            <AthleteProfileForm profile={profile} user={user} belts={BELTS} />
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
