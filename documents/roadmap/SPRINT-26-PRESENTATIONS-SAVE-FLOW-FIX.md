# SPRINT 26: Presentations Save Flow Fix (Device-Token RPC Path)

**Created:** 2025-09-01  
**Sprint Type:** 🔒 Security + Data Integrity  
**Status:** completed  
**Duration:** 1–2 days

---

## 🎯 Sprint Objective
Unblock and harden the extension → API → database save and read flows for presentations by aligning request contracts and implementing a Row Level Security–compliant device-token path using SECURITY DEFINER RPCs. No service-role usage in user routes.

---

## 🔎 Problem Analysis

References:
- documents/audits/presentations-save-flow-audit.md
- documents/audits/presentations-save-action-items.md

Key findings:
- 400 Bad Request is caused by payload contract mismatch (camelCase vs snake_case) before auth logic executes.
- Even with a corrected payload, device-token saves are currently rejected (403) because the route intentionally blocks device-token writes pending an RPC path.
- GET/LIST/[id] endpoints use a helper that throws for device-token auth, so reads don’t currently work for device-token either.
- RLS bypass is forbidden by policy; correct approach is anon client + SECURITY DEFINER RPCs for device-token operations.

---

## 📦 Scope

In-scope:
- Align extension POST body with server contract (snake_case keys).
- Server resilience: accept both camelCase and snake_case temporarily during migration.
- Add SECURITY DEFINER RPC for upserting presentations by (user_id, gamma_url).
- Update save route to call RPC for device-token; keep SSR client path for web session.
- Replace device-token reads (get/list/[id]) with RPC-backed queries using anon client.
- Add server-side schema validation and normalized DTOs.

Out of scope:
- Any service-role usage in user routes.
- Dashboard UX improvements beyond verifying reads show correctly.

---

## 🛠️ Technical Plan

1) Extension payload alignment
- File: `packages/shared/storage/index.ts` → `StorageManager.syncToCloud()`
- POST body keys:
  - `gamma_url: presentationUrl`
  - `timetable_data: timetableData`
  - `start_time: timetableData.startTime`
  - `total_duration: timetableData.totalDuration`
- Keep `title` passthrough.

2) Server payload compatibility
- File: `packages/web/src/app/api/presentations/save/route.ts`
- Accept both naming styles:
  - Map `presentationUrl` → `gamma_url`, `timetableData` → `timetable_data`.
  - Derive `start_time` and `total_duration` when present in either style.
- Validate via zod schema; return structured 4xx errors with codes.

3) SECURITY DEFINER RPC for upsert (VOLATILE + hardened)
- Database function: `rpc_upsert_presentation_from_device(p_user_id uuid, p_gamma_url text, p_title text, p_start_time text, p_total_duration int, p_timetable_data jsonb)`
- Behavior:
  - Upsert into `presentations` on `(user_id, gamma_url)`; update `updated_at`.
  - Return the row (id, gamma_url, title, timetable_data, start_time, total_duration, updated_at).
- Security/hardening:
  - SECURITY DEFINER VOLATILE SET search_path = public;
  - Validate `p_user_id` exists and is the derived identity from device token (not request body).
  - REVOKE ALL ON FUNCTION FROM PUBLIC; GRANT EXECUTE ONLY to `anon`, `authenticated`.
  - Limit privileges to required columns only.

4) Save route device-token path
- File: `packages/web/src/app/api/presentations/save/route.ts`
- When `authUser.source === 'device-token'`:
  - Use anon client: `createClient(supabaseUrl, supabaseAnonKey)` (not service-role).
  - Call `rpc('upsert_presentation_from_device', { ... })` with `dbUserId` and validated payload.
  - Return normalized DTO. Keep SSR client path unchanged for web session saves.

5) RPC-backed reads for device-token
- Files:
  - `packages/web/src/app/api/presentations/get/route.ts`
  - `packages/web/src/app/api/presentations/list/route.ts`
  - `packages/web/src/app/api/presentations/[id]/route.ts`
- Replace `createAuthenticatedSupabaseClient(authUser)` with anon client + SECURITY DEFINER RPCs that accept `p_user_id` and return filtered rows.
- Examples: `rpc_get_presentation_by_url(p_user_id uuid, p_gamma_url text)`, `rpc_list_presentations(p_user_id uuid)`, `rpc_get_presentation_by_id(p_user_id uuid, p_id uuid)`.
  - Each read RPC must WHERE `user_id = p_user_id`; by-id/by-url add `LIMIT 1`.

6) URL canonicalization (server-side)
- Implement a small utility to canonicalize Gamma URLs before upsert/read:
  - Lowercase host, strip query/fragment, remove trailing slash, preserve path.
  - Apply to both `presentationUrl` and `gamma_url` inputs to derive canonical `gamma_url`.

7) Validation and error handling
- Add zod schemas for request/response.
- Standardize error shape: `{ code, message, details? }`.
 - Reject unknown keys or strip via whitelist.
 - Deprecation logs: emit code `DEPRECATED_CAMEL_PAYLOAD` with a removal date.
 - Ensure DTO parity across save/get/list: `{ id, gamma_url, title, timetable_data, start_time, total_duration, updated_at }`.

