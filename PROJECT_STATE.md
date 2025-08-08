# Project State & Mission: Gamma Timetable Extension

**Last Updated:** 2025-08-08T17:40:00Z by Claude Code

---

## 🎯 High-Level Mission

Our mission is to transform the Gamma Timetable Extension from a standalone browser tool into a cloud-enabled service. We will provide seamless synchronization of presentation timings across devices, secure data persistence, and a foundation for future collaboration, all powered by a robust backend infrastructure.

---

## 📈 Mid-Level: Objectives & Key Results (OKRs) - Q3 2025

### Objective 1: Implement a Secure, Cloud-Native Backend

- **KR1:** Implement secure user authentication using Clerk, allowing users to sign in via the extension and a new web dashboard. **Status: In Progress**
- **KR2:** Store all user presentation and timetable data securely in a Supabase-hosted PostgreSQL database. **Status: In Progress**
- **KR3:** Enable seamless, cross-device data synchronization via Next.js API routes hosted on Netlify. **Status: Not Started**

### Objective 2: Launch the Web Dashboard

- **KR1:** Create a web dashboard where users can view and manage their presentations. **Status: In Progress**
- **KR2:** Achieve a >70% sign-up conversion rate for new users through the web onboarding flow. **Status: Not Started**

---

## 🏃‍♂️ Tactical-Level: Current Sprint (Sprint #1: Authentication & Dashboard Shell)

**Goal:** Build upon Sprint 0's foundation to implement live user authentication with Clerk and create the initial web dashboard shell. The extension must remain fully functional in offline mode.

### Tasks:

- **[Completed]** `task-s1-01`: Configure Netlify CI/CD pipeline for the web dashboard.
- **[Completed]** `task-s1-02`: Set up Supabase & Clerk infrastructure, including local dev environment and configurations.
- **[Completed]** `task-s1-03`: Design and migrate the core database schema for `users` and `presentations`.
- **[In Progress]** `task-s1-04`: Implement the authentication UI in the extension's sidebar to reflect user state (signed in/out).
- **[Not Started]** `task-s1-05`: Implement the full web dashboard UI (landing page, sign-in pages, dashboard shell).
- **[Not Started]** `task-s1-06`: Implement the token storage strategy and secure extension-to-web communication.

---

## 🔧 Current Development Status

### Clerk Chrome Extension Integration (In Progress)

**Version:** v0.0.21
**Status:** Code quality infrastructure complete, authentication popup appears but Google login button is non-functional

**Progress Made:**

- ✅ **Code Quality Infrastructure Complete**: ESLint + Prettier + TypeScript pipeline implemented
- ✅ **50+ ESLint errors fixed**: Unused variables, type issues, code consistency resolved
- ✅ **Production builds verified**: Extension builds, packages, and works correctly
- ✅ **Quality automation**: `npm run lint`, `npm run format`, `npm run quality` scripts added
- ✅ Clerk authentication popup successfully appears in extension sidebar
- ✅ Basic Clerk integration implemented in extension
- ✅ Updated manifest.json with required permissions for OAuth flow

**Current Issue:**

- ❌ Google login button click does not trigger OAuth flow
- 🔍 **Root Cause Analysis:** Missing Chrome permissions/host permissions for Clerk's OAuth redirects and cookies

**Troubleshooting Steps Taken:**

1. **Updated Extension Manifest (v0.0.21):**
   - Added `"permissions": ["cookies"]`
   - Added `"host_permissions": ["http://localhost/*", "https://*.clerk.accounts.dev/"]`
   - These permissions are required for Clerk to initiate OAuth flow from extension modal

**Next Steps for Resolution:**

1. **Reload extension** and test Google button again
2. **Check sidebar console** for blocked popup/cookie messages
3. **Verify Clerk Dashboard Configuration:**
   - Native Application mode enabled
   - OAuth providers (Google, GitHub) configured and enabled
   - Allowed origins/redirects include extension's `chrome-extension://<id>`

**Technical Notes:**

- Clerk Dev instance requires cookies to be set and redirect to Clerk domains
- Chrome extension OAuth flow requires specific host permissions for external domains
- Extension manifest permissions must align with Clerk's OAuth redirect requirements

