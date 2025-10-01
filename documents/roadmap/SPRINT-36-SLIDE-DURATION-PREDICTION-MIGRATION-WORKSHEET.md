# Sprint 36: Slide Duration Prediction - Migration Worksheet
**Date:** September 30, 2025
**Status:** Ready for Implementation
**Estimated Duration:** 6-8 hours for database migration + backfill
**Risk Level:** Medium (involves data migration and RLS changes)

---

## Pre-Migration Checklist

### ☐ 1. Environment Preparation
- [ ] **Local development database** ready for testing
- [ ] **Staging environment** available for validation
- [ ] **Production backup** verified within last 24 hours
- [ ] **Supabase CLI** installed and authenticated (`supabase --version`)
- [ ] **PostgreSQL client** available for manual queries (`psql --version`)

### ☐ 2. Baseline Metrics Collection
```bash
# Collect current database statistics
psql $DATABASE_URL -c "
  SELECT
    schemaname,
    tablename,
    n_live_tup as row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
  FROM pg_stat_user_tables
  WHERE tablename = 'presentations'
  ORDER BY n_live_tup DESC;
"

# Expected output: ~1000-10000 presentations (baseline for backfill planning)
```

### ☐ 3. Test Data Preparation
```bash
# Create test presentation with known content for validation
mkdir -p tests/migration
cat > tests/migration/test-presentation.json <<EOF
{
  "title": "Test Migration Presentation",
  "timetable_data": {
    "items": [
      {
        "id": "slide-1",
        "title": "Introduction to Testing!",
        "content": ["This is a test slide.", "With known content..."],
        "duration": 10
      },
      {
        "id": "slide-2",
        "title": "Second Test Slide",
        "content": ["Another test.", "Different content!"],
        "duration": 15
      }
    ]
  }
}
EOF
```

---

## Migration Script: `20250930000001_slide_fingerprints.sql`

### Phase 1: Extension & Functions (1-2 minutes)

```sql
-- ============================================================
-- PHASE 1: Enable pg_trgm Extension
-- ============================================================
-- SUPABASE: pg_trgm is pre-installed (verified 2025-09-30)
-- Enable via Dashboard: Database → Extensions → pg_trgm
-- OR via SQL (recommended for migration scripts):
-- ============================================================
-- RISK: None (extension is idempotent, officially supported)
-- ROLLBACK: Not needed (extension can remain enabled)
-- ============================================================

-- Supabase-recommended schema placement
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Verify extension
SELECT * FROM pg_extension WHERE extname = 'pg_trgm';
-- Expected: 1 row showing pg_trgm version

-- ============================================================
-- PHASE 1B: Text Normalization Function
-- ============================================================
-- RISK: Low (immutable function, no side effects)
-- ROLLBACK: DROP FUNCTION normalize_text(TEXT);
-- ============================================================

CREATE OR REPLACE FUNCTION normalize_text(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF input_text IS NULL OR input_text = '' THEN
    RETURN '';
  END IF;

  RETURN regexp_replace(
    regexp_replace(
      lower(trim(input_text)),
      '[^\w\s]', '', 'g'  -- Remove punctuation
    ),
    '\s+', ' ', 'g'       -- Collapse whitespace
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Test normalization
SELECT
  normalize_text('Hello, World!') AS test1,
  normalize_text('  Multiple   Spaces!  ') AS test2,
  normalize_text('Test123') AS test3;
-- Expected: 'hello world' | 'multiple spaces' | 'test123'
```

### Phase 2: Table Creation (2-5 minutes)

