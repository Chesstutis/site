# Repository Guidelines

## Scope and Task Intent

Requests to implement, fix, add, update, refactor, or remove behavior authorize edits within the requested scope. Review, explanation, investigation, and planning requests are read-only unless the user also asks for changes.

Keep changes focused. Preserve unrelated user work and do not introduce adjacent features without a request.

## System Overview

Chesstutis is a single Go service that embeds a React application, uses PostgreSQL through pgx and sqlc, and analyzes Chess.com games with Stockfish.

- Read [docs/architecture.md](docs/architecture.md) when a change crosses frontend, API, analysis, or persistence boundaries.
- Read [docs/authentication.md](docs/authentication.md) for login, signup, JWT, refresh-token, account, or authorization work.
- Read [docs/database.md](docs/database.md) for schema, query, migration, or generated-model work.
- Read [docs/deployment.md](docs/deployment.md) for Docker, Compose, nginx, environment, TLS, or production-runtime work.

Do not require these documents for unrelated, localized changes.

## Directory-Specific Guidance

Read the closest directory guide before changing files in that area:

- [frontend/AGENTS.md](frontend/AGENTS.md): React, TypeScript, styling, client API calls, and frontend validation.
- [internal/AGENTS.md](internal/AGENTS.md): Go package boundaries, handlers, authentication, request parsing, and backend tests.
- [internal/db/AGENTS.md](internal/db/AGENTS.md): sqlc-generated versus handwritten database files.
- [sql/AGENTS.md](sql/AGENTS.md): Goose migrations, sqlc queries, and database validation.
- [deploy/AGENTS.md](deploy/AGENTS.md): nginx and deployment configuration.

## Repository Workflows

Repository skills under `.agents/skills/` contain conditional workflows. Use them when their trigger matches the task:

- `add-api-endpoint`: add or materially change a Go HTTP endpoint and its client contract.
- `change-database`: change PostgreSQL schema, migrations, sqlc queries, or generated database code.
- `change-frontend`: implement a user-facing React flow or materially change client state/API integration.
- `change-authentication`: change authentication, authorization, credentials, tokens, or account-security behavior.
- `change-deployment`: change Docker, Compose, nginx, TLS, environment, or runtime topology.

The user's instructions take precedence over workflow guidelines. Skills do not authorize deployment, production access, destructive database operations, or other external mutations.

## Project Structure

- `main.go`: process setup, middleware, routes, embedded frontend serving, and server configuration.
- `internal/auth/`: password, token, and authentication middleware.
- `internal/handlers/`: HTTP handlers and response behavior.
- `internal/requests/`: request payloads and parsing.
- `internal/db/`: database pool plus sqlc-generated package.
- `internal/observability/`: metrics and profiling configuration.
- `frontend/src/`: React application organized into `pages/`, `components/`, `api/`, `lib/`, and `types/`.
- `sql/migrations/` and `sql/queries/`: database source of truth.
- `deploy/`, `Dockerfile`, and `compose.yaml`: production packaging and routing.

## Commands

- `go test ./...`: run backend tests.
- `cd frontend && npm ci`: install locked frontend dependencies.
- `cd frontend && npm run lint`: lint React and TypeScript.
- `cd frontend && npm run build`: type-check and build the frontend.
- `make build`: build the frontend, embed it, and compile the Go binary.
- `sqlc generate`: regenerate `internal/db` after SQL source changes.
- `docker compose up --build`: run the local stack; configure `.env` first.

Use the narrowest checks that cover the change, then broaden validation when the change crosses subsystem boundaries. Local services may be unavailable; report skipped integration checks rather than fabricating results.

## Repository-Wide Invariants

- Never edit `internal/db/models.go`, `internal/db/db.go`, or `internal/db/*sql.go` by hand. Change `sql/` sources and run `sqlc generate`.
- Keep backend JSON contracts and corresponding `frontend/src/types/` and `frontend/src/api/` code synchronized.
- When adding a client-side route, ensure the Go SPA-serving configuration still serves it on direct navigation.
- Do not commit `.env`, credentials, JWT secrets, database URLs, certificates, or private keys.
- Format Go with `gofmt`. Follow existing two-space TypeScript/React formatting and extensionless imports.
- Place Go tests beside the code under test and prefer table-driven coverage for validation and authentication behavior.
- Reusable shadcn components belong in `frontend/src/components/ui/`.

## Git Boundaries

Do not commit, amend, rebase, merge, push, create branches, or modify Git history. Read-only Git inspection is permitted when useful.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
