# Slide Duration Prediction Feature - Research & Technical Audit
**Date:** September 30, 2025
**Sprint:** 36 (Research Phase)
**Status:** Research Complete - Ready for Implementation Planning

---

## Executive Summary

This audit documents research and technical design for a **slide duration prediction system** that leverages historical slide data to automatically suggest durations when users copy or modify existing presentations.

### Core User Problem
Users frequently create new Gamma presentations by duplicating existing ones, modifying only 20-25% of slides. Currently, they must manually re-estimate durations for all slides, including unchanged ones—wasting time and producing inconsistent estimates.

### Proposed Solution (REVISED after feedback)
**Production-ready fingerprint-based duration prediction with enterprise safeguards:**
- **Tier 1:** Title matching ≥95% similarity (indexed, normalized)
- **Tier 2:** Content matching ≥90% similarity (indexed, normalized)
- **Result:** Trimmed-mean duration with outlier filtering (IQR method)
- **RLS-compliant:** User-scoped by default, opt-in cross-user sharing
- **Incremental sync:** 40x fewer writes vs naive delete-insert trigger
- **Text normalization:** Canonical serialization ensures TS ↔ SQL consistency

### Key Improvements (v2 - Post-Feedback)
1. ✅ **RLS security policies** - user_id enforcement + cross-user opt-in
2. ✅ **Incremental trigger** - 90% reduction in write amplification
3. ✅ **Text normalization** - Lowercase, punctuation removal, whitespace collapse
4. ✅ **Canonical serialization** - Identical fingerprints across TypeScript & SQL
5. ✅ **Variance handling** - IQR outlier filtering + coefficient of variation
6. ✅ **Batched migration** - Production-safe backfill with rollback strategy
7. ✅ **Prototype testing** - Comprehensive SQL test suite for threshold calibration

---

## 1. Current System Analysis

### Database Schema (Validated)
```sql
-- Presentations table (supabase/migrations/20240718000001_initial_schema.sql)
CREATE TABLE presentations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title VARCHAR NOT NULL,
  gamma_url VARCHAR UNIQUE NOT NULL,
  start_time VARCHAR DEFAULT '09:00',
  total_duration INTEGER DEFAULT 0,
  timetable_data JSONB NOT NULL,  -- Contains slides array
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Slide Data Structure (TypeScript Types)
```typescript
// packages/shared/types/index.ts
interface TimetableItem {
  id: string;           // Unique slide ID
  title: string;        // Slide title
  content: string[];    // Array of content lines
  duration: number;     // Duration in minutes
  startTime: string;    // Calculated start time
  endTime: string;      // Calculated end time
}

// packages/web/src/schemas/presentations.ts
timetable_data: {
  items: TimetableItem[];
  startTime: string;
  totalDuration: number;
}
```

### Current Duration Tracking
- **Storage:** Each slide's duration stored in `timetable_data.items[].duration`
- **Input:** Manual user entry via `EditableDurationCell` component (packages/web/src/app/gamma/timetables/[id]/components/EditableDurationCell.tsx:10-129)
- **Persistence:** Saved via `/api/presentations/save` route (packages/web/src/app/api/presentations/save/route.ts:1-158)
- **No historical analysis:** Currently no fingerprinting or similarity matching

---

## 2. Text Similarity Research

### Algorithm Comparison

| Algorithm | Use Case | Performance | PostgreSQL Support | Recommendation |
|-----------|----------|-------------|-------------------|----------------|
| **pg_trgm (Trigrams)** | Fuzzy text matching | Fast with GIN/GiST indexes | Native extension | ✅ **Best for 90% similarity** |
| **Levenshtein** | Character-level edits | O(n×m) - expensive | fuzzystrmatch extension | ❌ Too slow for bulk queries |
| **Jaccard** | Token-based similarity | Fast (set operations) | Requires custom impl. | ⚠️ Good for fallback |

### Selected Approach: PostgreSQL Trigrams (pg_trgm)

**Why pg_trgm?**
1. **Native PostgreSQL support** - No external dependencies
2. **Supabase officially supported** - Pre-configured extension (one-click enable)
3. **Index-backed performance** - GIN indexes enable fast similarity searches
4. **Percentage-based matching** - `similarity(text1, text2)` returns 0-1 score (perfect for ≥90% threshold)
5. **Proven at scale** - Handles millions of rows with sub-second queries

**Supabase Compatibility:** ✅ VERIFIED
- Extension: `pg_trgm` (Text similarity measurement and index searching based on trigrams)
- Status: Pre-installed, available in all Supabase projects
- Enable method: Dashboard (Database → Extensions) or SQL (`CREATE EXTENSION pg_trgm`)
- Documentation: https://supabase.com/docs/guides/database/extensions

**Performance Characteristics:**
- **Without index:** O(n) linear scan - ~seconds for millions of rows
- **With GIN index:** O(log n) indexed lookup - ~milliseconds even at scale
- **Similarity calculation:** Jaccard coefficient on trigram sets

**PostgreSQL Functions:**
```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Similarity score (0.0 - 1.0)
SELECT similarity('slide title', 'slide title') AS score;  -- Returns 1.0 (exact match)
SELECT similarity('Introduction to AI', 'Intro to AI') AS score;  -- Returns ~0.65

-- Indexed similarity search
CREATE INDEX idx_slides_title_trgm ON slides USING GIN (title gin_trgm_ops);
SELECT * FROM slides WHERE similarity(title, 'target title') > 0.9;
```

---

## 3. Technical Design: Two-Tier Matching Strategy

### Matching Logic Flow

```
┌─────────────────────────────────────────────────────────┐
│ User copies/modifies slide                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ TIER 1: Title Matching (Fast Filter)                    │
│ ─────────────────────────────────────────────────────── │
│ • Use pg_trgm similarity on slide.title                 │
│ • Threshold: similarity() ≥ 0.95 (95% title match)     │
│ • Indexed query: ~5ms for 100k slides                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ TIER 2: Content Matching (Precision Filter)             │
│ ─────────────────────────────────────────────────────── │
│ • Concatenate slide.content[] array into single text    │
│ • Use pg_trgm similarity on concatenated content        │
│ • Threshold: similarity() ≥ 0.90 (90% content match)   │
│ • Applied only to Tier 1 candidates (~10-50 slides)    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Duration Aggregation                                     │
│ ─────────────────────────────────────────────────────── │
│ • Collect all matching slides' durations                │
│ • Calculate average: AVG(duration)                      │
│ • Return suggested duration with metadata:              │
│   - Average duration                                    │
│   - Sample size (number of matches)                     │
│   - Confidence score (based on sample size & variance)  │
└─────────────────────────────────────────────────────────┘
```

### Why This Design Works

**Title Matching First (Tier 1):**
- ✅ Fast indexed filtering - reduces candidate pool from 100k→50 slides
- ✅ High recall - catches most similar slides
- ✅ Tolerates minor typos (e.g., "Intro" vs "Introduction")

**Content Matching Second (Tier 2):**
- ✅ High precision - ensures slides are truly similar
- ✅ Handles minor edits (fixed typo, added sentence = still matches)
- ✅ Small candidate pool makes expensive content comparison feasible

**Pragmatic Thresholds:**
- **Title: 95%** - Strict enough to filter noise, flexible enough for small variations
- **Content: 90%** - Matches user's requirement, tolerates ~10% modifications

---

## 4. Database Design

### Option A: Materialized Slide Index (Recommended)

**Create dedicated table for fast similarity searches:**

```sql
-- New table: slide_fingerprints (RLS-COMPLIANT)
CREATE TABLE slide_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- RLS: Required for policy enforcement
  presentation_id UUID REFERENCES presentations(id) ON DELETE CASCADE,
  slide_id VARCHAR NOT NULL,  -- Original timetable_data.items[].id
  title TEXT NOT NULL,
  title_normalized TEXT NOT NULL,  -- Normalized for accurate matching
  content_text TEXT NOT NULL,  -- Concatenated content[] array
  content_normalized TEXT NOT NULL,  -- Normalized for accurate matching
  duration INTEGER NOT NULL,   -- Minutes
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Composite unique constraint
  UNIQUE(presentation_id, slide_id)
);

