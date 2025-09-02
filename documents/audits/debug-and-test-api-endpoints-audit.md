# Audit: Debug/Test API Endpoints & Internal APIs Security

Last updated: 2025-09-01
Owner: Platform/Infrastructure
Scope: Next.js API routes under `packages/web/src/app/api`, CI guardrails, env/config

---

## Executive Summary

Several debug and test API endpoints are publicly reachable in the current codebase. Some use Supabase service-role credentials, bypassing RLS and exposing sensitive data and administrative actions without adequate gating. We recommend an Internal APIs program: consolidate and gate all diagnostics/endpoints, segregate service-role usage to dedicated admin paths, enforce middleware and CI guardrails, and keep a minimal, safe production health check.

---

## Endpoint Inventory & Risk Assessment

Legend: HR = High Risk, MR = Medium Risk, LR = Low Risk (dev-only), SR = Structural Risk

- HR: `/api/debug/database-direct` → `packages/web/src/app/api/debug/database-direct/route.ts`
  - Uses service-role client to read `users`, `device_tokens`, `presentations` directly; returns records. No guard.
  - Impact: Full RLS bypass over public HTTP; information disclosure.

- HR: `/api/debug/tokens` → `packages/web/src/app/api/debug/tokens/route.ts`
  - Uses service-role client to count rows and call `cleanup_expired_tokens()` (mutation) via GET. No guard.
  - Impact: Admin mutation endpoint publicly callable; information disclosure.

- HR: `/api/test-migration` → `packages/web/src/app/api/test-migration/route.ts`
  - Uses service-role client to probe RPC existence and schema. No guard.
  - Impact: Service-role probing surface; information disclosure.

- MR: `/api/debug/check-presentations` → `packages/web/src/app/api/debug/check-presentations/route.ts`
  - Uses regular server client; enumerates `presentations`, `device_tokens`, `users` and returns data. No guard.
  - Impact: Recon surface; depends on RLS but still exposes table shapes and counts.

- MR: `/api/debug/user-mapping` → `packages/web/src/app/api/debug/user-mapping/route.ts`
  - Similar enumeration; attempts debug RPC; no guard.
  - Impact: Recon surface; partial leakage.

- MR: `/api/test-auth-config` → `packages/web/src/app/api/test-auth-config/route.ts`
  - Returns env-derived config (URL, flags). No guard.
  - Impact: Recon surface in production.

- MR: `/api/test-db` → `packages/web/src/app/api/test-db/route.ts`
  - Validates Supabase connection; echoes URL prefix and anon-key prefix. No guard.
  - Impact: Recon surface; better restricted to dev/stage.

- LR: `/api/test-account-features` → `packages/web/src/app/api/test-account-features/route.ts`
  - Session-scoped tests (upsert, columns). Safer, but should still be gated in prod.

- LR: `/api/test-security`, `/api/test-security-validation` → `packages/web/src/app/api/test-security*/route.ts`
  - Local token/device generation checks. Safe if disabled in prod; otherwise benign info.

- LR: `/api/debug/auth-test` → `packages/web/src/app/api/debug/auth-test/route.ts`
  - Shows auth state and mapping; small info disclosure; should be gated.

SR: Service-role client usage pattern
- `createServiceRoleClient()` appears in public debug routes. Service-role usage must be isolated to admin-only, well-gated routes.

---

## Risks

- RLS Bypass Exposure: Public endpoints using service-role clients can read/modify data across tenants.
- Administrative Side Effects via GET: Cleanup RPC executed publicly (`/api/debug/tokens`).
- Information Disclosure: Schema, counts, sample records, env-derived URLs/keys prefixes.
- Attack Surface Amplification: Production exposes diagnostics that aid enumeration and targeted attacks.

---

## Recommended Internal APIs Strategy

1) Internal API Namespace
- Consolidate debug/test endpoints under `/api/_internal/*` and admin-only ops under `/api/admin/*`.
- Remove/rename existing `/api/(debug|test-*|migrate)` paths to these namespaces.

