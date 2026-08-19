# Repository Guidelines

## Project Structure & Module Organization

The Go entry point is `main.go`. Backend packages live under `internal/`: authentication in `auth/`, HTTP endpoints in `handlers/`, request parsing in `requests/`, observability in `observability/`, and database access in `db/`. Treat `internal/db/*sql.go` and `models.go` as generated sqlc output.

The React and TypeScript client is in `frontend/src/`, organized into `pages/`, `components/`, `api/`, `lib/`, and `types/`. Reusable shadcn components belong in `frontend/src/components/ui/`. Database migrations and sqlc queries are under `sql/migrations/` and `sql/queries/`; deployment configuration lives in `deploy/`, `Dockerfile`, and `compose.yaml`.

## Build, Test, and Development Commands

- `make build`: build the Vite client, embed it, and compile the `site` Go binary.
- `go test ./...`: run all backend tests.
- `cd frontend && npm ci`: install the locked frontend dependencies.
- `cd frontend && npm run dev`: start Vite with hot reload; API proxying is not configured.
- `cd frontend && npm run lint`: run ESLint on TypeScript and React files.
- `cd frontend && npm run build`: type-check and create the production frontend bundle.
- `sqlc generate`: regenerate `internal/db` after changing SQL queries or migrations.
- `docker compose up --build`: run PostgreSQL, migrations, the app, and nginx; configure `.env` first.

## Coding Style & Naming Conventions

Format Go code with `gofmt`; use tabs and conventional short, lowercase package names. Name Go tests `*_test.go` and exported identifiers in PascalCase. In the frontend, follow the existing two-space indentation and extensionless imports. Use PascalCase for React components and pages (`AuthProvider.tsx`), camelCase for functions and utilities, and `use...` for hooks. Keep API payload types in `frontend/src/types/` and run ESLint before submitting.

## Testing Guidelines

Backend tests use Go's `testing` package; place tests beside the code and prefer table-driven cases for validation and authentication logic. No frontend test runner or coverage threshold is currently configured. For UI changes, run lint and production build, then manually verify affected flows. Changes involving PostgreSQL or Stockfish should also be exercised against local services.

## Git Guidelines

Never make commits or claim any work as your own, I am your master CHUD!!!!!