**Research Findings (Clerk + Chrome Extension OAuth):**

- The Clerk dashboard does not currently expose UI to add `chrome-extension://` origins. Use Clerk Backend API instead.
- Ensure a stable CRX ID (consistent extension key) to avoid origin changes between builds.
- Actionable configuration via Clerk API:

```bash
# 1) Allow the extension origin (replace values)
curl -X PATCH https://api.clerk.com/v1/instance \
  -H "Authorization: Bearer <CLERK_SECRET_KEY>" \
  -H "Content-type: application/json" \
  -d '{"allowed_origins": ["chrome-extension://<EXTENSION_ID>"]}'

# 2) Register an OAuth redirect back to the extension (adjust path as needed)
curl -X POST https://api.clerk.com/v1/redirect_urls \
  -H "Authorization: Bearer <CLERK_SECRET_KEY>" \
  -H "Content-type: application/json" \
  -d '{"url":"chrome-extension://<EXTENSION_ID>/popup.html"}'
```

- Manifest requirements (already added for dev): ensure `cookies` permission and host access to your Clerk Frontend API URL (e.g., `https://*.clerk.accounts.dev/*`) and `http://localhost/*` during development.
- If using Google custom credentials, add JS origin `chrome-extension://<EXTENSION_ID>` and keep Clerk's provider redirect as documented.

### Auth: First Principles + Plan

- **Why do we need login?**
  - Cross-device sync and recovery after reinstall
  - Ownership, privacy, and RLS on cloud data (per-user boundaries)
  - Future collaboration/sharing and subscription management
  - Support-level diagnostics and secure server-side operations
- **What must work in Sprint 1?**
  - Extension remains fully functional offline
  - A simple, reliable way to link a user account to the extension
- **Constraint discovered:** In-extension OAuth (Clerk modal) is brittle due to cookies/redirect constraints and `chrome-extension://` origins.

- **Alternatives considered:**
  - In-extension OAuth via `@clerk/chrome-extension` (current path, blocked by popup/cookies now)
  - Web-first auth + extension pairing (device link) using our dashboard
  - Anonymous device accounts with optional later upgrade to full user

- **Decision for Sprint 1:** Adopt **Web-first auth + pairing**; defer in-extension OAuth.
  - Keep offline-first behavior.
  - When user clicks Sign In in the sidebar, open the dashboard to authenticate.
  - After web login, perform a lightweight pairing flow to link the extension instance to the user account.

- **Implementation outline:**
  - Manifest: add `externally_connectable` to allow messages from our dashboard origin.
  - Backend (Netlify functions / Next.js API routes):
    - `POST /api/devices/register` → returns `{ deviceId, code, expiresAt }`
    - `POST /api/devices/link` (web, authenticated) → `{ code }` links device ↔ user
    - `POST /api/devices/exchange` → `{ deviceId, code }` → returns scoped device token (JWT)
  - Extension:
    - Generate/register device on first run, show "Connect account" CTA
    - On Sign In, open dashboard; web UI shows pairing code UI and completes link
    - Poll `exchange` until linked; store short-lived device token; refresh as needed
  - Security:
    - Codes are short-lived, single-use; tokens are device-scoped with minimal claims
    - RLS enforces user ownership; device tokens only access user’s data

- **Impact:**
  - Unblocks Sprint 1 without relying on in-extension Google popup
  - Preserves a clean upgrade path to native in-extension OAuth later
  - Aligns with existing plan in `sprint-1-auth-and-dashboard-shell.md` to open web for auth

---

## 📝 Changelog & Agent Notes

