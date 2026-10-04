# Backend Package Guidelines

These instructions apply to Go code under `internal/` and supplement the repository root guidance.

## Package Responsibilities

- `auth/` owns password hashing, access-token validation, refresh-token primitives, and authentication middleware.
- `handlers/` translates HTTP requests into domain/database operations and owns status codes and response payloads.
- `requests/` owns request payload types and reusable parsing or validation helpers.
- `db/` owns the pool wrapper and sqlc-generated database access.
- `observability/` owns metrics and profiling setup.

Keep routing and process wiring in `main.go`. Avoid moving HTTP concerns into the database package or persistence details into request parsing.

## HTTP and Authentication

- Treat user identity from `auth.UserIDFromContext` as the authenticated subject; do not accept a caller-supplied user ID for protected account data.
- Register protected routes inside the `auth.RequireAuth` group unless the route is intentionally public.
- Decode bounded request shapes, reject malformed input consistently, and avoid exposing internal database or cryptographic errors to clients.
- Log operational detail with the request ID where available while returning stable client-facing errors.
- Keep response JSON compatible with the frontend types and API functions.

## Tests and Formatting

- Format changed Go files with `gofmt`.
- Put tests beside their package. Prefer table-driven cases for validation, authentication, and error mapping.
- Test API endpoints with Go's `net/http/httptest` package so requests pass through real HTTP handlers and response status, headers, and bodies can be asserted.
- Use small fakes around the existing `db.DBTX` interface when handler behavior can be tested without PostgreSQL.
- Run the affected package tests, then `go test ./...` for changes that alter shared behavior.
