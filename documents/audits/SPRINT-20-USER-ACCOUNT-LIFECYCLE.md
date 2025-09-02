# User Account Lifecycle Audit (Sprint 20)

This document audits the current authentication and user account creation flows, database schema, API endpoints, and client behavior. It also proposes a clean, unified lifecycle for user accounts based on the code and Supabase schema in this repository.

## Executive Summary

- The app has migrated from Clerk to Supabase Auth and now relies on `auth.users` for identity, with a first‑party `users` table keyed via `users.auth_id`.
- Account/Profile APIs attempt to lazily create the `users` row on first use, but behavior can diverge and return 500s if environment, RLS, or RPC permissions are misaligned.
- Device authentication for the Chrome extension uses a secure hashed token system via RPC. Service role is used only for administrative token storage/cleanup; validation runs with authenticated role via RPC.
- The Account page calls `/api/user/profile` and expects profile plus notification preferences. The current profile endpoint returns only base fields, while preferences are handled by a separate endpoint.
- Primary risks: missing/incorrect env vars, unapplied migrations, RLS policy mismatches, and inconsistent handling of “first login” between endpoints.

## Current Architecture

- Web authentication: Supabase Auth via SSR/PKCE
  - Server client: `packages/web/src/utils/supabase/server.ts:1`
  - Client: `packages/web/src/utils/supabase/client.ts:1`
  - Account page loads user server‑side: `packages/web/src/app/settings/account/page.tsx:1`

- Device auth (extension): Secure opaque device tokens with hashed storage and RPC validation
  - Token utilities: `packages/web/src/utils/secureTokenStore.ts:1`
  - RPCs + schema hardening: `supabase/migrations/20250831000001_secure_token_hashing.sql:1`

- Account UI and API
  - Account client UI: `packages/web/src/app/settings/account/AccountClient.tsx:1`
  - Profile API (GET/PUT): `packages/web/src/app/api/user/profile/route.ts:1`
  - Notifications API (GET/PUT): `packages/web/src/app/api/user/notifications/route.ts:1`

## Database Schema (Relevant)

- `users` (first‑party profile table)
  - Columns: `id (uuid PK), auth_id (uuid FK -> auth.users.id), email, name, created_at, updated_at, email_notifications (bool, default true), marketing_notifications (bool, default false)`
  - RLS: users can select/update where `auth.uid() = auth_id`
  - Migrations:
    - Initial: `supabase/migrations/20240718000001_initial_schema.sql:1`
    - Supabase auth migration: `supabase/migrations/20250831000004_migrate_auth_system.sql:1`
    - Remove Clerk refs: `supabase/migrations/20250831000005_remove_clerk_references.sql:1`
    - Add notifications: `supabase/migrations/20250831000002_add_user_notification_preferences.sql:1`
    - Add `name`: `supabase/migrations/20250831000003_add_user_name_column.sql:1`

- `presentations`
  - `user_id` references `users.id`; RLS ensures ownership via `auth_id` join.
  - RLS fix: `supabase/migrations/20250829210000_fix_presentations_rls_for_direct_auth.sql:1`

- `device_tokens` (opaque tokens, hashed)
  - Hashing + RPCs: `supabase/migrations/20250831000001_secure_token_hashing.sql:1`
  - Earlier policies updated to harden access.

## API Endpoints and Behavior

- `/api/user/profile`
  - GET
    - If `Authorization: Bearer <device-token>` is present, validates via `validateSecureToken()` RPC and returns minimal user data for extension.
    - Otherwise uses web session via Supabase SSR client and fetches/creates a row in `users` by `auth_id`.
    - Returns: `{ user: { id, email, name, created_at } }` (does not include notification prefs).
  - PUT
    - Auth via SSR session; updates or creates the `users` row by `auth_id` and sets `name`.

- `/api/user/notifications`
  - GET/PUT operate on `users.email_notifications` and `users.marketing_notifications`, creating the user row if missing.

- Test endpoint inventory: `packages/web/src/app/api/test-account-features/route.ts:73`

## Client Behavior

- Account page loads SSR user; client fetches `/api/user/profile` then sets:
  - `profile` (id, email, name, created_at)
  - `email_notifications` and `marketing_notifications` from response (falls back to defaults if missing)
  - Source: `packages/web/src/app/settings/account/AccountClient.tsx:62`, `:315`

## Observed Failures and Likely Root Causes

Screenshot shows 500s from GET `/api/user/profile`. Based on code and schema, failures are most likely from:

1) Environment/config mismatch
- Missing/incorrect `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` (breaks `createServerClient`).
- Incorrect cookie/session config (breaks `supabase.auth.getUser()` on server).
- Mitigation: verify `.env.local` values match `.env.example` and production project.

2) Migrations not applied to the database in use
- If the connected DB lacks `auth_id`, notification columns, or RPCs, profile queries and creations can fail.
- Mitigation: confirm the project points to the DB with the migrations in `supabase/migrations/` applied.

3) RLS/permissions divergence
- If RLS policies are missing/outdated, `SELECT` or `INSERT` on `users` can be blocked, surfacing as 500.
- Mitigation: verify the RLS policies from the latest migrations exist in the connected DB.

4) RPC permissions for device flow
- `validate_and_touch_token` must be executable by `authenticated` (already granted in migration). If revoked or not present, device token path returns 401/500.

5) Endpoint contract drift
- The Account client expects notification prefs possibly from the profile request; the current profile GET does not return them, causing extra fetches/defaults. Not the 500 root cause, but a UX inconsistency.