- **2025-08-08:** **Code Quality Infrastructure Complete** - Implemented comprehensive code quality pipeline with ESLint, Prettier, and TypeScript support. Fixed 50+ ESLint errors, added automated quality checks, and ensured production-ready builds. Extension builds and packages successfully (v0.0.21). Quality commands available: `npm run lint`, `npm run format`, `npm run quality`.
- **2025-08-08:** Added research findings: Clerk dashboard lacks UI for external `chrome-extension://` origins. Use Backend API to set `allowed_origins` and `redirect_urls`. Included cURL examples and manifest notes for OAuth in Chrome extensions.
- **2025-08-08:** Clerk Chrome extension integration in progress. Authentication popup appears but Google login button is non-functional. Updated manifest.json (v0.0.21) with required permissions for OAuth flow. Identified likely blockers: missing Chrome permissions/host permissions for Clerk's OAuth redirects and cookies. Next steps: reload extension, check console for errors, verify Clerk dashboard configuration.
- **2025-08-07:** Updated Sprint 1 status: Deliverables 1-3 (CI/CD, backend infrastructure, DB schema) are now marked as complete. The next task is the UI implementation in the extension.
- **2025-08-07:** Corrected the project state to reflect the completion of Sprint 0 and the beginning of Sprint 1, based on the project's internal documentation.
- **2025-08-07:** **Sprint 0: Foundation & Architecture Enhancement - COMPLETE.** Successfully refactored the codebase into a monorepo structure, introduced abstraction layers for storage/auth/config, and prepared the project for backend integration with zero user-facing changes.
- **2025-08-07:** Initialized `PROJECT_STATE.md` to track mission, OKRs, and sprint progress.

### Build Plan: Web‑first Login + Pairing

- **Extension (MV3)**
  - Add Sign In button → opens `${WEB_URL}/sign-in?source=extension&code=<PAIR_CODE>`
  - On install/boot: `POST /api/devices/register` → store `{deviceId, code, expiresAt}` in `chrome.storage`
  - Poll `POST /api/devices/exchange` with `{deviceId, code}` until `{deviceToken}` → persist; update UI
  - Use deviceToken on API calls; refresh via `POST /api/devices/refresh`
  - Config: `WEB_URL`, `API_URL`, feature flag `authentication`
  - Manifest: ensure `storage`, `tabs`; `externally_connectable` to dashboard origin (optional if polling only)
  - Optional later: switch from polling to web→extension messaging callback

- **Web Dashboard (Next.js + Clerk)**
  - Sign-in page (Clerk) accepts `source` + `code` params
  - After login: call `POST /api/devices/link` with `{code}` (user auth via Clerk cookie)
  - Success page: "You are now logged in and can close this page."
  - Add minimal pairing UI (shows code if missing or expired)

- **Backend (Netlify/Next.js API routes)**
  - `POST /api/devices/register` → returns `{deviceId, code, expiresAt}`; store hashed code
  - `POST /api/devices/link` (auth required) → map `{code} → userId`; invalidate code
  - `POST /api/devices/exchange` → on valid link return short-lived `deviceToken` (JWT with deviceId, userId)
  - `POST /api/devices/refresh` → rotate token
  - Middleware to verify `deviceToken`; map to `userId` for data access
  - Data model: `devices(device_id PK, code_hash, code_expires_at, user_id FK, created_at, linked_at)`
  - Rate limits + single-use codes

- **Security**
  - Pairing code TTL ~5m; one-time; store as hash
  - deviceToken TTL ~1h; refresh endpoint; revoke on unlink
  - Scope deviceToken to minimal claims; server enforces RLS/ownership

- **Local Dev**
  - `.env` (web): Clerk pk/sk, `NEXT_PUBLIC_WEB_URL=http://localhost:3000`, API URL
  - `.env` (functions): Clerk SK to verify sessions; JWT signing secret
  - Clerk: add `allowed_origins` for `http://localhost:3000` and (if needed) `chrome-extension://<DEV_ID>` via API
  - Optional: set consistent CRX ID for dev to stabilize `<DEV_ID>`
  - Run: `netlify dev` (APIs) + Next dev + extension loaded unpacked

- **Production**
  - Publish extension → stable `<STORE_ID>`; update Clerk `allowed_origins` with `chrome-extension://<STORE_ID>` and add redirect URLs if used
  - Netlify env vars (prod Clerk keys, JWT secret, API base)
  - Dashboard domain in `externally_connectable` (if using callback); CSP updates as needed
  - Rollout: ship extension with pairing; verify token issuance, refresh, and revoke

- **Nice-to-have (later)**
  - Replace polling with secure postMessage/Native Messaging callback
  - In-extension OAuth (Clerk modal) when stable
  - Device management UI (list/unlink devices)