8) Docs and guardrails
- Update audits with “Implemented” notes and link to DB functions.
- Reinforce RLS policy and device-token RPC approach in `documents/core/technical/security-implementation-summary.md`.
 - Shared types: colocate request/response schemas under `packages/shared/schemas/presentations.ts`; server-side zod can narrow.

9) Observability
- Add minimal structured logs/counters (no PII):
  - `presentations_save_rpc_success`, `presentations_save_rpc_fail`
  - `presentations_validation_error`, `presentations_camel_deprecation_hit`

---

## 📁 Implementation Map

Code changes:
- Modify: `packages/shared/storage/index.ts` → align POST body keys
- Modify: `packages/web/src/app/api/presentations/save/route.ts` → dual payload support + device-token RPC call path
- Modify: `packages/web/src/app/api/presentations/get/route.ts` → RPC based
- Modify: `packages/web/src/app/api/presentations/list/route.ts` → RPC based
- Modify: `packages/web/src/app/api/presentations/[id]/route.ts` → RPC based
- Add: DB SQL migration for `rpc_upsert_presentation_from_device` (+ read RPCs) with search_path hardening and GRANT/REVOKE
- Add: URL canonicalizer util (e.g., `packages/web/src/utils/url.ts`) and use in save/get/list routes
- Modify: Affected route handlers add `export const runtime = 'nodejs'` if Node APIs are required by helpers

Stretch (optional):
- Add: `rpc_delete_presentation(p_user_id uuid, p_id uuid)` and update DELETE route to use anon client + RPC with user scoping
- Add: zod schemas under `packages/web/src/schemas/presentations.ts`

No service-role usage in user routes. Admin-only paths remain under `/api/admin/*` per policy.

---

## ✅ Acceptance Criteria

- Save from extension with device token returns 200 and upserts by `(user_id, gamma_url)`.
- GET by URL returns the saved timetable for the same user; 404 for others (RLS respected).
- LIST returns only the user’s rows for device-token path via RPC.
- No `createServiceRoleClient()` usage in any user route; scans confirm none.
- Server accepts both camelCase and snake_case during rollout; logs deprecation warning for camelCase.
- Zod validation provides clear 4xx error messages with codes.
- Requests providing `user_id` in body are ignored/flagged; server derives identity from validated token/session.
- Unique index exists on `(user_id, gamma_url)` and is referenced by the upsert.
- Read RPCs filter with `WHERE user_id = p_user_id` and by-id/by-url use `LIMIT 1`.
 - Affected routes declare `runtime = 'nodejs'` if helpers require Node APIs; otherwise edge-compatible.

---

## ✅ Completion Notes (2025-09-02)

- Fixed API update bug for web-session flow (undefined `title` → `payload.title`) in `packages/web/src/app/api/presentations/save/route.ts`.
- Device‑token save path wired to SECURITY DEFINER RPC `rpc_upsert_presentation_from_device` with anon client; URL canonicalization applied.
- Read endpoints (get/list/[id]) use RPCs for device‑token; SSR client path retained for web sessions.
- Zod schema `normalizeSaveRequest` accepts both camelCase and snake_case; deprecation warning logged when camelCase seen.
- Verified extension → API save returns 200; database row upserts on `(user_id, gamma_url)`; list/get reflect updates.
- No service-role usage in user routes; all device‑token operations go through RPCs; RLS preserved.

Evidence:
- Extension console shows successful 200 on POST `/api/presentations/save` and subsequent list/get.
- Server logs include `presentations_save_rpc_success` on device‑token saves.
- Migrations present for RPCs and applied to target DB (see `supabase/migrations/*sprint26*`).

---

## 🧪 Testing Strategy

Manual/local (Port 3000 mandate):
1) Kill anything on 3000, then `PORT=3000 npm run dev`.
2) Pair extension to obtain a device token.
3) Trigger autosave: POST `/api/presentations/save` → 200, row upserted.
4) GET by URL and LIST endpoints return expected rows.

Note: DELETE covered in a separate sprint or optional stretch.

Optional automated:
- Unit tests for payload normalization and zod validation.
- Integration test for RPC call wiring (mock Supabase client).

---

## ⚠️ Risks & Mitigations

- RPC permissions misconfigured → Validate SECURITY DEFINER owner and grants; test with anon key only.
- Contract drift between extension and server → Keep temporary dual-acceptance + deprecation logs; cut over after extension release.
- Incorrect user scoping in RPC → Require `p_user_id`, add WHERE clauses on `user_id`.
- Unique constraint mismatch (current schema has `gamma_url` UNIQUE) → Add migration to drop global unique and add UNIQUE(user_id, gamma_url).

---

## 🔗 References

- documents/audits/presentations-save-flow-audit.md
- documents/audits/presentations-save-action-items.md
- packages/web/src/utils/auth-helpers.ts
- packages/web/src/app/api/presentations/*/route.ts
- packages/shared/storage/index.ts
