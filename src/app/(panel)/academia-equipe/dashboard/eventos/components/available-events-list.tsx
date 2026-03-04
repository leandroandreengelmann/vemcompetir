'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MapPin, Calendar, Plus, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import Link from 'next/link';

interface Event {
    id: string;
    title: string;
    event_date: string;
    location: string;
    status: string;
    banner_url: string | null;
}

interface Athlete {
    id: string;
    full_name: string;
    sexo: string;
    belt_color: string;
    birth_date: string;
    weight: number;
}

interface AvailableEventsListProps {
    events: Event[];
    athletes: any[]; // Not needed anymore for this component, but keeping for interface compatibility
}

export function AvailableEventsList({ events }: AvailableEventsListProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Eventos com Inscrições Abertas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="pl-6 text-label h-11">Evento</TableHead>
                            <TableHead className="text-label h-11">Data</TableHead>
                            <TableHead className="text-label h-11">Local</TableHead>
                            <TableHead className="w-[180px] text-right pr-6 text-label h-11">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!events || events.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center border-none">
                                    <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-2xl border-2 border-dashed border-border/50">
                                        <PackageOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
                                        <p className="text-sm font-medium text-muted-foreground">Nenhum evento disponível no momento.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            events.map((event) => (
                                <TableRow key={event.id} className="hover:bg-muted/10 transition-colors">
                                    <TableCell className="pl-6 font-bold text-ui text-foreground py-4">{event.title}</TableCell>
                                    <TableCell className="text-muted-foreground text-caption font-medium">
                                        {event.event_date ? format(new Date(event.event_date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-caption font-medium">
                                        <div className="flex items-center text-muted-foreground">
                                            <span className="truncate max-w-[150px]">{event.location || '-'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        {event.status !== 'pendente' && (
                                            <Button
                                                asChild
                                                size="sm"
                                                pill
                                                className="bg-primary hover:bg-primary/90 shadow-sm"
                                            >
                                                <Link href={`/academia-equipe/dashboard/eventos/${event.id}/inscrever`}>
                                                    <Plus className="mr-1.5 h-4 w-4" />
                                                    Inscrever Atletas
                                                </Link>
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
