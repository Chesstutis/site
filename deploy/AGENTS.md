# Deployment Configuration Guidelines

These instructions apply to `deploy/` and supplement the repository root guidance. Related changes to `Dockerfile` and `compose.yaml` should follow the same constraints.

## Runtime Model

- Compose starts PostgreSQL, applies Goose migrations, starts the application, and places nginx in front of it.
- The application container runs as a non-root `app` user and includes Stockfish plus the Goose binary.
- nginx terminates TLS, redirects HTTP to HTTPS, serves ACME challenges, and proxies application traffic.

## Change Boundaries

- Keep service dependencies and health conditions explicit; the application must not start before migrations complete successfully.
- Preserve least privilege, the internal backend network, and non-root runtime unless the task provides a reason to change them.
- Keep nginx request-size and timeout settings aligned with application behavior.
- Do not hard-code secrets, production credentials, certificate material, or machine-specific paths.
- Treat `docker compose up`, certificate operations, and production deployment as state-changing actions. Run them only when the user's request authorizes that scope and the target environment is clear.

## Validation

Use `docker compose config` for structural Compose validation when environment requirements can be satisfied safely. Build the relevant image or run the local stack only when dependencies and required secrets are available; otherwise report what remains unverified.
