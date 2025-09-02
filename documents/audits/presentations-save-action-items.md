# Presentations Save – Action Items (2025-09-01)

- Root cause: Body contract mismatch + device-token path lacks RPC.

## Minimum to remove 400
- Update extension request (packages/shared/storage/index.ts → syncToCloud):
  - Send `gamma_url` (from `presentationUrl`).
  - Send `timetable_data` (from `timetableData`).
  - Include `start_time` (from `timetableData.startTime`).
  - Include `total_duration` (from `timetableData.totalDuration`).
- Optional: Server accepts both camelCase and snake_case for transition.

## Required to support device-token saves (no RLS bypass)
- DB: Add SECURITY DEFINER RPC `upsert_presentation_from_device(...)` that upserts by `(user_id, gamma_url)`.
- API: In `/api/presentations/save`, when `authUser.source === 'device-token'`:
  - Use anon client and call the RPC with `dbUserId` and validated payload.

## Fix device-token reads
- Replace direct table selects in:
  - `packages/web/src/app/api/presentations/get/route.ts`
  - `packages/web/src/app/api/presentations/list/route.ts`
  - `packages/web/src/app/api/presentations/[id]/route.ts`
- Use SECURITY DEFINER RPCs that accept `p_user_id` and return filtered rows.

## Verification
- Extension: POST save returns 200; GET by URL returns timetable; LIST shows row; DELETE respects user boundary.
- No `createServiceRoleClient()` in user routes; internal/admin only.

## Nice-to-haves
- Server-side schema (zod) to normalize camelCase/snake_case.
- Structured error responses with codes for the extension.
