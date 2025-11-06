# Sprint 24: Account Deletion (User‑Initiated, RLS‑Safe)

**Sprint Number:** 24  
**Duration:** 2–3 days (target)  
**Status:** DRAFT – Awaiting team review  
**Priority:** HIGH – Privacy, compliance, UX clarity

**Lead:** Team Orchestrator  
**Team:** Tech Lead, Full‑Stack Engineer, QA Engineer, UX/UI Engineer, DevOps Engineer

---

## 🎯 Primary Objective

Enable users to permanently delete their account and all associated data. The flow must be explicit and safe: user must type the word `DELETE` to confirm. Implementation must be fully RLS‑compliant and avoid service‑role usage in user routes. Administrative deletion of the Supabase Auth user will be performed by a background task using service role.

---

## 📋 Scope

- UI: Account Settings “Delete account” section with explicit confirmation (type `DELETE`) and secondary confirm button.
- API: `DELETE /api/user/account` (or `POST` with body `{ confirm: 'DELETE' }`) to initiate deletion.
- Database: Transactional RPC `delete_my_account()` (SECURITY DEFINER) that deletes all first‑party data owned by `auth.uid()` safely under RLS.
- Background worker: Admin job/function to remove the Supabase Auth user after data is purged (service role; not called directly by user routes).
- Observability: Audit trail in `account_deletion_events` and structured logs.

Out of scope (can be follow‑up): 7‑day grace/undo period, data export prior to deletion.

---

## 🛠️ Technical Plan

### Phase 1: Database RPC & Schema (Day 1)
**Owner:** Tech Lead + DevOps  
**Tasks:**
- Create audit table `account_deletion_events(id, auth_id, email, requested_at, data_deleted_at, auth_deleted_at, status, reason)`.
- Add Postgres function `delete_my_account()` with SECURITY DEFINER:
  - Validates `auth.uid()` is not null; resolves `users.id` by `auth_id`.
  - Deletes dependent records (explicit deletes if FKs aren’t cascading):
    - `device_tokens` (via existing RPCs or direct table if policies allow),
    - `presentations` (ON DELETE CASCADE or explicit),
    - Any other user‑owned tables.
  - Deletes the `users` row for the caller.
  - Inserts audit record with `data_deleted_at` and `status = 'DATA_DELETED'`.
  - Returns `{ success: true }`.
- Grants: `GRANT EXECUTE ON FUNCTION delete_my_account TO authenticated;`
- Ensure foreign keys and RLS policies do not require service role for own‑data deletes.

### Phase 2: API Route & UI (Day 2)
**Owner:** Full‑Stack + UX/UI  
**Tasks:**
- Add `packages/web/src/app/api/user/account/route.ts`:
  - Auth via `createClient().auth.getUser()`.
  - Validate body `{ confirm: 'DELETE' }` (case‑sensitive). Reject otherwise (400).
  - Call RPC `delete_my_account()` and return 202 with `{ success: true }`.
  - Do NOT use service role in this route.
- Add UI section: `packages/web/src/app/settings/account/DeleteAccountClient.tsx`:
  - Text input requiring user to type `DELETE`.
  - Disabled destructive button until exact match.
  - After success: sign out locally and show final state.

### Phase 3: Admin Worker & Observability (Day 3)
**Owner:** DevOps + QA  
**Tasks:**
- Add background admin worker (Netlify/Scheduled function) `account-deletion-worker`:
  - Uses service role (admin context) to fetch audit records with `status = 'DATA_DELETED' AND auth_deleted_at IS NULL`.
  - Calls Supabase Admin API to delete the corresponding Auth user.
  - Updates audit record with `auth_deleted_at` and `status = 'COMPLETED'`.
- Add structured logs and dashboard doc for manual verification.

---

## 🔒 Security & Compliance

- Never use service role in user‑facing routes.  
- Deletion RPC enforces ownership via `auth.uid()` inside the function.  
- All operations run under RLS except the admin worker (system context).  
- Device tokens invalidated as part of deletion.  
- Return minimal details in API responses.

---

## ✅ Acceptance Tests

### Build & Type Safety
- [ ] `npm run build` passes in `packages/web`.

### API Behavior (Web Session)
1) Missing confirmation:
```
curl -s -X POST http://localhost:3000/api/user/account \
  -H "Content-Type: application/json" \
  -H "Cookie: <valid session cookies>" \
  -d '{"confirm":"WRONG"}'
```
Expect 400 `{ error: 'Confirmation required: type DELETE' }`.

2) Correct confirmation:
```
curl -s -X POST http://localhost:3000/api/user/account \
  -H "Content-Type: application/json" \
  -H "Cookie: <valid session cookies>" \
  -d '{"confirm":"DELETE"}'
```
Expect 202 `{ success: true }`.

3) Post‑deletion checks:
- `/api/user/profile` returns 401 (session invalid after sign‑out) or 404 for missing data.  
- `/api/user/notifications` returns 401.  
- Presentations list for user is empty.

### Database & RLS
- [ ] Deletion removes user’s rows from first‑party tables.  
- [ ] RLS prevents deleting other users’ data.  
- [ ] Audit table records request and timestamps.

### Admin Worker
- [ ] Worker deletes the Supabase Auth user for completed data deletes.  
- [ ] Audit updated to `COMPLETED` with `auth_deleted_at` set.

---

## 🧭 Risks & Mitigations
- Partial deletes if RPC fails midway → Wrap in transaction; return error and log details.  
- Orphaned auth users if worker fails → Worker retries with backoff; manual playbook documented.  
- UX mistakes in confirmation → Require exact `DELETE` string; secondary confirm button; disabled by default.

---

## 📈 Metrics
- 100% deletion requests require exact `DELETE`.  
- 0 service‑role usage in user routes.  
- 100% of deletion RPCs complete transactionally or roll back.  
- Admin worker clears pending auth deletions within 10 minutes.

---

## 🔄 Handoffs & Quality Gates
- Phase 1 → 2: RPC created, grants set, migrations applied.  
- Phase 2 → 3: API/UI merged; cURL tests pass.  
- Final Gate: Audit records generated; worker deletes Auth user; UI communicates final state.

---

## 📚 Touchpoints & References
- API Route: `packages/web/src/app/api/user/account/route.ts`  
- UI: `packages/web/src/app/settings/account/DeleteAccountClient.tsx`  
- RPC + Migrations: `supabase/migrations/*`  
- Admin Worker: `netlify/functions/account-deletion-worker.ts` (or equivalent)  
- Security Summary: `documents/core/technical/security-implementation-summary.md`

---

## 📝 Implementation Notes

- Prefer explicit deletes if FKs don’t cascade. Keep RLS policies intact; the RPC runs as owner but must check `auth.uid()` internally to bind scope.  
- After API success, sign out the local session and show a final screen (no auto‑recreate of user row).  
- Keep responses minimal; avoid leaking structure post‑deletion.