Notes on Supabase SDK behavior
- `single()` with 0 rows returns `PGRST116` (handled in code). Using `maybeSingle()` would avoid relying on error codes for the first‑login path.

## Proposed Unified User Lifecycle

State model
- Unauthenticated → Authenticated (Supabase session) → Profile Ensured (users row exists) → Profile Updated → Active User
- Extension device flow is orthogonal: Device Token Issued → Stored (hashed) → Validated via RPC → Linked Device

First login (web)
1. User authenticates (Supabase Auth) and is redirected into the app.
2. API helper `ensureUserRecord(authUser)` checks `users` by `auth_id`, using `maybeSingle()`.
3. If missing, insert `users` row with `auth_id`, `email`, `name` defaulting to email prefix, and default notification prefs.
4. Return unified profile DTO including preferences for UI.

Subsequent visits (web)
1. Session resolves via SSR client.
2. `users` row is read via RLS; profile + preferences returned.

Profile update (web)
1. PUT `/api/user/profile` validates and trims `name`, ensures user row exists, and updates `name`.
2. Return the updated unified profile DTO.

Notification preferences (web)
1. GET/PUT `/api/user/notifications` ensure user row exists and read/update prefs.
2. Consider merging these fields into profile GET to reduce round‑trips.

Device onboarding (extension)
1. Issue cryptographically secure opaque token via `generateSecureToken()`.
2. Store via `store_hashed_token()` RPC (service role only), which hashes and inserts token with expiry.
3. Validate device calls via `validate_and_touch_token()` RPC (authenticated role), which constant‑time compares hashes and updates `last_used`.
4. Devices listing/revocation via RPCs: `get_user_devices`, `revoke_device_token`.

Unified Profile DTO (recommended)
- Shape returned by profile GET/PUT to power Account screen without extra calls:
  - `id, email, name, created_at, email_notifications, marketing_notifications`

## Gaps and Fixes (Prioritized)

1) Ensure migrations are applied to the active database
- Verify the DB connected by `NEXT_PUBLIC_SUPABASE_URL` has all migrations:
  - `users.auth_id`, notifications columns, `name` column
  - Token RPCs and hardened RLS policies

2) Harden “first login” creation
- Replace `.single()` with `.maybeSingle()` and explicitly create the row when `data === null`.
- Encapsulate creation logic in a shared helper (e.g., `ensureUserRecord`).

3) Align profile API response with UI needs
- Include `email_notifications` and `marketing_notifications` in `/api/user/profile` GET/PUT response.

4) Validate environment configuration
- Required vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (for token storage/cleanup), `NEXT_PUBLIC_APP_URL`.
- Confirm cookie/session behavior in Next.js (PKCE + SSR) is consistent; `middleware` refresh is not required but recommended.

5) Guard device RPC permissions
- Confirm execute grants exist for `authenticated` (validate/list/revoke) and `service_role` (store/cleanup).

## Concrete Implementation Recommendations

- Profile GET (web path)
  - Query `users` by `auth_id` with `.maybeSingle()` and, if null, insert with defaults; then select `id, email, name, created_at, email_notifications, marketing_notifications` and return.

- Profile GET (device path)
  - Keep current secure RPC validation but consider returning the same DTO fields that make sense for devices, or keep minimal as is.

- Shared helper
  - Introduce `ensureUserRecord(supabase, authUser)` in a utils module to avoid duplication between profile and notifications endpoints.

## Validation Checklist

- Env
  - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set and correct
  - `SUPABASE_SERVICE_ROLE_KEY` set for server tasks (not used in user reads/writes)

- Schema
  - `users.auth_id` exists, is unique, and indexed (`idx_users_auth_id`)
  - `users.email_notifications` and `users.marketing_notifications` exist with defaults
  - RPCs present: `validate_and_touch_token`, `store_hashed_token`, `get_user_devices`, `revoke_device_token`, `cleanup_expired_tokens`

- RLS
  - `users` select/update/insert policies use `auth.uid() = auth_id`
  - `presentations` policies filter via `users.auth_id = auth.uid()`

- Permissions
  - RPC execute grants: `authenticated` and `service_role` per function

## Observability & Debugging Tips

- Add structured error logging in profile/notifications routes with Supabase error payload (`status`, `code`, `hint`).
- For “no row” situations, prefer `.maybeSingle()` to avoid handling `PGRST116`.
- If 500s persist, cURL the endpoints with `-v` to inspect headers and confirm cookies/session.

## Appendix: Key File References

- `packages/web/src/app/api/user/profile/route.ts:1`
- `packages/web/src/app/api/user/notifications/route.ts:1`
- `packages/web/src/app/settings/account/AccountClient.tsx:1`
- `packages/web/src/app/settings/account/page.tsx:1`
- `packages/web/src/utils/supabase/server.ts:1`
- `packages/web/src/utils/supabase/client.ts:1`
- `packages/web/src/utils/secureTokenStore.ts:1`
- `supabase/migrations/20250831000004_migrate_auth_system.sql:1`
- `supabase/migrations/20250831000005_remove_clerk_references.sql:1`
- `supabase/migrations/20250831000002_add_user_notification_preferences.sql:1`
- `supabase/migrations/20250831000003_add_user_name_column.sql:1`
- `supabase/migrations/20250831000001_secure_token_hashing.sql:1`

---

Status: Drafted from repository code and migrations as of this commit. If you want, I can implement the small profile API alignment (returning prefs and switching to `maybeSingle`) as a follow‑up.

