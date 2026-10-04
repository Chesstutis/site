# Authentication and Account Security

## Authentication Layers

The private beta uses two separate authentication layers:

1. HTTP Basic authentication configured in `main.go` protects the frontend and the signup/login endpoints using `BETA_USERNAME` and `BETA_PASSWORD`.
2. Application accounts use email/password authentication and bearer access tokens for protected `/api` routes.

Do not conflate beta access credentials with application account credentials.

## Access Tokens

`internal/auth` hashes passwords with Argon2id and signs access tokens with HS256 using `JWT_SECRET`. Access-token validation requires the expected algorithm, the `chesstutis-access` issuer, an expiration, and a numeric user ID in the subject claim.

`auth.RequireAuth` parses the `Authorization: Bearer <token>` header and places the authenticated user ID in request context. Protected handlers must derive ownership from that context rather than trusting request-supplied user identifiers.

## Refresh Tokens

Refresh tokens are random opaque values. Only their SHA-256 hashes are stored in `refresh_tokens`; responses return the raw value to the client. Refresh and revocation behavior must continue to check expiry and revocation state consistently.

Changes to token transport, rotation, browser storage, or lifetimes are security-sensitive cross-layer changes. Review backend handlers, database queries, `AuthProvider`, frontend API calls, and logout behavior together.

## Browser Session

`frontend/src/components/AuthProvider.tsx` is the central client session owner. It persists the current session in local storage, clears invalid or expired sessions, exposes authentication operations, and synchronizes storage changes across tabs.

Keep frontend endpoint paths synchronized with the routes registered in `main.go`. Authentication errors should not reveal whether an account exists or expose database, token, or password-hashing details.

## Environment Secrets

`JWT_SECRET`, beta credentials, database credentials, and production certificate material must not enter source control, logs, fixtures derived from real values, or client bundles. Tests should use obvious test-only secrets.
