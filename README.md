![Go Version](https://img.shields.io/badge/go-1.26-00ADD8?logo=go)
[![Tests](https://github.com/chesstutis/site/actions/workflows/test.yml/badge.svg)](
https://github.com/chesstutis/site/actions/workflows/test.yml)
[![codecov](https://codecov.io/github/chesstutis/site/graph/badge.svg)](
https://codecov.io/github/chesstutis/site)
# Chesstutis

Chesstutis turns mistakes from a player's recent Chess.com games into personalized chess puzzles. It fetches game data from Chess.com, analyzes positions with Stockfish, and presents missed opportunities as interactive training exercises.

## Project overview

The application is a single Go service with an embedded React frontend:

- **Backend:** Go, Chi, PostgreSQL, pgx, and sqlc
- **Chess analysis:** Stockfish through the UCI protocol and `github.com/chesstutis/analyzer`
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, and shadcn/ui
- **Authentication:** Email/password accounts with JWT bearer tokens

The Go server exposes authentication and analysis endpoints under `/api`, serves the compiled frontend, and handles client-side routes. The frontend retrieves a user's recent public games from Chess.com and sends them to the authenticated analysis endpoint.

## Repository layout

```text
.
├── frontend/             React and TypeScript application
├── internal/
│   ├── auth/             Password and JWT authentication
│   ├── db/               Database pool and sqlc-generated code
│   ├── handlers/         HTTP handlers
│   ├── observability/    Metrics and profiling configuration
│   └── requests/         Request parsing and validation
├── sql/
│   ├── migrations/       PostgreSQL schema migrations
│   └── queries/          Queries used by sqlc
├── main.go               Server setup, routes, and frontend embedding
├── makefile              Combined frontend/backend build
└── sqlc.yml              sqlc configuration
```

## Contributor setup

### Prerequisites

Install the following tools:

- Go 1.26.2 or the version declared in `go.mod`
- Node.js and npm
- PostgreSQL
- Stockfish
- GNU Make
- [Goose](https://github.com/pressly/goose) for database migrations
- [sqlc](https://sqlc.dev/) if you plan to change database queries or the schema

### 1. Clone the repository

```sh
git clone https://github.com/chesstutis/site.git
cd site
```

### 2. Configure the environment

Copy the provided template:

```sh
cp .env.template .env
```

Set every value in `.env` for your machine:

```dotenv
SERVER_ADDR=127.0.0.1
SERVER_PORT=8080
STOCKFISH_PATH=/absolute/path/to/stockfish
DATABASE_URL=postgres://postgres:postgres@localhost:5432/chesstutis?sslmode=disable
GOOSE_DRIVER=postgres
GOOSE_DBSTRING=postgres://postgres:postgres@localhost:5432/chesstutis?sslmode=disable
GOOSE_MIGRATION_DIR=sql/migrations
JWT_SECRET=replace-with-a-long-random-secret
```

The server loads `.env` automatically. Do not commit it; it contains database credentials and the JWT signing secret. You can generate a development secret with `openssl rand -hex 64`.

`STOCKFISH_PATH` must point to the Stockfish executable rather than its containing directory.

### 3. Create and migrate the database

Create the PostgreSQL database using your preferred PostgreSQL client. For a typical local installation:

```sh
createdb chesstutis
goose up
```

The Goose command reads the `GOOSE_*` values from `.env`.

### 4. Install dependencies and build

Install the frontend packages, then build the complete application:

```sh
cd frontend
npm ci
cd ..
make build
```

`make build` compiles the Vite frontend and embeds `frontend/dist` into the `site` Go binary.

### 5. Run the application

```sh
./site
```

Open `http://127.0.0.1:8080`, or the address configured with `SERVER_ADDR` and `SERVER_PORT`.

## Development workflow

For the combined application, rebuild and run the server after making changes:

```sh
make build
./site
```

For frontend-only work with Vite's hot reload:

```sh
cd frontend
npm run dev
```

The Vite development server does not currently proxy `/api`. Features that call the backend should therefore be tested through the combined Go build unless a local proxy is added.

When changing files in `sql/queries` or `sql/migrations`, regenerate the database package from the repository root:

```sh
sqlc generate
```

Commit the resulting changes under `internal/db` with the SQL changes that produced them.

## Checks before submitting a change

Run the backend tests:

```sh
go test ./...
```

Lint and build the frontend:

```sh
cd frontend
npm run lint
npm run build
```

Finally, run `make build` from the repository root to confirm the frontend can be embedded in the production binary.

## Contributing

Keep pull requests focused and include tests for behavior changes where practical. Before opening a pull request:

1. Run the backend and frontend checks above.
2. Regenerate sqlc output if SQL changed.
3. Verify the relevant flow against a local PostgreSQL database and Stockfish installation.
4. Describe the user-visible behavior and any database or environment changes in the pull request.

