---
name: change-authentication
description: Change Chesstutis authentication, authorization, passwords, access or refresh tokens, sessions, or account-security behavior.
---

# Change Authentication or Account Security

Read `docs/authentication.md`, `internal/AGENTS.md`, and `frontend/AGENTS.md` when client session behavior is involved. Use the database workflow too when token or account persistence changes.

## Security Invariants

- Derive the authenticated user from validated request context for protected resources.
- Keep accepted JWT algorithms, issuer, expiration, and subject validation explicit.
- Store password hashes and refresh-token hashes, never plaintext credentials or raw refresh tokens.
- Do not expose account existence, stored hashes, token internals, secrets, or dependency errors in client responses or logs.
- Treat beta Basic authentication and application account authentication as separate layers.

## Workflow

1. Trace the complete flow across route registration, middleware, handler, crypto/token helpers, database queries, frontend API calls, `AuthProvider`, and browser storage.
2. Define failure behavior for missing, malformed, expired, revoked, replayed, or unauthorized credentials as applicable to the request.
3. Preserve ownership checks and invalidate or rotate credentials deliberately when password, account, or refresh-token state changes.
4. Add focused tests for the success path and relevant authentication/authorization failures. Use test-only secrets and tokens.
5. Run `go test ./...`; when frontend behavior changes, also run `npm run lint` and `npm run build` in `frontend/`.

Do not redesign token transport, storage, or lifetime as an incidental cleanup. When the requested behavior changes a trust boundary, state the security tradeoff explicitly.
