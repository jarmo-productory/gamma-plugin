# SPRINT 23: Internal APIs Hardening & Debug Surface Consolidation

**Created:** 2025-09-01  
**Sprint Type:** 🚨 SECURITY CRITICAL + Platform Hygiene  
**Status:** ✅ COMPLETE  
**Duration:** 1–2 days

---

## 🎯 Sprint Objective

Eliminate publicly reachable debug/test endpoints and enforce a rigorous Internal APIs policy. Consolidate diagnostics under private namespaces, segregate service-role usage to guarded admin routes, add middleware and CI guardrails, and expose a minimal public health check only.

---

## 🔎 Problem Analysis (From Audit Validation)

Publicly accessible routes expose diagnostics and, in some cases, perform administrative operations with service-role privileges:

- High risk endpoints (no guard):
  - `/api/debug/database-direct` — reads `users`, `device_tokens`, `presentations` with service role.
  - `/api/debug/tokens` — uses service role; executes `cleanup_expired_tokens()` via GET.
  - `/api/test-migration` — uses service role to probe RPCs and schema.
- Medium risk endpoints (recon surface; no guard):
  - `/api/debug/check-presentations`, `/api/debug/user-mapping`, `/api/test-auth-config`, `/api/test-db`.
- Low risk but still noisy in prod: `/api/test-account-features`, `/api/test-security`, `/api/test-security-validation`, `/api/debug/auth-test`.
- Additional surface: `/api/migrate` uses service role; no guard.

Structural risks:
- Service-role usage in public debug routes. No central guard, no middleware, no CI enforcement; no `/api/health`.

Constraints from CLAUDE.md:
- Never bypass RLS for user operations. Service role only for admin/system use, with strict safeguards. Web app must continue to run on port 3000 (operational note).

---

## 📦 Scope

1) Introduce Internal/Admin API namespaces and guard utility.  
2) Migrate or delete risky endpoints.  
3) Add middleware to hide legacy paths in production.  
4) Add CI guardrails to prevent regressions.  
5) Add minimal public `/api/health` endpoint.

Out of scope: Rate limiting, WAF/CDN rules, Netlify edge protection (tracked separately).

---

## 🛠️ Technical Plan

### 1) Internal Guard Utility
Add `packages/web/src/utils/internal-guard.ts` to enforce:
- Env toggle: `ENABLE_INTERNAL_APIS === 'true'` required to enable any internal/admin endpoints.
- Token gate: Require `X-Internal-Auth: Bearer ${INTERNAL_API_TOKEN}`.
- Admin routes: Optional allowlist via `INTERNAL_ADMIN_EMAILS` (comma-separated). Verify server-side session email when present; else require explicit service token.
- Default denial mode: respond with 404 (not 403) when disabled/unauthorized.

Usage pattern:
```ts
import { requireInternalAccess, requireAdminAccess } from '@/utils/internal-guard';

export async function POST(req: NextRequest) {
  const guard = await requireAdminAccess(req);
  if (!guard.ok) return guard.res; // returns NextResponse 404
  // ...safe admin logic...
}
```

### 2) Namespacing
- Move diagnostics to `/api/_internal/*` (guarded).  
- Restrict service-role operations to `/api/admin/*` (guarded + runtime nodejs).  
- Block legacy paths (`/api/debug/*`, `/api/test-*`, `/api/migrate`) in production via middleware.

### 3) Endpoint Changes
- Delete: `/api/debug/database-direct` (no longer needed; too powerful).  
- Replace: `/api/debug/tokens` with `POST /api/admin/tokens/cleanup` (guarded; no GET side effects).  
- Delete: `/api/migrate` (manual instructions belong in docs; migrations are SQL files).  
- Relocate + gate: 
  - `/api/test-db` → `/api/_internal/test-db`
  - `/api/test-auth-config` → `/api/_internal/auth-config`
  - `/api/debug/check-presentations` → `/api/_internal/check-presentations` (trim payloads)
  - `/api/debug/user-mapping` → `/api/_internal/user-mapping` (remove non-existent RPC, trim payloads)
  - `/api/test-account-features`, `/api/test-security*`, `/api/debug/auth-test` → `/api/_internal/*`

### 4) Middleware
Add `packages/web/src/middleware.ts` to return 404 for:
- `/api/(debug|test-*|migrate)(/.*)?` when `ENABLE_INTERNAL_APIS !== 'true'`.
Keep internal/admin namespaces operational only when guard validates.

### 5) CI Guardrails
- ESLint/CI rule: fail if any file outside `/api/admin/` imports `createServiceRoleClient(`.
- ESLint/CI rule: fail if any route under `/api/_internal/` or `/api/admin/` does not import and call internal guard.
- Build fail if any legacy debug/test/migrate routes exist in production tree.

### 6) Minimal Health Endpoint
- Add `/api/health` that returns `{ ok: true, ts, sha }` without env/DB details.  
- `sha` sourced from env (e.g., `COMMIT_SHA`) when present.

---

## 📁 Implementation Map

New files:
- `packages/web/src/utils/internal-guard.ts`
- `packages/web/src/middleware.ts`
- `packages/web/src/app/api/health/route.ts`
- `packages/web/eslint-internal-rules.js` (or extend `eslint-local-rules.js`)