```sql
-- ============================================================
-- PHASE 2: Create slide_fingerprints Table
-- ============================================================
-- RISK: Low (new table, no existing dependencies)
-- ROLLBACK: DROP TABLE slide_fingerprints CASCADE;
-- DURATION: ~2-5 minutes (includes index creation)
-- ============================================================

CREATE TABLE slide_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  presentation_id UUID REFERENCES presentations(id) ON DELETE CASCADE,
  slide_id VARCHAR NOT NULL,
  title TEXT NOT NULL,
  title_normalized TEXT NOT NULL,
  content_text TEXT NOT NULL,
  content_normalized TEXT NOT NULL,
  duration INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(presentation_id, slide_id)
);

-- Verify table creation
\d slide_fingerprints
-- Expected: Table structure with all columns listed above

-- ============================================================
-- PHASE 2B: Enable RLS and Create Policies
-- ============================================================
-- RISK: Low (new table, no existing data to protect yet)
-- ROLLBACK: ALTER TABLE slide_fingerprints DISABLE ROW LEVEL SECURITY;
-- ============================================================

ALTER TABLE slide_fingerprints ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users view own fingerprints
CREATE POLICY "Users view own slide fingerprints" ON slide_fingerprints
  FOR SELECT
  USING (user_id = auth.uid()::uuid);

-- Policy 2: Users insert own fingerprints (via trigger)
CREATE POLICY "Users insert own slide fingerprints" ON slide_fingerprints
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::uuid);

-- Policy 3: Users delete own fingerprints
CREATE POLICY "Users delete own slide fingerprints" ON slide_fingerprints
  FOR DELETE
  USING (user_id = auth.uid()::uuid);

-- Policy 4: Cross-user suggestions (opt-in)
CREATE POLICY "Cross-user suggestions for opt-in users" ON slide_fingerprints
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users
      WHERE preferences->>'share_duration_data' = 'true'
    )
  );

-- Verify policies
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'slide_fingerprints';
-- Expected: 4 rows (SELECT x2, INSERT, DELETE)
```

### Phase 3: Indexes (5-10 minutes depending on data size)

```sql
-- ============================================================
-- PHASE 3: Create Indexes
-- ============================================================
-- RISK: Medium (GIN indexes can be slow on large datasets)
-- ROLLBACK: DROP INDEX [index_name];
-- DURATION: 5-10 minutes for 1M slides, scales linearly
-- ============================================================

-- Index 1: Title trigram (for similarity searches)
CREATE INDEX idx_slide_fingerprints_title_trgm
  ON slide_fingerprints USING GIN (title_normalized gin_trgm_ops);

-- Index 2: Content trigram (for similarity searches)
CREATE INDEX idx_slide_fingerprints_content_trgm
  ON slide_fingerprints USING GIN (content_normalized gin_trgm_ops);

-- Index 3: User ID (for RLS and user-scoped queries)
CREATE INDEX idx_slide_fingerprints_user_id
  ON slide_fingerprints (user_id);

-- Index 4: Duration (for aggregation queries)
CREATE INDEX idx_slide_fingerprints_duration
  ON slide_fingerprints (duration);

-- Index 5: Updated timestamp (for maintenance queries)
CREATE INDEX idx_slide_fingerprints_updated_at
  ON slide_fingerprints (updated_at DESC);

-- Verify indexes
\di slide_fingerprints*
-- Expected: 5 indexes + primary key

-- Monitor index creation progress (run in separate session)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename = 'slide_fingerprints';
```

### Phase 4: Trigger Function (2-3 minutes)

```sql
-- ============================================================
-- PHASE 4: Create Incremental Sync Trigger
-- ============================================================
-- RISK: High (affects all INSERT/UPDATE on presentations)
-- ROLLBACK: DROP TRIGGER trigger_sync_slide_fingerprints ON presentations;
--           DROP FUNCTION sync_slide_fingerprints_incremental();
-- TESTING: Critical - test with sample data before enabling
-- ============================================================

CREATE OR REPLACE FUNCTION sync_slide_fingerprints_incremental()
RETURNS TRIGGER AS $$
DECLARE
  old_items JSONB;
  new_items JSONB;
  old_item JSONB;
  new_item JSONB;
  slide_changed BOOLEAN;
  target_user_id UUID;
BEGIN
  -- Extract user_id from presentations table
  SELECT user_id INTO target_user_id
  FROM presentations
  WHERE id = NEW.id;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id not found for presentation %', NEW.id;
  END IF;

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

  -- Handle UPDATE: Incremental sync
  IF TG_OP = 'UPDATE' THEN
    old_items := OLD.timetable_data->'items';
    new_items := NEW.timetable_data->'items';

    -- Step 1: Delete removed slides
    DELETE FROM slide_fingerprints
    WHERE presentation_id = NEW.id
      AND slide_id NOT IN (
        SELECT item->>'id'
        FROM jsonb_array_elements(new_items) AS item
      );

    -- Step 2: Upsert new/changed slides
    FOR new_item IN SELECT * FROM jsonb_array_elements(new_items)
    LOOP
      SELECT item INTO old_item
      FROM jsonb_array_elements(old_items) AS item
      WHERE item->>'id' = new_item->>'id';

      IF old_item IS NULL THEN
        slide_changed := TRUE;
      ELSE
        slide_changed := (
          old_item->>'title' != new_item->>'title' OR
          old_item->'content' != new_item->'content' OR
          old_item->>'duration' != new_item->>'duration'
        );
      END IF;

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

-- Test trigger function manually (do NOT create trigger yet)
SELECT sync_slide_fingerprints_incremental();
-- Expected: Should compile without errors
```

