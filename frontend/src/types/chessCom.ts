// list of URLs to month archives
export type ArchivesResponse = {
    archives: URL[];
};

export type ChessPlayer = {
    rating: number;
    result: string;
    username: string;
};

export type ChessGame = {
    pgn: string;
    rules: string;
    white: ChessPlayer;
    black: ChessPlayer;
};

// list of raw games for given month
export type GamesArchiveResponse = {
    games: ChessGame[];
};
