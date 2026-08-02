-- name: AddPuzzle :one
-- INSERT INTO puzzles

-- name: UpdatePuzzle :one

-- name: Getpuzzles :many
SELECT * FROM puzzles 
WHERE user_id = $1;