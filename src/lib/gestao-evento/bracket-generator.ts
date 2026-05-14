export interface AthleteInput {
    id: string;
    name: string;
    team?: string | null;
}

export type BracketFormat = 'wo' | 'final_only' | 'round_robin' | 'single_elimination';

export interface GeneratedMatch {
    round: number;
    position: number;
    athlete_a_id: string | null;
    athlete_b_id: string | null;
    athlete_a_name: string | null;
    athlete_b_name: string | null;
    team_a: string | null;
    team_b: string | null;
    is_bye: boolean;
    winner_id: string | null;
}

export interface GenerateBracketResult {
    format: BracketFormat;
    matches: GeneratedMatch[];
    total_rounds: number;
    main_bracket_size: number;
    seed: string;
    placed_order: AthleteInput[];
}

export const nextPowerOf2 = (n: number) => {
    let p = 1;
    while (p < n) p *= 2;
    return p;
};

function bitReversalOrder(N: number): number[] {
    if (N <= 1) return [0];
    const bits = Math.log2(N);
    const out: number[] = [];
    for (let i = 0; i < N; i++) {
        let rev = 0;
        for (let b = 0; b < bits; b++) {
            if ((i & (1 << b)) !== 0) rev |= 1 << (bits - 1 - b);
        }
        out.push(rev);
    }
    return out;
}

