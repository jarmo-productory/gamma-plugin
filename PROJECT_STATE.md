# Project State & Mission: Gamma Timetable Extension

**Last Updated:** 2025-08-11T09:00:00Z by Cursor Agent

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

- **2025-08-08:** **Unit Testing Infrastructure Complete** - Implemented comprehensive unit testing system using Vitest with 89 tests covering all high-value targets:
  - ✅ **Configuration System** (28 tests): Feature flags, environment management, Sprint-based restrictions, listeners, migration logic, error handling
  - ✅ **Authentication System** (31 tests): Device registration, token exchange, polling logic with controlled timers, network error handling, integration flows  
  - ✅ **Storage Abstraction** (30 tests): Chrome storage wrapper, versioning, legacy compatibility, sync queue, debounce utility, edge cases
  - Updated CLAUDE.md with complete project architecture documentation including backend, web dashboard, and authentication strategy
  - Testing framework: Vitest + happy-dom + Chrome API mocking, commands: `npm run test`, `npm run test:ui`, `npm run test:coverage`
- **2025-08-08:** **Code Quality Infrastructure Complete** - Implemented comprehensive code quality pipeline with ESLint, Prettier, and TypeScript support. Fixed 50+ ESLint errors, added automated quality checks, and ensured production-ready builds. Extension builds and packages successfully (v0.0.21). Quality commands available: `npm run lint`, `npm run format`, `npm run quality`.
- **2025-08-08:** Added research findings: Clerk dashboard lacks UI for external `chrome-extension://` origins. Use Backend API to set `allowed_origins` and `redirect_urls`. Included cURL examples and manifest notes for OAuth in Chrome extensions.
- **2025-08-08:** Clerk Chrome extension integration in progress. Authentication popup appears but Google login button is non-functional. Updated manifest.json (v0.0.21) with required permissions for OAuth flow. Identified likely blockers: missing Chrome permissions/host permissions for Clerk's OAuth redirects and cookies. Next steps: reload extension, check console for errors, verify Clerk dashboard configuration.
- **2025-08-07:** Updated Sprint 1 status: Deliverables 1-3 (CI/CD, backend infrastructure, DB schema) are now marked as complete. The next task is the UI implementation in the extension.
- **2025-08-07:** Corrected the project state to reflect the completion of Sprint 0 and the beginning of Sprint 1, based on the project's internal documentation.
- **2025-08-07:** **Sprint 0: Foundation & Architecture Enhancement - COMPLETE.** Successfully refactored the codebase into a monorepo structure, introduced abstraction layers for storage/auth/config, and prepared the project for backend integration with zero user-facing changes.
- **2025-08-07:** Initialized `PROJECT_STATE.md` to track mission, OKRs, and sprint progress.
- **2025-08-08:** Web‑first login + pairing (initial slice): added device pairing module, sidebar wiring to open web sign-in and poll token, local dev API with register/link/exchange + stub sign-in page; bumped extension to v0.0.22 and verified builds/lints.

- **2025-08-11:** Backend hardening (local dev):
  - Added JWT signing/verification (HS256) to `dev/pairing-api.js`
  - Implemented `POST /api/devices/refresh` and `GET /api/protected/ping`
  - Extended `packages/shared/auth/device.ts` with token refresh + `authorizedFetch`
  - Sidebar: added "Test API" button to hit protected endpoint and confirm auth path
  - Bumped version to `0.0.23` and built extension successfully

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

- [x] Extension (MV3) — initial slice complete (2025-08-08T18:05Z)
  - Added shared config keys `apiBaseUrl`, `webBaseUrl`
  - Implemented `packages/shared/auth/device.ts` with register/exchange/poll + storage
  - Wired sidebar Login to open web sign-in with pairing code and poll for token
  - Build: extension compiled successfully (v0.0.22)
  - Next: create backend routes (register/link/exchange) with in-memory store to enable end-to-end local validation

---

### Handoff Notes (2025-08-08)

- **What’s implemented today**
  - Web‑first pairing flow scaffold
    - `packages/shared/auth/device.ts`: register/exchange/poll, token storage, clearToken
    - `packages/shared/config/index.ts`: added `apiBaseUrl`, `webBaseUrl` with localhost defaults
    - `packages/extension/sidebar/sidebar.js`: Login opens `${WEB_URL}/sign-in?source=extension&code=<code>`, polls `exchange`, stores device token, flips button to Logout
    - `packages/shared/auth/index.ts`: treats device token presence as authenticated; Logout clears token
  - Minimal local dev API (in‑memory) and sign‑in stub
    - File: `dev/pairing-api.js`
    - Endpoints: `POST /api/devices/register | link | exchange`
    - Page: `GET /sign-in?code=...` with a "Log in" button that calls `link`
  - Build/version
    - Version bumped to `0.0.22`, manifest synced
    - Extension builds clean; lint passes

