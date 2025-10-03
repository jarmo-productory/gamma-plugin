# 500 Error Debug Handover Memo for GPT-5

**Date**: October 3, 2025
**Issue**: Extension save functionality returns 500 error
**Current Status**: Unable to see error details despite multiple debug deployments

---

## Problem Statement

The Chrome extension's "Save Now" button consistently returns a 500 Internal Server Error when attempting to save presentation data to the cloud via the `/api/presentations/save` endpoint.

**User Flow**:
1. User pairs device successfully (device token authentication works)
2. User opens Gamma presentation
3. Extension loads presentation data
4. User clicks "Save Now" → **500 Error**

**Error Response**: `{"error":"Failed to save presentation"}` (no debug info despite being added)

---

## Authentication Architecture (Working)

### Dual Authentication System:
1. **Web Path**: Supabase session (SSR client) → Direct table access with RLS
2. **Extension Path**: Device token → SECURITY DEFINER RPCs (anon client)

### Device Token Flow (Confirmed Working):
1. Extension calls `/api/devices/register` → Returns device_id + pairing code
2. User opens web app with pairing code
3. Web app calls `/api/devices/link` → Links device to authenticated user
4. Web app calls `/api/devices/exchange` → Returns device token
5. Token stored in `device_tokens` table with SHA-256 hash

**Token Validation** (confirmed working):
- RPC: `validate_and_touch_token(input_token TEXT)`
- Returns: `TABLE(user_id TEXT, device_id TEXT, device_name TEXT, user_email TEXT)`
- Console shows: `[AuthManager] API response status: 200` ✅

---

## The Failing Code Path

### File: `/packages/web/src/app/api/presentations/save/route.ts`

**Line 37-82: Device Token Path (RLS Compliant)**

```typescript
if (authUser.source === 'device-token') {
  const supabase = await createClient(); // Anon client

  // Step 1: Sync user record (CREATE IF NOT EXISTS)
  const { data: dbUserId, error: syncError } = await supabase.rpc('rpc_sync_user_from_auth', {
    p_auth_id: authUser.userId,  // <-- THIS IS THE ISSUE
    p_email: authUser.userEmail
  });

  if (syncError || !dbUserId) {
    return withCors(NextResponse.json({
      error: 'Failed to sync user record',
      debug: { code, message, details, hint }
    }, { status: 422 }), request);
  }

  // Step 2: Upsert presentation
  const { data, error } = await supabase.rpc('rpc_upsert_presentation_from_device', {
    p_user_id: dbUserId,
    p_gamma_url: canonicalUrl,
    p_title: payload.title,
    p_start_time: payload.start_time ?? null,
    p_total_duration: payload.total_duration ?? null,
    p_timetable_data: payload.timetable_data,
  });

  if (error) {
    return withCors(NextResponse.json({
      error: 'Failed to save presentation',
      debug: { code, message, details, hint }  // <-- SHOULD SHOW BUT DOESN'T
    }, { status: 500 }), request);
  }
}
```

---

## Database Schema

### Table: `device_tokens`
```sql
CREATE TABLE device_tokens (
  token TEXT PRIMARY KEY,      -- SHA-256 hash
  device_id TEXT NOT NULL,
  user_id TEXT NOT NULL,       -- ⚠️ TEXT, not UUID!
  user_email TEXT NOT NULL,
  device_name TEXT,
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  last_used TIMESTAMPTZ
);
```

### Table: `users` (First-Party)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RPC: `rpc_sync_user_from_auth`
```sql
CREATE OR REPLACE FUNCTION rpc_sync_user_from_auth(
  p_auth_id uuid,    -- ⚠️ Expects UUID
  p_email text
)
RETURNS uuid         -- Returns users.id
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  INSERT INTO users (auth_id, email, created_at, updated_at)
  VALUES (p_auth_id, p_email, NOW(), NOW())
  ON CONFLICT (auth_id)
  DO UPDATE SET
    email = COALESCE(EXCLUDED.email, users.email),
    updated_at = NOW()
  RETURNING id INTO v_user_id;

  RETURN v_user_id;
END;
$$;
```