---

## Backfill Strategy (CRITICAL - Read Carefully)

### Option A: Immediate Backfill (Small datasets: <10k presentations)

**Estimated Time:** 30-60 minutes for 10k presentations

```sql
-- ============================================================
-- BACKFILL: Process all existing presentations
-- ============================================================
-- RISK: High (long-running transaction, blocks writes)
-- RECOMMENDATION: Use Option B (batched) for production
-- ============================================================

DO $$
DECLARE
  presentation_record RECORD;
  processed_count INT := 0;
BEGIN
  FOR presentation_record IN
    SELECT id, user_id, timetable_data
    FROM presentations
    WHERE timetable_data IS NOT NULL
  LOOP
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
      presentation_record.user_id,
      presentation_record.id,
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
    FROM jsonb_array_elements(presentation_record.timetable_data->'items') AS item
    ON CONFLICT (presentation_id, slide_id) DO NOTHING;

    processed_count := processed_count + 1;

    -- Progress logging every 100 presentations
    IF processed_count % 100 = 0 THEN
      RAISE NOTICE 'Processed % presentations', processed_count;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill complete: % presentations processed', processed_count;
END $$;
```

### Option B: Batched Backfill (RECOMMENDED for production: >10k presentations)

**Estimated Time:** 2-4 hours for 100k presentations (with monitoring breaks)

```bash
#!/bin/bash
# backfill-slide-fingerprints.sh
# Run this script in tmux/screen session for long-running backfills

set -e

DATABASE_URL=$1
BATCH_SIZE=${2:-100}  # Default 100 presentations per batch
LOG_FILE="backfill-$(date +%Y%m%d-%H%M%S).log"

echo "Starting batched backfill at $(date)" | tee -a $LOG_FILE
echo "Database: $DATABASE_URL" | tee -a $LOG_FILE
echo "Batch size: $BATCH_SIZE" | tee -a $LOG_FILE

# Get total presentation count
TOTAL=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM presentations WHERE timetable_data IS NOT NULL")
echo "Total presentations to process: $TOTAL" | tee -a $LOG_FILE

OFFSET=0
PROCESSED=0

while [ $PROCESSED -lt $TOTAL ]; do
  echo "[$(date)] Processing batch: offset=$OFFSET, limit=$BATCH_SIZE" | tee -a $LOG_FILE

  psql $DATABASE_URL -c "
    DO \$\$
    DECLARE
      presentation_record RECORD;
    BEGIN
      FOR presentation_record IN
        SELECT id, user_id, timetable_data
        FROM presentations
        WHERE timetable_data IS NOT NULL
        ORDER BY created_at ASC
        LIMIT $BATCH_SIZE OFFSET $OFFSET
      LOOP
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
          presentation_record.user_id,
          presentation_record.id,
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
        FROM jsonb_array_elements(presentation_record.timetable_data->'items') AS item
        ON CONFLICT (presentation_id, slide_id) DO NOTHING;
      END LOOP;
    END \$\$;
  "

  if [ $? -eq 0 ]; then
    PROCESSED=$((PROCESSED + BATCH_SIZE))
    OFFSET=$((OFFSET + BATCH_SIZE))
    PERCENTAGE=$((PROCESSED * 100 / TOTAL))
    echo "[$(date)] Progress: $PROCESSED/$TOTAL ($PERCENTAGE%)" | tee -a $LOG_FILE

    # Validation check every 10 batches
    if [ $((PROCESSED / BATCH_SIZE % 10)) -eq 0 ]; then
      FINGERPRINT_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM slide_fingerprints")
      echo "[$(date)] Validation: $FINGERPRINT_COUNT fingerprints created" | tee -a $LOG_FILE
    fi

    # Brief pause to avoid overwhelming database
    sleep 2
  else
    echo "[$(date)] ERROR: Batch failed at offset $OFFSET" | tee -a $LOG_FILE
    exit 1
  fi
done

echo "Backfill complete at $(date)" | tee -a $LOG_FILE
echo "Log saved to: $LOG_FILE"
```

