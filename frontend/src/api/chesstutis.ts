import type { PuzzleResponse, PuzzleStats } from "../types/chesstutis"
import type { ChessGame } from "../types/chessCom"
import type { AuthUser } from "../types/auth"

async function getErrorMessage(response: Response, fallback: string) {
    const message = (await response.text()).trim();
    return message || fallback;
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
        throw new Error("Failed to analyze games");
    }
    const data = await res.json();
    return data ?? [];
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
