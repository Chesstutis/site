import type { AnalyzedGamesResponse, ChessComRatingComparison, PuzzleResponse, PuzzleStats } from "../types/chesstutis"
import type { ChessGame } from "../types/chessCom"
import type { AuthUser } from "../types/auth"

async function getErrorMessage(response: Response, fallback: string) {
    const message = (await response.text()).trim();
    return message || fallback;
}

export const getAnalyzedGameUUIDs = async (token: string): Promise<string[]> => {
    const res = await fetch("/api/me/analyzed-games", {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        throw new Error(await getErrorMessage(res, "Failed to fetch analyzed games"));
    }
    const data = await res.json() as AnalyzedGamesResponse;
    return data.game_uuids ?? [];
}

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
        throw new Error(await getErrorMessage(res, "Failed to analyze games"));
    }
    const data = await res.json();
    return data ?? [];
}

export const attemptPuzzle = async (token: string, puzzleID: number, move: string): Promise<boolean> => {
    const res = await fetch(`/api/me/puzzles/${puzzleID}/attempts`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ move }),
    });
    if (!res.ok) {
        throw new Error(await getErrorMessage(res, "Failed to submit move"));
    }
    const data = await res.json() as { correct: boolean };
    return data.correct;
}

export const requestPuzzleHint = async (token: string, puzzleID: number, level: 1 | 2): Promise<{ from: string; to?: string }> => {
    const res = await fetch(`/api/me/puzzles/${puzzleID}/hints`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ level }),
    });
    if (!res.ok) {
        throw new Error(await getErrorMessage(res, "Failed to load puzzle hint"));
    }
    return await res.json() as { from: string; to?: string };
}

export const getAccountInfo = async (token: string): Promise<AuthUser> => {
    const res = await fetch("/api/me", {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    })
    if (!res.ok) {
        throw new Error("Failed to analyze games");
    }
    return res.json() as Promise<AuthUser>;
}

export const getPuzzleStats = async (token: string): Promise<PuzzleStats> => {
    const res = await fetch("/api/me/puzzles/stats", {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    })
    if (!res.ok) {
        throw new Error("Failed to fetch puzzle stats");
    }
    return res.json() as Promise<PuzzleStats>;
}

export const getChessComRatingComparison = async (token: string, signal?: AbortSignal): Promise<ChessComRatingComparison> => {
    const res = await fetch("/api/me/ratings", {
        headers: { Authorization: `Bearer ${token}` },
        signal,
    });
    if (!res.ok) {
        throw new Error(await getErrorMessage(res, "Failed to fetch Chess.com ratings"));
    }
    return res.json() as Promise<ChessComRatingComparison>;
}

export const updateChessComUsername = async (
    token: string,
    chessComUsername: string,
): Promise<AuthUser> => {
    const res = await fetch("/api/me", {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ chess_com_username: chessComUsername }),
    })
    if (!res.ok) {
        throw new Error(await getErrorMessage(res, "Failed to update Chess.com username"));
    }
    return res.json() as Promise<AuthUser>;
}

export const changePassword = async (
    token: string,
    currentPassword: string,
    newPassword: string,
): Promise<void> => {
    const res = await fetch("/api/me/password", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
        }),
    });

    if (!res.ok) {
        throw new Error(await getErrorMessage(res, "Failed to change password"));
    }
}

export const deleteAccount = async (token: string) => {
    const res = await fetch("/api/me", {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    })
    if (!res.ok) {
        throw new Error("Failed to delete account");
    }
    return res.json();
}