Modified files:
- Move and gate: 
  - `packages/web/src/app/api/test-db/route.ts` → `/api/_internal/test-db`
  - `packages/web/src/app/api/test-auth-config/route.ts` → `/api/_internal/auth-config`
  - `packages/web/src/app/api/debug/check-presentations/route.ts` → `/api/_internal/check-presentations`
  - `packages/web/src/app/api/debug/user-mapping/route.ts` → `/api/_internal/user-mapping` (remove `count_users_debug` RPC usage)
  - `packages/web/src/app/api/test-account-features/route.ts` → `/api/_internal/test-account-features`
  - `packages/web/src/app/api/test-security*/route.ts` → `/api/_internal/*`
- Replace:
  - `packages/web/src/app/api/debug/tokens/route.ts` → `packages/web/src/app/api/admin/tokens/cleanup/route.ts` (POST, guarded, `runtime = 'nodejs'`).
- Delete:
  - `packages/web/src/app/api/debug/database-direct/route.ts`
  - `packages/web/src/app/api/migrate/route.ts`

Environment variables (.env.example):
- `ENABLE_INTERNAL_APIS=false` (must be false in production)
- `INTERNAL_API_TOKEN=` (rotatable secret for internal access)
- `INTERNAL_ADMIN_EMAILS=` (comma-separated, optional)

---

## ✅ Acceptance Criteria

Routing & Guards
- [x] No public `/api/(debug|test-*|migrate)` paths active in production.
- [x] All diagnostics live under `/api/_internal/*` and require token guard.
- [x] All admin ops under `/api/admin/*`, require guard, and declare `runtime = 'nodejs'`.

Service Role Segregation
- [x] `createServiceRoleClient()` used only in `/api/admin/*` and server utilities explicitly for admin/system tasks.
- [x] All user-facing routes operate within RLS using anon/server clients.

Tooling
- [x] Middleware returns 404 for legacy debug/test/migrate paths when disabled.
- [x] CI/ESLint fails on service-role misuse and missing guards.

Health
- [x] `/api/health` returns `{ ok: true }` (+ optional `sha`).

Docs/Env
- [x] Internal APIs policy added to `documents/core/technical/security-implementation-summary.md`.
- [x] `.env.example` includes the three internal flags with warnings.
- [ ] Coding agents guidance updated: `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, `.claude/agents/*` reflect Internal APIs rules and service‑role segregation.

---

## 🧪 Testing Strategy

- Internal endpoints return 404 when `ENABLE_INTERNAL_APIS !== 'true'`.
- With correct headers (`X-Internal-Auth`), internal/admin routes respond; wrong/missing token → 404.
- `/api/admin/tokens/cleanup` executes RPC only on POST and responds with `{ cleaned }`.
- CI catches:
  - Any `createServiceRoleClient(` imports outside `/api/admin/`.
  - Missing guard usage in internal/admin routes.
  - Presence of legacy debug/test/migrate paths.

---

## 🗺️ Timeline & Ownership

- Day 1 AM: Implement guard utility + middleware + health route (Full-Stack + DevOps).
- Day 1 PM: Migrate/delete endpoints; add runtime annotations; trim payloads (Full-Stack).
- Day 2 AM: CI guardrails; `.env.example` and docs update (DevOps).
- Day 2 PM: QA validation pass, toggle tests with/without `ENABLE_INTERNAL_APIS` (QA).

---

## ⚠️ Risks & Mitigations

- Risk: Breaking internal troubleshooting in staging.  
  Mitigation: Enable `ENABLE_INTERNAL_APIS` in staging only; document access token distribution.

- Risk: Hidden legacy paths still referenced.  
  Mitigation: Middleware denies; CI fails builds when legacy paths exist.

- Risk: Overuse of service role in admin routes.  
  Mitigation: Keep admin endpoints minimal; prefer RPCs with RLS where feasible.

---

## 🤖 Agent Guidance Updates (Mandatory End‑of‑Sprint)

Update all coding‑agent instruction files so future sessions follow the new security rules:

- CLAUDE.md: Add Internal APIs policy summary, explicitly forbid public debug/test endpoints, and restate “service role only for admin/system ops behind guards”. Reinforce port 3000 mandate and “never bypass RLS”.
- GEMINI.md and AGENTS.md: Mirror the Internal APIs requirements, guard usage patterns, and middleware behavior; remove any guidance suggesting direct debug endpoints in production.
- `.claude/agents/*` memory files: Add preflight checks to verify `ENABLE_INTERNAL_APIS` state, require guard headers for any internal calls, and forbid creating routes outside `/api/_internal` and `/api/admin`.
- Session Start Protocols: Include validation that no legacy `/api/(debug|test-*|migrate)` paths exist; if found, agents must migrate/delete rather than use them.

Acceptance gate: PR cannot be closed until these files are updated and linked in the sprint completion notes.

---

## 🔗 References

- Audit: `documents/audits/debug-and-test-api-endpoints-audit.md`
- Current routes: `packages/web/src/app/api/**`
- Service role client: `packages/web/src/utils/supabase/service.ts`
- RPCs: `supabase/migrations/*secure_token_hashing.sql`
