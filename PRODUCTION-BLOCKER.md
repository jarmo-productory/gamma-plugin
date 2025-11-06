# 🚨 PRODUCTION BLOCKER - DATABASE MIGRATION MISSING

**Date:** October 5, 2025
**Severity:** P0 - CRITICAL
**Status:** ❌ **BLOCKING PRODUCTION**

---

## Issue

**Presentation save failing with 500 errors** because the **October 4 database migration was NOT deployed to production Supabase**.

## Root Cause (CORRECT Diagnosis)

**October 4, 2025** - Migration `20251004101500_update_presentations_rpc_auth_sync.sql` was created locally but **NEVER pushed to production Supabase database**.

**Result:**
- ✅ Code in production Netlify expects NEW RPC signature: `rpc_upsert_presentation_from_device(p_auth_id, p_email, p_gamma_url, ...)`
- ❌ Production Supabase has OLD RPC signature: `rpc_upsert_presentation_from_device(p_auth_id, p_gamma_url, p_title, p_timetable_data, ...)`
- 💥 Parameter mismatch → PostgreSQL error → 500 response

## Why GPT-5 Was Right

My initial diagnosis was **WRONG**. I thought changing JavaScript object key order would fix it, but:

**PostgreSQL uses NAMED parameters** - the order in the JS object doesn't matter!

```javascript
// These are IDENTICAL to PostgreSQL:
{ p_auth_id: 'x', p_email: 'y', p_gamma_url: 'z' }
{ p_gamma_url: 'z', p_auth_id: 'x', p_email: 'y' }
```

The real issue is **production Supabase doesn't have the updated RPC function**.

## How to Fix

### Option 1: Deploy Migration to Production Supabase (RECOMMENDED)

```bash
# Deploy the October 4 migration to production
supabase db push --linked --include-all

# Or if migration history is broken:
supabase migration repair --status reverted 20251004101500_update_presentations_rpc_auth_sync
supabase db push --linked
```

### Option 2: Manually Run SQL in Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Run the contents of `/supabase/migrations/20251004101500_update_presentations_rpc_auth_sync.sql`
3. Verify function exists:
   ```sql
   SELECT proname, proargtypes
   FROM pg_proc
   WHERE proname = 'rpc_upsert_presentation_from_device';
   ```

### Option 3: Rollback Code to Match Production Database

Revert `/packages/web/src/app/api/presentations/save/route.ts` to use OLD RPC signature:

```typescript
// OLD signature (matches current production):
const { data, error } = await supabase.rpc('rpc_upsert_presentation_from_device', {
  p_auth_id: authUser.userId,
  p_gamma_url: canonicalUrl,
  p_title: payload.title,
  p_timetable_data: payload.timetable_data,
  p_start_time: payload.start_time ?? null,
  p_total_duration: payload.total_duration ?? null,
});
```

**Note:** This requires removing `p_email` parameter and finding another way to sync user email.

## Impact

- ❌ Device-token presentation saves: **100% failing** with 500 errors
- ✅ Web dashboard saves: **Working** (uses different code path)
- ✅ Device pairing: **Working** (unaffected)
- ✅ Extension load: **Working** (unaffected)

## Testing Required After Fix

1. Deploy migration to production Supabase
2. Wait 30 seconds for Supabase to apply changes
3. Test extension save flow:
   - Should return HTTP 200 (not 500)
   - Should create presentation record in database
   - Should sync user email to `users` table

## Timeline

- **Oct 4, 2025 22:12** - Migration created locally (`20251004101500_update_presentations_rpc_auth_sync.sql`)
- **Oct 4, 2025 22:15** - Code deployed to Netlify with NEW RPC call
- **Oct 4-5** - Migration **NOT deployed** to production Supabase
- **Oct 5, 2025 12:00** - Pre-push testing discovered 500 errors
- **Oct 5, 2025 12:20** - Initial diagnosis WRONG (parameter order)
- **Oct 5, 2025 13:50** - GPT-5 correction: database migration missing
- **Oct 5, 2025 13:55** - ⏳ AWAITING DATABASE MIGRATION DEPLOYMENT

## Lessons Learned

1. **Database migrations MUST be deployed WITH code changes** - Code and schema must stay in sync
2. **Named parameters ≠ positional** - JavaScript object key order doesn't affect PostgreSQL
3. **Always verify production database state** - Don't assume migrations auto-deploy
4. **GPT-5 code review caught critical error** - AI pair programming works!

## Related Files

- Migration: `/supabase/migrations/20251004101500_update_presentations_rpc_auth_sync.sql`
- API Route: `/packages/web/src/app/api/presentations/save/route.ts`
- Commit 44af98c: Last deployment (with NEW code, OLD database)

---

**ACTION REQUIRED:** Deploy database migration to production Supabase BEFORE pushing code to GitHub!
