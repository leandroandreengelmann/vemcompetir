export type TeamColor = {
    solid: string;
    text: string;
};

const NO_TEAM_COLOR: TeamColor = {
    solid: '#9ca3af',
    text: '#ffffff',
};

const PALETTE: TeamColor[] = [
    { solid: '#ef4444', text: '#ffffff' }, // red
    { solid: '#f97316', text: '#ffffff' }, // orange
    { solid: '#f59e0b', text: '#ffffff' }, // amber
    { solid: '#eab308', text: '#1f2937' }, // yellow
    { solid: '#84cc16', text: '#1f2937' }, // lime
    { solid: '#22c55e', text: '#ffffff' }, // green
    { solid: '#10b981', text: '#ffffff' }, // emerald
    { solid: '#14b8a6', text: '#ffffff' }, // teal
    { solid: '#06b6d4', text: '#ffffff' }, // cyan
    { solid: '#0ea5e9', text: '#ffffff' }, // sky
    { solid: '#3b82f6', text: '#ffffff' }, // blue
    { solid: '#6366f1', text: '#ffffff' }, // indigo
    { solid: '#8b5cf6', text: '#ffffff' }, // violet
    { solid: '#a855f7', text: '#ffffff' }, // purple
    { solid: '#d946ef', text: '#ffffff' }, // fuchsia
    { solid: '#ec4899', text: '#ffffff' }, // pink
    { solid: '#f43f5e', text: '#ffffff' }, // rose
    { solid: '#1f2937', text: '#ffffff' }, // slate-dark
    { solid: '#78716c', text: '#ffffff' }, // stone
    { solid: '#7c2d12', text: '#ffffff' }, // brown
];

export function teamColor(team: string | null | undefined): TeamColor {
    if (!team || team.trim() === '' || team === 'Sem Equipe') return NO_TEAM_COLOR;

    let hash = 0;
    for (let i = 0; i < team.length; i++) {
        hash = (hash * 31 + team.charCodeAt(i)) | 0;
    }
    return PALETTE[Math.abs(hash) % PALETTE.length];
}

export const SEPARATION_GROUP_COLORS = [
    '#ef4444',
    '#f59e0b',
    '#10b981',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
] as const;

export type GroupBadge = {
    color: string;
    index: number;
};

export function buildGroupColorMap(
    groups: string[][],
): Map<string, GroupBadge> {
    const map = new Map<string, GroupBadge>();
    groups.forEach((ids, idx) => {
        const color = SEPARATION_GROUP_COLORS[idx % SEPARATION_GROUP_COLORS.length];
        for (const id of ids) map.set(id, { color, index: idx + 1 });
    });
    return map;
}

export type TeamCount = { name: string; count: number; color: TeamColor };

export function groupTeams(
    athletes: { team?: string | null }[],
): TeamCount[] {
    const map = new Map<string, number>();
    for (const a of athletes) {
        const key = a.team && a.team.trim() ? a.team : 'Sem Equipe';
        map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
        .map(([name, count]) => ({ name, count, color: teamColor(name) }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
