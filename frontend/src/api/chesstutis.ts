import type { PuzzleResponse } from "../types/chesstutis"
import type { ChessGame } from "../types/chessCom"

export const analyzeGames = async (username: string, games: ChessGame[], token: string,): Promise<PuzzleResponse[]> => {
    const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            username,
            games,
        }),
    });
    if (!res.ok) {
        throw new Error("Failed to analyze games");
    }
    const data = await res.json();
    return data ?? [];
}

export const getAccountInfo = async (token: string) => {
    const res = await fetch("/api/me", {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    })
    if (!res.ok) {
        throw new Error("Failed to analyze games");
    }
    const data = await res.json();
    return data ?? [];
}