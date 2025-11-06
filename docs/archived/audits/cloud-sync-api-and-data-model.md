# Audit: Cloud Sync API & Data Model

Status: In Progress

Summary: The extension’s cloud sync layer and the web API/data model have drifted. The client calls routes that don’t exist and sends payloads that don’t match server expectations. Authentication is also inconsistent: the client authorizes with a device token, while the server requires a Supabase session. Resolve by aligning endpoints, payloads, and auth strategy, and by updating type definitions to match the database schema.

—

## Scope & Context

- Client sync code: `packages/shared/storage/index.ts`
  - `syncToCloud`, `syncFromCloud`, `syncPresentationsList`, `autoSyncIfAuthenticated`
- Server API: `packages/web/src/app/api/presentations/*`
  - `save`, `list`, `[id]` routes
- Auth boundary: device token-based auth (extension) vs Supabase cookie-based auth (web)
- Types: `packages/web/src/lib/supabase.ts` vs actual DB schema

—

## Current Contract Map (Client → Server)

- Save
  - Client: POST `/api/presentations/save` with Authorization: Bearer device_token
  - Body shape (client): `{ presentationUrl, title, timetableData: { title, items[], startTime, totalDuration, lastModified } }`
  - Server expects: `{ title, gamma_url, start_time, total_duration, timetable_data }` and Supabase user via cookies

- Get by URL
  - Client: GET `/api/presentations/get?url=...` with Authorization: Bearer device_token
  - Server: No route implemented (only `[id]`, `list`, `save`)

- List
  - Client: GET `/api/presentations/list` with Authorization: Bearer device_token (+ limit/offset/sortBy)
  - Server: Requires Supabase user via cookies; no device token support

—

## Key Findings

1) Endpoint mismatch (blocking)
- Client calls `/api/presentations/get?url=`; server has no such endpoint. Fetch-from-cloud cannot work.

2) Payload mismatch on save
- Client sends `presentationUrl` and nested `timetableData`; server expects `gamma_url`, `start_time`, `total_duration`, and `timetable_data` at the top level.

3) Auth strategy conflict
- Client authorizes with extension device tokens (Bearer); server requires a Supabase-authenticated web user (`supabase.auth.getUser()`). Extension calls will be 401.

4) DB types drift
- `packages/web/src/lib/supabase.ts` defines `presentations` with `{ title, content }`, but API uses `{ gamma_url, start_time, total_duration, timetable_data }` and joins `users.clerk_id`. Types are out-of-date and misleading.

5) Identity mapping ambiguity
- `save` looks up `users` by `clerk_id = user.id` (Supabase user id). This suggests legacy Clerk integration. Confirm actual identity source and ensure consistent mapping from device token → user id → RLS policy.

—

## Impact

- Cloud sync cannot function from the extension (missing endpoint + auth conflict), causing silent failures or retries.
- Even if save occasionally works (manually authenticated browser), list/get will fail without web cookies.
- Type drift increases risk of bugs when modifying API or DB.

—

## Recommendations

Short-term (unblock extension sync):
- Add device-token-aware endpoints or extend existing ones to accept device tokens.
  - Option A (preferred): Introduce `/api/extension/presentations/*` that authorizes via device token using `validateToken()` (tokenStore) and acts on behalf of the user.
  - Option B: Modify `/api/presentations/*` routes to accept either Supabase session (web) or device token (extension), branching logic at the top of each route.
- Implement GET by URL endpoint (either `/api/extension/presentations/get?url=` or enhance `/api/presentations/[id]` with URL lookup).
- Normalize server save to accept either shape:
  - Accept `presentationUrl` or `gamma_url` (map to canonical `gamma_url`).
  - Accept `timetableData` object (map to canonical `timetable_data`, `start_time`, `total_duration`).
- Use service-role Supabase client inside server routes when authorizing via device token to perform DB ops under RLS or with explicit checks:
  - Derive `userId` from `validateToken(token)`.
  - Query/update records constrained to `user_id = token.userId`.
  - Do not rely on web cookies in extension routes.

Medium-term (stabilize model):
- Consolidate presentations schema and types: generate Supabase types and replace `packages/web/src/lib/supabase.ts` with generated types to reflect `gamma_url`, `timetable_data`, etc.
- Define a consistent user identity mapping: decide if `user.id` is Supabase UUID or Clerk ID; ensure the `users` table and code use the same field (e.g., `supabase_user_id`), and update queries.
- Add input validation and rate limiting on extension endpoints.

—

## Proposed API Adjustments (concrete)

1) POST `/api/extension/presentations/save`
- Auth: `Authorization: Bearer <device_token>`; validate via `validateToken()`.
- Request accepts either:
  - `{ presentationUrl, title, timetableData: { title, items[], startTime, totalDuration, lastModified } }`
  - or the canonical fields `{ gamma_url, title, start_time, total_duration, timetable_data }`
- Behavior: Upsert by `(user_id, gamma_url)`; return `{ success, presentation: { id, title, presentationUrl, startTime, totalDuration, slideCount, timetableData, createdAt, updatedAt } }`.

2) GET `/api/extension/presentations/get?url=...`
- Auth: Bearer device token (validate). Lookup by `(user_id, gamma_url)`; 404 if not found.
- Response: `{ success, timetableData }` (or full normalized presentation payload).

3) GET `/api/extension/presentations/list?limit=&offset=&sortBy=`
- Auth: Bearer device token (validate). Return only records for `user_id` from token.
- Response: `{ success, presentations: [ { id, title, presentationUrl, ... } ], count }`.

Note: Instead of `/api/extension/*`, you may extend existing `/api/presentations/*` with dual auth (Supabase or device token). Keep routes cohesive and clearly document the dual-mode behavior.

—

## Client Changes (minimal)

- Keep `packages/shared/storage/index.ts` behavior; with new extension endpoints, only the base path needs adjustment if you choose a different prefix. If extending existing routes, no client changes are needed except possibly response parsing (ensure `.timetableData` shape matches).
- If keeping `/api/presentations/*`, implement `/api/presentations/get` route expected by `syncFromCloud`.

—

## Verification Plan

- Unit tests (server):
  - Validate device token auth pathway (valid, expired, missing, malformed token).
  - Save: accept both payload shapes; upsert correctness; returns normalized shape.
  - Get by URL: 200/404 paths; ownership enforcement.
  - List: pagination, sorting; ownership enforcement.

- Integration/E2E (extension):
  - End-to-end: register/link/exchange → save via sidebar → fetch via syncFromCloud → list presentations.
  - Negative: invalid token → 401; URL not found → 404; rate-limit paths.

- Types & schema:
  - Generate Supabase types; update imports; ensure API route code type-checks against actual schema.

—

## Open Questions

- Identity: Is `users.clerk_id` still authoritative? If not, rename to `supabase_user_id` (or similar) and adjust code/DB.
- Persistence: Is service-role access available in the deployed environment for device-token-backed routes? If not, consider a proxy service or a constrained RPC.

—

## Next Steps

1) Decide between new `/api/extension/*` routes or dual-mode `/api/presentations/*`.
2) Implement GET-by-URL and device-token auth path.
3) Update/save route to accept both payload shapes; adjust types.
4) Add tests and run E2E from the extension.
