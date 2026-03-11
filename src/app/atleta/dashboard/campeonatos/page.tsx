import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth-guards';
import Link from 'next/link';
import { Trophy, Calendar, MapPin, Search, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { AthletePageHeader } from '../components/athlete-page-header';

export default async function AthleteCampeonatos() {
    const { profile } = await requireRole('atleta');
    const supabase = await createClient();

    // ... (fetch logic remains same)
    const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'publicado')
        .order('event_date', { ascending: true });

    // Calcular se é faixa branca para contraste
    const isWhiteBelt = (profile as any)?.belt_color?.toLowerCase() === 'branca';

    return (
        <div
            className="min-h-screen bg-[#FAFAFA] p-4 md:p-8 flex flex-col gap-6 md:max-w-5xl md:mx-auto w-full"
            style={{
                '--primary': isWhiteBelt ? '240 10% 3.9%' : undefined // Fallback para preto se for faixa branca
            } as React.CSSProperties}
        >
            <AthletePageHeader
                title="Campeonatos"
                description="Encontre eventos para competir e teste suas habilidades."
                backHref="/atleta/dashboard"
                beltColor={(profile as any)?.belt_color}
            />

            {/* Contagem — desktop only */}
            {events && events.length > 0 && (
                <p className="hidden md:block -mt-2 text-sm font-semibold text-muted-foreground">
                    {events.length} {events.length === 1 ? 'campeonato disponível' : 'campeonatos disponíveis'}
                </p>
            )}

            {/* Search Bar */}
            <div className="relative md:max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Pesquisar campeonatos..."
                    variant="lg"
                    className="pl-10"
                />
            </div>

            <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {!events || events.length === 0 ? (
                    <Card className="border-dashed py-12 col-span-full">
                        <CardContent className="flex flex-col items-center justify-center text-center">
                            <Trophy className="h-12 w-12 text-muted-foreground/20 mb-4" />
                            <p className="text-ui text-muted-foreground font-medium">Nenhum campeonato publicado no momento.</p>
                            <p className="text-caption text-muted-foreground mt-1">Fique atento às atualizações da sua academia.</p>
                        </CardContent>
                    </Card>
                ) : (
                    events.map(event => (
                        <Link key={event.id} href={`/atleta/dashboard/campeonatos/${event.id}`} className="h-full">
                            <Card className="overflow-hidden border-none shadow-premium hover:shadow-xl transition-all active:scale-[0.98] group bg-white rounded-sm p-0 gap-0 h-full flex flex-col">
                                <div className="aspect-square relative bg-muted overflow-hidden shrink-0">
                                    {event.image_path ? (
                                        <img
                                            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-images/${event.image_path}`}
                                            alt={event.title}
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center bg-primary/5">
                                            <Trophy className="h-12 w-12 text-primary/10" />
                                        </div>
                                    )}
                                    <div className="absolute top-4 right-4 text-white">
                                        {(() => {
                                            const eventDate = new Date(event.event_date);
                                            const today = new Date();
                                            const diffTime = eventDate.getTime() - today.getTime();
                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                            const isEndingSoon = diffDays > 0 && diffDays <= 14;

                                            return isEndingSoon ? (
                                                <span className="inline-flex items-center gap-1.5 bg-amber-50/90 backdrop-blur-sm border border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-widest rounded-full px-3 py-1.5">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                    Lote termina em breve
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 bg-emerald-50/90 backdrop-blur-sm border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-widest rounded-full px-3 py-1.5">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    Inscrições Abertas
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <CardContent className="p-5 space-y-3 flex flex-col flex-1">
                                    <h3 className={`font-bold text-h2 leading-tight transition-colors line-clamp-2 min-h-[3.5rem] ${(profile as any)?.belt_color?.toLowerCase() === 'branca' ? 'text-brand-950' : 'text-primary'}`}>
                                        {event.title}
                                    </h3>
                                    <div className="space-y-1">
                                        <p className="text-ui font-bold text-foreground">
                                            {format(new Date(event.event_date), "dd 'de' MMMM", { locale: ptBR })}
                                        </p>
                                        <p className="text-caption font-medium text-muted-foreground truncate">
                                            {event.location || event.city}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))
                )}
            </main>
        </div>
    );
}
