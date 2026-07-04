import type { ArchivesResponse, GamesArchiveResponse } from "../types/chess";

const archivesUrl = (uname: string) => `https://api.chess.com/pub/player/${uname}/games/archives`;

export const getArchives = async (username: string): Promise<string[]> => {
    const res = await fetch(archivesUrl(username));
    const json: ArchivesResponse = await res.json();
    return json.archives ?? [];
};

export const getGamesArchive = async (url: string): Promise<GamesArchiveResponse> => {
    const res = await fetch(url);
    return res.json();
};