### RPC: `rpc_upsert_presentation_from_device`
```sql
CREATE OR REPLACE FUNCTION rpc_upsert_presentation_from_device(
  p_user_id uuid,    -- Expects users.id (UUID)
  p_gamma_url text,
  p_title text,
  p_timetable_data jsonb,
  p_start_time text DEFAULT NULL,
  p_total_duration integer DEFAULT NULL
)
RETURNS SETOF presentations
SECURITY DEFINER
AS $$
DECLARE
  _exists boolean;
BEGIN
  -- Check if user exists
  SELECT TRUE INTO _exists FROM users WHERE id = p_user_id LIMIT 1;
  IF NOT COALESCE(_exists, FALSE) THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0001';  -- ⚠️ Might be this error
  END IF;

  RETURN QUERY
  INSERT INTO presentations (user_id, title, gamma_url, start_time, total_duration, timetable_data, updated_at)
  VALUES (p_user_id, p_title, p_gamma_url, COALESCE(p_start_time, '09:00'), COALESCE(p_total_duration, 0), p_timetable_data, NOW())
  ON CONFLICT (user_id, gamma_url)
  DO UPDATE SET
    title = EXCLUDED.title,
    start_time = EXCLUDED.start_time,
    total_duration = EXCLUDED.total_duration,
    timetable_data = EXCLUDED.timetable_data,
    updated_at = NOW()
  RETURNING *;
END;
$$;
```

---

## Type Mismatch Hypothesis

### The Core Issue:

1. **Token Validation Returns**: `user_id` as **TEXT** (from `device_tokens.user_id`)
2. **Device Token Store**: `user_id` is stored as **TEXT** (not constrained to be UUID format)
3. **RPC Expects**: `p_auth_id` as **UUID**

**Question**: What exactly is stored in `device_tokens.user_id`?

**Two Possibilities**:
1. ✅ **Correct**: `auth.users.id` (UUID string like `"550e8400-e29b-41d4-a716-446655440000"`)
2. ❌ **Wrong**: `users.id` (UUID or serial integer)

### How Device Token is Created

**File**: Unknown (need to find where `storeSecureToken` is called)

**Need to verify**: What is passed as `userId` when creating device token?
```typescript
await storeSecureToken({
  token: opaqueToken,
  deviceId: deviceId,
  userId: ???,  // <-- IS THIS auth.users.id OR users.id?
  userEmail: user.email,
  deviceName: deviceName,
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
});
```

---

## Debug Code Added (Not Showing in Browser)

### Multiple debug points added:
1. **Line 43-47**: Log before RPC call
   ```typescript
   console.log('user_sync_rpc_attempt', {
     auth_id: authUser.userId,
     email: authUser.userEmail,
     auth_id_type: typeof authUser.userId
   });
   ```

2. **Line 54-61**: Log RPC response
   ```typescript
   console.log('user_sync_rpc_response', {
     dbUserId, syncError, errorCode, errorMessage, errorDetails, errorHint
   });
   ```

3. **Line 92-102**: Debug info in RPC error response
4. **Line 207-214**: Debug info in generic catch block

**Problem**: None of these debug logs appear in browser console, and Response shows `{"error":"Failed to save presentation"}` without debug info.

**Cache Busting Attempts**:
- ✅ Added timestamp comment to force rebuild
- ✅ Verified deployment timestamp is fresh (11:36 GMT, 11:44 GMT, etc.)
- ✅ Headers show fresh Date
- ❌ Response still shows old format

---

## Network Evidence

### Request Headers:
```
POST https://productory-powerups.netlify.app/api/presentations/save
Authorization: Bearer 3mmZqCEuq7...
Content-Type: application/json
```

### Response Headers:
```
Status: 500 Internal Server Error
Date: Fri, 03 Oct 2025 11:36:02 GMT (FRESH)
Content-Type: application/json
x-nf-request-id: 01K6MXQ22NRP92QEQGYW7ZZKSZ
```

### Response Body:
```json
{"error":"Failed to save presentation"}
```

**No debug info despite being added to code!**

### Console Logs (Only from client-side):
```
[AuthManager] Using device token: 3mmZqCEuq7...
[AuthManager] API response status: 200  ← Token validation works!
POST .../save 500 (Internal Server Error)
POST .../save Request throttled
[SIDEBAR] Manual save to cloud failed: Error: Failed to fetch
```

**No server-side console.logs visible!**

---

## Files Modified During Debug Session

1. `/packages/web/src/app/api/presentations/save/route.ts`
   - Added debug logging at lines 43-47, 54-61
   - Added debug object to error responses at lines 71-81, 94-102, 207-214

2. `/packages/extension/sidebar/sidebar.js`
   - Increased debounce from 500ms to 2000ms (line 993)
   - Added comments about throttling

3. `/packages/extension/background.js`
   - Reduced polling from 5s to 15s (line 374)

4. `/package.json`, `/packages/extension/manifest.json`, `/packages/extension/manifest.production.json`
   - Updated version to 0.0.59

---

## Git History (Last 5 Commits)

```bash
d29a387 - debug: simplify RPC call for debugging
12b80bb - chore: force cache bust for debug deployment
4e78400 - debug: add error details to generic catch block
93ab7c4 - debug: add error details to presentation save RPC failure
b273477 - debug: add detailed logging to user sync RPC
```

All deployments show state: "ready", but debug info never appears in responses.

---

