export type PeriodPreset =
    | 'hoje'
    | 'ontem'
    | '7d'
    | '30d'
    | 'mes_atual'
    | 'mes_anterior'
    | 'ano_atual'
    | 'todos'
    | 'custom';

export type PeriodRange = {
    from: Date | null;
    to: Date | null;
    preset: PeriodPreset;
    label: string;
};

const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
};

const endOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
};

export function resolvePeriod(params: {
    preset?: string;
    from?: string;
    to?: string;
}): PeriodRange {
    const now = new Date();
    const preset = (params.preset ?? 'mes_atual') as PeriodPreset;

    if (preset === 'custom') {
        const from = params.from ? startOfDay(new Date(params.from + 'T00:00:00')) : null;
        const to = params.to ? endOfDay(new Date(params.to + 'T00:00:00')) : null;
        return { from, to, preset, label: 'Personalizado' };
    }

    if (preset === 'hoje') {
        return { from: startOfDay(now), to: endOfDay(now), preset, label: 'Hoje' };
    }
    if (preset === 'ontem') {
        const y = new Date(now); y.setDate(y.getDate() - 1);
        return { from: startOfDay(y), to: endOfDay(y), preset, label: 'Ontem' };
    }
    if (preset === '7d') {
        const from = new Date(now); from.setDate(from.getDate() - 6);
        return { from: startOfDay(from), to: endOfDay(now), preset, label: 'Últimos 7 dias' };
    }
    if (preset === '30d') {
        const from = new Date(now); from.setDate(from.getDate() - 29);
        return { from: startOfDay(from), to: endOfDay(now), preset, label: 'Últimos 30 dias' };
    }
    if (preset === 'mes_anterior') {
        const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const to = new Date(now.getFullYear(), now.getMonth(), 0);
        return { from: startOfDay(from), to: endOfDay(to), preset, label: 'Mês anterior' };
    }
    if (preset === 'ano_atual') {
        const from = new Date(now.getFullYear(), 0, 1);
        return { from: startOfDay(from), to: endOfDay(now), preset, label: 'Este ano' };
    }
    if (preset === 'todos') {
        return { from: null, to: null, preset, label: 'Todos os períodos' };
    }

    // mes_atual (default)
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: startOfDay(from), to: endOfDay(now), preset: 'mes_atual', label: 'Este mês' };
}

export function periodToQueryString(period: PeriodRange): string {
    if (period.preset === 'custom') {
        const parts: string[] = ['preset=custom'];
        if (period.from) parts.push(`from=${period.from.toISOString().slice(0, 10)}`);
        if (period.to) parts.push(`to=${period.to.toISOString().slice(0, 10)}`);
        return parts.join('&');
    }
    return `preset=${period.preset}`;
}

export type PeriodFilterInput = {
    from?: string | null;
    to?: string | null;
};

export function periodToIsoFilter(period: PeriodRange): PeriodFilterInput {
    return {
        from: period.from ? period.from.toISOString() : null,
        to: period.to ? period.to.toISOString() : null,
    };
}
