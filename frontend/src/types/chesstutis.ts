export type PuzzleResponse = {
    id: number;
    fen: string;
    player_move: string;
};

export type PuzzleStats = {
    solved: number;
    unsolved: number;
    total: number;
};

export type AnalyzedGamesResponse = {
    game_uuids: string[];
};

export type ChessComRatingValues = {
    bullet: number | null;
    blitz: number | null;
    rapid: number | null;
    daily: number | null;
};

export type ChessComRatingComparison = {
    baseline: ChessComRatingValues;
    current: ChessComRatingValues;
    baseline_captured_at: string | null;
    comparison_status: "available" | "baseline_unavailable" | "current_unavailable" | "account_mismatch";
};
