'use client';

import { useMemo } from 'react';
import { groupTeams } from '@/lib/gestao-evento/team-colors';
import { UsersIcon } from '@phosphor-icons/react';

type Athlete = { team?: string | null };

interface TeamsBarProps {
    athletes: Athlete[];
}

export function TeamsBar({ athletes }: TeamsBarProps) {
    const teams = useMemo(() => groupTeams(athletes), [athletes]);

    if (teams.length === 0) return null;

    return (
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                <UsersIcon size={14} weight="duotone" />
                Equipes ({teams.length})
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                {teams.map((t) => (
                    <div
                        key={t.name}
                        className="flex items-center gap-2 rounded-full pl-3 pr-1 py-1 text-xs font-semibold whitespace-nowrap"
                        style={{
                            background: t.color.solid,
                            color: t.color.text,
                        }}
                    >
                        <span className="truncate max-w-[160px]">{t.name}</span>
                        <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums bg-black/20"
                        >
                            {t.count}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
