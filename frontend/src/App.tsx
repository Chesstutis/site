import React, { useState, useEffect } from "react";
import { ChessPuzzle } from "@react-chess-tools/react-chess-puzzle";
// im lazy and i just want this shit to work already
const dataUrl = "https://api.chess.com/pub/player/alex121563/games/2026/04"
const apiUrl = "http://localhost:8080/api/analyze"

export default function App() {
    const [data, setData] = useState([]);
    const [dataIsLoaded, setDataIsLoaded] = useState(false);
   
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

    type Puzzle = {
        fen: string,
        best_move: string,
        player_move: string,
    }

    const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
    // analyze games with the API
    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    }
    useEffect(() => {
        if (!dataIsLoaded) return;
        fetch(apiUrl, requestOptions)
            .then(res => res.json())
            .then(json => setPuzzles(json))
    }, [dataIsLoaded])
    useEffect(() => {
        console.log(puzzles)
    }, [puzzles])

    if (puzzles.length === 0) {
        return <h1>Loading...</h1>
    }

    const puzzle = {
        fen: puzzles[0].fen,
        moves: [puzzles[0].best_move],
        makeFirstMove: false,
    };

    return (
        <>
        <h1>last time you played {puzzles[0].player_move}. See if you can find a better move</h1>
        <ChessPuzzle.Root puzzle={puzzle}>
            <ChessPuzzle.Board className="w-96 max-w-full" />
            <ChessPuzzle.Reset>Restart</ChessPuzzle.Reset>
            <ChessPuzzle.Hint>Get Hint</ChessPuzzle.Hint>
        </ChessPuzzle.Root>
        </>
    );
}