## Hypotheses for GPT-5 to Investigate

### Hypothesis 1: Type Casting Failure
**Problem**: `authUser.userId` (TEXT) → `p_auth_id` (UUID) cast fails silently
**Evidence**: Supabase JS client might not auto-cast TEXT to UUID
**Test**: Check if `authUser.userId` is a valid UUID string
**Fix**: Explicit cast or change RPC parameter type to TEXT

### Hypothesis 2: Wrong User ID Stored
**Problem**: `device_tokens.user_id` contains `users.id` instead of `auth.users.id`
**Evidence**: Would cause "User not found" in second RPC
**Test**: Query `device_tokens` table to see actual values
**Fix**: Update device token creation to use `auth.users.id`

### Hypothesis 3: CDN/Edge Caching
**Problem**: Netlify Edge or CDN is caching old responses despite fresh builds
**Evidence**: Fresh deployment timestamp but old response format
**Test**: Check Netlify edge logs or bypass CDN
**Fix**: Add cache control headers or use different deployment method

### Hypothesis 4: Error Thrown Before Debug Code
**Problem**: Exception thrown during parameter processing before RPC call
**Evidence**: Generic catch block triggered, but debug not in response
**Test**: Add try-catch around the entire device-token block
**Fix**: Identify exact line throwing exception

---

## Immediate Next Steps for GPT-5

1. **Find Device Token Creation Code**
   - Search for where `storeSecureToken()` is called
   - Verify what `userId` value is passed
   - Check if it's `auth.users.id` (UUID) or `users.id`

2. **Query Database Directly**
   ```sql
   SELECT user_id, user_email, device_id
   FROM device_tokens
   WHERE user_email = 'jarmo@productory.eu'
   LIMIT 1;
   ```
   This will show if `user_id` is a valid UUID string

3. **Test RPC Directly**
   ```typescript
   // Test if RPC works with the actual user_id from device_tokens
   const { data, error } = await supabase.rpc('rpc_sync_user_from_auth', {
     p_auth_id: 'actual-uuid-from-device-tokens',
     p_email: 'jarmo@productory.eu'
   });
   console.log({ data, error });
   ```

4. **Check Netlify Function Logs**
   - Access Netlify dashboard → Functions → View logs
   - Look for request ID: `01K6MXQ22NRP92QEQGYW7ZZKSZ`
   - This will show server-side console.logs

5. **Simplify Error Path**
   ```typescript
   // Replace entire device-token block with:
   if (authUser.source === 'device-token') {
     return withCors(NextResponse.json({
       debug: {
         authUserId: authUser.userId,
         authUserIdType: typeof authUser.userId,
         authUserEmail: authUser.userEmail,
         message: 'Debug: Device token detected'
       }
     }, { status: 200 }), request);
   }
   ```
   This will at least show what `authUser.userId` contains

---

## Key Questions to Answer

1. **What is the exact value of `authUser.userId`?**
   - Is it a UUID string? Integer? Something else?

2. **What is stored in `device_tokens.user_id`?**
   - Query the database to see actual values

3. **Why don't debug logs appear in the response?**
   - Is there CDN caching? Different code path? Exception before debug code?

4. **Where is the device token created?**
   - Find the `/api/devices/exchange` or `/api/devices/link` endpoint
   - Check what `userId` is passed to `storeSecureToken()`

5. **Does the RPC work when called directly?**
   - Test with known UUID from `auth.users` table

---

## Files to Examine

1. `/packages/web/src/app/api/devices/exchange/route.ts` - Where token is created
2. `/packages/web/src/app/api/devices/link/route.ts` - Where device is linked to user
3. `/packages/web/src/utils/secureTokenStore.ts` - Token storage logic (line 42-78)
4. `/packages/web/src/utils/auth-helpers.ts` - Where authUser.userId comes from (line 24)

---

## Success Criteria

1. ✅ Identify exact type/format of `authUser.userId`
2. ✅ Confirm `device_tokens.user_id` contains valid UUID from `auth.users.id`
3. ✅ Get debug info to appear in API responses
4. ✅ Successfully call `rpc_sync_user_from_auth` and get `users.id` back
5. ✅ Successfully save presentation to database
6. ✅ Extension shows "Successfully saved to cloud!" message

---

## Current Deployment

- **Netlify Site**: productory-powerups.netlify.app
- **Latest Deploy**: commit `d29a387` (state: ready)
- **Extension Version**: 0.0.59
- **Database**: Supabase (project: ufhxqbwlnplkjrqxwfvx)

---

## Contact

- **User**: jarmo@productory.eu
- **Extension ID**: bhoijiicgpeihilgcfndkgkifmhccnjn
- **GitHub**: jarmo-productory/gamma-plugin

---

**End of Handover Memo**
