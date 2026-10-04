---
name: change-database
description: Change the Chesstutis PostgreSQL schema, Goose migrations, sqlc queries, or generated database package.
---

# Change the Database

Read `docs/database.md`, `sql/AGENTS.md`, and `internal/db/AGENTS.md` before making database changes.

## Invariants

- Treat `sql/migrations/` and `sql/queries/` as the source of truth.
- Never hand-edit `internal/db/db.go`, `internal/db/models.go`, or `internal/db/*sql.go`.
- Do not execute destructive migration or database commands until the target is known to be disposable or the user explicitly authorizes that target.

## Workflow

1. Determine whether the task requires a schema migration, query-only change, or both.
2. For schema work, prefer a new sequential Goose migration when prior migrations may have been applied. Make the `Up` transition safe for existing data and provide an honest `Down` transition.
3. Update named sqlc queries with intentional result and cardinality annotations.
4. Run `sqlc generate` from the repository root and adapt Go callers to the generated API.
5. Review generated changes for consistency with the SQL sources; correct the sources rather than generated output.
6. Run `go test ./...`.
7. When a disposable PostgreSQL instance is available, apply the migration and exercise the affected query path. Report this check as skipped when the required service is unavailable.

Call out locking, backfill, compatibility, or data-loss implications when they materially affect rollout.
