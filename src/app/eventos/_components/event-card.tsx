'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
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
                    <div className="relative aspect-square overflow-hidden">
                        {coverUrl ? (
                            <Image
                                src={coverUrl}
                                alt={event.title}
                                fill
                                quality={100}
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted/50">
                                <Calendar className="h-10 w-10 text-muted-foreground/20" />
                            </div>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="p-5 flex-1 space-y-4">
                    <h3 className="text-h2 text-foreground line-clamp-2 min-h-[4rem] group-hover:text-primary transition-colors duration-300">
                        {event.title}
                    </h3>

                    <div className="space-y-1.5 pt-2">
                        <p className="text-ui text-muted-foreground font-medium uppercase tracking-tight">
                            {event.starts_at ? format(new Date(event.starts_at), "dd 'de' MMMM", { locale: ptBR }) : 'Data a definir'}
                        </p>
                        <p className="text-ui text-muted-foreground font-medium truncate">
                            {event.city ? `${event.city}, ${event.state}` : (event.venue_name || 'Local a definir')}
                        </p>
                    </div>
                </CardContent>

                <CardFooter className="p-5 pt-0">
                    <Button
                        variant="default"
                        pill
                        className="h-12 text-ui font-bold text-white shadow-lg shadow-primary/20 w-full group-hover:bg-primary/90 transition-all"
                    >
                        Ver Detalhes
                    </Button>
                </CardFooter>
            </Card>
        </Link>
    );
}
