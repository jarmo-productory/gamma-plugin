# SPRINT 25: Extension ↔ Web Pairing Flow Fix

**Created:** 2025-09-01  
**Sprint Type:** ⚙️ UX + Integration Reliability  
**Status:** ✅ COMPLETED  
**Duration:** ~0.5–1 day

---

## 🎯 Sprint Objective

Fix the broken pairing deep link from the Chrome extension to the web app. Ensure that clicking “Login/Pair Device” in the extension opens the correct web route, shows the pairing UI, and completes the register → link → exchange flow reliably on port 3000 for local dev.

---

## 🔎 Problem Analysis

Reference audit: `documents/audits/extension-web-pairing-flow-audit.md`

- 404 observed at: `http://localhost:3000/sign-in?source=extension&code=...`
- Root cause: Shared `buildSignInUrl()` constructs `/sign-in`, but the web app does not define `/sign-in`. The expected path is the root `/` with query params.
- Tests expect root path: extension tests assert `/?source=extension&code=...`.
- Web flow is already implemented to handle these params on `/` (home) and to redirect authenticated users to `/dashboard?code=...&source=extension`.
- Pairing APIs exist and work (in-memory registration + secure token issue on exchange).

---

## 📦 Scope

- Update shared URL builder to use root `/` (preferred, minimal change).
- Add compatibility redirect route `/sign-in` that preserves params to reduce breakage on older builds.
- Validate end-to-end pairing: register → open URL → link → exchange.
- Keep Port 3000 mandate (local dev): update docs if needed; do not change extension defaults.

Out of scope: Persisting `deviceRegistrations` in DB/Redis; refresh endpoint redesign (tracked separately).

---

## 🛠️ Technical Plan

1) Shared Auth URL Builder
- File: `packages/shared/auth/device.ts`
- Change `buildSignInUrl()` from `${webBaseUrl}/sign-in` to `${webBaseUrl}/` and append `?source=extension&code=...`.
- Confirm existing tests in `packages/extension/src/test/device.auth.test.ts` pass (they expect root path).

2) Web Compatibility Route (Defense-in-Depth)
- New file: `packages/web/src/app/sign-in/page.tsx`
- Behavior: read `searchParams` for `source`, `code`; if authenticated, `redirect('/dashboard?code=&source=')`, else `redirect('/?code=&source=')`.
- Purpose: gracefully handle any extension builds still pointing to `/sign-in`.

3) E2E/Manual Validation
- Add a minimal Playwright scenario (or manual checklist) to:
  - POST `/api/devices/register` (returns `deviceId`, `code`).
  - Open `http://localhost:3000/?source=extension&code=<code>`.
  - Authenticate → dashboard shows pairing dialog.
  - POST `/api/devices/link` via dialog button.
  - Extension polls `/api/devices/exchange` and receives token.

4) Docs & Guardrails
- Update pairing steps and Port 3000 mandate in docs. If `documents/core/technical/local-development-guide.md` is not used, place the guidance in `documents/core/environment-setup.md`.
- Ensure extension shared-config defaults still target `http://localhost:3000`.

---

## 📁 Implementation Map

Changes to make:
- Modify: `packages/shared/auth/device.ts` → `buildSignInUrl()` to root.
- Add: `packages/web/src/app/sign-in/page.tsx` → redirect preserving `source` and `code`.
- Optional (tests): add quick e2e/manual checklist under `tests/manual/`.

No database schema or RLS changes required.

---

## ✅ Acceptance Criteria

- ✅ Opening `/sign-in?source=extension&code=ABC` results in the correct pairing UI (via redirect), no 404.
- ✅ `deviceAuth.buildSignInUrl()` returns `http://localhost:3000/?source=extension&code=...` in dev.
- ✅ Unauthenticated users see banner on home and code is retained post-login; authenticated users see pairing dialog on dashboard.
- ✅ Clicking "Link Device" calls `/api/devices/link` successfully, setting `linked=true` for the code.
- ✅ Extension can poll `/api/devices/exchange` and receive a secure token after link.
- ✅ Works with Port 3000; instructions reflect the PORT=3000 mandate.

---

## 🧪 Testing Strategy

- Unit: Rely on existing tests that assert root URL behavior for `buildSignInUrl()`.
- Manual/E2E: Simulate full flow on localhost:3000 (register → open URL → login → link → exchange). Capture console logs/screenshots.

---

## ⚠️ Risks & Mitigations

- Risk: Older extension builds still hitting `/sign-in` → Mitigate with compatibility redirect.
- Risk: In-memory `deviceRegistrations` lost on server restart → acceptable for dev; document restart impact.
- Risk: Port conflict → reinforce Port 3000 mandate and command snippets in docs.

---

## 🔗 References

- Audit: `documents/audits/extension-web-pairing-flow-audit.md`
- URL Builder: `packages/shared/auth/device.ts`
- Home routing: `packages/web/src/app/page.tsx`
- Pairing UI: `packages/web/src/components/DevicePairing.tsx`, `packages/web/src/components/DevicePairingDashboard.tsx`
- Devices API: `packages/web/src/app/api/devices/{register,link,exchange,refresh}/route.ts`
