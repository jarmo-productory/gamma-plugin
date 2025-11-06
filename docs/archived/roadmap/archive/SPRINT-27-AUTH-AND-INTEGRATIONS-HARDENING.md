# Sprint 27 — Auth & Integrations Hardening

Status: planned
Sprint Window: 2025-09-02 → 2025-09-09
Owners: full-stack-engineer, tech-lead-architect, qa-engineer
Related audit: documents/audits/integrations-view-and-device-token-expiry-audit.md

## What This Sprint Is About (Non-Technical Summary)

This sprint fixes critical user experience issues with device authentication and the integrations management interface. Currently, users experience confusing behavior:
- **Problem 1**: When logging out a device from the web dashboard doesn't work properly
- **Problem 2**: Each time you log back into the Chrome extension, it creates a "new device" instead of recognizing your existing browser
- **Problem 3**: The extension doesn't automatically sign you out when your login expires, showing you as "logged in" when you're actually not
- **Problem 4**: The device list on the web dashboard is confusing with duplicate entries and unclear information

**What users will experience after this sprint:**
- Clean device management: each physical device (like "Chrome on MacBook") appears once in your device list
- Automatic logout: the extension immediately shows you're signed out when your session expires
- Working device removal: clicking "Remove Device" actually removes it from your account
- Clear device information: see device names, when they were last used, and their current status

## Goals

- Fix device revocation in Integrations UI (token vs deviceId mismatch).
- Stop duplicate devices on re-login; introduce stable device identity per install.
- Make extension reflect real auth state on token expiry/outage.
- Provide secure token rotation/refresh without requiring web session cookies.
- Improve Integrations view clarity: status, last seen, rename, grouping.

## Success Criteria

- Revoke works from `/settings/integrations` and removes the correct row.
- Re-auth on same browser install does NOT create a new device row; token rotates.
- Extension auto-transitions to “signed out” within ≤10s of token expiry or refresh failure.
- `/api/devices/refresh` accepts device token and returns new `{ token, expiresAt }` (no Supabase session needed). RLS remains intact.
- Integrations list shows: device name (aliasable), browser/OS, last seen, status (Active/Expired/Revoked). No duplicates for same installation.

## Non-Goals

- Full device management UI redesign beyond items above.
- Cross-platform mobile clients.

## Work Items

### 1) Fix Device Removal Bug
**User Problem**: "Remove Device" button doesn't actually remove devices from your account
**Technical Fix**: The web UI and backend API expect different data formats when removing a device
- Update `packages/web/src/app/settings/integrations/IntegrationsClient.tsx` to:
  - Remove `token` from `ConnectedDevice` type (tokens shouldn't be visible in UI for security)
  - Send `DELETE /api/user/devices` with `{ deviceId }` (use device ID instead of token)
  - Filter local state by `device.deviceId` (match the backend expectation)
- QA: revoke succeeds; 404 handled gracefully; optimistic removal matches server.

### 2) Prevent Duplicate Devices 
**User Problem**: Every time you log back into the extension, it creates a "new device" instead of recognizing your existing browser
**Technical Fix**: Create a stable "fingerprint" for each browser installation so the system can recognize returning devices
- Extension: persist `installId` in `chrome.storage.local` once; expose `device_fingerprint = sha256(installId + userAgentMajor)`
- Pairing payloads include `device_fingerprint` (unique identifier for this browser installation)
- DB: add `device_fingerprint text` to `device_tokens` and `device_registrations` tables
- Constraint: `UNIQUE (user_id, device_fingerprint)` (ensures one device record per user per browser installation)
- RPC: `upsert_device_by_fingerprint(p_device_fingerprint, p_client jsonb)` rotates token and updates metadata/last_seen
- QA: re-login reuses same device row; no duplicates.

### 3) Enable Extension Token Refresh
**User Problem**: Extension can't automatically refresh expired login tokens, requiring manual re-login
**Technical Fix**: Create a backend endpoint that can refresh device tokens without requiring web session cookies
- New SECURITY DEFINER RPC: `rotate_device_token(p_input_token text)`
  - Validates current token hash, derives `user_id`, `device_id`, `device_fingerprint`
  - Inserts a new hashed token row, expires old token (set `expires_at = now()`)
  - Returns minimal metadata for the new token
- `/api/devices/refresh` calls the RPC using device Bearer token; returns `{ token, expiresAt }`
- QA: extension holding an expiring token receives a new token; 401 on invalid.

### 4) Automatic Logout on Token Expiry
**User Problem**: Extension shows "logged in" even when your session has expired, creating confusion
**Technical Fix**: Add automatic monitoring of token expiration status in the extension
- Subscribe to auth changes; lightweight interval watcher (5–10s) checks `expiresAt`
- On expiry and failed refresh: clear token, update UI state, prompt re-auth
- Replace unconditional `registerDevice()` with `getOrRegisterDevice()` (check for existing device first)
- QA: UI transitions within ≤10s of expiry; no phantom "logged in" state.

### 5) Improve Device List User Experience
**User Problem**: Device list shows confusing information with generic names and unclear status
**Technical Fix**: Add meaningful device information and better visual organization
- Show status, last seen, truncated deviceId; add rename action (alias)
- Group by `device_fingerprint`; surface current token status per device (shows one entry per physical device)
- QA: visual checks and unit tests for mapping.

### 6) Clean Up Existing Duplicate Data
**User Problem**: Current users already have duplicate device entries that need to be consolidated
**Technical Fix**: One-time data migration to merge duplicate devices for existing users
- One-time script/RPC to merge duplicates by `(user_id, device_fingerprint)` keeping the newest token
- QA: run in staging, verify counts, backup first.

## Security & RLS

- No service role in user routes. Service role used only for admin/maintenance.
- All device flows rely on SECURITY DEFINER RPCs. Inputs validated server-side.
- `/api/_internal/*` and `/api/admin/*` policies remain enforced.

## Acceptance Tests

- Revoke: DELETE by `deviceId` removes device; list reload matches server.
- Duplicate prevention: re-login twice creates one device row.
- Refresh: calling `/api/devices/refresh` with a valid token yields new token; invalid returns 401.
- Extension expiry: with an expired token, sidebar shows signed-out within ≤10s.
- Integrations fields: last seen updates after extension activity; status toggles correctly.

## Rollout Plan

- Phase 1: UI revoke fix (safe to ship)
- Phase 2: Refresh endpoint + extension watcher
- Phase 3: Stable identity + DB constraint + upsert RPC
- Phase 4: UX polish + migration to merge duplicates

## Risks & Mitigations

- Breaking existing tokens: keep refresh backward compatible; dual-read window.
- Fingerprint collisions: use UUIDv4 installId + hash; extremely low collision risk.
- RLS regressions: cover with RPC integration tests; never use service role outside admin.

## Links

- Audit: documents/audits/integrations-view-and-device-token-expiry-audit.md
- Code: 
  - UI: packages/web/src/app/settings/integrations/IntegrationsClient.tsx
  - API: packages/web/src/app/api/user/devices/route.ts
  - Extension: packages/extension/sidebar/sidebar.js, packages/shared/auth/device.ts, packages/shared/auth/index.ts
  - Token store: packages/web/src/utils/secureTokenStore.ts

