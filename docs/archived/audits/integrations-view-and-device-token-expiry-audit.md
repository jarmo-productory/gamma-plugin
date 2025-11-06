# Audit: Integrations View & Device Token Expiry

Created: 2025-09-02
Type: UX + Auth State Integrity
Status: draft

---

## Summary

Observed issues around extension auth/session lifecycle and the `/settings/integrations` device list:

- When the localhost web server is down or the device token expires, the extension sidebar remains "logged in" instead of signing out or prompting re‑auth.
- Logging in again from the extension sidebar creates a new "device" entry in `/settings/integrations`, leading to duplicate/new items for the same physical browser/installation.
- The integrations list labeling and grouping are not aligned with user expectations (e.g., multiple indistinguishable "new device" rows, unclear status/last seen).

Audit focuses:
1) Is the current behavior intended?  
2) What should a regular user expect to see in the `/integrations` view?

---

## Code Findings (Grounded Evidence)

- Web UI endpoint and revoke mismatch:
  - UI fetches from `/api/user/devices` and tries to revoke by sending `{ token }` but the API expects `{ deviceId }`.
    - UI: `packages/web/src/app/settings/integrations/IntegrationsClient.tsx`
      - Sends DELETE with `body: JSON.stringify({ token })` and filters local state by `device.token`.
    - API: `packages/web/src/app/api/user/devices/route.ts`
      - Expects `const { deviceId } = body;` and calls `revokeDeviceToken(userId, deviceId)`.
      - GET intentionally strips token: maps `userDevices` without returning any token field.
  - Impact: Revocation from UI cannot work; user cannot remove stale entries → list accumulates devices.

- Always creating a new device on login from the extension sidebar:
  - Sidebar login explicitly calls `deviceAuth.registerDevice(apiUrl)` every time (comment: "Always register a fresh code").
    - File: `packages/extension/sidebar/sidebar.js` (see `wireAuthAction()` login branch)
    - `registerDevice` issues a new `device_id` + code and saves it as `device_info_v1`.
  - Register endpoint always inserts a new row for code/device_id.
    - File: `packages/web/src/app/api/devices/register/route.ts`
    - Generates unique `deviceId` and inserts into `device_registrations`.
  - Exchange endpoint creates a new secure token per registration; no reuse of prior device identity.
    - File: `packages/web/src/app/api/devices/exchange/route.ts`
  - Impact: Re-auth/login triggers a new registration → new device listed in `/integrations`.

- Token refresh is not viable for the extension:
  - Extension refresh call uses `Authorization: Bearer <device-token>` and calls `/api/devices/refresh`.
    - File: `packages/shared/auth/device.ts` (`refresh()` and `getValidTokenOrRefresh()`).
  - The refresh route requires a Supabase web session (user cookies) and ignores the device token.
    - File: `packages/web/src/app/api/devices/refresh/route.ts` (checks `supabase.auth.getUser()` and generates a fake token in memory).
  - Impact: Refresh usually 401s; extension retains expired token in storage until an action fails and clears it. UI appears logged in longer than it should.

- Sidebar logout-on-expiry not proactive:
  - `AuthManager` only updates state during `initialize()` and when `logout()` is called; there’s no periodic expiry watcher.
    - File: `packages/shared/auth/index.ts` (`updateAuthState`, `isAuthenticated`, `getCurrentUser`).
  - Token is cleared upon profile fetch failure (401/404) or network error, but the UI is not auto-updated unless a call happens.
  - Impact: Sidebar can display a logged-in state even after expiry until the next API interaction.

- Device naming and fields:
  - Device name is auto-generated in exchange using user agent; list comes from RPC `get_user_devices` via `secureTokenStore.getUserDeviceTokens()`.
    - Files: `packages/web/src/utils/secureTokenStore.ts` (generateDeviceInfo, getUserDeviceTokens)
    - UI shows `device.deviceName` which aligns, but lacks alias/rename and status clarity.

---

## Current Behavior (Observed)

