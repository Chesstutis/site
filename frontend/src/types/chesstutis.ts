export type PuzzleResponse = {
    fen: string;
    best_move: string;
    player_move: string;
};

export type PuzzleStats = {
    solved: number;
    unsolved: number;
    total: number;
};
