import type { PuzzleResponse, ChessGame } from "../types/chess"

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