- Extension session persists visually after token expiry or when the web server is unavailable.
- Attempting actions triggers re‑login; after re‑auth, a new device appears under `/settings/integrations`.
- Device entries are not obviously deduplicated or merged; naming appears generic (e.g., "new device").
- The list does not clearly communicate device status (active, expired, offline), last seen, or origin (browser/OS).

---

## Intended Behavior (Design Principles)

- Auth truth source is Supabase Auth; UI should reflect real session state. Expired/invalid tokens must trigger sign‑out or re‑auth prompts in the extension.
- Re‑auth on the same browser installation should reuse the same device record (stable device fingerprint or installation ID), rotating tokens without creating a new logical device.
- The `/integrations` view should present devices clearly, avoid duplicates, and provide controls to rename and revoke devices.
- All user routes must remain RLS‑compliant (no service role usage) and use SECURITY DEFINER RPCs where device tokens participate.

---

## User Expectations for `/integrations`

- Clear, human‑readable device names (e.g., "Chrome on macOS", renameable alias).
- Status indicators: Active, Expired, Revoked, Last seen timestamp.
- No duplicates for the same installation; historical sessions grouped under a single device with current token state.
- Ability to:
  - Rename a device
  - Revoke a device/token
  - See last activity and basic client info (browser, OS, extension version)
- Predictable behavior after re‑login: device remains the same; token rotates.

---

## Gap Analysis

- Session lifecycle: The extension does not react to token expiry/sign‑out events to update UI state and clear device credentials.
- Device identity: Pairing flow likely creates a new device row on each login instead of upserting by a stable device fingerprint/installation ID.
- Integrations UX: Missing dedup/grouping, last seen/status, and rename affordances; generic labels make entries indistinguishable.

---

## Risks

- Confusing security posture: Users may believe multiple unknown devices exist.
- Token sprawl: Multiple active tokens for the same install increases exposure.
- Data hygiene: Duplicated device rows complicate support and analytics.

---

## Root Cause Hypotheses

1) Extension does not subscribe to or handle Supabase `onAuthStateChange` (TOKEN_REFRESH, SIGNED_OUT) correctly, leaving stale UI/auth state.
2) Pairing flow issues:
   - No stable `device_fingerprint` persisted across sessions (e.g., `installId` in `chrome.storage.local`).
   - Backend upsert uses a surrogate key (new UUID) instead of `ON CONFLICT (user_id, device_fingerprint)`.
3) `/integrations` view lacks fields (status, last_seen) and grouping logic; device rows are labeled generically.

---

## Repro Steps (Local)

1) Ensure port 3000 mandate:
   - Kill 3000: `lsof -ti:3000 | xargs kill -9`
   - Start: `PORT=3000 npm run dev`
2) Pair the extension and confirm a device appears in `/settings/integrations`.
3) Force token invalidation (revoke session or wait for expiry). Alternatively, stop the local server to simulate outages.
4) Observe the extension sidebar state (should log out but currently remains logged in).
5) Log in again via sidebar.
6) Check `/settings/integrations` → a new device row appears for the same installation.

---

## Recommendations

Auth & Extension
- Subscribe to Supabase auth state changes in the extension; on `SIGNED_OUT` or token invalidation, clear device token, reset UI, and prompt re‑auth.
- Persist a stable `installId` in `chrome.storage.local` and include a hashed `device_fingerprint` in pairing payloads.
- On re‑auth, reuse `device_fingerprint` to request token rotation rather than creating a new device.

Concrete code changes:
- Sidebar login should reuse existing device info when present:
  - Change sidebar to call `deviceAuth.getOrRegisterDevice(apiUrl)` instead of unconditional `registerDevice(apiUrl)`.
  - File: `packages/extension/sidebar/sidebar.js` within `wireAuthAction()` login branch.
- Add a lightweight expiry watcher in the sidebar or `AuthManager`:
  - Periodically check stored token `expiresAt`; if expired and refresh fails, call `authManager.logout()` and update UI controls.
  - File: `packages/shared/auth/index.ts` and sidebar init.

