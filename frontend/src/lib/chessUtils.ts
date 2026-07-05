export function longToShortNotation(longMove: string, fen: string): string {
	const move = longMove.trim();
	const from = move.slice(0, 2);
	const to = move.slice(2, 4);
	const promotion = move[4];

	if (!isSquare(from) || !isSquare(to)) {
		return longMove;
	}

	const board = parseFenBoard(fen);
	const piece = board.get(from);

	if (!piece) {
		return longMove;
	}

	if (piece.toLowerCase() === "k") {
		if (from === "e1" && to === "g1") return "O-O";
		if (from === "e1" && to === "c1") return "O-O-O";
		if (from === "e8" && to === "g8") return "O-O";
		if (from === "e8" && to === "c8") return "O-O-O";
	}

	const pieceName = pieceToNotation(piece);
	const isPawn = pieceName === "";
	const isCapture = board.has(to) || isEnPassantCapture(piece, from, to, fen);
	const promotionSuffix = promotion ? `=${promotion.toUpperCase()}` : "";

	if (isPawn) {
		return `${isCapture ? `${from[0]}x` : ""}${to}${promotionSuffix}`;
	}

	return `${pieceName}${isCapture ? "x" : ""}${to}`;
}

function isSquare(square: string): boolean {
	return /^[a-h][1-8]$/.test(square);
}

function pieceToNotation(piece: string): string {
	switch (piece.toLowerCase()) {
		case "k":
			return "K";
		case "q":
			return "Q";
		case "r":
			return "R";
		case "b":
			return "B";
		case "n":
			return "N";
		default:
			return "";
	}
}

function parseFenBoard(fen: string): Map<string, string> {
	const board = new Map<string, string>();
	const boardPart = fen.split(" ")[0];
	const ranks = boardPart.split("/");

	for (let rankIndex = 0; rankIndex < ranks.length; rankIndex += 1) {
		const rank = 8 - rankIndex;
		let fileIndex = 0;

		for (const char of ranks[rankIndex]) {
			const emptySquares = Number(char);

			if (Number.isInteger(emptySquares)) {
				fileIndex += emptySquares;
				continue;
			}

			const file = String.fromCharCode("a".charCodeAt(0) + fileIndex);
			board.set(`${file}${rank}`, char);
			fileIndex += 1;
		}
	}

	return board;
}

function isEnPassantCapture(
	piece: string,
	from: string,
	to: string,
	fen: string,
): boolean {
	if (piece.toLowerCase() !== "p") {
		return false;
	}

	const enPassantSquare = fen.split(" ")[3];
	return enPassantSquare === to && from[0] !== to[0];
}
