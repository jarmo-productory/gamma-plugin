# Presentation Save System Audit — 2025-10-05

## Scope & Evidence
- Code paths inspected in the extension (`packages/extension`), shared libraries (`packages/shared`), Next.js API routes (`packages/web/src/app/api`), and Supabase migrations (`supabase/migrations`).
- Recent diagnostics: `PRODUCTION-BLOCKER.md` (production RPC failure) and `documents/audits/local-environment-validation-report.md` (local trigger failures).
- Build behaviour validated via `vite.config.js`, environment configs, and package scripts.

## End-to-End Flow (Current Implementation)

### 1. Extension Bootstrapping
1. **Content script injection** retries on Gamma tabs and streams slide payloads (`packages/extension/content.ts`).
2. **Background service worker** brokers messages, tracks tab health, and connects sidebar UI (`packages/extension/background.js`).
3. **Sidebar UI** reconciles slide data, renders timetable, and coordinates auth/save actions (`packages/extension/sidebar/sidebar.js`).

### 2. Device Pairing & Authentication
1. **Device registration**: sidebar calls `deviceAuth.getOrRegisterDevice()` which hits `/api/devices/register` with a fingerprint and stores `{ deviceId, code }` locally (`packages/shared/auth/device.ts:139` and `packages/web/src/app/api/devices/register/route.ts:12`).
2. **User linking**: extension opens `/?source=extension&code=...`; web UI authenticates the user and POSTs `/api/devices/link` to mark the registration as linked (`packages/web/src/app/api/devices/link/route.ts`).
3. **Token exchange**: sidebar polls `/api/devices/exchange` until Supabase RPC `exchange_device_code` emits an opaque token, which is saved to `chrome.storage` (`packages/shared/auth/device.ts:178`).
4. **Profile fetch**: authenticated sidebar calls `/api/user/profile` with the device token to populate `AuthManager` state and confirm email (`packages/shared/auth/index.ts:190` and `packages/web/src/app/api/user/profile/route.ts`).
5. **Token refresh**: when tokens near expiry, the extension POSTs `/api/devices/refresh`, which invokes `rotate_device_token` to rotate hashes without exposing service-role credentials (`packages/shared/auth/device.ts:196`).

### 3. Saving Presentations to the Database
1. **Local persistence**: timetable edits trigger `saveDataWithSync()`, which always writes to `chrome.storage` and queues an auto-sync when `cloudSync` is enabled (`packages/shared/storage/index.ts:704`).
2. **Payload assembly**: before calling the API, `StorageManager.syncToCloud()` normalises items (id, title, duration, start/end time) but preserves arbitrary `content` objects (`packages/shared/storage/index.ts:265`).
3. **API gateway**: extension POSTs `/api/presentations/save` with device token auth; the route maps camelCase to snake_case, canonicalises the Gamma URL, and obtains `authUser` (`packages/web/src/app/api/presentations/save/route.ts:16`).
4. **Device-token path**: on device tokens the route invokes `rpc_upsert_presentation_from_device` via the anon Supabase client, expecting the 7-parameter signature that also upserts `users.email` (`packages/web/src/app/api/presentations/save/route.ts:41` + migration `20251004101500_update_presentations_rpc_auth_sync.sql`).
5. **Database triggers**: when the RPC inserts/updates `presentations`, the `sync_slide_fingerprints_incremental` trigger expands each timetable item, requires non-empty scalar text arrays, and persists normalised fingerprints (`supabase/migrations/20251001154438_slide_fingerprints.sql:201`).

## Environment & Build Differences

| Area | Local Dev (`BUILD_ENV=local`) | Production Build (`BUILD_ENV=production`) | Impact |
|------|------------------------------|-------------------------------------------|--------|
| Extension host permissions | `manifest.json` allows `http://localhost/*` | `manifest.production.json` targets Netlify + adds `cookies` permission | Wrong build -> wrong API base or missing cookies |
| API base URL | `http://localhost:3000` (`packages/extension/shared-config/environment.local.ts`) | `https://productory-powerups.netlify.app` (`…environment.production.ts`) | Build mismatch causes cross-origin failures |
| Supabase target | Local audit used a reset local DB (`documents/audits/local-environment-validation-report.md:80`); docs claim dev hits remote prod DB | Production Netlify uses managed Supabase | Divergent schema state masks production issues |
| Database migrations | Local reset applied latest migrations (including slide fingerprints) | Production includes `20251004101500` (verified via REST) + slide fingerprint trigger | Behavioural gaps now owed to payload differences, not missing schema |

