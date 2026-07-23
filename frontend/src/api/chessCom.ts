import type { ArchivesResponse, GamesArchiveResponse } from "../types/chessCom";

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
