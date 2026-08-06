export type PuzzleResponse = {
    fen: string;
    best_move: string;
    player_move: string;
};

export type User = {
    id: number;
    email: string;
    password_hash: string;
    chess_com_username: string;
    created_at: Date;
    updated_at: Date;
};

export type PuzzleStats = {
    solved: number;
    unsolved: number;
    total: number;
};
