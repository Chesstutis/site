-- name: CreateUser :one

-- name: UpdateUser :one

-- name: DeleteUser :one

-- name: GetUser :one
SELECT * FROM users
WHERE id = $1;