## Failure Points & Root Causes (Verified 2025-10-06)

1. **Production RPC signature verified (no mismatch)**  
   - Direct REST invocation against production using the service role key confirms the deployed function accepts the 7-parameter shape.  
   - Evidence: `curl …/rest/v1/rpc/rpc_upsert_presentation_from_device` with `p_email` set returned `HTTP 400` only because we supplied a null email (`message":"null value in column \"email\"…"`).  
   - A subsequent call with a known `auth_user_id` succeeded (`HTTP 200`) and returned the presentation row, demonstrating the migration `20251004101500_update_presentations_rpc_auth_sync.sql` is live in production. (Test row was immediately deleted via `DELETE …/rest/v1/presentations`.)

2. **Slide fingerprint trigger rejects scalar content payloads**  
   - Replaying the save with `content` as an empty string reproduced the production failure: `HTTP 400` with `"cannot extract elements from a scalar"`, matching the trigger logic at `supabase/migrations/20251001154438_slide_fingerprints.sql:219`.  
   - When `content` is an array of objects (the current extension JSON), the trigger succeeds and the function completes.  
   - Therefore, failures stem from timetable items whose `content` property is persisted as a string (e.g., legacy cache entries or manual tests), not from the array/object structure produced by the latest sidebar.

3. **Operational drift between local and production data sources**  
   - Repository docs still describe local development against production Supabase, but recent QA evidence (`documents/audits/local-environment-validation-report.md:40`) used a reset local instance with different trigger behaviour.  
   - This mismatch leads to incorrect assumptions (e.g., believing the RPC migration was missing) when diagnosing production-only incidents.

## Additional Observations
- `device_registrations` currently omits `device_fingerprint` despite RPCs relying on it for unique constraints; recent migrations add fallbacks but re-enabling the column will reduce reliance on hashing fallbacks (`packages/web/src/app/api/devices/register/route.ts:29`).
- `StorageManager.syncToCloud()` performs no mutex around token refresh; concurrent debounced saves can race and drop tokens (`packages/shared/auth/device.ts:126`), leading to silent local-only saves. This is a resilience risk even after the schema issues are fixed.
- Build scripts default to `BUILD_ENV=development` for `npm run build`; packaging without `build:prod` will ship a localhost-pointing extension.

## Recommended Actions

1. **Audit production schema before filing blockers**  
   - Retain the REST harness used in this audit (service role + `curl`) to verify future migration concerns directly against production.
2. **Align trigger expectations with unusual `content` payloads**  
   - Update `sync_slide_fingerprints_incremental` to guard against scalar `content` values (e.g., wrap in `jsonb_typeof` checks) or normalise extension/local storage to always persist arrays. Add regression tests hitting the RPC via REST.
3. **Standardise environment usage**  
   - Clarify whether local development should point at production Supabase or a controlled mirror, and update `PROJECT_STATE.md` plus `.env.local` templates accordingly. Automated checks should fail if migrations diverge.
4. **Harden refresh & save concurrency**  
   - Introduce a refresh mutex in `DeviceAuth.getValidTokenOrRefresh` and surface sync errors in the sidebar UI so users are aware when cloud persistence fails.

## Verification Plan (post-fixes)
1. Build extension with `BUILD_ENV=production`; load unpacked and pair device on production web.  
2. Confirm `/api/presentations/save` returns 200 with populated `presentation` payload.  
3. Query Supabase to ensure `presentations` row exists and associated `slide_fingerprints` rows succeed.  
4. Repeat on local stack (using the same Supabase instance or an up-to-date clone) to ensure parity.
