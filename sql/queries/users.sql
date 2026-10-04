-- name: CreateUser :one
INSERT INTO users (email, password_hash, chess_com_username)
VALUES (
    $1,
    $2,
    $3
)
RETURNING *;

-- name: ChangeChessComUsername :one
UPDATE users 
    SET chess_com_username = $1,
        updated_at = NOW()
    WHERE id = $2
RETURNING *;

-- name: ChangePassword :one
WITH updated_user AS (
    UPDATE users
    SET
        password_hash = $1,
        updated_at = NOW()
    WHERE id = $2
    RETURNING *
), revoked_tokens AS (
    UPDATE refresh_tokens
    SET
        revoked_at = COALESCE(revoked_at, NOW()),
        updated_at = NOW()
    WHERE user_id = $2
)
SELECT * FROM updated_user;

-- name: DeleteUser :one
DELETE FROM users
WHERE id = $1
RETURNING *;

-- name: GetUserById :one
SELECT * FROM users
WHERE id = $1;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = $1;

-- name: CreateRefreshToken :one
INSERT into refresh_tokens (token_hash, user_id, expires_at)
VALUES (
    $1,
    $2,
    $3
)
RETURNING *;

-- name: GetRefreshToken :one
SELECT * FROM refresh_tokens
WHERE token_hash = $1;

-- name: RevokeRefreshToken :execrows
UPDATE refresh_tokens
SET 
    revoked_at = NOW(),
    updated_at = NOW()
WHERE token_hash = $1
AND revoked_at IS NULL;

-- name: RotateRefreshToken :one
WITH current_token AS (
    UPDATE refresh_tokens AS tokens
    SET
        revoked_at = NOW(),
        updated_at = NOW()
    WHERE tokens.token_hash = sqlc.arg(current_token_hash)
      AND tokens.revoked_at IS NULL
      AND tokens.expires_at > NOW()
    RETURNING tokens.user_id, tokens.family_id
)
INSERT INTO refresh_tokens (token_hash, user_id, expires_at, family_id)
SELECT
    sqlc.arg(new_token_hash),
    user_id,
    sqlc.arg(new_expires_at),
    family_id
FROM current_token
RETURNING *;

-- name: RevokeRefreshTokenFamily :execrows
UPDATE refresh_tokens AS tokens
SET
    revoked_at = COALESCE(revoked_at, NOW()),
    updated_at = NOW()
WHERE tokens.family_id = (
    SELECT candidate.family_id
    FROM refresh_tokens AS candidate
    WHERE candidate.token_hash = $1
);
