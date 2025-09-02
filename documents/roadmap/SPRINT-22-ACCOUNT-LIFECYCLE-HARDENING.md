# Sprint 22: Account Lifecycle Hardening & API Alignment

**Sprint Number:** 22  
**Duration:** 2–3 days (2025-09-01 → 2025-09-03)  
**Status:** DRAFT – Awaiting team review and approval  
**Priority:** HIGH – Stability, RLS-compliance, and UX correctness

**Lead:** Team Orchestrator  
**Team:** Tech Lead, Full‑Stack Engineer, QA Engineer, DevOps Engineer, UX/UI Engineer

---

## 🎯 Primary Objective

Harden the end‑to‑end user account lifecycle so first‑time and returning users get consistent, RLS‑compliant behavior across web and extension. Align API responses with UI needs, centralize user creation logic, and ensure migrations/permissions match the documented state.

Auth truth: Supabase Auth only (Clerk removed). Remove any remaining Clerk allowlists from extension manifests as part of prep.

---

## 📋 Sprint Context

### Source Audit
- documents/audits/SPRINT-20-USER-ACCOUNT-LIFECYCLE.md

### Key Findings To Address
- First‑login creation path is brittle; `.single()` usage can 500 on no‑row.  
- Profile API omits notification prefs expected by UI.  
- Inconsistent “create missing user row” logic duplicated across endpoints.  
- Possible divergence between active DB and repo migrations (columns/RPCs/policies).  
- RPC execute grants and RLS must be verified; never bypass RLS with service role for user ops.  
- Env/config misalignment can masquerade as "fetch failed"; require explicit validation.

---

## 🚀 Phase Plan

### Phase 1: API Refactor & Helper Consolidation (Day 1)
**Owner:** Full‑Stack Engineer  
**Scope:**
- Add shared helper `ensureUserRecord(supabase, authUser)` to create/select user by `auth_id` idempotently using `upsert(..., { onConflict: 'auth_id' })` to avoid select→insert races.  
- Switch `.single()` → `.maybeSingle()` in profile/notifications flows; on null, insert defaults then select.  
- Unify response DTO for `/api/user/profile` (GET/PUT):
  - Fields: `id, email, name, created_at, email_notifications, marketing_notifications`.  
- Keep device token path minimal, but return consistent subset where safe.  
- Add structured error logging (status, code, hint) in both profile and notifications routes.
 - Email handling: read from Supabase Auth; also store in `users.email` for UI/support; never key on email.

**Touchpoints:**
- `packages/web/src/app/api/user/profile/route.ts`
- `packages/web/src/app/api/user/notifications/route.ts`
- `packages/web/src/utils/user.ts` (ensureUserRecord)
- `packages/web/src/app/settings/account/AccountClient.tsx` (verify parsing expectations)

**Success Criteria:**
- [ ] First‑time login creates row without 500s; repeated calls are idempotent.  
- [ ] Profile GET/PUT include notification prefs in response.  
- [ ] No service‑role client used in user‑facing routes.  
- [ ] Structured logs emit Supabase error metadata for debugging.

---

### Phase 2: Database Schema & Permissions Validation (Day 2)
**Owner:** Tech Lead + DevOps Engineer  
**Scope:**
- Confirm active DB has required columns/indexes and RPCs from repo migrations:
  - `users.auth_id` (UUID, unique + indexed), `name`, `email_notifications`, `marketing_notifications`.  
  - Device token RPCs: `validate_and_touch_token`, `store_hashed_token`, `get_user_devices`, `revoke_device_token`, `cleanup_expired_tokens`.  
- Verify RLS policies for `users` and `presentations` use `auth.uid()` correctly.  
- Verify RPC EXECUTE grants: `authenticated` for validate/list/revoke; `service_role` only for store/cleanup.  
- If drift found, add corrective migration(s) under `supabase/migrations/` and apply to the active project.  
- Update `.env.example` with validated list of required variables and brief notes.

**Touchpoints:**
- `supabase/migrations/*`  
- `.env.example`, `documents/core/technical/local-development-guide.md`

**Success Criteria:**
- [ ] Migrations apply cleanly; DB matches documented schema.  
- [ ] RLS enforces user isolation; device RPCs work without privilege escalation.  
- [ ] Environment templates are accurate and minimal.

---

