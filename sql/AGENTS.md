# SQL Guidelines

These instructions apply to `sql/` and supplement the repository root guidance.

## Migrations

- Migrations use Goose annotations and must include both `-- +goose Up` and a viable `-- +goose Down` path.
- Prefer a new sequential migration for a schema change that may already have been applied. Modify an existing migration only when the user establishes that it is still disposable and unapplied.
- Preserve existing data deliberately. Call out destructive or lossy transformations before executing them.
- Add indexes and constraints based on the actual access pattern and integrity requirement, not speculatively.

## Queries and Generation

- sqlc query declarations use `-- name: MethodName :one|:many|:exec|:execrows`.
- Keep SQL result shapes intentional; avoid `SELECT *` when a stable explicit projection materially protects the API from schema growth.
- After changing migrations or queries, run `sqlc generate` from the repository root.
- Do not repair generation failures by editing `internal/db` output.

## Validation

Run `sqlc generate` and `go test ./...`. When PostgreSQL is available, apply migrations to a disposable database and exercise affected queries. Do not run destructive migration commands against an unidentified or non-disposable database.
