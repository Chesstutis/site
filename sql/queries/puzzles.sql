-- name: AddPuzzle :one
-- INSERT INTO puzzles

-- name: UpdatePuzzle :one

-- name: Getpuzzles :many
SELECT * FROM puzzles 
WHERE user_id = $1;

-- name: GetPuzzleStats :one
SELECT 
    COUNT(*) FILTER (WHERE status = 'solved') AS solved,
    COUNT(*) FILTER (WHERE status <> 'solved') AS unsolved,
    COUNT(*) AS total
FROM puzzles
WHERE user_id = $1;
