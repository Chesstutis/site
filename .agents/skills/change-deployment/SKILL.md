---
name: change-deployment
description: Change Chesstutis Docker, Compose, nginx, TLS, environment, or production runtime topology.
---

# Change Deployment Configuration

Read `docs/deployment.md` and `deploy/AGENTS.md`. Inspect `Dockerfile`, `compose.yaml`, `.env.template`, and `deploy/nginx.conf` selectively according to the requested change.

## Invariants

- Preserve non-root application execution and least-privilege network exposure unless the task requires a deliberate change.
- Do not embed credentials, populated environment files, certificates, private keys, or machine-specific secret paths.
- Editing configuration does not authorize starting services, changing certificates, or operating a production environment.

## Workflow

1. Trace the affected value or behavior through build stages, Compose interpolation, service dependencies, mounts, networks, nginx, and application configuration.
2. Keep PostgreSQL health, one-shot migration completion, application startup, and proxy readiness ordered explicitly.
3. Keep application and nginx request-size and timeout assumptions aligned.
4. Update `.env.template` and deployment documentation when configuration requirements change, using placeholders only.
5. Use `docker compose config` for structural validation when required environment values can be supplied safely.
6. Build the relevant image or run the local stack only when the task authorizes it and dependencies are available. State which runtime checks were not performed.

For potentially disruptive changes, explain rollout and rollback implications without performing deployment unless explicitly requested.
