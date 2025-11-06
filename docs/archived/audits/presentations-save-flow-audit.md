# Audit: Extension → API → Database save flow for presentations (2025-09-01)

## Summary
- Cloud save from the Chrome extension fails with 400 Bad Request due to a request body contract mismatch, before auth logic runs.
- Even with a corrected body, saves from the extension would be rejected with 403 because the endpoint currently blocks device‑token writes and requires an RPC path for RLS‑compliant access.
- Related GET/LIST endpoints attempt device‑token support but currently throw before executing queries.

## Evidence
- User console shows: `POST http://localhost:3000/api/presentations/save 400` and `Title, gamma_url, and timetable_data are required`.
- Server route: `packages/web/src/app/api/presentations/save/route.ts`
  - Validates `title`, `gamma_url`, `timetable_data` (snake_case) and returns 400 if missing.
  - After validation, checks auth and rejects device‑token: `Device-token save not allowed. Use RPC-based endpoint.` (403).
- Extension request builder: `packages/shared/storage/index.ts` → `StorageManager.syncToCloud()`
  - Sends camelCase payload:
    ```json
    {
      "presentationUrl": "https://gamma.app/...",
      "title": "...",
      "timetableData": { "title": "...", "items": [...], "startTime": "HH:MM", "totalDuration": 123 }
    }
    ```
  - Uses `deviceAuth.authorizedFetch` (device token) to call `/api/presentations/save`.

## Root Causes
1) Payload contract mismatch (camelCase vs snake_case)
   - API expects: `title` (string), `gamma_url` (string), `timetable_data` (jsonb). Optional: `start_time`, `total_duration`.
   - Extension sends: `presentationUrl`, `timetableData`.

2) Device‑token writes intentionally blocked in route
   - Route explicitly forbids device‑token write and instructs to use a SECURITY DEFINER RPC.
   - Current implementation provides no RPC for presentations upsert, so device‑token saves cannot proceed.

3) Device‑token GET/LIST are currently nonfunctional
   - `packages/web/src/app/api/presentations/{get,list,[id]}/route.ts` call `createAuthenticatedSupabaseClient(authUser)` which throws for device‑token auth (by design) before queries can add a manual `user_id` filter.

## Current Data Flow (as implemented)
- Extension sidebar → `saveDataWithSync()` → `StorageManager.syncToCloud()` → `deviceAuth.authorizedFetch(apiBaseUrl, '/api/presentations/save')` with camelCase body.
- API route `/api/presentations/save`:
  - Body validation (expects snake_case) → 400.
  - If body matched, would next reject device‑token with 403 and only allow Supabase session path using SSR client + RLS.
  - Upsert logic relies on unique key `(user_id, gamma_url)`.

## Compliance Notes (CLAUDE.md constraints)
- RLS bypass is forbidden: do not use service role in user routes. Current route adheres by rejecting device‑token writes and relying on SSR client for web users.
- Device‑token flows must use SECURITY DEFINER RPCs. Those RPCs are not implemented yet for presentations.
- Port 3000 mandate is unrelated to this bug but remains required for manual testing.

## Recommended Fix Plan
Short‑term (unblock extension save):
- Server: Accept both payload shapes to be resilient during migration.
  - Map `presentationUrl` → `gamma_url`; `timetableData` → `timetable_data`; also derive `start_time`/`total_duration` from timetable if present.
  - Keep device‑token rejection in place for now (still returns 403 after validation), so this change only helps web‑session saves.

- Extension (align with server contract):
  - In `StorageManager.syncToCloud()`, switch POST body to server contract:
    - `gamma_url: presentationUrl`
    - `timetable_data: timetableData`
    - `start_time: timetableData.startTime`
    - `total_duration: timetableData.totalDuration`
  - This removes the 400, but saves will still hit 403 until RPC is added.

Medium‑term (proper device‑token path without RLS bypass):
- Database: Add SECURITY DEFINER RPC for upsert, e.g. `upsert_presentation_from_device(p_user_id uuid, p_gamma_url text, p_title text, p_start_time text, p_total_duration int, p_timetable_data jsonb)` that:
  - Upserts into `presentations` on `(user_id, gamma_url)` and sets `updated_at`.
  - Enforces that `p_user_id` exists; further checks can be added if needed.
- API: In `/api/presentations/save` when `authUser.source === 'device-token'`:
  - Call `supabaseAnon.rpc('upsert_presentation_from_device', { ... })` using the anon client (not service role), passing the `dbUserId` resolved from the validated device token.
  - Return the same DTO as web path.

Fix GET/LIST for device‑token:
- Replace `createAuthenticatedSupabaseClient(authUser)` with anon client and perform queries through SECURITY DEFINER RPCs, or redesign the queries to use RPCs that return filtered rows for the provided `p_user_id`.

## Concrete Findings (file and line references)
- Payload validation and error message:
  - `packages/web/src/app/api/presentations/save/route.ts` (required fields check returning 400)
- Device‑token rejection in save route:
  - Same file: explicit 403 instructing RPC usage.
- Extension POST body construction:
  - `packages/shared/storage/index.ts` → `syncToCloud()` builds `presentationUrl` and `timetableData` keys.
- Device‑token client restriction:
  - `packages/web/src/utils/auth-helpers.ts` → `createAuthenticatedSupabaseClient()` throws for device‑token (enforces RPC rule).
- GET/LIST/[id] device‑token paths currently call the throwing helper before applying manual `user_id` filters.

## Action Items Checklist
- Align payload naming:
  - [ ] Update extension POST body to use `gamma_url` and `timetable_data` (plus `start_time`, `total_duration`).
  - [ ] Optionally, make server accept both naming styles during transition.
- Implement device‑token RPC path:
  - [ ] Create SECURITY DEFINER RPC for presentations upsert.
  - [ ] Update `/api/presentations/save` to call RPC for device‑token.
- Fix reads for device‑token:
  - [ ] Convert GET/LIST/[id] routes to RPCs or a safe anon‑client pattern that satisfies RLS policy without service role.
- Verify end‑to‑end:
  - [ ] With device paired, extension auto‑sync calls should return 200 and create/update row.
  - [ ] GET by URL returns timetable for same user; 404 for others (RLS respected).

## Suggested Test Steps (local)
1) Ensure port 3000 is free and run the web app on 3000.
2) Pair the extension to obtain a device token.
3) Open a Gamma presentation, adjust a slide duration to trigger auto‑save.
4) Observe network: POST `/api/presentations/save` should succeed; DB row should show `gamma_url` and `timetable_data` with expected values.

## Notes
- No service‑role client should be used in user routes. All device‑token DB mutations must go through SECURITY DEFINER RPCs.
- Consider adding server‑side schema validation (zod) to normalize camelCase/snake_case and give clearer 4xx errors.

