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

type ChessPlayer = {
	rating: number;
	result: string;
	username: string;
};

type ChessGame = {
	pgn: string;
	rules: string;
	white: ChessPlayer;
	black: ChessPlayer;
};

type GamesArchiveResponse = {
	games: ChessGame[];
};

export default function Solve({ username }: SolveProps) {
	const [playerArchives, setPlayerArchives] = useState<string[]>([]);
	const [archivesLoaded, setArchivesLoaded] = useState(false);
	const [data, setData] = useState<GamesArchiveResponse>();
	const [dataIsLoaded, setDataIsLoaded] = useState(false);
	const [puzzlesResponse, setPuzzlesResponse] = useState<PuzzleResponse[]>(
		[],
	);
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
		if (!data) return;
		fetch(apiUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				username,
				games: data.games,
			}),
		})
			.then((res) => res.json())
			.then((json) => setPuzzlesResponse(json));
	}, [dataIsLoaded, data]);

	const puzzles: Puzzle[] = puzzlesResponse.map((p) => ({
		fen: p.fen,
		moves: [p.best_move],
		makeFirstMove: false,
	}));

	const currentPuzzle = puzzles[puzzleIndex];

	const toArrow = (uciMove: string) => ({
		startSquare: uciMove.slice(0, 2),
		endSquare: uciMove.slice(2, 4),
		color: "#ef4444",
	});

	const handleSolve = () => {
		setPuzzleIndex((prev) => Math.min(prev + 1, puzzles.length - 1));
	};

	const statusCard = (
		<div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/40 backdrop-blur">
			<p className="text-sm font-medium uppercase tracking-[0.35em] text-emerald-300/80">
				Chess Puzzle Solver
			</p>
			<h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
				Loading your puzzles
			</h1>
			<p className="mt-3 text-sm leading-6 text-slate-300">
				We’re pulling your recent games and analyzing your mistakes.
			</p>
		</div>
	);

	return (
		<main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
			<section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center justify-center">
				{!archivesLoaded || !dataUrl || puzzlesResponse.length === 0 ? (
					statusCard
				) : (
					<div className="w-full rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-8">
						<div className="mb-6 text-center">
							<p className="text-sm font-medium uppercase tracking-[0.35em] text-emerald-300/80">
								Chess Puzzle Solver
							</p>
							<h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
								Last time you played{" "}
								{puzzlesResponse[puzzleIndex].player_move}
							</h1>
							<p className="mt-3 text-sm leading-6 text-slate-300">
								See if you can find a better move.
							</p>
						</div>

						<div className="flex flex-col items-center gap-5">
							<ChessPuzzle.Root
								key={puzzleIndex}
								puzzle={currentPuzzle}
								onSolve={handleSolve}
							>
								<ChessPuzzle.Board
									className="w-full max-w-md"
									options={{
										arrows: [
											toArrow(
												puzzlesResponse[puzzleIndex]
													.player_move,
											),
										],
									}}
								/>
								<div className="mt-5 flex w-full flex-wrap justify-center gap-3">
									<ChessPuzzle.Reset>
										Restart
									</ChessPuzzle.Reset>
									<ChessPuzzle.Hint>
										Get Hint
									</ChessPuzzle.Hint>
								</div>
							</ChessPuzzle.Root>
						</div>
					</div>
				)}
			</section>
		</main>
	);
}
