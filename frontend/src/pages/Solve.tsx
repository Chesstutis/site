import { useState, useEffect } from "react";
import { ChessPuzzle } from "@react-chess-tools/react-chess-puzzle";

const archivesUrl = (uname: string) =>
    `https://api.chess.com/pub/player/${uname}/games/archives`;

const apiUrl = "http://localhost:8080/api/analyze";

type PuzzleResponse = {
    fen: string;
    best_move: string;
    player_move: string;
};

type Puzzle = {
    fen: string;
    moves: string[];
    makeFirstMove: boolean;
};

type ArchivesResponse = {
    archives: string[];
};

type SolveProps = {
    username: string;
};

export default function Solve({ username }: SolveProps) {
    const [playerArchives, setPlayerArchives] = useState<string[]>([]);
    const [archivesLoaded, setArchivesLoaded] = useState(false);
    const [data, setData] = useState([]);
    const [dataIsLoaded, setDataIsLoaded] = useState(false);
    const [puzzlesResponse, setPuzzlesResponse] = useState<PuzzleResponse[]>([]);
    const [puzzleIndex, setPuzzleIndex] = useState(0);

    useEffect(() => {
        if (!username) return;

        setArchivesLoaded(false);
        setPlayerArchives([]);

        fetch(archivesUrl(username))
            .then((res) => res.json())
            .then((json: ArchivesResponse) => {
                setPlayerArchives(json.archives ?? []);
                setArchivesLoaded(true);
            });
    }, [username]);

    const dataUrl = playerArchives.at(-1);

    useEffect(() => {
        if (!archivesLoaded || !dataUrl) return;

        setData([]);
        setDataIsLoaded(false);
        setPuzzleIndex(0);
        setPuzzlesResponse([]);

        fetch(dataUrl)
            .then((res) => res.json())
            .then((json) => {
                setData(json);
                setDataIsLoaded(true);
            });
    }, [archivesLoaded, dataUrl]);

    useEffect(() => {
        if (!dataIsLoaded) return;

        fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        })
            .then((res) => res.json())
            .then((json) => setPuzzlesResponse(json));
    }, [dataIsLoaded, data]);

    if (!archivesLoaded) {
        return <h1>Loading archives...</h1>;
    }

    if (!dataUrl) {
        return <h1>Could not find any game archives</h1>;
    }

    if (puzzlesResponse.length === 0) {
        return <h1>Loading...</h1>;
    }

    const puzzles: Puzzle[] = puzzlesResponse.map((p) => ({
        fen: p.fen,
        moves: [p.best_move],
        makeFirstMove: false,
    }));

    const currentPuzzle = puzzles[puzzleIndex];

    const handleSolve = () => {
        setPuzzleIndex((prev) => Math.min(prev + 1, puzzles.length - 1));
    };

    return (
        <>
            <h1>
                last time you played {puzzlesResponse[puzzleIndex].player_move}. See if
                you can find a better move
            </h1>
            <ChessPuzzle.Root key={puzzleIndex} puzzle={currentPuzzle} onSolve={handleSolve}>
                <ChessPuzzle.Board className="w-96 max-w-full" />
                <ChessPuzzle.Reset>Restart</ChessPuzzle.Reset>
                <ChessPuzzle.Hint>Get Hint</ChessPuzzle.Hint>
            </ChessPuzzle.Root>
        </>
    );
}
