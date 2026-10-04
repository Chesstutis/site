# Frontend Guidelines

These instructions apply to `frontend/` and supplement the repository root guidance.

## Structure and Boundaries

- Keep route-level screens in `src/pages/`, shared application components in `src/components/`, and shadcn primitives in `src/components/ui/`.
- Keep HTTP calls in `src/api/`, API payload shapes in `src/types/`, and reusable non-UI behavior in `src/lib/`.
- Reuse the existing `AuthProvider` and `useAuth` interface for session-aware UI instead of reading authentication storage throughout the component tree.
- Keep React Router paths in `src/App.tsx` aligned with the Go server's SPA fallback behavior in `main.go`.

## UI and API Behavior

- Preserve the established Tailwind and shadcn visual language unless the task calls for a redesign.
- Provide explicit loading, empty, error, and disabled states when a flow can reach them.
- Check `Response.ok` before consuming a success payload. Preserve useful server error text where the API provides it.
- Update the matching type and API client whenever a backend JSON contract changes.
- Do not add a second client-side data-fetching or state-management framework without a concrete need.

## Validation

For frontend changes, run:

```sh
npm run lint
npm run build
```

There is no frontend test runner. Manually verify the affected route or flow when a runnable backend is available. Because Vite has no `/api` proxy, backend-integrated flows should be checked through the combined application unless proxying is part of the task.
