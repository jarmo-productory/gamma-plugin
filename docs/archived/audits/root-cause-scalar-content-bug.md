# Root Cause Analysis: Scalar `content` Field Causing Presentation Save Failures

**Date:** October 18, 2025
**Severity:** P0 - PRODUCTION BLOCKER
**Status:** ✅ ROOT CAUSE IDENTIFIED

---

## Executive Summary

Presentation saves are failing with `HTTP 400 "cannot extract elements from a scalar"` because the database trigger `sync_slide_fingerprints_incremental` expects `content` to be a JSONB array, but the extension is sending **ContentItem[] objects** (not string arrays).

**The Issue:**
- **Type Definition Says:** `content: string[]` (array of strings)
- **Extension Actually Sends:** `ContentItem[]` (array of objects with `{type, text, subItems}`)
- **Database Trigger Expects:** JSONB array to call `jsonb_array_elements_text()`
- **What Happens:** When `content` is an object array, `jsonb_array_elements_text()` fails

---

## Data Flow Analysis

### 1️⃣ **Extension Extraction** (content.ts:106-140)

```typescript
interface ContentItem {
  type: 'paragraph' | 'image' | 'link' | 'list_item';
  text: string;
  subItems: string[];
}

interface SlideData {
  id: string;
  title: string;
  content: ContentItem[];  // ⚠️ Array of OBJECTS, not strings!
  order: number;
  level: number;
  presentationUrl: string;
}
```

**Example Extracted Content:**
```json
{
  "id": "slide-1",
  "title": "Introduction",
  "content": [
    { "type": "paragraph", "text": "Welcome to the course", "subItems": [] },
    { "type": "list_item", "text": "Main point", "subItems": ["Sub point 1", "Sub point 2"] }
  ]
}
```

### 2️⃣ **Type Definition** (packages/shared/types/index.ts:6-18)

```typescript
export interface Slide {
  id: string;
  title: string;
  content: string[];  // ❌ WRONG! Says string[] but receives ContentItem[]
}

export interface TimetableItem {
  id: string;
  title: string;
  content: string[];  // ❌ WRONG! Same mismatch
  startTime: string;
  duration: number;
  endTime: string;
}
```

**THE MISMATCH:**
- Type says `string[]`
- Extension sends `ContentItem[]`
- No runtime validation catches this!

### 3️⃣ **Storage & Transmission** (packages/shared/storage/index.ts:266-281)

```typescript
const normalizedItems = Array.isArray(timetableData?.items)
  ? timetableData.items
      .map((item: any) => {
        return {
          id,
          title,
          duration: Number.isFinite(duration) ? duration : 0,
          startTime,
          endTime,
          // ⚠️ PRESERVES CONTENT AS-IS - NO NORMALIZATION!
          content: item?.content,
        };
      })
```

**What Gets Sent to API:**
```json
{
  "gamma_url": "https://gamma.app/docs/...",
  "timetable_data": {
    "items": [
      {
        "id": "slide-1",
        "title": "Introduction",
        "content": [
          { "type": "paragraph", "text": "Welcome", "subItems": [] }
        ]
      }
    ]
  }
}
```

### 4️⃣ **Database Trigger Failure** (20251001154438_slide_fingerprints.sql:219-220)

```sql
-- This line FAILS when content is ContentItem[]
array_to_string(ARRAY(SELECT jsonb_array_elements_text(item->'content')), ' ')
```

**Why It Fails:**
- `jsonb_array_elements_text()` expects an array of **primitive values** (strings, numbers)
- When given `[{"type":"paragraph","text":"..."}]`, it errors with:
  ```
  "cannot extract elements from a scalar"
  ```

---

## The Three-Way Type Conflict

| Component | Expected Type | Actual Data | Result |
|-----------|--------------|-------------|--------|
| **Type Definition** | `content: string[]` | `ContentItem[]` | ❌ Type lies |
| **Extension** | Sends `ContentItem[]` | `ContentItem[]` | ✅ Matches extraction |
| **Database Trigger** | `jsonb_array_elements_text()` | `ContentItem[]` | ❌ Fails on objects |

---

## Why This Wasn't Caught Earlier

### 1. **TypeScript Doesn't Enforce Runtime**
```typescript
// This compiles fine even though types are wrong!
const slide: Slide = {
  id: "1",
  title: "Test",
  content: [{ type: "paragraph", text: "Hello", subItems: [] }] as any
};
```

### 2. **No Schema Validation in StorageManager**
```typescript
// Line 281: Just passes content through
content: item?.content,  // No validation!
```

### 3. **Trigger Was Written for String Arrays**
The original design assumed `content: string[]` for text similarity matching:
```sql
-- Designed for: ["Welcome to the course", "Key points", "Summary"]
-- Receives: [{"type":"paragraph","text":"Welcome"}]
```

### 4. **Legacy Data May Have String Arrays**
Some older presentations might have:
```json
{
  "content": ["Simple text 1", "Simple text 2"]  // ✅ Works with trigger
}
```

But newer extension sends:
```json
{
  "content": [{"type":"paragraph","text":"Simple text 1"}]  // ❌ Breaks trigger
}
```

---

## Evidence Trail

