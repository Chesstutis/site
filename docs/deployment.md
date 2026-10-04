# Deployment and Runtime Configuration

## Container Build

The Dockerfile uses three stages:

1. Node builds `frontend/dist` from the locked npm dependencies.
2. Go builds the application with the frontend output embedded and installs a pinned Goose binary.
3. Debian provides the non-root runtime, CA certificates, Stockfish, the application binary, and Goose.

The final application runs as the system user `app` and expects Stockfish at `/usr/games/stockfish` in the container.

## Compose Topology

`compose.yaml` defines:

- `db`: PostgreSQL with a persistent named volume and health check.
- `migrate`: a one-shot application image that runs Goose after PostgreSQL is healthy.
- `app`: the Go service, started only after migrations succeed.
- `nginx`: the public HTTP/TLS proxy.

The database and application communicate over an internal backend network. nginx shares a separate frontend network with the application.

## nginx and TLS

`deploy/nginx.conf` redirects ordinary HTTP traffic to HTTPS while serving ACME HTTP-01 challenges. The HTTPS server uses certificates mounted from `/etc/letsencrypt`, applies baseline response-security headers, and proxies requests to the application.

The configured hostname and certificate paths are production-specific. Changes to domains, ACME handling, TLS, request-size limits, or proxy timeouts should be reviewed together with Compose mounts and application timeouts.

## Configuration

Local configuration starts from `.env.template`. Required application values include server address and port, Stockfish path, database URL, JWT secret, and beta credentials. Compose derives its PostgreSQL connection string from `POSTGRES_*` values and requires application secrets from `.env`.

Never add populated `.env` files, certificates, private keys, or real credentials to the repository.

## Safe Validation

- Use `docker compose config` to validate interpolation and structure.
- Use `docker compose build app` to validate the production image when network and build dependencies are available.
- Use the full stack only with explicit local/test configuration.
- Do not operate production hosts, certificates, DNS, volumes, or databases unless the task explicitly authorizes that environment.
