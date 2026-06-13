import type {
    GenerateBracketResult,
    GeneratedMatch,
    AthleteInput,
    BracketFormat,
} from './bracket-generator';

// Linha de `ge_chaves_oficiais` (campos usados para reconstruir o resultado).
export interface ChaveRowDb {
    formato: BracketFormat;
    seed: string;
    bracket_size: number;
    total_rounds: number;
    total_atletas: number;
    placed_order: AthleteInput[] | null;
    status: string;
}

// Linha de `ge_lutas_oficiais`.
export interface LutaRowDb {
    round: number;
    position: number;
    athlete_a_id: string | null;
    athlete_b_id: string | null;
    athlete_a_name: string | null;
    athlete_b_name: string | null;
    team_a: string | null;
    team_b: string | null;
    winner_id: string | null;
    is_bye: boolean;
}

// Converte a chave persistida (chave + lutas) no formato consumido pelo
// componente <GeBracket />. Pura — pode rodar no servidor ou no cliente.
// Usada tanto na gestão do evento quanto na página pública (evita divergência).
export function mapChaveToResult(chave: ChaveRowDb, lutas: LutaRowDb[]): GenerateBracketResult {
    const matches: GeneratedMatch[] = lutas.map((l) => ({
        round: l.round,
        position: l.position,
        athlete_a_id: l.athlete_a_id,
        athlete_b_id: l.athlete_b_id,
        athlete_a_name: l.athlete_a_name,
        athlete_b_name: l.athlete_b_name,
        team_a: l.team_a,
        team_b: l.team_b,
        is_bye: l.is_bye,
        winner_id: l.winner_id,
    }));

    return {
        format: chave.formato,
        matches,
        total_rounds: chave.total_rounds,
        main_bracket_size: chave.bracket_size,
        seed: chave.seed,
        placed_order: chave.placed_order || [],
    };
}
