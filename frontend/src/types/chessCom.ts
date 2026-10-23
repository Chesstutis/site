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
    uuid: string;
    pgn: string;
    rules: string;
    rated: boolean;
    white: ChessPlayer;
    black: ChessPlayer;
};

// list of raw games for given month
export type GamesArchiveResponse = {
    games: ChessGame[];
};
