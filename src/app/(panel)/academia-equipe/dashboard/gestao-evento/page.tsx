'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, UsersIcon, TrophyIcon, ArrowRightIcon, MapPinIcon } from '@phosphor-icons/react';
import { listEventosGestao } from '../actions/gestao-evento';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Evento = {
    id: string;
    name: string;
    event_date: string | null;
    status: string | null;
    location_name: string | null;
    athletes_count: number;
};

export default function GestaoEventoPage() {
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        load();
    }, []);

    async function load() {
        setLoading(true);
        try {
            const res = await listEventosGestao();
            setEventos((res.data as Evento[]) || []);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Gestão de Evento"
                description="Acompanhe as chaves dos seus eventos em tempo real e gere a versão oficial quando o evento começar."
            />

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 flex items-start gap-3">
                <TrophyIcon size={24} weight="duotone" className="text-amber-600 mt-0.5" />
                <div>
                    <p className="text-panel-sm font-semibold text-foreground">Como funciona?</p>
                    <p className="text-panel-sm text-muted-foreground mt-1">
                        Escolha um evento abaixo. As chaves são montadas <strong>ao vivo</strong> conforme novas inscrições chegam — você pode acompanhar quando quiser. No dia do evento, gere a <strong>chave oficial</strong> para travar e usar.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading
                    ? [...Array(3)].map((_, i) => (
                          <div key={i} className="rounded-2xl border border-border/50 p-5 space-y-3">
                              <Skeleton className="h-5 w-3/4" />
                              <Skeleton className="h-4 w-1/2" />
                              <Skeleton className="h-9 w-full mt-4" />
                          </div>
                      ))
                    : eventos.length === 0
                    ? (
                          <div className="col-span-full text-center py-12 text-muted-foreground">
                              <CalendarIcon size={48} weight="duotone" className="mx-auto mb-3 text-muted-foreground/40" />
                              <p>Você ainda não possui eventos.</p>
                          </div>
                      )
                    : eventos.map((ev) => (
                          <div
                              key={ev.id}
                              className="rounded-2xl border border-border/50 p-5 space-y-3 hover:border-primary/30 hover:shadow-sm transition-all flex flex-col"
                          >
                              <div className="space-y-1 flex-1">
                                  <h3 className="font-bold text-base line-clamp-2">{ev.name}</h3>
                                  <div className="flex items-center gap-3 text-panel-sm text-muted-foreground">
                                      {ev.event_date && (
                                          <span className="flex items-center gap-1">
                                              <CalendarIcon size={14} weight="duotone" />
                                              {format(new Date(ev.event_date), "dd 'de' MMM yyyy", { locale: ptBR })}
                                          </span>
                                      )}
                                      {ev.location_name && (
                                          <span className="flex items-center gap-1 truncate">
                                              <MapPinIcon size={14} weight="duotone" />
                                              {ev.location_name}
                                          </span>
                                      )}
                                  </div>
                              </div>

                              <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5">
                                  <span className="flex items-center gap-2 text-panel-sm font-medium">
                                      <UsersIcon size={16} weight="duotone" />
                                      {ev.athletes_count} atletas confirmados
                                  </span>
                              </div>

                              <Button asChild pill className="w-full font-semibold">
                                  <Link href={`/academia-equipe/dashboard/gestao-evento/${ev.id}`}>
                                      Abrir gestão
                                      <ArrowRightIcon size={16} weight="bold" className="ml-1" />
                                  </Link>
                              </Button>
                          </div>
                      ))}
            </div>
        </div>
    );
}
