# Audit: Resilience & State Persistence

Status: Draft (placeholder)

- Objective: Ensure auth and sync flows survive restarts and scale.
- Primary areas:
  - In-memory stores: `globalThis.deviceRegistrations`, `globalThis.deviceTokens`
  - Token lifecycle: `packages/web/src/app/api/devices/*`, `/api/user/profile`
  - Client retry/cleanup: `packages/extension/shared-auth/index.ts`, `packages/shared/storage/index.ts`

Sections to complete:
- Scope & context
- Failure modes (restarts, multi-instance, network flakiness)
- Token invalidation vs transient errors
- Persistence options (Redis/DB), cleanup policies
- Recommendations & phased fixes
- Verification plan (chaos tests, e2e scenarios)