**Usage:**
```bash
chmod +x backfill-slide-fingerprints.sh
./backfill-slide-fingerprints.sh $DATABASE_URL 100
```

---

## Post-Backfill Validation

### ☐ 1. Data Integrity Checks

```sql
-- Check 1: All presentations have fingerprints
SELECT
  'Presentations without fingerprints' AS check_name,
  COUNT(*) AS count
FROM presentations p
WHERE timetable_data IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM slide_fingerprints sf
    WHERE sf.presentation_id = p.id
  );
-- Expected: 0

-- Check 2: Fingerprint count matches slide count
SELECT
  'Total presentations' AS metric,
  COUNT(*) AS value
FROM presentations
WHERE timetable_data IS NOT NULL
UNION ALL
SELECT
  'Total fingerprints',
  COUNT(*)
FROM slide_fingerprints
UNION ALL
SELECT
  'Expected fingerprints',
  SUM(jsonb_array_length(timetable_data->'items'))
FROM presentations
WHERE timetable_data IS NOT NULL;
-- Expected: Total fingerprints ≈ Expected fingerprints

-- Check 3: Normalization consistency
SELECT
  COUNT(*) AS rows_with_normalization_issues
FROM slide_fingerprints
WHERE title_normalized = '' OR content_normalized = '';
-- Expected: 0
```

### ☐ 2. Enable Trigger (ONLY after successful backfill)

```sql
-- ============================================================
-- ENABLE TRIGGER: Auto-sync future presentation changes
-- ============================================================
-- RISK: High (affects all future INSERT/UPDATE on presentations)
-- PREREQUISITE: Backfill must be 100% complete
-- ============================================================

CREATE TRIGGER trigger_sync_slide_fingerprints
  AFTER INSERT OR UPDATE ON presentations
  FOR EACH ROW
  EXECUTE FUNCTION sync_slide_fingerprints_incremental();

-- Test trigger with new presentation
INSERT INTO presentations (user_id, title, gamma_url, timetable_data)
VALUES (
  'test-user-id',
  'Trigger Test',
  'https://gamma.app/test-trigger',
  '{
    "items": [
      {
        "id": "test-1",
        "title": "Test Slide",
        "content": ["Test content"],
        "duration": 10
      }
    ]
  }'::JSONB
);

-- Verify trigger created fingerprints
SELECT COUNT(*) FROM slide_fingerprints
WHERE presentation_id = (
  SELECT id FROM presentations WHERE gamma_url = 'https://gamma.app/test-trigger'
);
-- Expected: 1
```

### ☐ 3. Performance Validation

```sql
-- Test query performance with EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT
  AVG(duration) AS avg_duration,
  COUNT(*) AS sample_size
FROM slide_fingerprints
WHERE similarity(title_normalized, normalize_text('introduction to ai')) > 0.95
  AND similarity(content_normalized, normalize_text('machine learning basics')) > 0.90;

-- Expected execution time: <100ms
-- Expected plan: Index Scan using idx_slide_fingerprints_title_trgm
```

---

## Rollback Procedures

### Emergency Rollback (if migration fails)

```sql
-- Step 1: Disable trigger immediately
DROP TRIGGER IF EXISTS trigger_sync_slide_fingerprints ON presentations;

-- Step 2: Drop function
DROP FUNCTION IF EXISTS sync_slide_fingerprints_incremental();

-- Step 3: Drop table (WARNING: Deletes all fingerprint data)
DROP TABLE IF EXISTS slide_fingerprints CASCADE;

-- Step 4: Drop normalization function
DROP FUNCTION IF EXISTS normalize_text(TEXT);

-- Step 5: (Optional) Disable extension
-- Note: pg_trgm can remain enabled, does not affect other tables
-- DROP EXTENSION IF EXISTS pg_trgm;
```

