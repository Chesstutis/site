-- name: SaveAnalyzedGame :one
WITH inserted_game AS (
    INSERT INTO analyzed_games (user_id, game_uuid)
    VALUES ($1, $2)
    ON CONFLICT (user_id, game_uuid) DO NOTHING
    RETURNING user_id, game_uuid
), inserted_puzzles AS (
    INSERT INTO puzzles (user_id, source_game_uuid, puzzle_index, puzzle)
    SELECT $1, $2, item.ordinality::INTEGER - 1, item.puzzle
    FROM inserted_game
    CROSS JOIN LATERAL jsonb_array_elements($3::JSONB) WITH ORDINALITY AS item(puzzle, ordinality)
    RETURNING id
)
SELECT EXISTS (SELECT 1 FROM inserted_game) AS inserted;

-- name: GetUnsolvedPuzzles :many
SELECT id, puzzle
FROM puzzles
WHERE user_id = $1 AND status <> 'solved'
ORDER BY created_at, id;

-- name: IsGameAnalyzed :one
SELECT EXISTS (
    SELECT 1 FROM analyzed_games WHERE user_id = $1 AND game_uuid = $2
);

-- name: GetAnalyzedGameUUIDs :many
SELECT game_uuid
FROM analyzed_games
WHERE user_id = $1
ORDER BY analyzed_at DESC, game_uuid;

-- name: GetPuzzleForAttempt :one
SELECT puzzle
FROM puzzles
WHERE id = $1 AND user_id = $2;

-- name: MarkPuzzleSolved :execrows
UPDATE puzzles
SET status = 'solved', solved_at = COALESCE(solved_at, now())
WHERE id = $1 AND user_id = $2 AND status <> 'solved';

-- name: Getpuzzles :many
SELECT id, game_uuid, user_id, puzzle, status, comment, created_at, solved_at, source_game_uuid, puzzle_index
FROM puzzles
WHERE user_id = $1;

-- name: GetPuzzleStats :one
SELECT 
    COUNT(*) FILTER (WHERE status = 'solved') AS solved,
    COUNT(*) FILTER (WHERE status <> 'solved') AS unsolved,
    COUNT(*) AS total
FROM puzzles
WHERE user_id = $1;
