# Duration Suggestions Not Showing - Root Cause Analysis

**Date:** 2025-11-06  
**Issue:** All duration suggestions return zeros (`sampleSize: 0`) and are not displayed in UI

---

## 🔍 Root Cause Identified

### **Problem 1: API Returns Zero Suggestions**

**Location:** `packages/web/src/app/api/presentations/suggestions/duration/route.ts`

**Issue:**
- RPC function `get_duration_suggestion()` **ALWAYS returns a row** (even when no matches)
- When no matches found, RPC returns zeros due to `COALESCE` (line 99-106 in migration)
- API endpoint checks `matches.length === 0` but RPC always returns a row
- API creates suggestion object with `sampleSize: 0` and returns it
- Frontend filters these out (correct behavior) but API shouldn't return zeros

**Fix Applied:**
- ✅ Added check for `result.sample_size === 0` before creating suggestion object
- ✅ Returns `{ success: true, message: 'No similar slides found' }` instead of zero suggestion

### **Problem 2: No Data in slide_fingerprints Table**

**Likely Root Cause:**
- `slide_fingerprints` table is populated by trigger `trg_sync_slide_fingerprints`
- Trigger fires when presentations are saved/updated
- **If no presentations have been saved with durations > 0, table will be empty**
- **If trigger isn't firing, fingerprints won't be created**

**How Fingerprints Are Created:**
1. User saves presentation via `/api/presentations/save`
2. Trigger `trg_sync_slide_fingerprints` fires on `presentations` table
3. Function `sync_slide_fingerprints_incremental()` extracts slides from `timetable_data->'items'`
4. Inserts into `slide_fingerprints` table with normalized title/content

**Content Format Issue:**
- Trigger expects `content` as `string[]` or `ContentItem[]`
- Migration `20251018000000` added `extract_content_text()` helper
- But latest migration `20251020000000` uses old `array_to_string()` method
- **Potential mismatch between content format and extraction**

---

## 🔧 Fixes Applied

### **Fix 1: API Endpoint - Check sample_size** ✅

**File:** `packages/web/src/app/api/presentations/suggestions/duration/route.ts`

**Change:**
```typescript
// CRITICAL: RPC returns zeros when no matches found (due to COALESCE)
// Check sample_size to determine if we actually found matches
if (result.sample_size === 0) {
  return withCors(NextResponse.json({
    success: true,
    message: 'No similar slides found'
  }), request);
}
```

**Impact:** API no longer returns zero suggestions to frontend

### **Fix 2: Trigger Content Extraction - Restore Helper Function** ✅

**File:** `supabase/migrations/20251106195743_fix_trigger_content_extraction.sql`

**Issue:** Migration `20251020000000` reverted trigger to use old `array_to_string()` method, breaking ContentItem[] format support that was added in `20251018000000`.

**Fix:**
- Restored `extract_content_text()` helper function usage in trigger
- Maintains zero-duration support (`duration >= 0`)
- Now correctly handles both `string[]` and `ContentItem[]` formats

**Impact:** 
- Future presentations will create fingerprints correctly
- ContentItem[] format (from extension) will be properly extracted
- Zero-duration slides (section headers) continue to work

---

## 🔬 Investigation Needed

### **1. Check Database State**

**Query to run:**
```sql
-- Check if slide_fingerprints has any data
SELECT COUNT(*) as total_fingerprints, 
       COUNT(DISTINCT user_id) as unique_users,
       COUNT(DISTINCT presentation_id) as unique_presentations,
       AVG(duration) as avg_duration
FROM slide_fingerprints;

-- Check for specific user
SELECT COUNT(*) 
FROM slide_fingerprints 
WHERE user_id = '<your-user-id>';
```

### **2. Verify Trigger is Active**

**Query to run:**
```sql
-- Check if trigger exists and is enabled
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'trg_sync_slide_fingerprints';

-- Check trigger function
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'sync_slide_fingerprints_incremental';
```

### **3. Check Content Format**

**Issue:** Migration `20251020000000` uses old content extraction:
```sql
array_to_string(ARRAY(SELECT jsonb_array_elements_text(item->'content')), ' ')
```

But migration `20251018000000` created helper function:
```sql
extract_content_text(item->'content')
```

**Potential Problem:** Latest migration might have reverted to old method, breaking ContentItem[] format support

### **4. Verify Presentations Have Fingerprints**

**Query to run:**
```sql
-- Check if presentations have corresponding fingerprints
SELECT p.id, p.title, COUNT(sf.id) as fingerprint_count
FROM presentations p
LEFT JOIN slide_fingerprints sf ON sf.presentation_id = p.id
GROUP BY p.id, p.title
ORDER BY fingerprint_count DESC;
```

---

## 🎯 Next Steps

1. **✅ FIXED:** API endpoint now checks `sample_size === 0`
2. **✅ FIXED:** Trigger restored to use `extract_content_text()` helper
3. **⏳ PENDING:** Deploy migration `20251106195743_fix_trigger_content_extraction.sql` (database connection timeout)
4. **TODO:** After migration deployment, check production database for `slide_fingerprints` data
5. **TODO:** Verify trigger is firing when presentations are saved
6. **TODO:** Test saving a presentation and verify fingerprints are created with correct content extraction
7. **TODO:** Lower similarity thresholds if needed (currently 0.60 title, 0.40 content)
8. **TODO:** Existing presentations may need to be re-saved to regenerate fingerprints with correct extraction

---

## 📊 Expected Behavior After Fix

**Before:**
- API returns: `{ success: true, suggestion: { sampleSize: 0, averageDuration: 0, ... } }`
- Frontend filters out (doesn't display)
- Console shows zeros

**After:**
- API returns: `{ success: true, message: 'No similar slides found' }`
- Frontend doesn't store zero suggestions
- Console shows "No similar slides found" message
- **Once fingerprints exist:** API returns real suggestions with `sampleSize > 0`

---

## 🐛 Additional Issue: content.js Error

**Error:** `content.js:6 Uncaught TypeError: Cannot redefine property: __s@3s'"A213D+3`

**Impact:** May be unrelated to suggestions, but could affect extension functionality

**Investigation Needed:** Check content.js for property redefinition issues

---

**Status:** API fix applied. Database investigation needed to determine why fingerprints aren't being created.