-- RLS: Enable Row Level Security
ALTER TABLE slide_fingerprints ENABLE ROW LEVEL SECURITY;

-- RLS POLICY 1: Users can view only their own fingerprints by default
CREATE POLICY "Users view own slide fingerprints" ON slide_fingerprints
  FOR SELECT
  USING (user_id = auth.uid()::uuid);

-- RLS POLICY 2: Users can insert only their own fingerprints (via trigger)
CREATE POLICY "Users insert own slide fingerprints" ON slide_fingerprints
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::uuid);

-- RLS POLICY 3: Users can delete only their own fingerprints
CREATE POLICY "Users delete own slide fingerprints" ON slide_fingerprints
  FOR DELETE
  USING (user_id = auth.uid()::uuid);

-- RLS POLICY 4 (OPTIONAL): Cross-user suggestions for opted-in users
-- This policy allows reading fingerprints from users who enabled sharing
CREATE POLICY "Cross-user suggestions for opt-in users" ON slide_fingerprints
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users
      WHERE preferences->>'share_duration_data' = 'true'
    )
  );

-- Trigram indexes for similarity matching (on NORMALIZED fields)
CREATE INDEX idx_slide_fingerprints_title_trgm
  ON slide_fingerprints USING GIN (title_normalized gin_trgm_ops);

CREATE INDEX idx_slide_fingerprints_content_trgm
  ON slide_fingerprints USING GIN (content_normalized gin_trgm_ops);

-- Performance indexes
CREATE INDEX idx_slide_fingerprints_duration
  ON slide_fingerprints (duration);

CREATE INDEX idx_slide_fingerprints_user_id
  ON slide_fingerprints (user_id);

CREATE INDEX idx_slide_fingerprints_updated_at
  ON slide_fingerprints (updated_at DESC);
