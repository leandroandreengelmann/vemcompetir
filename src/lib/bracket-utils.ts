export interface Athlete {
    name: string;
    team: string;
}

export interface Match {
    id: string;
    athleteA: string | null;
    athleteB: string | null;
    teamA?: string | null;
    teamB?: string | null;
    winner: string | null;
    isBye: boolean;
}

export interface Round {
    name: string;
    matches: Match[];
}

export const nextPowerOf2 = (n: number) => Math.pow(2, Math.ceil(Math.log2(n)));

/**
 * Intelligent seed placement using recursive quadrant distribution.
 *
 * Core idea: divide the bracket into quadrants (halves, quarters, eighths…)
 * and spread athletes from the same team as far apart as possible by always
 * picking the quadrant that is most "distant" from the team's already-placed
 * seeds. This guarantees that any two athletes from the same team will only
 * meet in the latest possible round given the bracket size.
 *
 * Guarantees:
 *  - 2 athletes from same team → meet no earlier than the Final
 *  - 4 athletes from same team → meet no earlier than the Semi-Finals
 *  - 8 athletes from same team → meet no earlier than the Quarters
 *  - Multiple teams with 2 athletes each → no team crosses before the Semi
 */
function getBitReverseSlot(k: number, roundsCount: number): number {
    let rev = 0;
    for (let i = 0; i < roundsCount; i++) {
        rev = (rev << 1) | ((k >> i) & 1);
    }
    return rev;
}

export const generateBracketLogic = (athleteList: Athlete[]): Round[] => {
    const count = athleteList.length;
    if (count < 2) return [];

    const size = nextPowerOf2(count);
    const roundsCount = Math.log2(size);

    // 1. Agrupar atletas por equipe. BYEs são tratados como uma equipe gigante.
    const teamMap = new Map<string, (Athlete | "BYE")[]>();
    for (const a of athleteList) {
        const t = a.team?.trim() || "Sem Equipe";
        if (!teamMap.has(t)) teamMap.set(t, []);
        teamMap.get(t)!.push(a);
    }

    // Adicionar BYEs como equipe para que também sejam perfeitamente separados
    const numByes = size - count;
    if (numByes > 0) {
        teamMap.set("BYE_TEAM", new Array(numByes).fill("BYE"));
    }

    // Ordenar da maior equipe para a menor
    const sortedTeams = [...teamMap.values()].sort((a, b) => b.length - a.length);

    // Criar um array concatenando os atletas de todas as equipes
    const allAthletes: (Athlete | "BYE")[] = [];
    for (const team of sortedTeams) {
        allAthletes.push(...team);
    }

    // 2. Alocar nos slots físicos usando a permuta "Bit-Reversal".
    // Isso garante que atletas consecutivos do array `allAthletes` 
    // sejam colocados à maior distância possível no Bracket Físico!
    const slots: (Athlete | "BYE" | null)[] = new Array(size).fill(null);
    for (let k = 0; k < size; k++) {
        slots[getBitReverseSlot(k, roundsCount)] = allAthletes[k];
    }

    // 3. Construir matches do Round 1 diretamente dos slots físicos.
    const r1Matches: Match[] = [];
    for (let i = 0; i < size / 2; i++) {
        const slotA = slots[i * 2]!;
        const slotB = slots[i * 2 + 1]!;

        const isBye = slotA === "BYE" || slotB === "BYE";
        const aObj = slotA !== "BYE" ? slotA as Athlete : null;
        const bObj = slotB !== "BYE" ? slotB as Athlete : null;

        const match: Match = {
            id: `r1-m${i}`,
            athleteA: aObj?.name ?? (slotA === "BYE" ? "BYE" : null),
            athleteB: bObj?.name ?? (slotB === "BYE" ? "BYE" : null),
            teamA: aObj?.team ?? null,
            teamB: bObj?.team ?? null,
            winner: null,
            isBye,
        };

        if (isBye) {
            match.winner = match.athleteA !== "BYE" && match.athleteA ? match.athleteA :
                match.athleteB !== "BYE" && match.athleteB ? match.athleteB : "BYE";
        }

        r1Matches.push(match);
    }

    const newRounds: Round[] = [{ name: "Round 1", matches: r1Matches }];

    // ------------------------------------------------------------------
    // 4. Construir rounds subsequentes
    // ------------------------------------------------------------------
    for (let r = 1; r < roundsCount; r++) {
        const mCount = Math.pow(2, roundsCount - r - 1);
        const rMatches: Match[] = Array.from({ length: mCount }, (_, i) => ({
            id: `r${r + 1}-m${i}`,
            athleteA: null,
            athleteB: null,
            teamA: null,
            teamB: null,
            winner: null,
            isBye: false,
        }));

        // Create the next round matches
        const prevMatches = newRounds[r - 1].matches;
        prevMatches.forEach((m, idx) => {
            if (m.winner) {
                const nextPos = Math.floor(idx / 2);
                const isSlotB = idx % 2 !== 0;
                const winTeam = m.winner === m.athleteA ? m.teamA : m.teamB;

                if (isSlotB) {
                    rMatches[nextPos].athleteB = m.winner;
                    rMatches[nextPos].teamB = winTeam;
                } else {
                    rMatches[nextPos].athleteA = m.winner;
                    rMatches[nextPos].teamA = winTeam;
                }
            }
        });

        const roundName =
            r === roundsCount - 1 ? "Final" :
                r === roundsCount - 2 ? "Semi-Final" :
                    `Round ${r + 1}`;

        newRounds.push({ name: roundName, matches: rMatches });
    }

    return newRounds;
};

// ---------------------------------------------------------------------------
// Standard single-elimination seeding pattern generator.
// Produces an array where index i = seed number and value = bracket slot.
// Guarantees seed 0 (top) and seed N-1 (bottom) are on opposite sides.
// ---------------------------------------------------------------------------
function getSeedingPattern(size: number): number[] {
    if (size <= 1) return [0];
    const half = getSeedingPattern(size / 2);
    const res: number[] = [];
    for (const val of half) {
        res.push(val);
        res.push(size - 1 - val);
    }
    return res;
}
