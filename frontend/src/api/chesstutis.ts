import type { PuzzleResponse } from "../types/chesstutis"
import type { ChessGame } from "../types/chessCom"

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
    const data = await res.json()
    return data ?? [];
}