### **File: packages/extension/content.ts:21-34**
```typescript
interface ContentItem {
  type: 'paragraph' | 'image' | 'link' | 'list_item';
  text: string;
  subItems: string[];
}

interface SlideData {
  id: string;
  title: string;
  content: ContentItem[];  // Definitive proof: Objects, not strings
  ...
}
```

### **File: packages/extension/sidebar/sidebar.js:64**
```javascript
content: slide.content,  // Passes ContentItem[] to timetable
```

### **File: packages/shared/types/index.ts:9**
```typescript
content: string[];  // WRONG! Doesn't match reality
```

### **File: packages/shared/storage/index.ts:281**
```typescript
content: item?.content,  // No normalization - passes objects as-is
```

### **File: supabase/migrations/20251001154438_slide_fingerprints.sql:219**
```sql
jsonb_array_elements_text(item->'content')  -- Expects primitive array
```

---

## Impact Assessment

### **Working Scenarios:**
✅ Legacy presentations with `content: string[]`
✅ Manually created test data with string arrays
✅ Any saves that skip the slide fingerprint trigger

### **Broken Scenarios:**
❌ New presentations saved via extension (since content.ts was written)
❌ Any presentation with rich content (paragraphs, images, links, lists)
❌ Production device-token saves (100% failure rate)

---

## Proposed Fix Strategies

### **Option 1: Normalize to String Array in Extension** (RECOMMENDED)
**Change:** `packages/extension/lib/timetable.js` or `content.ts`

```javascript
// Before sending to storage, flatten ContentItem[] to string[]
function flattenContent(contentItems) {
  return contentItems.map(item => {
    let text = item.text;
    if (item.subItems && item.subItems.length > 0) {
      text += ': ' + item.subItems.join(', ');
    }
    return text;
  });
}
```

**Pros:**
- Matches type definition `content: string[]`
- Works with existing trigger
- Simple text for similarity matching
- No migration needed

**Cons:**
- Loses type information (paragraph vs image)
- Cannot reconstruct rich content

---

### **Option 2: Fix Database Trigger to Handle Objects**
**Change:** `supabase/migrations/20251001154438_slide_fingerprints.sql`

```sql
-- Extract text from ContentItem objects
array_to_string(
  ARRAY(
    SELECT
      CASE
        WHEN jsonb_typeof(elem) = 'string' THEN elem #>> '{}'
        WHEN jsonb_typeof(elem) = 'object' THEN elem #>> '{text}'
        ELSE ''
      END
    FROM jsonb_array_elements(item->'content') AS elem
  ),
  ' '
)
```

**Pros:**
- Preserves rich content structure
- Backward compatible with string arrays
- Handles both formats

**Cons:**
- More complex SQL
- Requires new migration deployment

---

### **Option 3: Normalize in StorageManager (API Gateway)**
**Change:** `packages/shared/storage/index.ts:281`

```typescript
// Normalize content before API call
content: Array.isArray(item?.content)
  ? item.content.map(c =>
      typeof c === 'string' ? c : (c.text || '')
    )
  : [],
```

**Pros:**
- Fixes at the boundary (extension → API)
- Ensures API always receives string[]
- No database changes needed

**Cons:**
- Loses rich content structure
- Doesn't fix type definition lie

---

## Recommended Implementation Plan

### **Phase 1: Immediate Fix (Deploy Today)**
1. **Update trigger** to handle both string[] and ContentItem[]
2. **Deploy migration** to production Supabase
3. **Test** with real extension save

### **Phase 2: Clean Up Types (Next Sprint)**
1. **Fix type definitions** to match reality:
   ```typescript
   content: ContentItem[] | string[]  // Support both
   ```
2. **Add runtime validation** in StorageManager
3. **Update documentation** to clarify expected formats

### **Phase 3: Long-term (Future)**
1. **Decide on canonical format:** String[] or ContentItem[]?
2. **Migrate all data** to chosen format
3. **Remove dual-format support**

---

## Testing Checklist

- [ ] Create presentation with paragraphs → Save → Verify success
- [ ] Create presentation with images → Save → Verify success
- [ ] Create presentation with lists → Save → Verify success
- [ ] Load legacy presentation with string[] content → Verify works
- [ ] Verify slide fingerprints created correctly for both formats
- [ ] Check production database for existing scalar content entries

---

## Lessons Learned

1. **Type definitions must match runtime reality** - TypeScript types are documentation, not validation
2. **Add schema validation at boundaries** - Don't trust `any` types
3. **Test with real production data** - Mock data hides type mismatches
4. **Database constraints catch bugs** - Triggers exposed the mismatch that TS missed
5. **Document data format evolution** - Track when ContentItem[] replaced string[]

---

## Related Files

- `/packages/extension/content.ts` - ContentItem definition
- `/packages/shared/types/index.ts` - Type definitions (WRONG)
- `/packages/shared/storage/index.ts` - Payload assembly (no validation)
- `/supabase/migrations/20251001154438_slide_fingerprints.sql` - Trigger failure point
- `/packages/extension/sidebar/sidebar.js` - Content rendering (expects ContentItem[])

---

**Next Steps:** Choose fix strategy and implement.
