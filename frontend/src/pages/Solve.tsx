import { useState, useEffect, useRef } from "react";
import { useChessGameContext } from "@react-chess-tools/react-chess-game";
import { ChessPuzzle, useChessPuzzleContext } from "@react-chess-tools/react-chess-puzzle";
import type { Hint } from "@react-chess-tools/react-chess-puzzle";
import type { Square } from "chess.js";
import { Check, X } from "lucide-react";
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
import { analyzeGames, attemptPuzzle, getAnalyzedGameUUIDs, requestPuzzleHint } from "@/api/chesstutis";
import { getLatestGames } from "../api/chessCom";
import { longToShortNotation } from "@/lib/chessUtils";
import type { PuzzleResponse } from "@/types/chesstutis"
import { Navigate } from "react-router"
import { useAuth } from "@/components/AuthProvider"

type Status = "idle" | "loading" | "ready" | "error" | "none" | "done";
type PuzzleFeedback = "correct" | "incorrect" | null;

function BoardFeedbackOverlay({ feedback, square }: { feedback: PuzzleFeedback; square: string | null }) {
    const { orientation } = useChessGameContext();
    if (!feedback || !square) return null;

    const file = square.charCodeAt(0) - "a".charCodeAt(0);
    const rank = Number(square[1]);
    const column = orientation === "w" ? file : 7 - file;
    const row = orientation === "w" ? 8 - rank : rank - 1;

    return (
        <div className="pointer-events-none absolute inset-0 z-20 grid grid-cols-8 grid-rows-8">
            <span
                role="img"
                aria-label={feedback === "correct" ? "Correct move" : "Incorrect move"}
                className="relative flex items-center justify-center"
                style={{ gridColumnStart: column + 1, gridRowStart: row + 1 }}
            >
                <span
                    className={`puzzle-feedback-ring absolute size-14 rounded-full border-4 ${feedback === "correct" ? "border-emerald-400/45" : "border-destructive/45"}`}
                />
                <span
                    className={`puzzle-feedback-pop relative flex size-10 items-center justify-center rounded-full text-white/95 ${feedback === "correct" ? "bg-emerald-600/45" : "bg-destructive/45"}`}
                >
                    {feedback === "correct" ? (
                        <Check className="size-6 drop-shadow-sm" aria-hidden="true" />
                    ) : (
                        <X className="size-6 drop-shadow-sm" aria-hidden="true" />
                    )}
                </span>
            </span>
        </div>
    );
}

function PuzzleBoard({ puzzle, token, feedback, feedbackSquare, onFeedback, onCorrect }: {
    puzzle: PuzzleResponse;
    token: string;
    feedback: PuzzleFeedback;
    feedbackSquare: string | null;
    onFeedback: (feedback: PuzzleFeedback, square: string | null) => void;
    onCorrect: () => void;
}) {
    const { game, methods } = useChessGameContext();
    const { hint, changePuzzle, onHint } = useChessPuzzleContext();
    const [pending, setPending] = useState(false);
    const [hintPending, setHintPending] = useState(false);
    const [hintError, setHintError] = useState("");
    const [promotionMove, setPromotionMove] = useState<{ sourceSquare: string; targetSquare: string } | null>(null);
    const [hintBeforeGuess, setHintBeforeGuess] = useState<Hint>("none");
    const [hintedMoveBeforeGuess, setHintedMoveBeforeGuess] = useState<string | null>(null);

    const submitMove = async ({ sourceSquare, targetSquare, promotion }: {
        sourceSquare: string;
        targetSquare: string;
        promotion?: "q" | "r" | "b" | "n";
    }) => {
        if (pending || hintPending || feedback !== null) return false;
        onFeedback(null, null);
        setHintError("");
        const legal = game.moves({ square: sourceSquare as Square, verbose: true })
            .filter((move) => move.to === targetSquare);
        if (!legal.length) return false;
        if (legal.some((move) => move.promotion) && !promotion) return false;
        const move = `${sourceSquare}${targetSquare}${promotion ?? ""}`;
        setPending(true);
        try {
            const correct = await attemptPuzzle(token, puzzle.id, move);
            if (!methods.makeMove({ from: sourceSquare, to: targetSquare, promotion })) {
                setHintError("Could not apply that move. Restart the puzzle and try again.");
                return false;
            }
            setHintBeforeGuess(hint);
            onFeedback(correct ? "correct" : "incorrect", targetSquare);
            if (correct) onCorrect();
            return true;
        } catch (error) {
            console.error(error);
            onFeedback(null, null);
            return false;
        } finally {
            setPending(false);
        }
    };

    const showHint = async () => {
        if (hintPending || hint === "move") return;
        setHintPending(true);
        setHintError("");
        const level = hint === "piece" ? 2 : 1;
        try {
            const result = await requestPuzzleHint(token, puzzle.id, level);
            const legalMove = game.moves({ square: result.from as Square, verbose: true })
                .find((move) => level === 1 || move.to === result.to);
            if (!legalMove) throw new Error("No legal move found for hint");
            const hintedMove = `${result.from}${legalMove.to}${legalMove.promotion ?? ""}`;
            changePuzzle({ fen: puzzle.fen, moves: [hintedMove] });
            setHintedMoveBeforeGuess(hintedMove);
            onHint();
            if (level === 2) onHint();
        } catch (error) {
            console.error(error);
            setHintError("Could not load a hint. Try again.");
        } finally {
            setHintPending(false);
        }
    };

    const restart = () => {
        setPromotionMove(null);
        onFeedback(null, null);
        setHintError("");
        if (hintBeforeGuess === "piece") onHint();
        if (hintBeforeGuess === "move") {
            onHint();
            onHint();
        }
    };

    const resetPuzzle = {
        fen: puzzle.fen,
        moves: hintBeforeGuess === "none" || !hintedMoveBeforeGuess ? [] : [hintedMoveBeforeGuess],
    };

    return <>
        <div className="relative w-full max-w-md">
            <ChessPuzzle.Board
                className="w-full"
                options={{
                    allowDragging: !pending && !hintPending && feedback === null,
                    onPieceDrop: ({ sourceSquare, targetSquare }) => {
                        if (!sourceSquare || !targetSquare) return false;
                        const legal = game.moves({ square: sourceSquare as Square, verbose: true })
                            .filter((move) => move.to === targetSquare);
                        if (legal.some((move) => move.promotion)) {
                            setPromotionMove({ sourceSquare, targetSquare });
                            return false;
                        }
                        void submitMove({ sourceSquare, targetSquare });
                        return false;
                    },
                    arrows: [{
                        startSquare: puzzle.player_move.slice(0, 2),
                        endSquare: puzzle.player_move.slice(2, 4),
                        color: "var(--destructive)",
                    }],
                }}
            />
            <BoardFeedbackOverlay feedback={feedback} square={feedbackSquare} />
        </div>
        <div className="mt-5 flex min-h-24 w-full flex-col items-center gap-2">
            <div className="flex min-h-10 w-full items-center justify-center gap-2" aria-label={promotionMove && feedback === null ? "Choose promotion piece" : undefined}>
                {promotionMove && feedback === null ? (["q", "r", "b", "n"] as const).map((promotion) => (
                        <Button
                            key={promotion}
                            variant="secondary"
                            disabled={pending || hintPending}
                            onClick={() => {
                                void submitMove({ ...promotionMove, promotion });
                                setPromotionMove(null);
                            }}
                        >
                            {promotion.toUpperCase()}
                        </Button>
                    )) : null}
            </div>
            <div className="flex min-h-10 items-center justify-center">
                {feedback === "incorrect" ? (
                    <ChessPuzzle.Reset asChild puzzle={resetPuzzle} showOn={["not-started", "in-progress", "failed", "solved"]} onReset={restart}>
                        <Button variant="outline" disabled={pending}>Restart</Button>
                    </ChessPuzzle.Reset>
                ) : feedback === null ? (
                    <Button variant="outline" onClick={() => void showHint()} disabled={pending || hintPending || hint === "move"}>
                        {hint === "piece" ? "Show move" : hint === "move" ? "Move revealed" : "Hint"}
                    </Button>
                ) : (
                    <Button variant="outline" disabled>Correct!</Button>
                )}
            </div>
        </div>
        {hintError && (
            <p className="mt-3 text-center text-sm text-destructive" role="alert">
                {hintError}
            </p>
        )}
    </>;
}

