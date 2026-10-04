# Database and SQL Generation

## Source of Truth

PostgreSQL schema history lives in `sql/migrations/`, and named queries live in `sql/queries/`. `sqlc.yml` reads both directories and generates the Go `db` package under `internal/db` using pgx/v5.

Generated files include:

- `internal/db/db.go`
- `internal/db/models.go`
- `internal/db/*sql.go`

Do not edit these files directly. `internal/db/pool.go` is handwritten.

## Current Data Model

- `users`: application identity, password hash, Chess.com username, and timestamps.
- `puzzles`: user-owned JSON puzzle records with solve status and timestamps.
- `chess_com_rating_snapshots`: time-series Chess.com ratings by time control.
- `refresh_tokens`: hashed opaque refresh tokens with expiry and revocation timestamps.

User-owned tables reference `users(id)` with cascading deletion.

## Change Workflow

1. Add a new numbered Goose migration when persistent schema changes.
2. Update or add named sqlc queries.
3. Run `sqlc generate` from the repository root.
4. Adapt callers to the generated method and model shapes.
5. Run `go test ./...`.
6. When PostgreSQL is available, apply and reverse the migration on a disposable database and exercise the changed query path.

Do not run destructive migration commands until the database target is identified as disposable or the user explicitly authorizes the operation.

## Compatibility

Prefer migrations that allow a safe application transition. For constraints on existing data, account for backfill and validation. For destructive changes, document data-loss and rollback implications rather than assuming Goose `Down` makes the operation lossless.
