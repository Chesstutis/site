import { useState, useEffect } from "react";
import { ChessPuzzle } from "@react-chess-tools/react-chess-puzzle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { analyzeGames } from "@/api/chesstutis";
import {
    getArchives,
    getGamesArchive,
} from "../api/chessCom";
import { longToShortNotation } from "@/lib/chessUtils";
import type { Puzzle, PuzzleResponse } from "@/types/chesstutis"
import { Navigate } from "react-router"
import { useAuth } from "@/components/AuthProvider"

type Status = "idle" | "loading" | "ready" | "error" | "none" | "done";

export default function Solve() {
    const { status, user, token } = useAuth();
    const username = user?.chess_com_username ?? "";

    const [pageStatus, setStatus] = useState<Status>("idle");
    const [puzzlesResponse, setPuzzlesResponse] = useState<PuzzleResponse[]>([]);
    const [puzzleIndex, setPuzzleIndex] = useState(0);

    useEffect(() => {
        if (!username || !token) {
            setStatus("idle");
            return;
        }

        async function loadPuzzles() {
            try {
                setStatus("loading");
                setPuzzleIndex(0);
                setPuzzlesResponse([]);

                const archives = await getArchives(username);
                const latestArchiveUrl = archives.at(-1);
                if (!latestArchiveUrl) {
                    setStatus("error");
                    return;
                }

                const archive = await getGamesArchive(latestArchiveUrl);
                const puzzles = await analyzeGames(username, archive.games, token!);

                setPuzzlesResponse(puzzles);
                setStatus(puzzles.length === 0 ? "none" : "ready");
            } catch (error) {
                console.error(error);
                setStatus("error");
            }
        }
        loadPuzzles();
    }, [username, token]);

    const puzzles: Puzzle[] = puzzlesResponse.map((p) => ({
        fen: p.fen,
        moves: [p.best_move],
        makeFirstMove: false,
    }));

    const currentPuzzle = puzzles[puzzleIndex];
    const currentPuzzleResponse = puzzlesResponse[puzzleIndex];

    const toArrow = (uciMove: string) => ({
        startSquare: uciMove.slice(0, 2),
        endSquare: uciMove.slice(2, 4),
        color: "var(--destructive)",
    });

    const handleSolve = () => {
        if (puzzleIndex === puzzles.length - 1) {
            setStatus("done")
        }
        setPuzzleIndex((prev) => prev + 1);
    };

    if (pageStatus === "done") {
        return <div>You solved all ur puzzles bruh</div>
    }

    if (status === "unauthenticated" || !user || !token) {
        return <Navigate to="/login" replace />;
    }

    if (!username) {
        return (
            <div className="flex flex-1 bg-background px-4 py-8 text-foreground">
                <section className="mx-auto flex w-full max-w-3xl items-center justify-center">
                    <Card className="w-full">
                        <CardContent>
                            <Alert>
                                <AlertTitle>Enter a username first</AlertTitle>
                                <AlertDescription>
                                    Go back to the start screen and choose a
                                    Chess.com username before loading puzzles.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </section>
            </div>
        );
    }

    if (pageStatus === "loading" || pageStatus === "idle" || status === "initializing") {
        return (
            <div className="flex flex-1 bg-background px-4 py-8 text-foreground">
                <section className="mx-auto flex w-full max-w-3xl items-center justify-center">
                    <Card className="w-full">
                        <CardHeader className="text-center">
                            <p className="text-sm font-medium uppercase tracking-widest text-primary">
                                Chess Puzzle Solver
                            </p>
                            <CardTitle className="text-3xl sm:text-4xl">
                                Loading your puzzles
                            </CardTitle>
                            <CardDescription>
                                We&apos;re pulling your recent games and
                                analyzing your mistakes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center">
                            <Skeleton className="aspect-square w-full max-w-md" />
                        </CardContent>
                    </Card>
                </section>
            </div>
        );
    }

    if (pageStatus == "none") {
        return (
            <div className="flex flex-1 bg-background px-4 py-8 text-foreground">
                <section className="mx-auto flex w-full max-w-3xl items-center justify-center">
                    <Card className="w-full">
                        <CardContent>
                            <Alert variant="destructive">
                                <AlertTitle>No Puzzles Found</AlertTitle>
                                <AlertDescription>
                                    Try making more mistakes in your games.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </section>
            </div>
        );
    }

    if (pageStatus === "error" || !currentPuzzle || !currentPuzzleResponse) {
        return (
            <div className="flex flex-1 bg-background px-4 py-8 text-foreground">
                <section className="mx-auto flex w-full max-w-3xl items-center justify-center">
                    <Card className="w-full">
                        <CardContent>
                            <Alert variant="destructive">
                                <AlertTitle>Could not load puzzles</AlertTitle>
                                <AlertDescription>
                                    Try another username or reload the page.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </section>
            </div>
        );
    }

    return (
        <div className="flex flex-1 bg-background px-4 py-8 text-foreground">
            <section className="mx-auto flex w-full max-w-3xl items-center justify-center">
                <Card className="w-full">
                    <CardHeader className="text-center">
                        <p className="text-sm font-medium uppercase tracking-widest text-primary">
                            Chess Puzzle Solver
                        </p>
                        <CardTitle className="text-3xl sm:text-4xl">
                            Last time you played {longToShortNotation(currentPuzzleResponse.player_move, currentPuzzleResponse.fen)}
                        </CardTitle>
                        <CardDescription>
                            See if you can find a better move.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="flex flex-col items-center gap-5">
                            <ChessPuzzle.Root
                                key={puzzleIndex}
                                puzzle={currentPuzzle}
                                onSolve={handleSolve}
                            >
                                <ChessPuzzle.Board
                                    className="w-full max-w-md"
                                    options={{
                                        arrows: [toArrow(currentPuzzleResponse.player_move)],
                                    }}
                                />
                                <div className="mt-5 flex w-full flex-wrap justify-center gap-3">
                                    <ChessPuzzle.Reset asChild>
                                        <Button variant="outline">Restart</Button>
                                    </ChessPuzzle.Reset>
                                    <ChessPuzzle.Hint asChild>
                                        <Button variant="secondary">
                                            Get Hint
                                        </Button>
                                    </ChessPuzzle.Hint>
                                </div>
                            </ChessPuzzle.Root>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
