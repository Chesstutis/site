import type { ArchivesResponse, ChessGame, GamesArchiveResponse } from "../types/chessCom";
import analysisConfig from "../../../internal/config/analysis.json";

export const MAX_ANALYSIS_GAMES = analysisConfig.max_analysis_games;

const archivesUrl = (uname: string): URL => new URL(`https://api.chess.com/pub/player/${uname}/games/archives`);

export const getArchives = async (username: string): Promise<URL[]> => {
    const res = await fetch(archivesUrl(username));
    const json: ArchivesResponse = await res.json();
    return json.archives ?? [];
};

export const getGamesArchive = async (url: URL): Promise<GamesArchiveResponse> => {
    const res = await fetch(url);
    return res.json();
};

export const getLatestGames = async (username: string, analyzedGameUUIDs: ReadonlySet<string>): Promise<ChessGame[]> => {
    const archives = await getArchives(username);
    const latestUnanalyzedGames: ChessGame[] = [];

    for (let index = archives.length - 1; index >= 0 && latestUnanalyzedGames.length < MAX_ANALYSIS_GAMES; index--) {
        const archive = await getGamesArchive(archives[index]);
        const games = archive.games ?? [];
        for (let gameIndex = games.length - 1; gameIndex >= 0 && latestUnanalyzedGames.length < MAX_ANALYSIS_GAMES; gameIndex--) {
            const game = games[gameIndex];
            if (game.rules === "chess" && game.rated && !analyzedGameUUIDs.has(game.uuid.toLowerCase())) {
                latestUnanalyzedGames.push(game);
            }
        }
    }

    return latestUnanalyzedGames.reverse();
};