export default function Solve() {
    const { status, user, token } = useAuth();
    const username = user?.chess_com_username ?? "";

    const [pageStatus, setStatus] = useState<Status>("idle");
    const [puzzlesResponse, setPuzzlesResponse] = useState<PuzzleResponse[]>([]);
    const [puzzleIndex, setPuzzleIndex] = useState(0);
    const [feedback, setFeedback] = useState<PuzzleFeedback>(null);
    const [feedbackSquare, setFeedbackSquare] = useState<string | null>(null);
    const feedbackTimeout = useRef<number | null>(null);

    useEffect(() => () => {
        if (feedbackTimeout.current !== null) {
            window.clearTimeout(feedbackTimeout.current);
        }
    }, []);

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

                const analyzedGameUUIDs = await getAnalyzedGameUUIDs(token!);
                const games = await getLatestGames(username, new Set(analyzedGameUUIDs.map((uuid) => uuid.toLowerCase())));
                const puzzles = await analyzeGames(username, games, token!);

                setPuzzlesResponse(puzzles);
                setStatus(puzzles.length === 0 ? "none" : "ready");
            } catch (error) {
                console.error(error);
                setStatus("error");
            }
        }
        loadPuzzles();
    }, [username, token]);

    const currentPuzzleResponse = puzzlesResponse[puzzleIndex];

    const handleSolve = () => {
        feedbackTimeout.current = window.setTimeout(() => {
            setFeedback(null);
            setFeedbackSquare(null);
            if (puzzleIndex === puzzlesResponse.length - 1) {
                setStatus("done");
                return;
            }
            setPuzzleIndex((prev) => prev + 1);
        }, 900);
    };

    const handleFeedback = (nextFeedback: PuzzleFeedback, square: string | null) => {
        setFeedback(nextFeedback);
        setFeedbackSquare(square);
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

    if (pageStatus === "error" || !currentPuzzleResponse) {
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
                                key={currentPuzzleResponse.id}
                                puzzle={{ fen: currentPuzzleResponse.fen, moves: [] }}
                                theme={{ puzzle: { failure: feedback === "correct" ? "rgba(16, 185, 129, 0.5)" : undefined } }}
                                solveOnCheckmate={false}
                            >
                                <PuzzleBoard
                                    puzzle={currentPuzzleResponse}
                                    token={token!}
                                    feedback={feedback}
                                    feedbackSquare={feedbackSquare}
                                    onFeedback={handleFeedback}
                                    onCorrect={handleSolve}
                                />
                            </ChessPuzzle.Root>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