### Partial Rollback (keep table, disable trigger)

```sql
-- Useful if trigger is causing performance issues
DROP TRIGGER IF EXISTS trigger_sync_slide_fingerprints ON presentations;

-- Re-enable later with:
-- CREATE TRIGGER trigger_sync_slide_fingerprints
--   AFTER INSERT OR UPDATE ON presentations
--   FOR EACH ROW
--   EXECUTE FUNCTION sync_slide_fingerprints_incremental();
```

---

## Monitoring & Alerts

### Setup Monitoring Dashboard

```sql
-- Create monitoring view
CREATE OR REPLACE VIEW v_slide_fingerprints_health AS
SELECT
  (SELECT COUNT(*) FROM presentations WHERE timetable_data IS NOT NULL) AS total_presentations,
  (SELECT COUNT(DISTINCT presentation_id) FROM slide_fingerprints) AS presentations_with_fingerprints,
  (SELECT COUNT(*) FROM slide_fingerprints) AS total_fingerprints,
  (SELECT pg_size_pretty(pg_total_relation_size('slide_fingerprints'))) AS table_size,
  (SELECT pg_size_pretty(SUM(pg_relation_size(indexrelid)))
   FROM pg_stat_user_indexes
   WHERE tablename = 'slide_fingerprints') AS index_size,
  (SELECT MAX(updated_at) FROM slide_fingerprints) AS last_fingerprint_update;

-- Query monitoring view
SELECT * FROM v_slide_fingerprints_health;
```

### Trigger Performance Monitoring

```bash
# Run this query periodically to detect slow triggers
psql $DATABASE_URL -c "
  SELECT
    schemaname,
    tablename,
    n_tup_ins AS inserts,
    n_tup_upd AS updates,
    n_tup_del AS deletes,
    last_autovacuum,
    autovacuum_count
  FROM pg_stat_user_tables
  WHERE tablename = 'presentations'
     OR tablename = 'slide_fingerprints';
"
```

---

## Post-Migration Tasks

### ☐ 1. Update Application Code
- [ ] Implement `/api/slides/suggest-duration` endpoint
- [ ] Add `serializeSlideContent()` utility function
- [ ] Update `EditableDurationCell` component
- [ ] Add confidence scoring logic

### ☐ 2. Documentation
- [ ] Update API documentation with new endpoint
- [ ] Document RLS policies for dev team
- [ ] Create user guide for duration suggestions feature

### ☐ 3. Monitoring Setup
- [ ] Configure alerts for trigger failures
- [ ] Set up dashboard for fingerprint table health
- [ ] Monitor query performance metrics

---

## Success Criteria

- ✅ All existing presentations have fingerprints generated
- ✅ Trigger successfully creates fingerprints for new presentations
- ✅ Query performance <100ms for similarity searches
- ✅ No RLS violations (users can only access own data)
- ✅ Normalization produces consistent results (TS === SQL)
- ✅ Zero downtime during migration

---

## Troubleshooting

### Issue 1: Slow Index Creation
**Symptom:** GIN index creation takes >30 minutes

**Solution:**
```sql
-- Increase maintenance_work_mem temporarily
SET maintenance_work_mem = '2GB';
CREATE INDEX CONCURRENTLY idx_slide_fingerprints_title_trgm ...;
```

### Issue 2: Trigger Timeout on Large Presentations
**Symptom:** Trigger fails on presentations with 100+ slides

**Solution:**
```sql
-- Add timeout guard in trigger function
SET statement_timeout = '30s';
-- Or process large presentations in background job instead
```

### Issue 3: Backfill Memory Exhaustion
**Symptom:** Backfill script crashes with OOM error

**Solution:**
```bash
# Reduce batch size
./backfill-slide-fingerprints.sh $DATABASE_URL 50  # Instead of 100
```

---

**Migration Owner:** Database Team
**Code Review Required:** Yes (trigger function is critical)
**Staging Validation Required:** Yes (test with production-like data)
**Production Deployment Window:** Low-traffic hours (2-6 AM UTC)
