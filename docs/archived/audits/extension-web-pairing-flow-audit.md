# Audit: Extension ↔ Web Pairing Flow (404 on /sign-in)

Last updated: 2025-09-01
Owner: Full‑Stack + Platform
Scope: Chrome extension pairing UX, web routing, API endpoints, shared auth lib

---

## Executive Summary

Pairing from the extension opens `http://localhost:3000/sign-in?source=extension&code=...`, which returns 404. The web app does not implement `/sign-in`. The intended flow is to land on `/` (or `/dashboard` after login) with `?source=extension&code=...` so the UI shows a pairing dialog and calls `/api/devices/link`.

Root cause: Drift between shared `buildSignInUrl()` and web routes. Tests expect root (`/?source=extension&code=`), but implementation currently builds `/sign-in?...`.

---

## Evidence

- Extension builds wrong URL:
  - File: `packages/shared/auth/device.ts:74`
    - `buildSignInUrl()` uses `new URL(`${webBaseUrl.replace(/\/$/, '')}/sign-in`)`.
- Tests expect root path (correct):
  - File: `packages/extension/src/test/device.auth.test.ts:193` and `:199`
    - Expect `https://example.com/?source=extension&code=...`.
- Web routing expects params on `/` and handles redirect after auth:
  - File: `packages/web/src/app/page.tsx:1`
    - If authenticated and `source=extension&code=...` present → `redirect('/dashboard?code=...&source=extension')`.
  - File: `packages/web/src/components/DevicePairing.tsx:1`
    - On unauthenticated: shows banner and stores `pendingPairingCode` until login; on authenticated: shows pairing dialog and calls `/api/devices/link`.
  - File: `packages/web/src/app/dashboard/DashboardClient.tsx:32` uses `DevicePairingDashboard` for dialog on dashboard.
- Screenshot shows 404 at `/sign-in?source=extension&code=...` (matches wrong path).

---

## Current Pairing Flow (Intended)

1) Extension obtains pairing code:
   - `POST /api/devices/register` (in-memory state)
   - File: `packages/web/src/app/api/devices/register/route.ts`
2) Extension opens web URL with params (should be `/` not `/sign-in`).
3) Web UI:
   - If unauthenticated → home page shows banner and stores code; after login, dialog opens.
   - If authenticated → redirect to `/dashboard?code=...&source=extension`; dialog opens immediately.
4) User clicks “Link device” → `POST /api/devices/link` (links code to user; in-memory).
   - File: `packages/web/src/app/api/devices/link/route.ts`
5) Extension polls `POST /api/devices/exchange` until linked → receives secure token.
   - File: `packages/web/src/app/api/devices/exchange/route.ts` (secure token creation + hashed storage via RPC).
6) Subsequent API calls include `Authorization: Bearer <token>`.

Notes:
- Token refresh route still reflects legacy behavior and requires Supabase session; acceptable for initial pairing since tokens are 24h.
  - File: `packages/web/src/app/api/devices/refresh/route.ts`

---

## Findings

- Broken redirect target:
  - `buildSignInUrl()` uses `/sign-in` → 404. Web only has `/` (with auth form) and `/login` (redirects to `/`).
- Tests vs implementation mismatch:
  - Tests assert root path. Implementation uses `/sign-in`. Regression likely introduced after tests were written.
- Web UI correctly handles `?source=extension&code=` on `/` and `/dashboard`.
- API endpoints exist and are functional for pairing (register, link, exchange). State is ephemeral (in-memory) by design.
- Refresh endpoint requires user session and is not extension-friendly. Non-blocking for initial pairing; track for future hardening.

---

## Risk Assessment

- UX Breakage: Users land on 404 and abandon pairing.
- Supportability: Confusion due to mismatch between docs/tests and behavior.
- Stability: In-memory `deviceRegistrations` lost on server restart (expected during development, but worth noting).

---

## Remediation Plan

Minimal, low-risk options (choose one, or both for robustness):

1) Fix URL builder (preferred):
   - Update `packages/shared/auth/device.ts` → `buildSignInUrl()` to use root `/` instead of `/sign-in`.
   - Continue app-side behavior unchanged; params flow to `/` or `/dashboard` as designed.

2) Add compatibility redirect (defense-in-depth):
   - Create `packages/web/src/app/sign-in/page.tsx` that immediately redirects preserving `?source&code` to `/` if unauthenticated or to `/dashboard` if authenticated.
   - Avoid changing extension code if a quick hotfix is needed in production.

Follow-ups:
- Add an E2E test that simulates the full pairing loop (register → open URL → link → exchange) against localhost at port 3000.
- Consider persisting `deviceRegistrations` to a short‑TTL table/Redis for robustness (optional if dev-only).
- Align refresh semantics with extension (issue a new token using existing token bearer without requiring Supabase session).

---

## Verification Checklist

- [ ] `deviceAuth.buildSignInUrl()` returns `http://localhost:3000/?source=extension&code=...` in dev.
- [ ] Navigating to the URL shows pairing banner or dialog (depending on auth state).
- [ ] Linking via `/api/devices/link` sets `linked=true` and includes user metadata.
- [ ] Polling `/api/devices/exchange` returns a secure token after link.
- [ ] E2E happy path passes on port 3000.

---

## Patches Proposed (Separate PR)

- Shared library:
  - `packages/shared/auth/device.ts`: change `/sign-in` → `/`.
- Web compatibility route:
  - `packages/web/src/app/sign-in/page.tsx`: redirect preserving params to `/` or `/dashboard`.

---

## References (Code)

- URL builder (source of bug): `packages/shared/auth/device.ts:74`
- Tests (expected behavior): `packages/extension/src/test/device.auth.test.ts:193`, `:199`
- Web home routing: `packages/web/src/app/page.tsx:1`
- Pairing UI (home): `packages/web/src/components/DevicePairing.tsx:1`
- Pairing UI (dashboard): `packages/web/src/components/DevicePairingDashboard.tsx:1`
- Devices API: `packages/web/src/app/api/devices/{register,link,exchange,refresh}/route.ts`

---

## Notes

- Keep port 3000 mandate in dev; extension defaults to `http://localhost:3000` via shared config (`packages/extension/shared-config/index.ts`).
- Do not introduce service-role usage in user routes; pairing endpoints adhere to RLS constraints by operating on in-memory registration + hashed token storage via RPC on exchange.
