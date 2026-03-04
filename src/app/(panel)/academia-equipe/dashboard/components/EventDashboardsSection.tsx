'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, SlidersHorizontal, PackageOpen } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EventDashboardCard } from './EventDashboardCard';
import { getEventsDashboardSummaries, EventSummary } from '../actions/event-dashboards';
import { Skeleton } from '@/components/ui/skeleton';

export function EventDashboardsSection() {
    const [events, setEvents] = useState<EventSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('todos');
    const [sort, setSort] = useState('mais_recentes');

    useEffect(() => {
        const timer = setTimeout(() => {
            loadEvents();
        }, 300);
        return () => clearTimeout(timer);
    }, [search, status, sort]);

    async function loadEvents() {
        setLoading(true);
        try {
            const data = await getEventsDashboardSummaries({ search, status, sort });
            setEvents(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6 mt-12 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h2 className="text-h2 tracking-tight">Painéis por Evento</h2>
                    <p className="text-caption text-muted-foreground">Monitore o desempenho e acesse relatórios de cada evento individualmente.</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-all duration-300" />
                        <Input
                            placeholder="Pesquisar evento pelo nome..."
                            aria-label="Pesquisar evento pelo nome"
                            variant="lg"
                            className="pl-12 bg-background border-input shadow-sm focus:shadow-md transition-all h-14 rounded-2xl"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="w-[160px] rounded-2xl border border-input bg-background hover:bg-muted/50 font-bold transition-all h-14 text-body px-4 shadow-sm">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos Status</SelectItem>
                                <SelectItem value="pendente">Pendentes</SelectItem>
                                <SelectItem value="aprovado">Aprovados</SelectItem>
                                <SelectItem value="publicado">Publicados</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={sort} onValueChange={setSort}>
                            <SelectTrigger className="w-[180px] rounded-2xl border border-input bg-background hover:bg-muted/50 font-bold transition-all h-14 text-body px-4 shadow-sm">
                                <SelectValue placeholder="Ordenar por" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="mais_recentes">Mais recentes</SelectItem>
                                <SelectItem value="mais_inscricoes">Popularidade</SelectItem>
                                <SelectItem value="maior_faturamento">Faturamento</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-[140px] w-full rounded-3xl" />
                    ))}
                </div>
            ) : events.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                    {events.map((event) => (
                        <EventDashboardCard key={event.id} event={event} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-border/50">
                    <PackageOpen className="h-10 w-10 text-muted-foreground/30 mb-4" />
                    <p className="text-sm font-medium text-muted-foreground">Nenhum evento encontrado com estes filtros.</p>
                </div>
            )}
        </div>
    );
}
