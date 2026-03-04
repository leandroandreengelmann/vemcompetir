'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Globe, Eye, MousePointerClick } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActivityItem {
    id: string;
    name: string;
    isIdentified: boolean;
    eventType: string;
    path: string;
    time: string;
}

interface ActivityFeedProps {
    data: ActivityItem[];
}

const EVENT_TYPE_LABELS: Record<string, { label: string; icon: React.FC<any>; color: string }> = {
    page_view: { label: 'visualizou', icon: Eye, color: 'text-sky-500' },
    event_click: { label: 'clicou em evento', icon: MousePointerClick, color: 'text-indigo-500' },
};

function formatPath(path: string) {
    // Simplifica caminhos para leitura humana
    return path.replace('/admin', '').replace(/^\//, '') || 'Home';
}

export function ActivityFeed({ data }: ActivityFeedProps) {
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-h3">Atividade Recente</CardTitle>
                <CardDescription>Últimas interações de usuários na plataforma.</CardDescription>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <div className="h-40 flex items-center justify-center text-muted-foreground text-ui">
                        Nenhuma atividade registrada ainda.
                    </div>
                ) : (
                    <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                        {data.map((item) => {
                            const typeInfo = EVENT_TYPE_LABELS[item.eventType] ?? {
                                label: item.eventType,
                                icon: Eye,
                                color: 'text-muted-foreground',
                            };
                            const Icon = typeInfo.icon;

                            return (
                                <div
                                    key={item.id}
                                    className="flex items-start gap-3 py-2.5 border-b border-border last:border-0"
                                >
                                    {/* Avatar */}
                                    <div className={`p-2 rounded-full shrink-0 ${item.isIdentified ? 'bg-indigo-100 dark:bg-indigo-950/40' : 'bg-muted'}`}>
                                        {item.isIdentified
                                            ? <User className="h-3.5 w-3.5 text-indigo-500" />
                                            : <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                        }
                                    </div>

                                    {/* Texto */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-ui leading-snug">
                                            <span className="font-semibold">{item.name}</span>
                                            {' '}
                                            <span className={`inline-flex items-center gap-1 ${typeInfo.color}`}>
                                                <Icon className="h-3 w-3 inline" />
                                                {typeInfo.label}
                                            </span>
                                            {' '}
                                            <span className="text-muted-foreground font-mono text-caption">
                                                /{formatPath(item.path)}
                                            </span>
                                        </p>
                                        <p className="text-caption text-muted-foreground mt-0.5">
                                            {formatDistanceToNow(new Date(item.time), { addSuffix: true, locale: ptBR })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
