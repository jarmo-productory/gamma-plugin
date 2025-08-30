# Audit: Database Connection & Supabase Setup (Next.js + Netlify)

Status: In Progress

Objective: Document how DB connections are set up today, assess security/robustness, and recommend improvements aligned with best practices for Next.js App Router, Netlify, and Supabase.

—

## AS-IS Architecture

- Client-side Supabase (browser)
  - File: `packages/web/src/utils/supabase/client.ts`
  - Uses `createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)` with `auth.flowType = 'pkce'`.
  - Intended for React client components (e.g., DevicePairing UI) to read auth session.

- Server-side Supabase (RSC/API)
  - File: `packages/web/src/utils/supabase/server.ts`
  - Uses `createServerClient(url, anonKey, { cookies: getAll/setAll })` to bind Next cookies.
  - Used by server components and API routes to check `supabase.auth.getUser()`.

- Middleware session refresh
  - File: `packages/web/src/utils/supabase/middleware.ts`
  - Creates a server client per request; refreshes session via `auth.getUser()`. Correct App Router pattern.

- Legacy helper and types
  - File: `packages/web/src/lib/supabase.ts`
  - Contains a legacy `createClient` and hand-rolled `Database` types. Code comments advise to use `/utils/supabase/*` instead, but types are still imported elsewhere (e.g. `utils/tokenStore.ts`).

- Admin (service-role) Supabase client
  - File: `packages/web/src/utils/tokenStore.ts`
  - Uses `createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` to manage `device_tokens` (insert/validate/cleanup) inside API routes.
  - Falls back to in-memory map if env is missing or DB calls fail.

- API routes using DB
  - Most API routes use `createClient()` from `utils/supabase/server.ts` to check the web session (cookies).
  - Device-token sensitive routes:
    - `/api/devices/exchange`: issues token and calls `storeToken(...)` (admin client) to insert into `device_tokens`.
    - `/api/user/profile`: validates `Authorization: Bearer` via `validateToken(...)` (admin client read first; fallback to memory).
    - `/api/user/devices`: currently reads from in-memory `globalThis.deviceTokens` (not DB).

- Migrations
  - SQL exists for `device_tokens` under `supabase/migrations/...sql` with RLS policies and indexes.
  - Whether it’s applied depends on your Supabase project; not automatically applied by the app.

- Environment management
  - `.env.local/.env` include `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
  - Netlify config uses `@netlify/plugin-nextjs`; secrets must be configured in Netlify UI.

—

## Findings

1) Split client factories (plus legacy)
- There are three paths: browser client, server client, and a legacy helper. This invites accidental misuse and type drift.

2) Service-role usage is correct but fragile
- `SUPABASE_SERVICE_ROLE_KEY` is accessed only from server-side utility `tokenStore.ts`, which API routes import. Good. However, if any client-side import path ever references it, bundlers could accidentally leak envs.

3) Inconsistent auth boundaries
- Some routes require Supabase cookie session (web), others accept device tokens (extension). This is intentional, but the code lacks a clear, shared “auth gate” utility to standardize how a route authenticates (cookie vs device token).

4) Device list still uses memory
- `/api/user/devices` reads `globalThis.deviceTokens` instead of DB. This leads to empty lists after server restarts and doesn’t reflect DB state.

5) Migrations not auto-applied
- The app depends on `device_tokens` but doesn’t apply migrations on deploy. If the table isn’t created in the target project, token writes silently fall back to memory.

6) Types drift
- `packages/web/src/lib/supabase.ts` types don’t reflect actual schema used in API routes (e.g., `presentations` fields). Token store imports `Database` from here, risking incorrect typing.

7) Runtime targeting
- Service-role operations must run in Node.js runtime, not Edge. Route handlers don’t declare `export const runtime = 'nodejs'`; Netlify plugin typically sets Node, but being explicit avoids accidental Edge deployment.

8) Logging leakage risk
- Some logs print user emails and token prefixes in server logs. Helpful in dev; in prod consider structured logs with redaction.

—

## Recommendations (Best Practices)

A) Centralize clients & auth gates
- Create a small `db/clients.ts`:
  - `getBrowserClient()` (wrapper around current browser client)
  - `getServerClient(cookiesCtx)` (wrapper around server client)
  - `getAdminClient()` (service-role; Node-only) — only export to server code
- Create `auth/guards.ts`:
  - `requireWebUser(request)` → returns user or throws 401
  - `requireDeviceToken(request)` → validates Bearer token via DB and returns tokenData or 401
  - Routes import these guards for consistent authentication logic.

B) Protect service-role usage
- Ensure `getAdminClient()` lives in a file that can’t be imported by client bundles (e.g., inside `src/server/*`).
- Add lint rule or comment banner to prevent importing admin client from client components.
- Be explicit in routes requiring Node runtime: `export const runtime = 'nodejs'`.

C) Apply migrations in CI/CD
- Add a documented step (or manual checklist) to apply SQL in `supabase/migrations` to the target Supabase project.
- Optionally integrate `supabase db push` as a protected CI job for non-prod.

D) Replace in-memory device list
- Update `/api/user/devices` to use DB helpers (`getUserDeviceTokens`) instead of `globalThis.deviceTokens`.
- For revocation, call `revokeDeviceToken` (DB delete) and return updated list.

E) Unify types
- Generate Supabase types (e.g., `npx supabase gen types typescript --project-id ...`) and place in a shared `@types/supabase` module.
- Remove or limit `packages/web/src/lib/supabase.ts` to re-export generated types only.

F) Configuration hygiene
- Document which env vars must be set in each environment (dev, preview, prod).
- For Netlify, verify all secrets are added (URL, ANON, SERVICE_ROLE). Consider environment-specific sites or contexts.

G) Observability & errors
- Wrap admin DB operations with clear error logging and status codes (don’t silently fall back to memory without a warning in non-dev).
- Add a `/api/debug/tokens` endpoint that reports whether DB or memory is used (already exists — ensure it reflects reality and isn’t deployed to prod or guard it behind admin).

H) Security posture
- Keep service-role key server-only. Never embed it in client bundles or Edge middleware. Avoid importing admin utilities from any file used client-side.
- Enforce RLS where appropriate; if using service-role inserts, you bypass RLS, so complement with explicit checks (e.g., ensure `user_id` from device token maps to a valid user).

—

## Suggested Implementation Plan

1) Create `src/server/db/clients.ts` and `src/server/auth/guards.ts` (server-only modules). Migrate API routes to use them.
2) Add `export const runtime = 'nodejs'` to routes that call admin client (token store ops).
3) Update `/api/user/devices` to use DB helpers. Remove memory fallback in production.
4) Generate Supabase types; replace hand-written types. Update imports.
5) Add a deployment checklist (documents/core/technical) to apply migrations before enabling token-backed auth.
6) Improve logs: use structured logging with userId (hash) instead of raw email; never log full tokens.

—

## Verification Checklist

- Pair device → row appears in `device_tokens`.
- GET `/api/user/profile` with Bearer token validates against DB.
- `/api/user/devices` lists DB tokens and supports revocation.
- No client bundle includes `SUPABASE_SERVICE_ROLE_KEY` (inspect build output).
- Route handlers that use admin client run in Node runtime.
- Supabase types compile and match queries.