Backend & DB
- Add unique constraint: `UNIQUE (user_id, device_fingerprint)` on `devices` (or equivalent table).
- Implement SECURITY DEFINER RPC: `upsert_device_by_fingerprint(p_user_id uuid, p_device_fingerprint text, p_client jsonb)` that rotates tokens and updates `last_seen` without creating duplicates.
- Maintain `last_seen`, `status`, and minimal `client_info` (browser, os, extension_version) columns.
- Harden RPCs: `SECURITY DEFINER SET search_path = public; REVOKE ALL FROM PUBLIC; GRANT EXECUTE TO anon, authenticated;` and always derive `p_user_id` from validated token server‑side.
- Fix refresh path to be usable by the extension:
  - Replace `/api/devices/refresh` web-session requirement with SECURITY DEFINER RPC that validates the provided device token and issues a rotated token; return `{ token, expiresAt }`.
  - Keep RLS intact; no service-role in user routes.

Integrations UI
- Display fields: name (renameable), browser/OS, extension version, last seen, status (Active/Expired/Revoked), and actions (Rename, Revoke).
- Group historical sessions under the same device; avoid duplicate rows for the same `device_fingerprint`.
- Improve default naming (e.g., "Chrome • macOS") and allow user aliasing.
- Fix revoke mismatch now:
  - Update UI to send `{ deviceId }` to `/api/user/devices` DELETE and adjust local removal to filter by `device.deviceId`.
  - Remove `token` from `ConnectedDevice` interface; API intentionally does not return tokens.

Cleanup & Observability
- One‑time migration to merge duplicate device rows by `(user_id, device_fingerprint)` keeping the newest token.
- Add structured logs for device upsert/rotate, revocations, and extension auth state errors (no PII).

---

## Action Items (Prioritized)

1) Extension: Implement auth state listener and logout UI on token expiry.  
2) Extension: Persist `installId` and include `device_fingerprint` in pairing/save flows.  
3) DB: Add unique index `(user_id, device_fingerprint)` and `last_seen` column if missing.  
4) Backend: Add `upsert_device_by_fingerprint` SECURITY DEFINER RPC; rotate token if exists.  
5) Backend: Update pairing/save endpoints to call the RPC and to derive `user_id` from token (never from body).  
6) Web: Revamp `/settings/integrations` list to show name, status, last seen, and to collapse duplicates; add rename/revoke.  
7) Migration: De‑duplicate existing device rows and set canonical names.  
8) Telemetry: Add logs/metrics for token expiry handling and device upserts.

---

## Acceptance Criteria

- Token expiry triggers visible logout in the extension; no actions are allowed until re‑auth.
- Re‑auth on the same installation does not create a new device row; the existing device updates `last_seen` and rotates token.
- `/settings/integrations` shows de‑duplicated devices with clear names, last seen, and status, plus working Rename/Revoke.
- DB enforces uniqueness on `(user_id, device_fingerprint)`; RPCs are SECURITY DEFINER with least privilege and do not accept `user_id` from the client.
- One‑time migration merges historical duplicates for the same device.
- Web UI revoke works end-to-end (DELETE sends `deviceId`, API revokes via RPC, device disappears from list).

---

## References

- Port 3000 mandate in CLAUDE.md
- Internal/Admin APIs policy (no service‑role use in user routes)
- Related docs: `documents/audits/extension-web-pairing-flow-audit.md`, `documents/audits/extension-web-sync-disconnect-audit.md`
 - Code: 
   - UI: `packages/web/src/app/settings/integrations/IntegrationsClient.tsx`
   - API: `packages/web/src/app/api/user/devices/route.ts`
   - Extension: `packages/extension/sidebar/sidebar.js`, `packages/shared/auth/device.ts`, `packages/shared/auth/index.ts`
   - Token store: `packages/web/src/utils/secureTokenStore.ts`
