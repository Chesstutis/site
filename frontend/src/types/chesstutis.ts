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
