import type {
    GenerateBracketResult,
    GeneratedMatch,
} from './bracket-generator';

// ─────────────────────────────────────────────────────────────────
// Helpers compartilhados entre os PDFs de chaveamento
// (lista de lutas e árvore para preencher à mão).
//
// Regra do evento: NÃO há disputa de 3º lugar. O 3º é o semifinalista
// que perdeu para o campeão — portanto nenhum PDF gera/mostra luta de 3º.
// ─────────────────────────────────────────────────────────────────

export function formatDateTime(d: Date): string {
    return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function roundLabel(round: number, totalRounds: number): string {
    if (round === totalRounds) return 'FINAL';
    if (round === totalRounds - 1) return 'SEMIFINAL';
    return `${round}ª RODADA`;
}

export function bracketColumnLabel(round: number, totalRounds: number): string {
    const rev = totalRounds - round;
    if (rev === 0) return 'FINAL';
    if (rev === 1) return 'SEMIFINAL';
    if (rev === 2) return 'QUARTAS';
    if (rev === 3) return 'OITAVAS';
    if (rev === 4) return '16-AVOS';
    if (rev === 5) return '32-AVOS';
    if (rev === 6) return '64-AVOS';
    return `${round}ª RODADA`;
}

export type FightRow = {
    displayNum: number;
    round: number;
    position: number;
    sectionLabel: string;
    aName: string | null;
    aTeam: string | null;
    aFromMatch: number | null; // displayNum do pai (quando o nome é desconhecido)
    aFromKind: 'venc' | 'perd' | null;
    aAdvancedByBye: boolean;
    bName: string | null;
    bTeam: string | null;
    bFromMatch: number | null;
    bFromKind: 'venc' | 'perd' | null;
    bAdvancedByBye: boolean;
};

export function buildFightOrder(result: GenerateBracketResult): FightRow[] {
    const realMatches = result.matches.filter((m) => !m.is_bye);
    // Defensivo: ignora qualquer luta de 3º (position 99) que ainda exista
    // em chaves oficiais antigas congeladas no banco.
    const main = realMatches.filter((m) => m.position !== 99);
    const isRoundRobin = result.format === 'round_robin';

    // Ordem: round 1 → round 2 → ... → semifinal → final
    main.sort((a, b) => {
        if (a.round !== b.round) {
            const aw = !isRoundRobin && a.round === result.total_rounds ? 1 : 0;
            const bw = !isRoundRobin && b.round === result.total_rounds ? 1 : 0;
            if (aw !== bw) return aw - bw;
            return a.round - b.round;
        }
        return a.position - b.position;
    });

    const ordered: GeneratedMatch[] = [];
    for (const m of main) {
        if (!isRoundRobin && m.round === result.total_rounds) continue; // final por último
        ordered.push(m);
    }
    if (!isRoundRobin) {
        const finalMatch = main.find((m) => m.round === result.total_rounds);
        if (finalMatch) ordered.push(finalMatch);
    }

    // Map (round,position) -> displayNum para os "Venc. #X"
    const numMap = new Map<string, number>();
    let seq = 0;
    const rows: FightRow[] = ordered.map((m) => {
        seq += 1;
        numMap.set(`${m.round}:${m.position}`, seq);
        return {
            displayNum: seq,
            round: m.round,
            position: m.position,
            sectionLabel: '',
            aName: m.athlete_a_name,
            aTeam: m.team_a,
            aFromMatch: null,
            aFromKind: null,
            aAdvancedByBye: false,
            bName: m.athlete_b_name,
            bTeam: m.team_b,
            bFromMatch: null,
            bFromKind: null,
            bAdvancedByBye: false,
        };
    });

    // Resolve "Venc. #X"
    for (const row of rows) {
        if (isRoundRobin) {
            row.sectionLabel = 'TODOS CONTRA TODOS';
        } else if (row.round === result.total_rounds) {
            row.sectionLabel = 'FINAL';
        } else {
            row.sectionLabel = roundLabel(row.round, result.total_rounds);
        }
        if (row.round > 1) {
            const parentA = numMap.get(`${row.round - 1}:${row.position * 2}`);
            const parentB = numMap.get(`${row.round - 1}:${row.position * 2 + 1}`);
            const parentAMatch = result.matches.find(
                (m) => m.round === row.round - 1 && m.position === row.position * 2,
            );
            const parentBMatch = result.matches.find(
                (m) => m.round === row.round - 1 && m.position === row.position * 2 + 1,
            );
            if (!row.aName && parentA) {
                row.aFromMatch = parentA;
                row.aFromKind = 'venc';
            } else if (row.aName && parentAMatch?.is_bye) {
                row.aAdvancedByBye = true;
            }
            if (!row.bName && parentB) {
                row.bFromMatch = parentB;
                row.bFromKind = 'venc';
            } else if (row.bName && parentBMatch?.is_bye) {
                row.bAdvancedByBye = true;
            }
        }
    }
    return rows;
}
