-- name: GetInitialRatingSnapshot :one
SELECT
    id,
    user_id,
    captured_at,
    bullet_rating,
    blitz_rating,
    rapid_rating,
    daily_rating,
    chess_com_username,
    chess_com_player_id
FROM chess_com_rating_snapshots
WHERE user_id = $1
ORDER BY captured_at, id
LIMIT 1;
