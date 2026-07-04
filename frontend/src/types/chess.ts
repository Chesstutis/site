export type ArchivesResponse = {
	archives: string[];
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

export type GamesArchiveResponse = {
	games: ChessGame[];
};

export type PuzzleResponse = {
	fen: string;
	best_move: string;
	player_move: string;
};