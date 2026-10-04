# Architecture

## Runtime Shape

Chesstutis is deployed as one Go application behind nginx with PostgreSQL as its durable store. The Go binary embeds the Vite production output and serves both the JSON API and the React single-page application.

```text
Browser
  |-- static pages and assets ----------> Go embedded frontend
  |-- /api requests --------------------> Chi router and handlers
                                              |-- auth helpers
                                              |-- sqlc queries --> PostgreSQL
                                              `-- analyzer -----> Stockfish

Internet --> nginx TLS proxy --> Go application
                                PostgreSQL (internal network)
```

## Backend Boundaries

`main.go` constructs external resources, configures middleware, registers routes, and serves embedded frontend files. Request behavior belongs in `internal/handlers`; authentication primitives and middleware belong in `internal/auth`; payload parsing belongs in `internal/requests`; persistence belongs in `internal/db` and is generated primarily from `sql/`.

The chess-analysis path accepts Chess.com game PGNs, parses them with `github.com/corentings/chess/v2`, analyzes the player's positions through `github.com/chesstutis/analyzer`, and returns puzzle positions and moves. Stockfish is an external process configured by `STOCKFISH_PATH`.

## Frontend Boundaries

`frontend/src/App.tsx` owns client routing. Pages compose application components, `src/api/` owns HTTP calls, `src/types/` mirrors payload contracts, and `AuthProvider` owns browser session state.

The Vite development server does not proxy `/api`. Production and combined local builds work because the Go service serves both the frontend and API from one origin.

## Cross-Boundary Changes

An endpoint change may require coordinated updates to:

1. Request or response types in Go.
2. Handler behavior and route registration.
3. SQL queries and generated code when persistence changes.
4. Frontend API functions and TypeScript payload types.
5. Backend tests plus frontend lint/build validation.

A new client route must also remain reachable through the server-side SPA fallback on direct navigation.