function makeSeededRng(seed: string): () => number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    return () => {
        h += 0x6D2B79F5;
        let t = h;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function fisherYates<T>(arr: T[], rng: () => number): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function randomSeed(): string {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

type Slot = AthleteInput | null;

function buildSlots(
    athletes: AthleteInput[],
    size: number,
    separationGroups: string[][]
): Slot[] {
    const byeCount = size - athletes.length;
    const slots: Slot[] = new Array(size).fill(null);
    const used = new Set<number>();
    const protectedSlots = new Set<number>();
    const placed = new Set<string>();
    const byId = new Map(athletes.map((a) => [a.id, a]));
    const order = bitReversalOrder(size);

    const validGroups = separationGroups
        .map((ids) => ids.map((id) => byId.get(id)).filter((a): a is AthleteInput => !!a))
        .filter((g) => g.length >= 2)
        .sort((a, b) => b.length - a.length);

    for (const group of validGroups) {
        let placedCount = 0;
        let cursor = 0;
        while (placedCount < group.length && cursor < size) {
            const slotIdx = order[cursor];
            const member = group[placedCount];
            if (!used.has(slotIdx) && !placed.has(member.id)) {
                slots[slotIdx] = member;
                used.add(slotIdx);
                protectedSlots.add(slotIdx);
                placed.add(member.id);
                placedCount += 1;
            }
            cursor += 1;
        }
    }

    const remaining = athletes.filter((a) => !placed.has(a.id));
    const teamMap = new Map<string, AthleteInput[]>();
    for (const a of remaining) {
        const key = a.team?.trim() ? a.team.trim().toLowerCase() : `__solo__${a.id}`;
        if (!teamMap.has(key)) teamMap.set(key, []);
        teamMap.get(key)!.push(a);
    }
    const pseudo: (AthleteInput | null)[][] = [...teamMap.values()];
    if (byeCount > 0) pseudo.push(new Array(byeCount).fill(null));
    pseudo.sort((a, b) => b.length - a.length);
    const flat: (AthleteInput | null)[] = pseudo.flat();

    let cur = 0;
    for (let k = 0; k < size; k++) {
        if (cur >= flat.length) break;
        const slotIdx = order[k];
        if (used.has(slotIdx)) continue;
        slots[slotIdx] = flat[cur++];
        used.add(slotIdx);
    }

    ensureNoDoubleByePairs(slots, protectedSlots);
    return slots;
}

function ensureNoDoubleByePairs(slots: Slot[], protectedSlots: Set<number>) {
    const byePairs: number[] = [];
    const realPairs: number[] = [];
    for (let i = 0; i < slots.length; i += 2) {
        const a = slots[i];
        const b = slots[i + 1];
        if (a === null && b === null) {
            byePairs.push(i);
        } else if (a !== null && b !== null && !protectedSlots.has(i) && !protectedSlots.has(i + 1)) {
            realPairs.push(i);
        }
    }
    while (byePairs.length > 0 && realPairs.length > 0) {
        const byeStart = byePairs.pop()!;
        const realStart = realPairs.pop()!;
        const donor = protectedSlots.has(realStart + 1) ? realStart : realStart + 1;
        const receiver = protectedSlots.has(byeStart) ? byeStart + 1 : byeStart;
        [slots[receiver], slots[donor]] = [slots[donor], slots[receiver]];
    }
}

function makeMatch(
    round: number,
    position: number,
    a: AthleteInput | null,
    b: AthleteInput | null,
    isBye = false,
    winnerId: string | null = null
): GeneratedMatch {
    return {
        round,
        position,
        athlete_a_id: a?.id ?? null,
        athlete_b_id: b?.id ?? null,
        athlete_a_name: a?.name ?? null,
        athlete_b_name: b?.name ?? null,
        team_a: a?.team ?? null,
        team_b: b?.team ?? null,
        is_bye: isBye,
        winner_id: winnerId,
    };
}

export function generateBracket(
    athletes: AthleteInput[],
    options: { separationGroups?: string[][]; seed?: string } = {}
): GenerateBracketResult {
    const seed = options.seed || randomSeed();
    const rng = makeSeededRng(seed);
    const shuffled = fisherYates(athletes, rng);
    const n = shuffled.length;
    const separationGroups = options.separationGroups ?? [];

    if (n === 0) {
        return {
            format: 'wo',
            matches: [],
            total_rounds: 0,
            main_bracket_size: 0,
            seed,
            placed_order: [],
        };
    }

    if (n === 1) {
        return {
            format: 'wo',
            matches: [],
            total_rounds: 0,
            main_bracket_size: 1,
            seed,
            placed_order: shuffled,
        };
    }

    if (n === 2) {
        return {
            format: 'final_only',
            matches: [makeMatch(1, 0, shuffled[0], shuffled[1])],
            total_rounds: 1,
            main_bracket_size: 2,
            seed,
            placed_order: shuffled,
        };
    }

    if (n === 3) {
        const [a, b, c] = shuffled;
        return {
            format: 'round_robin',
            matches: [
                makeMatch(1, 0, a, b),
                makeMatch(1, 1, a, c),
                makeMatch(1, 2, b, c),
            ],
            total_rounds: 1,
            main_bracket_size: 3,
            seed,
            placed_order: shuffled,
        };
    }

    const size = nextPowerOf2(n);
    const totalRounds = Math.log2(size);
    const slots = buildSlots(shuffled, size, separationGroups);

    const matches: GeneratedMatch[] = [];
    const r1: GeneratedMatch[] = [];
    for (let i = 0; i < size / 2; i++) {
        const a = slots[2 * i];
        const b = slots[2 * i + 1];
        const isBye = a === null || b === null;
        const winner = isBye ? a ?? b : null;
        r1.push(makeMatch(1, i, a, b, isBye, winner?.id ?? null));
    }
    matches.push(...r1);

    let prev = r1;
    for (let r = 2; r <= totalRounds; r++) {
        const cnt = size / Math.pow(2, r);
        const cur: GeneratedMatch[] = [];
        for (let p = 0; p < cnt; p++) {
            const fA = prev[2 * p];
            const fB = prev[2 * p + 1];
            const aId = fA.is_bye ? fA.winner_id : null;
            const bId = fB.is_bye ? fB.winner_id : null;
            const aSrc = aId ? shuffled.find((s) => s.id === aId) ?? null : null;
            const bSrc = bId ? shuffled.find((s) => s.id === bId) ?? null : null;
            cur.push(makeMatch(r, p, aSrc, bSrc));
        }
        matches.push(...cur);
        prev = cur;
    }

    if (n >= 4) {
        matches.push(makeMatch(totalRounds, 99, null, null));
    }

    const placedOrder: AthleteInput[] = slots.filter((s): s is AthleteInput => s !== null);

    return {
        format: 'single_elimination',
        matches,
        total_rounds: totalRounds,
        main_bracket_size: size,
        seed,
        placed_order: placedOrder,
    };
}

export function applyWinnerPropagation(
    matches: GeneratedMatch[],
    matchIndex: number,
    winnerId: string,
    athletes: AthleteInput[]
): GeneratedMatch[] {
    const out = matches.map((m) => ({ ...m }));
    const m = out[matchIndex];
    if (!m) return out;
    m.winner_id = winnerId;
    if (m.position === 99) return out;

    const nextRound = m.round + 1;
    const nextPosition = Math.floor(m.position / 2);
    const isSlotB = m.position % 2 !== 0;
    const winner = athletes.find((a) => a.id === winnerId);

    const target = out.find(
        (x) => x.round === nextRound && x.position === nextPosition
    );
    if (!target) return out;

    if (isSlotB) {
        target.athlete_b_id = winnerId;
        target.athlete_b_name = winner?.name ?? null;
        target.team_b = winner?.team ?? null;
    } else {
        target.athlete_a_id = winnerId;
        target.athlete_a_name = winner?.name ?? null;
        target.team_a = winner?.team ?? null;
    }

    return out;
}

export function getRoundLabel(round: number, totalRounds: number, position?: number): string {
    if (position === 99) return 'Disputa de 3º';
    if (round === totalRounds) return 'Final';
    if (round === totalRounds - 1) return 'Semifinal';
    return `${round}ª Rodada`;
}
