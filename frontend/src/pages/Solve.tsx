import React, { useState, useEffect } from "react";
import { ChessPuzzle } from "@react-chess-tools/react-chess-puzzle";

const username = localStorage.getItem("username")

// im lazy and i just want this shit to work already
const dataUrl = `https://api.chess.com/pub/player/${username}/games/2026/03`
const apiUrl = "http://localhost:8080/api/analyze"


export default function Solve() {
    const [data, setData] = useState([]);
    const [dataIsLoaded, setDataIsLoaded] = useState(false);
    const [puzzleIndex, setPuzzleIndex] = useState(0);

    // get game data from chess.com
    useEffect(() => {
        fetch(dataUrl)
            .then((res) => res.json())
            .then((json) => {
                setData(json);
                setDataIsLoaded(true);
            });
    }, []);
    useEffect(() => {
        if (dataIsLoaded) console.log(data);
    }, [data])

    type PuzzleResponse = {
        fen: string,
        best_move: string,
        player_move: string,
    }

    const [puzzlesResponse, setPuzzlesResponse] = useState<PuzzleResponse[]>([]);
    // analyze games with the API
    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }
    useEffect(() => {
        if (!dataIsLoaded) return;
        fetch(apiUrl, requestOptions)
            .then(res => res.json())
            .then(json => setPuzzlesResponse(json))
    }, [dataIsLoaded])
    useEffect(() => {
        console.log(puzzlesResponse)
    }, [puzzlesResponse])

    if (puzzlesResponse.length === 0) {
        return <h1>Loading...</h1>
    }

    type Puzzle = {
        fen: string,
        moves: string[],
        makeFirstMove: boolean,
    }

    let puzzles: Puzzle[] = []
    for (const p of puzzlesResponse) {
        puzzles.push({
            fen: p.fen,
            moves: [p.best_move],
            makeFirstMove: false,
        })
    }

    const currentPuzzle = puzzles[puzzleIndex];

    const handleSolve = () => {
        setPuzzleIndex((prev) => Math.min(prev + 1, puzzles.length - 1))
    }

    return (
        <>
            <h1>last time you played {puzzlesResponse[puzzleIndex].player_move}. See if you can find a better move</h1>
            <ChessPuzzle.Root key={puzzleIndex} puzzle={currentPuzzle} onSolve={handleSolve}>
                <ChessPuzzle.Board className="w-96 max-w-full" />
                <ChessPuzzle.Reset>Restart</ChessPuzzle.Reset>
                <ChessPuzzle.Hint>Get Hint</ChessPuzzle.Hint>
            </ChessPuzzle.Root>
        </>
    );
}
