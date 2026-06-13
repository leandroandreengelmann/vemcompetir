'use client';

import { useEffect, useState } from 'react';
import { Users, Eye, ExternalLink, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePresence } from '@/components/chaves-publicas/usePresence';
import { getEstatsPublicas } from '@/lib/public/chaves-publicas';

const POLL_MS = 30_000;

export function AcessosPublicosCard({ eventId }: { eventId: string }) {
    // Observa a presença (sem entrar na contagem) → "online agora" em tempo real.
    const online = usePresence(eventId, false);
    const [total, setTotal] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const { total_views } = await getEstatsPublicas(eventId);
                if (active) setTotal(total_views);
            } catch {
                /* silencioso */
            }
        };
        load();
        const id = setInterval(load, POLL_MS);
        return () => {
            active = false;
            clearInterval(id);
        };
    }, [eventId]);

    const path = `/eventos/${eventId}/chaves`;

    const handleCopy = async () => {
        try {
            const url = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* ignore */
        }
    };

    return (
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-6">
                {/* Online agora */}
                <div className="flex items-center gap-3">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/70" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </span>
                    <div>
                        <p className="text-2xl font-black tabular-nums text-foreground leading-none">{online}</p>
                        <p className="text-xs font-semibold text-muted-foreground mt-1 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            online agora
                        </p>
                    </div>
                </div>

                <div className="h-10 w-px bg-border/60" />

                {/* Total de acessos */}
                <div>
                    <p className="text-2xl font-black tabular-nums text-foreground leading-none">
                        {total == null ? '—' : total.toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs font-semibold text-muted-foreground mt-1 flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        acessos à página pública
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={handleCopy}
                    className={cn(
                        'inline-flex items-center gap-1.5 h-10 px-4 rounded-full border text-sm font-semibold transition-colors',
                        copied
                            ? 'border-emerald-500/40 text-emerald-700 bg-emerald-500/10'
                            : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copiado!' : 'Copiar link'}
                </button>
                <a
                    href={path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                    <ExternalLink className="h-4 w-4" />
                    Abrir página
                </a>
            </div>
        </div>
    );
}
