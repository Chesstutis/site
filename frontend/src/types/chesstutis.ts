export type PuzzleResponse = {
    fen: string;
    best_move: string;
    player_move: string;
};

export type Puzzle = {
    fen: string;
    moves: string[];
    makeFirstMove: boolean;
};

