-- -- name: CreateUser :one
INSERT INTO users (email, password_hash, chess_com_username)
VALUES (
    
)


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