---
name: change-frontend
description: Implement a Chesstutis React flow or materially change frontend state, routing, styling, or API integration.
---

# Change the Frontend

Read `frontend/AGENTS.md`. Read `docs/architecture.md` when the change crosses the client/API boundary, adds a route, or changes shared behavior.

## Outcome

Deliver a complete user flow that fits the existing React, Tailwind, and shadcn application rather than an isolated mockup.

## Workflow

1. Inspect the affected page, shared components, API module, payload types, auth context, and neighboring UI patterns.
2. Keep route-level composition in `pages/`, reusable application UI in `components/`, shadcn primitives in `components/ui/`, HTTP behavior in `api/`, and payload types in `types/`.
3. Preserve the established design tokens and component language unless redesign is part of the request.
4. Implement relevant loading, empty, error, disabled, and success states. Make controls usable with keyboard navigation and preserve meaningful labels.
5. Centralize session behavior through `AuthProvider`; do not scatter direct authentication-storage access.
6. If a client route is added, confirm direct navigation is served by the Go SPA fallback. If an API contract changes, update Go and TypeScript surfaces together.
7. Run `npm run lint` and `npm run build` in `frontend/`. Manually verify the flow through the combined application when backend integration is involved and services are available.

Do not introduce a new UI framework, state library, or data-fetching framework unless the requested result demonstrates a need for it.