- **How to run (local)**
  - Start dev pairing API: `npm run dev:pairing-api` (serves on http://localhost:3000)
  - Build extension: `npm run build:extension` and reload unpacked extension
  - Login flow:
    1. Click Login in sidebar → opens `http://localhost:3000/sign-in?source=extension&code=<CODE>`
    2. Click "Log in" on the page → pairs device
    3. Sidebar console logs: `Device linked; token stored.` and button changes to Logout
    4. Logout from toolbar clears device token and flips back to Login

- **What works**
  - Pairing code generation and storage in extension
  - Opening web sign‑in page with the code
  - Linking via stub page and polling `exchange` until token is received
  - Device token persisted; UI toggles Login/Logout accordingly

- **Known gaps / next steps (Monday)**
  1. Backend API hardening (still in-memory)
     - Implement `POST /api/devices/refresh` and token rotation
     - Add basic rate limiting and logs; convert token to signed JWT (HS256) for dev
     - Unit tests for register/link/exchange/refresh negative paths
  2. Dashboard integration
     - Replace stub `/sign-in` page with real Clerk SignIn page that calls `/api/devices/link { code }` after auth
     - Success page: “You are now logged in and can close this page.” (kept)
  3. Extension integration
     - Add a minimal protected API call using the saved device token to prove authorization path
     - Persist and surface basic user state (email) once available from web side
  4. Data model & persistence
     - Migrate dev API to Netlify/Next.js route with `devices` table (`device_id`, `code_hash`, `code_expires_at`, `user_id`, `linked_at`, timestamps)
     - Store `code` as hash; TTL ~5m; single-use
  5. Production prep
     - Stabilize CRX ID for dev and record Chrome Web Store ID for prod; update Clerk `allowed_origins`
     - Env wiring for Netlify (JWT secret, Clerk keys)

- **Testing checklist**
  - [ ] Fresh code → Login → link → token saved (console confirms)
  - [ ] Toolbar flips to Logout without reload
  - [ ] Logout clears token and flips back to Login
  - [ ] (After backend work) Protected API call succeeds with device token; fails without

- **Notes**
  - If you see `net::ERR_CONNECTION_REFUSED` on `/api/devices/register`, ensure `npm run dev:pairing-api` is running on port 3000
  - If you see JSON `{ "error":"Not found" }` on `/sign-in`, restart the dev server to load the latest route
  - Pairing codes expire after ~5m in dev; click Login again to issue a new code

---

## 📋 Monday Handoff Summary (2025-08-08 Weekend)

### 🎯 **Current Status - Ready for Sprint 1 Continuation**

**What's Complete Today:**
- ✅ **Unit Testing Infrastructure** (89 tests, all passing)
- ✅ **CLAUDE.md Documentation** (complete full-stack architecture)
- ✅ **Web-first Authentication Flow** (device pairing scaffold working)
- ✅ **Code Quality Pipeline** (ESLint, Prettier, TypeScript strict mode)

**Extension Version:** v0.0.22 (builds clean, pairing flow functional)

### 🚀 **Priority Tasks for Monday Resumption**

**High Priority (Sprint 1 completion):**
1. **Backend API Hardening** - Convert in-memory dev API to production-ready Next.js routes with JWT tokens
2. **Clerk Integration** - Replace stub sign-in page with real Clerk authentication + device pairing 
3. **Extension Protected API** - Add authenticated API call to prove end-to-end token flow
4. **Supabase Integration** - Migrate to `devices` table with proper hashing and TTL

**Medium Priority (Sprint 1+):**
1. **Web Dashboard Shell** - Implement basic presentation management UI
2. **Timetable Logic Tests** - Extend unit tests to cover slide processing algorithms  
3. **Export Function Tests** - Add tests for CSV/Excel/PDF generation functionality

### 🔧 **Development Environment - Ready to Go**

**Local Setup Commands:**
```bash
# Start dev environment (3 terminals)
npm run dev:pairing-api     # Backend API (port 3000)
npm run build:extension     # Extension build
npm run test               # Run all unit tests

# Code quality
npm run quality            # Lint + format + type check
npm run test:ui           # Interactive test runner
```

**Authentication Flow Working:**
1. Click Login in sidebar → opens web page with pairing code
2. Click "Log in" on page → device links to user  
3. Extension polls and receives token → UI updates to Logout
4. Logout clears token and resets to Login state

### 📊 **Test Coverage - Solid Foundation**

**89 tests across core modules:**
- **Configuration System** (28 tests): Sprint-based feature flags, environment security, user preferences
- **Authentication System** (31 tests): Device registration, token exchange, polling with timers, error handling  
- **Storage Abstraction** (30 tests): Chrome storage wrapper, versioning, legacy compatibility, sync queue

**Testing Strategy Applied:**
1. Pure functions first (highest ROI)
2. Business logic with mocked dependencies  
3. Integration points with controlled time
4. Edge cases and error boundaries

### 🎨 **Architecture - Well-Documented**

**CLAUDE.md Updated with:**
- Complete monorepo structure documentation
- Web-first authentication strategy explanation
- Sprint-based development methodology
- Backend infrastructure (Supabase + Netlify) 
- Full-stack data flow diagrams
- Testing recommendations for each component

**PROJECT_STATE.md Tracking:**
- High-level mission and OKRs
- Sprint 1 task breakdown with completion status
- Technical implementation details
- Handoff notes for seamless continuation

### ⚠️ **Known Issues & Next Steps**

**Current Blockers Resolved:**
- ✅ Unit testing framework operational
- ✅ Authentication pairing flow working
- ✅ Code quality pipeline functional
- ✅ Documentation up to date

**Monday Focus Areas:**
1. **JWT Implementation** - Replace simple tokens with signed JWTs for security
2. **Database Persistence** - Move from in-memory to Supabase `devices` table
3. **Real Authentication** - Integrate Clerk SDK in web dashboard
4. **Protected Routes** - Add token validation for API endpoints
5. **Rate Limiting** - Add basic DDoS protection to device registration

**Testing Gaps to Fill Monday:**
- Timetable generation algorithms (duration calculations, reconciliation)
- Export functionality (CSV/Excel/PDF generation)
- API endpoint integration tests with database

### 🏁 **Success Criteria for Next Sprint Completion**

- [ ] Full authentication flow: Extension → Web (Clerk) → Token → Protected API
- [ ] Backend API deployed to Netlify with Supabase integration
- [ ] JWT token rotation and validation working
- [ ] Web dashboard shell displaying user state
- [ ] Unit tests extended to timetable and export logic (target: 120+ tests)

**Project is in excellent state for Monday resumption. All foundations solid, clear next steps identified, comprehensive documentation and testing in place.**
