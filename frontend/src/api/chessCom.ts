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

export const getLatestGames = async (username: string): Promise<ChessGame[]> => {
    const archives = await getArchives(username);
    const selectedArchives: ChessGame[][] = [];
    let gameCount = 0;

    for (let index = archives.length - 1; index >= 0; index--) {
        const archive = await getGamesArchive(archives[index]);
        selectedArchives.unshift(archive.games ?? []);
        gameCount += archive.games?.length ?? 0;
        if (gameCount >= MAX_ANALYSIS_GAMES) {
            break;
        }
    }

    return selectedArchives.flat().slice(-MAX_ANALYSIS_GAMES);
};
