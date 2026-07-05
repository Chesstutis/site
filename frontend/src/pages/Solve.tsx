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
import { analyzeGames } from "../api/chesstutis";
import {
	getArchives,
	getGamesArchive,
} from "../api/chessCom";

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

type SolveProps = {
	username: string;
};

type Status = "idle" | "loading" | "ready" | "error";

export default function Solve({ username }: SolveProps) {
	const [status, setStatus] = useState<Status>("idle");
	const [puzzlesResponse, setPuzzlesResponse] = useState<PuzzleResponse[]>([]);
	const [puzzleIndex, setPuzzleIndex] = useState(0);


	useEffect(() => {
		if (!username) {
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
				const puzzles = await analyzeGames(username, archive.games);

				setPuzzlesResponse(puzzles);
				setStatus("ready");
			} catch (error) {
				console.error(error);
				setStatus("error");
			}
		}
		loadPuzzles();

	}, [username]);


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
		setPuzzleIndex((prev) => Math.min(prev + 1, puzzles.length - 1));
	};

	if (!username) {
		return (
			<main className="min-h-screen bg-background px-4 py-8 text-foreground">
				<section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center justify-center">
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
			</main>
		);
	}

	if (status === "loading" || status === "idle") {
		return (
			<main className="min-h-screen bg-background px-4 py-8 text-foreground">
				<section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center justify-center">
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
			</main>
		);
	}

	if (status === "error" || !currentPuzzle || !currentPuzzleResponse) {
		return (
			<main className="min-h-screen bg-background px-4 py-8 text-foreground">
				<section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center justify-center">
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
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-background px-4 py-8 text-foreground">
			<section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center justify-center">
				<Card className="w-full">
					<CardHeader className="text-center">
						<p className="text-sm font-medium uppercase tracking-widest text-primary">
							Chess Puzzle Solver
						</p>
						<CardTitle className="text-3xl sm:text-4xl">
							Last time you played {currentPuzzleResponse.player_move}
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
		</main>
	);
}