### Phase 3: Observability, QA Validation & Docs (Day 3)
**Owner:** QA Engineer + UX/UI Engineer  
**Scope:**
- Enhance `/api/test-account-features` to perform a real first‑login upsert using `auth_id` conflict and return created preferences.  
- Add cURL docs and test scripts validating profile + notifications flows.  
- Ensure Account UI correctly displays name and notification switches with server defaults.  
- Update knowledge docs with finalized patterns and pitfalls (RLS, env, first‑login).

**Touchpoints:**
- `packages/web/src/app/api/test-account-features/route.ts`  
- `documents/core/technical/security-implementation-summary.md`  
- `documents/core/technical/local-development-guide.md`

**Success Criteria:**
- [ ] Reproducible cURL tests for first‑login and updates.  
- [ ] Account UI shows expected values post‑refresh.  
- [ ] Docs reflect finalized lifecycle and troubleshooting.

---

## ✅ Acceptance Tests

### Build & Type Safety
- [ ] `npm run build` passes for web without TS errors.  
- [ ] No usage of service‑role client in user routes.  

### API Behavior (Web Session)
1) First‑login GET creates defaults:
```
curl -s -X GET http://localhost:3000/api/user/profile \
  -H "Cookie: <valid supabase session cookies>"
```
Expect HTTP 200 with fields: `id, email, name, created_at, email_notifications, marketing_notifications`.

2) Update name + prefs:
```
curl -s -X PUT http://localhost:3000/api/user/profile \
  -H "Content-Type: application/json" \
  -H "Cookie: <valid supabase session cookies>" \
  -d '{"name":"Test User"}'

curl -s -X PUT http://localhost:3000/api/user/notifications \
  -H "Content-Type: application/json" \
  -H "Cookie: <valid supabase session cookies>" \
  -d '{"email_notifications":false,"marketing_notifications":true}'
```
Expect subsequent GETs to reflect updates.

### API Behavior (Device Token)
- [ ] Bearer token path validates via RPC and returns minimal safe fields for extension.  
- [ ] Rejected when token invalid/expired (401 with `{ error: 'Invalid or expired token' }`); no RLS bypass observed.

### Database & RLS
- [ ] `users` row exists post first‑login; repeat calls do not duplicate rows.  
- [ ] RLS blocks cross‑user reads/updates.  
- [ ] RPC grants align with roles; service_role restricted to admin tasks only.

### Environment & Ops
- [ ] `.env.example` includes only required, accurate variables with brief guidance.  
- [ ] Local dev uses port 3000 per mandate; conflict handling documented.  
- [ ] Netlify/production envs updated accordingly.

---

## 🔒 Security Invariants
- Never bypass RLS.  
- Never use service role for user data operations.  
- Validate device tokens via RPC with proper execute grants.  
- Return only necessary data for device flows.

CI guard: Add a check that blocks `createServiceRoleClient()` in user-facing routes.

Example (in CI script):

```
if rg -n "createServiceRoleClient\(" packages/web/src/app/api | rg -v "/api/(admin|debug|test)"; then
  echo "ERROR: service role client used in user routes" && exit 1
fi
```

---

## 🧭 Risks & Mitigations
- Drifted production schema: add corrective migrations; validate on staging first.  
- Env mismatch leading to session failures: add startup validation and improved error logging.  
- UI/DTO divergence: lock response contract in tests and docs.

Prep tasks to avoid confusion:
- Remove `https://*.clerk.accounts.dev/*` from extension manifests.
- Ensure `/api/migrate` (manual helper) is disabled in production and references `auth_id (UUID)` correctly.

---

## 📈 Metrics
- 0 first‑login 500s in logs across test passes.  
- 100% API responses include expected fields for web path.  
- 0 service‑role usages in user routes (grep gate).  
- RLS audit passes on `users` and `presentations`.

---

## 🔄 Handoffs & Quality Gates
- Phase 1 → 2: Code merged, unit tests pass, API contract verified.  
- Phase 2 → 3: DB verified, env templates updated, RPC grants confirmed.  
- Final Gate (QA): cURL scripts green, UI validated, logs clean.

---

## 📚 References
- documents/audits/SPRINT-20-USER-ACCOUNT-LIFECYCLE.md  
- packages/web/src/app/api/user/profile/route.ts  
- packages/web/src/app/api/user/notifications/route.ts  
- packages/web/src/utils/supabase/server.ts  
- supabase/migrations/*

---

**Sprint Status:** DRAFT → Pending team review and approval.
