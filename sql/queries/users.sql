-- name: CreateUser :one
INSERT INTO users (email, password_hash, chess_com_username)
VALUES (
    $1,
    $2,
    $3
)
RETURNING *;

-- -- name: UpdateUser :one

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

-- name: CreateEmailVerificationToken :one
INSERT INTO email_verification_tokens (token_hash, user_id, expires_at)
VALUES (
    $1,
    $2,
    $3
)
RETURNING *;

-- name: GetEmailVerificationToken :one
SELECT * FROM email_verification_tokens
WHERE token_hash = $1;

-- name: DeleteEmailVerificationToken :exec
DELETE FROM email_verification_tokens
WHERE token_hash = $1;

-- name: DeleteEmailVerificationTokensForUser :exec
DELETE FROM email_verification_tokens
WHERE user_id = $1;

-- name: MarkUserEmailVerified :exec
UPDATE users
SET
    email_verified_at = NOW(),
    updated_at = NOW()
WHERE id = $1;