```

**Text Normalization Function (for accurate similarity matching):**

```sql
-- Normalization helper: lowercase, remove punctuation, collapse whitespace
CREATE OR REPLACE FUNCTION normalize_text(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN regexp_replace(
    regexp_replace(
      lower(trim(input_text)),
      '[^\w\s]', '', 'g'  -- Remove punctuation
    ),
    '\s+', ' ', 'g'  -- Collapse multiple spaces
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Incremental Trigger Strategy (avoids delete-insert amplification):**

```sql
-- STRATEGY: Compare OLD vs NEW timetable_data, only update changed slides
CREATE OR REPLACE FUNCTION sync_slide_fingerprints_incremental()
RETURNS TRIGGER AS $$
DECLARE
  old_items JSONB;
  new_items JSONB;
  old_item JSONB;
  new_item JSONB;
  slide_changed BOOLEAN;
BEGIN
  -- Extract user_id from presentations table (for RLS)
  DECLARE
    target_user_id UUID;
  BEGIN
    SELECT user_id INTO target_user_id
    FROM presentations
    WHERE id = NEW.id;
  END;

  -- Handle INSERT: Create all fingerprints
  IF TG_OP = 'INSERT' THEN
    INSERT INTO slide_fingerprints (
      user_id,
      presentation_id,
      slide_id,
      title,
      title_normalized,
      content_text,
      content_normalized,
      duration
    )
    SELECT
      target_user_id,
      NEW.id,
      item->>'id',
      item->>'title',
      normalize_text(item->>'title'),
      array_to_string(
        ARRAY(SELECT jsonb_array_elements_text(item->'content')),
        ' '
      ),
      normalize_text(
        array_to_string(
          ARRAY(SELECT jsonb_array_elements_text(item->'content')),
          ' '
        )
      ),
      (item->>'duration')::INTEGER
    FROM jsonb_array_elements(NEW.timetable_data->'items') AS item;

    RETURN NEW;
  END IF;

  -- Handle UPDATE: Incremental sync (only changed slides)
  IF TG_OP = 'UPDATE' THEN
    old_items := OLD.timetable_data->'items';
    new_items := NEW.timetable_data->'items';

    -- STEP 1: Delete slides removed from presentation
    DELETE FROM slide_fingerprints
    WHERE presentation_id = NEW.id
      AND slide_id NOT IN (
        SELECT item->>'id'
        FROM jsonb_array_elements(new_items) AS item
      );

    -- STEP 2: Upsert new/changed slides
    FOR new_item IN SELECT * FROM jsonb_array_elements(new_items)
    LOOP
      -- Check if slide exists in OLD data
      SELECT item INTO old_item
      FROM jsonb_array_elements(old_items) AS item
      WHERE item->>'id' = new_item->>'id';

      -- Determine if slide changed (compare title, content, duration)
      IF old_item IS NULL THEN
        slide_changed := TRUE;  -- New slide
      ELSE
        slide_changed := (
          old_item->>'title' != new_item->>'title' OR
          old_item->'content' != new_item->'content' OR
          old_item->>'duration' != new_item->>'duration'
        );
      END IF;

      -- Upsert only if changed
      IF slide_changed THEN
        INSERT INTO slide_fingerprints (
          user_id,
          presentation_id,
          slide_id,
          title,
          title_normalized,
          content_text,
          content_normalized,
          duration,
          updated_at
        )
        VALUES (
          target_user_id,
          NEW.id,
          new_item->>'id',
          new_item->>'title',
          normalize_text(new_item->>'title'),
          array_to_string(
            ARRAY(SELECT jsonb_array_elements_text(new_item->'content')),
            ' '
          ),
          normalize_text(
            array_to_string(
              ARRAY(SELECT jsonb_array_elements_text(new_item->'content')),
              ' '
            )
          ),
          (new_item->>'duration')::INTEGER,
          NOW()
        )
        ON CONFLICT (presentation_id, slide_id)
        DO UPDATE SET
          title = EXCLUDED.title,
          title_normalized = EXCLUDED.title_normalized,
          content_text = EXCLUDED.content_text,
          content_normalized = EXCLUDED.content_normalized,
          duration = EXCLUDED.duration,
          updated_at = NOW();
      END IF;
    END LOOP;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_slide_fingerprints
  AFTER INSERT OR UPDATE ON presentations
  FOR EACH ROW
  EXECUTE FUNCTION sync_slide_fingerprints_incremental();
```

**Write Amplification Analysis:**

| Operation | Simple Trigger (DELETE + INSERT ALL) | Incremental Trigger (UPSERT changed) |
|-----------|-------------------------------------|-------------------------------------|
| Update 1 slide in 20-slide deck | 40 writes (20 deletes + 20 inserts) | 1 write (1 upsert) |
| Update 5 slides in 20-slide deck | 40 writes | 5 writes (5 upserts) |
| Add 1 slide to 20-slide deck | 42 writes (20 deletes + 21 inserts) | 1 write (1 insert) |
| **Improvement** | **Baseline** | **40x fewer writes** for single-slide edits |

**Performance Impact:**
- Trigger execution time: +10-30ms (due to comparison logic)
- Index maintenance: ~80-95% reduction in reindexing operations
- Storage churn: ~90% reduction for typical edit patterns

**Benefits:**
- ✅ Fast queries (indexed similarity searches)
- ✅ Automatic sync (trigger-based)
- ✅ Scales to millions of slides
- ✅ No denormalization of presentations table

### Option B: Direct JSONB Queries (Not Recommended)

Query `presentations.timetable_data` JSONB directly:

```sql
-- Example query (slow without specialized indexes)
SELECT
  item->>'duration' AS duration
FROM presentations,
  jsonb_array_elements(timetable_data->'items') AS item
WHERE
  similarity(item->>'title', 'Target Title') > 0.95
  AND similarity(
    array_to_string(
      ARRAY(SELECT jsonb_array_elements_text(item->'content')),
      ' '
    ),
    'Target Content'
  ) > 0.90;
```

**Why NOT this approach:**
- ❌ No trigram indexes on JSONB content (pg_trgm doesn't support JSONB expressions)
- ❌ Slow O(n) table scans for every query
- ❌ Complex query syntax

---

## 5. API Design

### Content Serialization Contract (API ↔ Database)

**CRITICAL: Canonical serialization ensures identical fingerprints across layers**

```typescript
// TypeScript: Canonical content serializer (shared/utils/fingerprint.ts)
export function serializeSlideContent(content: string[]): string {
  // Step 1: Join array with single space (matches SQL array_to_string)
  // Step 2: Normalize for matching (lowercase, remove punctuation, collapse whitespace)
  return content
    .join(' ')                          // "Overview of ML" + "Neural networks"
    .toLowerCase()                      // "overview of ml neural networks"
    .replace(/[^\w\s]/g, '')           // Remove punctuation
    .replace(/\s+/g, ' ')              // Collapse whitespace
    .trim();                           // Remove leading/trailing spaces
}

// Usage in API endpoint
const contentFingerprint = serializeSlideContent(request.content);
// Returns: "overview of machine learning neural networks basics"
```

```sql
-- PostgreSQL: Matching serialization (must produce IDENTICAL output)
normalize_text(
  array_to_string(
    ARRAY(SELECT jsonb_array_elements_text(item->'content')),
    ' '  -- Join with single space (matches TypeScript .join(' '))
  )
)
-- normalize_text function applies: lowercase, remove punctuation, collapse spaces
-- Output: "overview of machine learning neural networks basics"
```

**Validation Test:**
```typescript
// Test that TS and SQL produce identical fingerprints
const testContent = ["Overview of ML!", "Neural networks..."];

const tsFingerprint = serializeSlideContent(testContent);
// "overview of ml neural networks"

const sqlFingerprint = await db.query(`
  SELECT normalize_text(array_to_string(ARRAY['Overview of ML!', 'Neural networks...'], ' '))
`);
// "overview of ml neural networks"

assert(tsFingerprint === sqlFingerprint);  // MUST MATCH
```

---

### New Endpoint: `/api/slides/suggest-duration`

**Request:**
```typescript
POST /api/slides/suggest-duration
{
  "title": "Introduction to AI",
  "content": ["Overview of machine learning", "Neural networks basics"],  // Array format (canonical)
  "userId": "uuid"  // Optional: prioritize user's own history
}
```

**API Handler (TypeScript):**
```typescript
// packages/web/src/app/api/slides/suggest-duration/route.ts
import { serializeSlideContent } from '@/utils/fingerprint';

export async function POST(request: Request) {
  const { title, content, userId } = await request.json();

  // Serialize content using canonical function
  const contentText = serializeSlideContent(content);

  // Call PostgreSQL function with serialized text
  const result = await supabase.rpc('suggest_slide_duration', {
    p_title: title,
    p_content: contentText,  // Already normalized by serializeSlideContent
    p_user_id: userId
  });

  return NextResponse.json(result);
}
```

**Response:**
```typescript
{
  "success": true,
  "suggestion": {
    "averageDuration": 15,        // Minutes (trimmed mean, outliers removed)
    "medianDuration": 14,         // Median (robust to outliers)
    "sampleSize": 42,             // Number of matching slides
    "variance": 3.2,              // Standard deviation (consistency indicator)
    "confidence": "high",         // high/medium/low based on sample size + variance
    "confidenceScore": 0.92,      // 0-1 score
    "matchQuality": {
      "titleSimilarity": 0.98,
      "contentSimilarity": 0.94
    },
    "durationRange": {
      "min": 10,
      "max": 20,
      "p25": 12,                  // 25th percentile
      "p75": 17                   // 75th percentile
    }
  },
  "fallback": {
    "defaultDuration": 10,        // System default if no matches
    "reason": "no_matches"        // or "low_confidence" or "high_variance"
  }
}
```

**Enhanced Confidence Scoring (with variance handling):**
```typescript
// packages/web/src/utils/confidence.ts
interface ConfidenceResult {
  level: 'high' | 'medium' | 'low';
  score: number;
  reason?: string;
}

function calculateConfidence(
  sampleSize: number,
  variance: number,
  avgDuration: number
): ConfidenceResult {
  // Step 1: Check sample size threshold
  if (sampleSize < 3) {
    return { level: 'low', score: 0.2, reason: 'insufficient_samples' };
  }

  // Step 2: Calculate coefficient of variation (CV)
  // CV = (std_dev / mean) - measures relative variability
  const coefficientOfVariation = variance / avgDuration;

  // Step 3: Determine confidence based on sample size + variance
  if (sampleSize >= 10 && coefficientOfVariation < 0.3) {
    // High confidence: Many samples, low variance (CV < 30%)
    return { level: 'high', score: 0.9 };
  }

  if (sampleSize >= 10 && coefficientOfVariation < 0.5) {
    // Medium-high: Many samples, moderate variance
    return { level: 'medium', score: 0.7 };
  }

  if (sampleSize >= 5 && coefficientOfVariation < 0.4) {
    // Medium: Decent samples, acceptable variance
    return { level: 'medium', score: 0.6 };
  }

  if (coefficientOfVariation >= 0.5) {
    // Low confidence: High variance (CV ≥ 50%) - durations too inconsistent
    return { level: 'low', score: 0.3, reason: 'high_variance' };
  }

  // Default: Low-medium confidence
  return { level: 'medium', score: 0.5 };
}

// Example scenarios:
// - 42 samples, avg=15min, variance=2min, CV=0.13 → HIGH (consistent data)
// - 12 samples, avg=15min, variance=7min, CV=0.47 → MEDIUM (some variation)
// - 30 samples, avg=15min, variance=10min, CV=0.67 → LOW (too inconsistent)
```

### SQL Query (PostgreSQL Function with Outlier Handling)

```sql
CREATE OR REPLACE FUNCTION suggest_slide_duration(
  p_title TEXT,
  p_content TEXT,
  p_user_id UUID DEFAULT NULL,
  p_cross_user BOOLEAN DEFAULT FALSE  -- Opt-in for cross-user suggestions
)
RETURNS TABLE(
  avg_duration NUMERIC,
  median_duration NUMERIC,
  sample_size BIGINT,
  variance NUMERIC,
  min_duration INTEGER,
  max_duration INTEGER,
  p25_duration NUMERIC,
  p75_duration NUMERIC,
  title_similarity NUMERIC,
  content_similarity NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH title_candidates AS (
    -- Tier 1: Title matching (fast indexed filter using NORMALIZED fields)
    SELECT
      sf.id,
      sf.duration,
      similarity(sf.title_normalized, normalize_text(p_title)) AS title_sim
    FROM slide_fingerprints sf
    WHERE similarity(sf.title_normalized, normalize_text(p_title)) > 0.95
    -- RLS: User's own slides OR opted-in cross-user data
    AND (
      sf.user_id = p_user_id
      OR (p_cross_user AND sf.user_id IN (
        SELECT id FROM users WHERE preferences->>'share_duration_data' = 'true'
      ))
    )
  ),
  content_matches AS (
    -- Tier 2: Content matching (precision filter using NORMALIZED fields)
    SELECT
      tc.duration,
      tc.title_sim,
      similarity(sf.content_normalized, normalize_text(p_content)) AS content_sim
    FROM title_candidates tc
    JOIN slide_fingerprints sf ON sf.id = tc.id
    WHERE similarity(sf.content_normalized, normalize_text(p_content)) > 0.90
  ),
  outlier_filtered AS (
    -- Remove outliers using IQR method (Interquartile Range)
    SELECT
      duration,
      title_sim,
      content_sim
    FROM content_matches
    WHERE duration BETWEEN (
      -- Lower bound: Q1 - 1.5 * IQR
      SELECT PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY duration)
        - 1.5 * (
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY duration)
          - PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY duration)
        )
      FROM content_matches
    ) AND (
      -- Upper bound: Q3 + 1.5 * IQR
      SELECT PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY duration)
        + 1.5 * (
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY duration)
          - PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY duration)
        )
      FROM content_matches
    )
  )
  SELECT
    AVG(duration)::NUMERIC AS avg_duration,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration)::NUMERIC AS median_duration,
    COUNT(*)::BIGINT AS sample_size,
    STDDEV(duration)::NUMERIC AS variance,
    MIN(duration)::INTEGER AS min_duration,
    MAX(duration)::INTEGER AS max_duration,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY duration)::NUMERIC AS p25_duration,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY duration)::NUMERIC AS p75_duration,
    AVG(title_sim)::NUMERIC AS title_similarity,
    AVG(content_sim)::NUMERIC AS content_similarity
  FROM outlier_filtered;
END;
$$ LANGUAGE plpgsql;
```

**Key Improvements:**
1. ✅ **Normalized field matching** - Uses `title_normalized` and `content_normalized` for accurate similarity
2. ✅ **Outlier removal** - IQR method filters extreme durations (e.g., 100min slide in dataset of 10-15min)
3. ✅ **Robust statistics** - Returns both mean (trimmed) and median for resilience
4. ✅ **Percentiles** - p25/p75 show typical duration range
5. ✅ **RLS-compliant** - Respects user privacy with opt-in cross-user flag

**Outlier Example:**
```
Raw durations: [10, 12, 14, 15, 13, 100, 11, 14, 16]
                                    ^^^ outlier (typo or error)

With IQR filtering:
- Q1 (25th percentile) = 11.5
- Q3 (75th percentile) = 15.5
- IQR = 4
- Lower bound = 11.5 - 1.5*4 = 5.5
- Upper bound = 15.5 + 1.5*4 = 21.5
- Filtered: [10, 12, 14, 15, 13, 11, 14, 16]  (100 removed)
- Trimmed mean = 13.1min (vs 20.6min without filtering)
```

**Query Performance:**
- Tier 1 (title matching): ~5-10ms with GIN index
- Tier 2 (content matching): ~10-50ms on filtered candidates
- Outlier filtering: ~5-10ms (percentile calculations)
- **Total:** ~20-70ms end-to-end

---

## 6. User Experience & Frontend Integration

### UX Design Principles (CRITICAL)

**Core Principle: Suggestions NEVER overwrite user input**

**Golden Rules:**
1. ✅ Only suggest for **untouched slides** (never edited by user)
2. ✅ Show suggestions **passively** (inline badge, not blocking modal)
3. ✅ User must **explicitly accept** each suggestion
4. ✅ User can **dismiss** suggestions permanently
5. ❌ **NO auto-apply** (user consent required)
6. ❌ **NO bulk actions** in MVP (too prominent, adds complexity)

---

### UX User Journey Scenarios

#### Scenario 1: First-Time User (No Login, No History)
```
Extension opens → Gamma presentation detected
├─ All slides: Default 5min (system default)
├─ No suggestions shown (not logged in)
└─ User manually edits durations as needed
```

**UX:** Clean, simple, no distractions

---

#### Scenario 2: User Logs In BEFORE Editing
```
Extension opens → User logs in immediately
├─ System checks: Are slides copied from existing deck?
│   ├─ YES: Fetch suggestions for all slides
│   │   └─ Show suggestion badge on each slide (non-intrusive)
│   └─ NO: Show default 5min (no suggestions available)
└─ User reviews suggestions, accepts or overrides
```

**State Tracking:**
```typescript
interface SlideState {
  id: string;
  duration: number;              // Current value (5min default)
  userEdited: boolean;           // Has user manually changed this?
  suggestion?: {
    duration: number;            // AI-suggested value (e.g., 12min)
    confidence: 'high' | 'medium' | 'low';
    sampleSize: number;
    dismissed: boolean;          // User clicked "No thanks"
  }
}
```

---

#### Scenario 3: User Edits THEN Logs In (Critical Flow)
```
Extension opens (logged out)
├─ Slide 1: User manually sets 10min ✏️
├─ Slide 2: Remains 5min (default)
├─ Slide 3: User manually sets 15min ✏️
├─ Slide 4: Remains 5min (default)
└─ User logs in
    ├─ System fetches suggestions for ALL slides
    ├─ Slide 1: Suggestion found (12min) but userEdited=true
    │   └─ ❌ NO suggestion shown (respects user's 10min)
    ├─ Slide 2: Suggestion found (8min) and userEdited=false
    │   └─ ✅ Show suggestion badge
    ├─ Slide 3: Suggestion found (14min) but userEdited=true
    │   └─ ❌ NO suggestion shown (respects user's 15min)
    └─ Slide 4: Suggestion found (6min) and userEdited=false
        └─ ✅ Show suggestion badge
```

**Result:** Only **untouched slides** (2 & 4) show suggestions

**UX Benefit:** User's manual work is **never lost or challenged**

---

#### Scenario 4: User Accepts or Dismisses Suggestions
```
Slide 2: Suggestion 8min
├─ User clicks [Apply 8min]
│   └─ Duration updates to 8min
│   └─ Suggestion badge disappears
│   └─ State: userEdited=true (accepted = edited)
│
Slide 4: Suggestion 6min
├─ User clicks [×] (dismiss)
│   └─ Suggestion badge disappears permanently
│   └─ Duration remains 5min
│   └─ State: suggestion.dismissed=true
```

**UX Rule:** Once dismissed, **never show suggestion again** for that slide

---

### UI Component Designs

#### Inline Suggestion Badge (Subtle, MVP)
```
┌─────────────────────────────────────────┐
│ Slide Title                             │
├─────────────────────────────────────────┤
│ Duration: [  5  ] min                   │
│ 💡 12 min suggested  [Apply] [×]        │  ← Inline, dismissible
└─────────────────────────────────────────┘
```

#### Inline Suggestion Badge (Detailed on Hover)
```
┌─────────────────────────────────────────┐
│ Duration: [  5  ] min                   │
│ 💡 12 min suggested                     │
│    ↓ (hover for details)                │
│    ┌──────────────────────────────────┐ │
│    │ Based on 42 similar slides       │ │
│    │ Confidence: High (87%)           │ │
│    │ Range: 10-15 min typically       │ │
│    │ [Apply 12min] [Dismiss]          │ │
│    └──────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Note:** Bulk actions intentionally **excluded from MVP** to keep UX simple and non-intrusive.

---

### State Machine: Slide Duration Lifecycle

```
┌──────────────┐
│   DEFAULT    │  State: userEdited=false, duration=5min
│   (5 min)    │  Trigger: Extension loads
└──────┬───────┘
       │
       ├─────────────────────────────────────┐
       │                                     │
       ▼                                     ▼
┌──────────────┐                    ┌─────────────┐
│ USER EDITED  │                    │ SUGGESTED   │
│  (10 min)    │◄───────────────────│  (12 min)   │
└──────┬───────┘   User overrides   └──────┬──────┘
       │           suggestion               │
       │                                    │
       │                                    ├─ User accepts → USER EDITED
       │                                    ├─ User dismisses → DEFAULT (suggestion hidden)
       │                                    └─ Timeout (7 days) → Suggestion expires
       │
       └─► LOCKED (never show suggestions for this slide again)
```

---

### Edge Cases & Handling Rules

#### Edge Case 1: Conflicting Suggestions (User Copies Slide A → Slide B)
```
Slide A: User set 10min manually
Slide B: Exact copy of Slide A, default 5min
         Suggestion: 12min (based on historical data)

Solution: Show 12min suggestion (more data > single copy)
          Optionally: "💡 Similar to Slide A (10min) | Suggested: 12min"
```

#### Edge Case 2: User Edits After Accepting Suggestion
```
Initial: 5min (default)
Suggested: 12min → User accepts
New value: 12min (userEdited=true, from suggestion)

User edits again: 12min → 15min
State: userEdited=true (fully user-owned now)

Future: If system re-suggests 12min, DO NOT show (userEdited=true)
```

#### Edge Case 3: Low Confidence Suggestions
```
Confidence: Low (only 2 similar slides)
Suggestion: 8min

UI: Show warning icon
    "⚠️ 8 min suggested (limited data, only 2 similar slides)"
    [Apply with Caution] [Dismiss]
```

#### Edge Case 4: Suggestion Refresh (User Re-Opens Extension)
```
Session 1: User dismisses suggestion for Slide 2
Session 2: User re-opens extension (new tab)

Question: Show suggestion again?

Answer: NO (dismissed state persists across sessions)
        Store in: localStorage or backend preference
```

---

### Client-Side State Management

```typescript
// LocalStorage (per-user, per-presentation)
interface SuggestionState {
  presentationId: string;
  slides: {
    [slideId: string]: {
      userEdited: boolean;           // Manual edit tracking
      suggestionDismissed: boolean;  // User said "no thanks"
      lastSuggestion?: {
        duration: number;
        timestamp: Date;             // When suggestion was shown
        accepted: boolean;           // Did user accept it?
      }
    }
  };
}

// Example: Store user interaction state
localStorage.setItem('gamma-suggestions-state', JSON.stringify({
  presentationId: 'abc123',
  slides: {
    'slide-1': { userEdited: true, suggestionDismissed: false },
    'slide-2': { userEdited: false, suggestionDismissed: true }, // User dismissed
    'slide-4': { userEdited: false, suggestionDismissed: false, lastSuggestion: {
      duration: 12,
      timestamp: '2025-09-30T10:00:00Z',
      accepted: true
    }}
  }
}));
```

---

### Component Implementation: EditableDurationCell (Enhanced)

**Current Flow:**
```typescript
// packages/web/src/app/gamma/timetables/[id]/components/EditableDurationCell.tsx
const [duration, setDuration] = useState(initialDuration);  // Manual input
```

**Enhanced Flow with UX-Safe Suggestions:**
```typescript
const EditableDurationCell = ({ slide }) => {
  const [duration, setDuration] = useState(slide.duration || 5); // Default 5min
  const [suggestion, setSuggestion] = useState<SuggestionData | null>(null);
  const [userEdited, setUserEdited] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Load suggestion state from localStorage
  useEffect(() => {
    const state = loadSuggestionState(presentationId, slide.id);
    setUserEdited(state.userEdited);
    setDismissed(state.suggestionDismissed);
  }, [slide.id]);

  // Fetch suggestion only for untouched slides
  useEffect(() => {
    if (!userEdited && !dismissed && isUserLoggedIn) {
      fetchDurationSuggestion(slide.title, slide.content)
        .then(data => {
          if (data.confidence === 'high' || data.confidence === 'medium') {
            setSuggestion(data);
          }
        });
    }
  }, [slide.id, userEdited, dismissed]);

  // Track manual edits
  const handleManualEdit = (newDuration: number) => {
    setDuration(newDuration);
    setUserEdited(true);
    setSuggestion(null); // Hide suggestion immediately
    saveSuggestionState(presentationId, slide.id, { userEdited: true });
  };

  // Apply suggestion
  const handleApplySuggestion = () => {
    if (suggestion) {
      setDuration(suggestion.averageDuration);
      setUserEdited(true); // Accepting = editing
      setSuggestion(null);
      saveSuggestionState(presentationId, slide.id, {
        userEdited: true,
        lastSuggestion: { ...suggestion, accepted: true }
      });
    }
  };

  // Dismiss suggestion
  const handleDismiss = () => {
    setDismissed(true);
    setSuggestion(null);
    saveSuggestionState(presentationId, slide.id, { suggestionDismissed: true });
  };

  return (
    <div className="duration-cell">
      <Input
        value={duration}
        onChange={handleManualEdit}
        className="duration-input"
      />

      {suggestion && !userEdited && !dismissed && (
        <div className="suggestion-badge">
          <span className="suggestion-icon">💡</span>
          <span className="suggestion-text">
            {suggestion.averageDuration} min suggested
          </span>
          <button
            onClick={handleApplySuggestion}
            className="suggestion-apply"
          >
            Apply
          </button>
          <button
            onClick={handleDismiss}
            className="suggestion-dismiss"
            aria-label="Dismiss suggestion"
          >
            ×
          </button>
        </div>
      )}

      {/* Optional: Show details on hover */}
      {suggestion && (
        <div className="suggestion-tooltip" role="tooltip">
          Based on {suggestion.sampleSize} similar slides<br/>
          Confidence: {suggestion.confidence}<br/>
          Range: {suggestion.durationRange.p25}-{suggestion.durationRange.p75} min
        </div>
      )}
    </div>
  );
};
```

**Key UX Features:**
1. ✅ Only shows suggestions for untouched slides (`!userEdited`)
2. ✅ Respects dismissals (`!dismissed`)
3. ✅ Persists state across sessions (localStorage)
4. ✅ Manual edit immediately hides suggestion
5. ✅ Accepting suggestion = marking as edited
6. ✅ Tooltip shows confidence details on hover

### Bulk Suggestion Flow (Copy Entire Presentation)

When user copies presentation:
1. **Batch API Call:** Send all slides at once
2. **Backend:** Run suggestions in parallel (PostgreSQL handles concurrency)
3. **Frontend:** Show preview with suggested durations
4. **User:** Accept all, or manually override specific slides

```typescript
// API: POST /api/slides/suggest-duration-batch
{
  "slides": [
    { "title": "Intro", "content": [...] },
    { "title": "Overview", "content": [...] },
    // ... 20 more slides
  ]
}

// Response: Array of suggestions (matched by index)
{
  "suggestions": [
    { "averageDuration": 10, "confidence": "high" },
    { "averageDuration": 15, "confidence": "medium" },
    // ...
  ]
}
```

---

## 7. Implementation Phases (MVP - UX-First Approach)

### Phase 1: Database Foundation (Sprint 36)
- ✅ Research complete (this document)
- ✅ UX specification complete (Section 6)
- [ ] Create `slide_fingerprints` table migration
- [ ] Implement incremental sync trigger from `presentations.timetable_data`
- [ ] Backfill existing presentations (~2-4 hours for production scale)
- [ ] Add trigram indexes (GIN on normalized fields)
- [ ] Enable pg_trgm extension in Supabase

**Estimated:** 6-8 hours

### Phase 2: Backend API (Sprint 36-37)
- [ ] Create PostgreSQL function `suggest_slide_duration()` (with IQR outlier filtering)
- [ ] Implement canonical `serializeSlideContent()` utility (TypeScript)
- [ ] Implement `/api/slides/suggest-duration` endpoint (single slide)
- [ ] Add confidence scoring logic (variance-aware, coefficient of variation)
- [ ] Write integration tests (API + database + RLS policies)
- [ ] Test RLS policies (user-scoped vs cross-user opt-in)

**Estimated:** 6-8 hours

**MVP Scope:** Single-slide endpoint only
**Deferred to v2:** Batch endpoint `/api/slides/suggest-duration-batch`

### Phase 3: Frontend Integration - UX-Safe (Sprint 37)

#### 3A: Client-Side State Management (2-3 hours)
- [ ] Implement localStorage-based suggestion state
  - Track `userEdited` flag per slide (never show suggestions after manual edit)
  - Track `suggestionDismissed` flag per slide (remember dismissals across sessions)
  - Persist presentation-scoped state
  - Handle state cleanup (old presentations)

#### 3B: EditableDurationCell Enhancement (4-5 hours)
- [ ] Add suggestion fetching logic
  - Only fetch for untouched slides (`!userEdited && !dismissed && isUserLoggedIn`)
  - Only show high/medium confidence suggestions
  - Handle loading states
- [ ] Implement inline suggestion badge
  - Design: "💡 12 min suggested [Apply] [×]"
  - Subtle, non-blocking, dismissible
  - Show only when user hasn't edited
- [ ] Add hover tooltip with details
  - Sample size, confidence level, duration range
  - Low confidence warning
- [ ] Implement interaction handlers
  - Apply: Update duration, mark as `userEdited`, hide badge
  - Dismiss: Hide badge permanently, save to localStorage
  - Manual edit: Immediately hide badge, mark as `userEdited`

#### 3C: Analytics Tracking (1-2 hours)
- [ ] Track suggestion events
  - Suggestion shown (with confidence level)
  - Suggestion accepted
  - Suggestion dismissed
  - Manual edit after seeing suggestion
- [ ] Track aggregate metrics
  - Acceptance rate by confidence level
  - Average sample size when accepted
  - Time-to-decision (shown → accepted/dismissed)

**Estimated:** 8-10 hours

**UX Constraints (MVP):**
- ❌ NO bulk action banner ("Apply All" too prominent)
- ❌ NO batch suggestion modal
- ❌ NO auto-apply (user must explicitly accept)
- ✅ Inline badges only (subtle, per-slide)
- ✅ Dismissals persist across sessions
- ✅ Manual edits always take precedence

### Phase 4: Testing & UX Validation (Sprint 37)

#### 4A: UX Scenario Testing (2-3 hours)
- [ ] Scenario 1: User edits before login
  - Verify: Suggestions don't overwrite manual edits
  - Verify: Only untouched slides show badges
- [ ] Scenario 2: User logs in first
  - Verify: Suggestions appear immediately
  - Verify: High confidence shown, low confidence hidden
- [ ] Scenario 3: User dismisses suggestions
  - Verify: Badge disappears permanently
  - Verify: Dismissal persists across browser restarts
- [ ] Scenario 4: User accepts suggestion
  - Verify: Duration updates correctly
  - Verify: Badge disappears
  - Verify: Marked as `userEdited` (no re-suggestions)

#### 4B: Performance Validation (1-2 hours)
- [ ] Query latency validation (target: P95 <100ms)
- [ ] Trigger overhead validation (target: <50ms per save)
- [ ] Client-side state management overhead
- [ ] localStorage size monitoring (ensure no bloat)

#### 4C: RLS & Security Testing (1 hour)
- [ ] User-scoped queries work correctly
- [ ] Cross-user opt-in works (if enabled)
- [ ] Anonymous users properly blocked
- [ ] No data leakage between users

**Estimated:** 4-6 hours

**Total Effort:** ~20-28 hours (2.5-3.5 sprints with parallelization)

---

## 8. Performance Estimates

### Query Performance (1M slides in database)

| Operation | Without Index | With GIN Index | Improvement |
|-----------|--------------|----------------|-------------|
| Title similarity search | ~2-5 seconds | ~5-10ms | **200-500x faster** |
| Content similarity (on 50 candidates) | ~500ms | ~10-50ms | **10-50x faster** |
| **Total query time** | ~3-6 seconds | **~15-60ms** | **200-400x faster** |

### Storage Impact

**Per slide fingerprint:** ~500 bytes (title + content + metadata)
- **1,000 presentations × 20 slides:** ~10MB
- **100,000 presentations × 20 slides:** ~1GB
- **1,000,000 presentations × 20 slides:** ~10GB

**With GIN indexes:** ~2-3x storage (20-30GB for 1M presentations)

**Verdict:** Negligible for modern PostgreSQL deployments

---

## 9. Success Metrics

### User Impact
- **Time saved:** Target 30-40% reduction in presentation prep time
- **Adoption rate:** % of users accepting suggested durations
- **Accuracy:** % of suggestions within ±15% of user's final choice

### Technical Metrics
- **Query latency:** P95 < 100ms
- **Suggestion quality:** Sample size ≥3 for "medium" confidence
- **System load:** < 5% CPU increase on database

### Business Value
- **Feature differentiation:** Unique AI-powered feature vs competitors
- **User satisfaction:** NPS increase for power users
- **Data flywheel:** More usage → better suggestions → more adoption

---

## 10. Risks & Mitigations

### Risk 1: Poor Suggestion Quality (Low Match Rate)
**Scenario:** New users have no historical data, suggestions fail frequently

**Mitigation:**
- Use anonymized cross-user data pool (with privacy considerations)
- Fall back to domain-specific defaults (e.g., "Intro slides: 10min, Technical slides: 15min")
- Implement "cold start" onboarding: Ask user to estimate 5 slides, learn patterns

### Risk 2: Performance Degradation at Scale
**Scenario:** Database queries slow down with 10M+ slides

**Mitigation:**
- Implement Redis caching for common title patterns
- Partition `slide_fingerprints` table by user_id or date
- Use read replicas for suggestion queries

### Risk 3: Privacy Concerns (Cross-User Learning)
**Scenario:** Users uncomfortable with their presentation data informing others' suggestions

**Mitigation:**
- **Default:** User-only suggestions (query only user's own slides)
- **Opt-in:** Allow sharing anonymized patterns for better suggestions
- **Compliance:** GDPR-compliant data anonymization

---

## 11. Alternative Approaches Considered

### ❌ ML-Based Prediction (Neural Networks)
**Why rejected:**
- Requires 10k+ labeled examples for training
- Inference latency: ~100-500ms (vs ~15ms for SQL)
- Model maintenance overhead
- Over-engineered for problem scope

### ❌ Exact Hash Matching Only
**Why rejected:**
- Too brittle: Single character change = no match
- Low match rate on edited slides
- Doesn't meet "90% overlap" requirement

### ✅ Selected: Trigram Similarity (Pragmatic Balance)
- Fast enough (15-60ms)
- Flexible enough (tolerates 10% edits)
- Simple enough (no ML infrastructure)
- Proven at scale (pg_trgm battle-tested)

---

## 12. Next Steps

### Immediate Actions (Sprint 36)
1. **Review this audit** with stakeholders
2. **Approve technical approach** (slide_fingerprints table + pg_trgm)
3. **Create sprint plan** for Phase 1 implementation
4. **Assign tasks** to development team

### Follow-Up Questions
- Should suggestions be user-only or cross-user by default?
- What confidence threshold triggers auto-apply vs manual review?
- Should we show "similar slides" preview in UI?

---

## Appendices

### A. PostgreSQL Trigram Primer

**What are trigrams?**
- 3-character sequences from text
- Example: "hello" → {" h", "he", "el", "ll", "lo", "o "}

**How similarity works:**
```
Title A: "Introduction to AI"
Trigrams: {" in", "int", "ntr", "tro", "rod", ...}

Title B: "Intro to AI"
Trigrams: {" in", "int", "ntr", "tro", " to", ...}

Jaccard Similarity = (Shared trigrams) / (Total unique trigrams)
                   = 15 / 22 = 0.68 (68% similar)
```

### B. Example SQL Queries

**Find slides similar to target:**
```sql
SELECT
  title,
  content_text,
  duration,
  similarity(title, 'Introduction to Machine Learning') AS title_sim,
  similarity(content_text, 'Overview of neural networks...') AS content_sim
FROM slide_fingerprints
WHERE similarity(title, 'Introduction to Machine Learning') > 0.95
  AND similarity(content_text, 'Overview of neural networks...') > 0.90
ORDER BY title_sim DESC, content_sim DESC
LIMIT 10;
```

**Get average duration with confidence:**
```sql
WITH matches AS (
  SELECT duration
  FROM slide_fingerprints
  WHERE similarity(title, $1) > 0.95
    AND similarity(content_text, $2) > 0.90
)
SELECT
  AVG(duration) AS avg_duration,
  COUNT(*) AS sample_size,
  STDDEV(duration) AS variance
FROM matches;
```

### C. References

**PostgreSQL Documentation:**
- pg_trgm: https://www.postgresql.org/docs/current/pgtrgm.html
- fuzzystrmatch: https://www.postgresql.org/docs/current/fuzzystrmatch.html

**Research Articles:**
- "Fuzzy Search with PostgreSQL Trigrams" (Medium, 2025)
- "Improving Performance with Similarity Postgres" (Stack Overflow)

---

## Appendix D. Deliverables Summary

### ✅ Research & Documentation (COMPLETE)
1. **Technical Audit** (this document)
   - Path: `documents/audits/slide-duration-prediction-research-audit-2025-09-30.md`
   - Size: 1400+ lines, comprehensive technical + UX design
   - Includes: Schema design, API contracts, UX flows, edge cases, implementation phases
   - **New in v2:** Complete UX specification (Section 6) with user journey scenarios

2. **Migration Worksheet**
   - Path: `documents/roadmap/SPRINT-36-SLIDE-DURATION-PREDICTION-MIGRATION-WORKSHEET.md`
   - Size: 800+ lines, production deployment guide
   - Includes: Pre-migration checklist, migration scripts, backfill strategies, rollback procedures
   - Features: Batched backfill shell script, monitoring queries, troubleshooting guide

3. **Prototype Test Suite**
   - Path: `tests/migration/test-slide-fingerprinting.sql`
   - Size: 450+ lines, comprehensive validation
   - Includes: 10 test scenarios, threshold calibration, performance benchmarks
   - Purpose: Local validation before production deployment

4. **Supabase Verification Document**
   - Path: `documents/audits/SUPABASE-PG-TRGM-VERIFICATION.md`
   - Size: 200+ lines, extension compatibility verification
   - Status: pg_trgm officially supported by Supabase ✅
   - Includes: Enable methods, performance characteristics, known issues review

### 📋 Implementation Artifacts Ready for Sprint 36

**Database Layer:**
- ✅ `normalize_text()` function (immutable text normalizer)
- ✅ `slide_fingerprints` table schema (RLS-compliant)
- ✅ 4 RLS policies (user-scoped + cross-user opt-in)
- ✅ 5 indexes (2 GIN trigram, 3 performance)
- ✅ `sync_slide_fingerprints_incremental()` trigger function
- ✅ `suggest_slide_duration()` query function (with outlier filtering)

**API Layer:**
- ✅ `/api/slides/suggest-duration` endpoint specification (MVP)
- ✅ `serializeSlideContent()` utility (TypeScript, canonical)
- ✅ `calculateConfidence()` utility (variance-aware, CV-based)
- ⏳ `/api/slides/suggest-duration-batch` endpoint (deferred to v2)

**UX Layer (Section 6):**
- ✅ User journey scenarios (4 complete flows)
- ✅ State management specification (localStorage-based)
- ✅ Component implementation (EditableDurationCell enhanced)
- ✅ Edge case handling (4 documented scenarios)
- ✅ UI component designs (inline badge, tooltip)
- ✅ State machine diagram (slide lifecycle)
- ❌ Bulk actions UI (intentionally excluded from MVP)

**Migration Tools:**
- ✅ Immediate backfill script (SQL, for <10k presentations)
- ✅ Batched backfill script (Bash, for 10k-1M presentations)
- ✅ Monitoring queries (health dashboard views)
- ✅ Rollback procedures (emergency + partial)

**Testing Tools:**
- ✅ Local prototype test suite (test-slide-fingerprinting.sql)
- ✅ Threshold calibration analysis
- ✅ Performance benchmarking queries

### 🎯 Next Steps for Sprint 36 Implementation (UX-First MVP)

**Day 1-2: Database Migration (6-8 hours)**
1. Run prototype tests on local database (validate thresholds)
2. Execute Phase 1-3 of migration script (table + indexes + RLS)
3. Run batched backfill (2-4 hours for production scale)
4. Validate data integrity (fingerprint count matches slides)
5. Enable trigger after successful backfill

**Day 3-4: Backend API (6-8 hours)**
1. Implement canonical `serializeSlideContent()` utility (TS + SQL parity)
2. Create `/api/slides/suggest-duration` endpoint (single-slide MVP)
3. Implement variance-aware confidence scoring (CV-based)
4. Write integration tests (API + database + RLS)
5. **Skip:** Batch endpoint (deferred to v2)

**Day 5-6: Frontend Integration - UX-Safe (8-10 hours)**
1. Implement localStorage state management (userEdited, dismissed tracking)
2. Enhance `EditableDurationCell` component
   - Inline suggestion badge (subtle, dismissible)
   - Hover tooltip (confidence details)
   - Interaction handlers (apply/dismiss/manual edit)
3. Add analytics tracking (shown, accepted, dismissed events)
4. **Skip:** Bulk action UI (too prominent for MVP)

**Day 7: UX & Performance Validation (4-6 hours)**
1. Test UX scenarios (edits before/after login, dismissals, acceptance)
2. Performance validation (query latency P95 <100ms)
3. RLS policy testing (user-scoped, cross-user opt-in)
4. localStorage state persistence testing

**Total Estimated Effort:** 24-32 hours (3-4 days with parallelization)

**MVP Scope Constraints:**
- ✅ Single-slide suggestions only (inline badges)
- ✅ User must explicitly accept (no auto-apply)
- ✅ Dismissals persist (localStorage)
- ❌ NO bulk actions banner
- ❌ NO "Apply All" modal
- ❌ NO batch endpoint (deferred)

---

### 📊 Success Metrics (Track Post-Launch)

**User Impact:**
- Suggestion adoption rate: Target ≥60% (users accept suggested durations)
- Time savings: Target 30-40% reduction in presentation prep time
- Accuracy: Suggestions within ±15% of final user choice

**Technical Performance:**
- Query latency P95: <100ms
- Trigger overhead: <50ms per presentation save
- Suggestion quality: Sample size ≥3 for medium confidence

**Data Quality:**
- Fingerprint coverage: 100% of slides have fingerprints
- Normalization consistency: 0 empty normalized fields
- Outlier filtering effectiveness: Variance reduction ≥20%

---

### 🔄 Post-Feedback Improvements Applied

**Original Feedback Items:**
1. ✅ **RLS compliance** - Added user_id + 4 security policies
2. ✅ **Incremental triggers** - Reduced write amplification by 40x
3. ✅ **Text normalization** - Documented canonical serialization
4. ✅ **API/DB contract** - Specified identical fingerprint generation
5. ✅ **Variance handling** - IQR outlier filtering + coefficient of variation
6. ✅ **Migration planning** - Batched backfill + rollback strategy
7. ✅ **Prototype testing** - Comprehensive SQL test suite

**Additional Improvements:**
- Cross-user opt-in privacy model
- Median + percentiles for robust statistics
- Performance benchmarking suite
- Monitoring dashboard queries
- Emergency rollback procedures
- Threshold calibration analysis

**UX Design (Added in v3 - September 30, 2025):**
8. ✅ **Complete UX specification** - Section 6 with user journey scenarios
9. ✅ **Non-destructive suggestions** - Never overwrite user input
10. ✅ **State management** - localStorage persistence for edits & dismissals
11. ✅ **Edge case handling** - 4 documented scenarios with solutions
12. ✅ **MVP scope constraints** - No bulk actions (too prominent)

---

## Appendix E. UX Design Principles (Quick Reference)

### Golden Rules (NEVER VIOLATE)
1. **Suggestions NEVER overwrite user input** - Only show for untouched slides
2. **User must explicitly accept** - No auto-apply, no silent changes
3. **Dismissals persist forever** - Once dismissed, never re-show
4. **Manual edits take precedence** - Any user edit immediately hides suggestions
5. **Inline badges only (MVP)** - No bulk actions, no prominent banners

### State Tracking Requirements
```typescript
// Required per-slide state
{
  userEdited: boolean,        // Has user manually changed this slide?
  suggestionDismissed: boolean // User clicked "No thanks"
}

// Storage: localStorage (presentation-scoped)
// Persistence: Across browser sessions
```

### MVP Scope
- ✅ Inline suggestion badge (per-slide)
- ✅ Hover tooltip (confidence details)
- ✅ Apply/Dismiss actions
- ❌ NO bulk actions banner
- ❌ NO "Apply All" modal
- ❌ NO auto-apply

### When to Show Suggestions
```
Show IF:
  - User is logged in AND
  - Slide is untouched (userEdited=false) AND
  - Suggestion not dismissed (dismissed=false) AND
  - Confidence is high/medium (not low)

Hide IF:
  - User manually edited duration OR
  - User dismissed suggestion OR
  - User is logged out OR
  - Confidence is low (<3 samples)
```

---

**Document Status:** ✅ Complete - Ready for Implementation Planning (v3 - UX Enhanced)
**Version:** 3.0 (Technical + UX Specification)
**Last Updated:** September 30, 2025
**Next Review:** Sprint 36 Planning Meeting
**Owner:** Development Team
**Approved By:** [Pending stakeholder review]

**Related Documents:**
- Migration Worksheet: `documents/roadmap/SPRINT-36-SLIDE-DURATION-PREDICTION-MIGRATION-WORKSHEET.md`
- Test Suite: `tests/migration/test-slide-fingerprinting.sql`
- Supabase Verification: `documents/audits/SUPABASE-PG-TRGM-VERIFICATION.md`