2) Mandatory Guard Utility
- Add `packages/web/src/utils/internal-guard.ts` to enforce:
  - Env toggle: `ENABLE_INTERNAL_APIS === 'true'` (must be false in production).
  - Token gate: require `X-Internal-Auth: Bearer ${INTERNAL_API_TOKEN}` for all internal routes.
  - Optional admin session gate for `/api/admin/*`: Supabase session email in `INTERNAL_ADMIN_EMAILS` allowlist.
  - Default behavior: respond 404 (not 403) when disabled/unauthorized to avoid advertising endpoints.

3) Middleware (defense in depth)
- Add Next.js `middleware.ts` to 404 any `/api/(debug|test-*|migrate)` when `ENABLE_INTERNAL_APIS !== 'true'`.
- Migrate callers to the new internal/admin namespaces; keep legacy paths blocked.

4) Service Role Segregation
- Allow service-role only in `/api/admin/*` and only with guard utility checks.
- Remove service-role usage from all other routes.
- Keep `export const runtime = 'nodejs'` on any service-role routes.

5) CI Guardrails (augment existing CI)
- Fail build if any route outside `/api/admin` imports `createServiceRoleClient(`.
- Fail build if any route under `/api/_internal` does not import and call the guard utility.
- Optionally fail build if any route under `/api/(debug|test-*|migrate)` remains (force consolidation).

6) Production Health Endpoint
- Provide `/api/health` that returns `{ ok: true }` and build SHA; no env/DB details.
- Use separate, authenticated smoke tests in CI instead of public diagnostics.

---

## Immediate Remediation Plan

Priority A (remove or quarantine):
- Delete `/api/debug/database-direct`.
- Replace `/api/debug/tokens` with a POST `/api/admin/tokens/cleanup` (guarded; no GET side effects).
- Delete `/api/migrate` (manual instructions belong in docs; migrations are via SQL files).

Priority B (gate and relocate):
- Move remaining debug/test routes to `/api/_internal/*` and require guard utility.
- Reduce payloads to omit table rows unless explicitly necessary.

Priority C (tooling and docs):
- Add `internal-guard.ts`, `middleware.ts` behavior, and CI rules as above.
- Document Internal APIs policy in `documents/core/technical/security-implementation-summary.md`.
- Add `.env.example` entries: `ENABLE_INTERNAL_APIS`, `INTERNAL_API_TOKEN`, `INTERNAL_ADMIN_EMAILS` with clear guidance.

---

## Verification Checklist

- Routing
  - [ ] No public `/api/(debug|test-*|migrate)` paths in production build.
  - [ ] All diagnostics under `/api/_internal/*` and admin ops under `/api/admin/*`.

- Guards
  - [ ] All internal/admin routes call the shared guard utility.
  - [ ] Admin routes require both internal token and admin session allowlist.

- Service Role
  - [ ] `createServiceRoleClient()` only appears in `/api/admin/*`.
  - [ ] All other routes use SSR or anon clients with RLS.

- CI
  - [ ] Guardrails fail on violations (service-role misuse; missing guard; legacy debug paths).

- Docs/Env
  - [ ] Internal APIs policy documented.
  - [ ] Env template includes internal flags with warnings.

---

## References (Code)

- `packages/web/src/app/api/debug/database-direct/route.ts`
- `packages/web/src/app/api/debug/tokens/route.ts`
- `packages/web/src/app/api/test-migration/route.ts`
- `packages/web/src/app/api/debug/check-presentations/route.ts`
- `packages/web/src/app/api/debug/user-mapping/route.ts`
- `packages/web/src/app/api/test-auth-config/route.ts`
- `packages/web/src/app/api/test-db/route.ts`
- `packages/web/src/app/api/test-account-features/route.ts`
- `packages/web/src/app/api/test-security/route.ts`
- `packages/web/src/app/api/test-security-validation/route.ts`
- Service-role factory: `packages/web/src/utils/supabase/service.ts`

---

## Notes

- This audit aligns with CLAUDE.md security rules: Never bypass RLS for user operations; service role strictly for admin/system ops.
- Device-token validation remains via secure RPCs; this audit does not change those flows—only how diagnostics/admin tasks are surfaced and protected.

