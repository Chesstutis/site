
type PuzzleResponse = {
	fen: string;
	best_move: string;
	player_move: string;
};

type ChessPlayer = {
	rating: number;
	result: string;
	username: string;
};

type ChessGame = {
	pgn: string;
	rules: string;
	white: ChessPlayer;
	black: ChessPlayer;
};

export const analyzeGames = async (username: string, games: ChessGame[]): Promise<PuzzleResponse[]> => {
    const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username, 
            games,
        }),
    });
    if (!res.ok) {
        throw new Error("Failed to analyze games");
    }
    return res.json();
}