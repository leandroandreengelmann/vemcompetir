'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export function EventFilter({ events, value }: { events: { id: string; title: string }[]; value: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const sp = useSearchParams();

    return (
        <label className="grid gap-1 text-panel-sm text-muted-foreground">
            Campeonato
            <select
                value={value}
                onChange={(e) => {
                    const params = new URLSearchParams(sp.toString());
                    if (e.target.value) params.set('eventId', e.target.value);
                    else params.delete('eventId');
                    router.push(`${pathname}?${params.toString()}`);
                }}
                className="min-h-11 rounded-lg border bg-background px-3 text-foreground"
            >
                <option value="">Todos os campeonatos</option>
                {events.map((e) => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                ))}
            </select>
        </label>
    );
}
