---
name: add-api-endpoint
description: Add or materially change a Chesstutis Go HTTP endpoint and its frontend-facing contract.
---

# Add or Change an API Endpoint

Use this workflow for endpoint behavior, route registration, payload contracts, or status-code changes. Do not invoke it for an internal refactor that preserves the HTTP contract.

Read `docs/architecture.md` and the applicable `internal/AGENTS.md`. If identity, credentials, or tokens are involved, also read `docs/authentication.md` and use the authentication workflow guidance.

## Outcome

Deliver one coherent contract across routing, handler behavior, persistence, tests, and any frontend consumer that is in scope.

## Workflow

1. Inspect neighboring routes, handlers, request types, tests, frontend API calls, and TypeScript types before choosing the contract.
2. Decide whether the route is public, beta-gated, or bearer-authenticated. Protected resources must derive their user identity from request context.
3. Keep request decoding, validation, status codes, response JSON, and error exposure consistent with nearby endpoints.
4. Put process wiring and route registration in `main.go`, HTTP behavior in `internal/handlers`, reusable request parsing in `internal/requests`, and persistence in sqlc queries.
5. Add focused endpoint tests with Go's `net/http/httptest` package so requests exercise the real HTTP handler and assertions cover status, headers, and response bodies. Cover success, malformed input, missing authentication where relevant, and meaningful dependency failures.
6. Update `frontend/src/api/` and `frontend/src/types/` when a frontend consumer or shared contract is part of the requested change.
7. Run affected Go tests and `go test ./...`. If frontend files changed, run `npm run lint` and `npm run build` in `frontend/`.

Do not add persistence, frontend UI, or a public route merely because an endpoint could use one; follow the requested scope.
