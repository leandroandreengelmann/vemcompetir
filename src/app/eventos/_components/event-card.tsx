'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Calendar, MapPin, ArrowRight, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PublicEvent } from '../_data/events';
import { getEventCoverUrl } from '../_data/event-utils';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface EventCardProps {
    event: PublicEvent;
}

export function EventCard({ event }: EventCardProps) {
    const coverUrl = getEventCoverUrl(event.cover_image_path || null);

    return (
        <Link href={`/eventos/${event.id}`} className="block h-full">
            <Card className="overflow-hidden group flex flex-col h-full border-border/50 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500 rounded-[7px] p-0 gap-0 bg-white cursor-pointer">
                <CardHeader className="p-0 border-0">
                    <div className="relative aspect-[4/3] sm:aspect-square overflow-hidden">
                        {coverUrl ? (
                            <Image
                                src={coverUrl}
                                alt={event.title}
                                fill
                                quality={100}
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                className="object-cover transition-transform duration-700 sm:group-hover:scale-110"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted/50">
                                <Calendar className="h-10 w-10 text-muted-foreground/20" />
                            </div>
                        )}
                        {event.inscricoes_encerradas && (
                            <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-lg">
                                <Lock className="h-3 w-3" />
                                Inscrições encerradas
                            </div>
                        )}
                    </div>
                </CardHeader>

                <CardContent
                    className={
                        event.inscricoes_encerradas
                            ? 'p-4 sm:p-5 flex-1 flex flex-col items-center justify-center text-center space-y-4 sm:space-y-5'
                            : 'p-4 sm:p-5 flex-1 space-y-3 sm:space-y-4'
                    }
                >
                    <h3
                        className={
                            event.inscricoes_encerradas
                                ? 'text-lg sm:text-2xl font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-300'
                                : 'text-base sm:text-h2 font-semibold text-foreground line-clamp-2 sm:min-h-[4rem] group-hover:text-primary transition-colors duration-300'
                        }
                    >
                        {event.title}
                    </h3>

                    <div
                        className={
                            event.inscricoes_encerradas
                                ? 'space-y-2 sm:space-y-3'
                                : 'space-y-1 sm:space-y-1.5 sm:pt-2'
                        }
                    >
                        <p
                            className={
                                event.inscricoes_encerradas
                                    ? 'text-base sm:text-xl text-foreground font-bold uppercase tracking-wide'
                                    : 'text-xs sm:text-ui text-muted-foreground font-medium uppercase tracking-tight'
                            }
                        >
                            {event.starts_at ? format(new Date(event.starts_at), "dd 'de' MMMM", { locale: ptBR }) : 'Data a definir'}
                        </p>
                        <p
                            className={
                                event.inscricoes_encerradas
                                    ? 'text-base sm:text-lg text-muted-foreground font-medium'
                                    : 'text-xs sm:text-ui text-muted-foreground font-medium truncate'
                            }
                        >
                            {event.city ? `${event.city}, ${event.state}` : (event.venue_name || 'Local a definir')}
                        </p>
                    </div>
                </CardContent>

                <CardFooter className="p-4 pt-0 sm:p-5 sm:pt-0">
                    {event.inscricoes_encerradas ? (
                        <Button
                            variant="outline"
                            pill
                            className="h-10 sm:h-12 text-sm sm:text-ui font-bold w-full bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:text-rose-800 hover:border-rose-300 shadow-sm transition-colors"
                        >
                            <Lock className="h-4 w-4" />
                            Inscrições encerradas
                        </Button>
                    ) : (
                        <Button
                            variant="default"
                            pill
                            className="h-10 sm:h-12 text-sm sm:text-ui font-bold text-white shadow-lg shadow-primary/20 w-full group-hover:bg-primary/90 transition-all"
                        >
                            Ver Detalhes
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </Link>
    );
}
