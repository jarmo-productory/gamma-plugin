-- ============================================================
-- SPRINT 36: SLIDE DURATION PREDICTION - DATABASE FOUNDATION
-- ============================================================
-- Purpose: Enable slide duration prediction using PostgreSQL trigram similarity
-- Author: Sprint 36 Team
-- Date: October 1, 2025
-- Risk: Medium (new table, triggers, RLS policies)
-- Rollback: See end of file for rollback procedures
-- ============================================================

-- ============================================================
-- PHASE 1: Enable pg_trgm Extension
-- ============================================================
-- Supabase pre-installs pg_trgm (verified 2025-09-30)
-- This extension enables trigram-based text similarity matching
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Verify extension
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    RAISE EXCEPTION 'pg_trgm extension failed to install';
  END IF;
END $$;

-- ============================================================
-- PHASE 2: Text Normalization Function
-- ============================================================
-- Purpose: Normalize text for consistent similarity matching
-- Transformations:
--   1. Convert to lowercase
--   2. Remove all punctuation and special characters
--   3. Collapse multiple whitespaces into single space
--   4. Trim leading/trailing whitespace
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

-- Test normalization function
DO $$
BEGIN
  IF normalize_text('Introduction to Machine Learning!!!') != 'introduction to machine learning' THEN
    RAISE EXCEPTION 'normalize_text function test failed';
  END IF;
END $$;

-- ============================================================
-- PHASE 3: Slide Fingerprints Table
-- ============================================================
-- Purpose: Store normalized slide data for similarity matching
-- Constraints:
--   - user_id: Required for RLS compliance
--   - UNIQUE(presentation_id, slide_id): One fingerprint per slide
-- Performance: ~2-3x table size with GIN indexes
-- ============================================================

CREATE TABLE slide_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  presentation_id UUID REFERENCES presentations(id) ON DELETE CASCADE,
  slide_id VARCHAR NOT NULL,

  -- Original content
  title TEXT NOT NULL,
  content_text TEXT NOT NULL,
  duration INTEGER NOT NULL,

  -- Normalized for matching (immutable after normalization)
  title_normalized TEXT NOT NULL,
  content_normalized TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE(presentation_id, slide_id),
  CHECK(duration > 0),
  CHECK(title != ''),
  CHECK(content_text != '')
);

-- Add table comment
COMMENT ON TABLE slide_fingerprints IS 'Normalized slide content for duration prediction via trigram similarity matching';

-- ============================================================
-- PHASE 4: Performance Indexes
-- ============================================================
-- GIN indexes for fast similarity searches (200-500x faster than sequential scan)
-- Index build time: ~5-10 seconds per 10k rows
-- Index size: ~2-3x table size
-- ============================================================

-- Title similarity index (PRIMARY matching field)
CREATE INDEX idx_slide_fingerprints_title_trgm
ON slide_fingerprints USING GIN (title_normalized gin_trgm_ops);

-- Content similarity index (SECONDARY matching field)
CREATE INDEX idx_slide_fingerprints_content_trgm
ON slide_fingerprints USING GIN (content_normalized gin_trgm_ops);

-- User lookup index (for RLS queries)
CREATE INDEX idx_slide_fingerprints_user_id
ON slide_fingerprints (user_id);

-- Presentation lookup index (for trigger efficiency)
CREATE INDEX idx_slide_fingerprints_presentation_id
ON slide_fingerprints (presentation_id);

-- ============================================================
-- PHASE 5: Row Level Security (RLS)
-- ============================================================
-- Security model:
--   1. Users can only view their own fingerprints (default)
--   2. Opt-in: Users can share duration data for better suggestions
--   3. No user can modify another user's fingerprints
-- ============================================================

ALTER TABLE slide_fingerprints ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users view their own slide fingerprints
CREATE POLICY "Users view own slide fingerprints"
ON slide_fingerprints
FOR SELECT
USING (user_id = auth.uid()::uuid);

-- Policy 2: Cross-user suggestions for opt-in users (future enhancement)
-- Note: Requires users.preferences JSONB column with 'share_duration_data' flag
-- Disabled by default until user preference system is implemented
-- CREATE POLICY "Cross-user suggestions for opt-in users"
-- ON slide_fingerprints
-- FOR SELECT
-- USING (
--   user_id IN (
--     SELECT id FROM users WHERE preferences->>'share_duration_data' = 'true'
--   )
-- );

-- Policy 3: Users can insert their own fingerprints
CREATE POLICY "Users insert own slide fingerprints"
ON slide_fingerprints
FOR INSERT
WITH CHECK (user_id = auth.uid()::uuid);

-- Policy 4: Users can update their own fingerprints
CREATE POLICY "Users update own slide fingerprints"
ON slide_fingerprints
FOR UPDATE
USING (user_id = auth.uid()::uuid);

-- Policy 5: Users can delete their own fingerprints
CREATE POLICY "Users delete own slide fingerprints"
ON slide_fingerprints
FOR DELETE
USING (user_id = auth.uid()::uuid);

-- ============================================================
-- PHASE 6: Incremental Trigger for presentations Table
-- ============================================================
-- Purpose: Auto-sync slide_fingerprints when presentations.timetable_data changes
-- Strategy: Incremental updates (compare OLD vs NEW) to reduce write amplification
-- Performance: 1 write per changed slide (vs 40 writes for full delete-insert)
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
  content_array TEXT[];
  content_text TEXT;
BEGIN
  -- Extract user_id from presentations table
  SELECT user_id INTO target_user_id FROM presentations WHERE id = NEW.id;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Cannot sync fingerprints: user_id not found for presentation %', NEW.id;
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
      array_to_string(ARRAY(SELECT jsonb_array_elements_text(item->'content')), ' '),
      normalize_text(array_to_string(ARRAY(SELECT jsonb_array_elements_text(item->'content')), ' ')),
      (item->>'duration')::INTEGER
    FROM jsonb_array_elements(NEW.timetable_data->'items') AS item
    WHERE item->>'title' IS NOT NULL
      AND item->>'duration' IS NOT NULL
      AND (item->>'duration')::INTEGER > 0;

    RETURN NEW;
  END IF;

  -- Handle UPDATE: Incremental sync (only changed slides)
  IF TG_OP = 'UPDATE' THEN
    old_items := OLD.timetable_data->'items';
    new_items := NEW.timetable_data->'items';

    -- Delete removed slides
    DELETE FROM slide_fingerprints
    WHERE presentation_id = NEW.id
      AND slide_id NOT IN (
        SELECT item->>'id'
        FROM jsonb_array_elements(new_items) AS item
      );

    -- Upsert changed slides
    FOR new_item IN SELECT * FROM jsonb_array_elements(new_items) LOOP
      -- Skip invalid slides
      IF new_item->>'title' IS NULL OR new_item->>'duration' IS NULL THEN
        CONTINUE;
      END IF;

      -- Find corresponding old item
      SELECT item INTO old_item
      FROM jsonb_array_elements(old_items) AS item
      WHERE item->>'id' = new_item->>'id';

      -- Determine if slide changed
      slide_changed := (
        old_item IS NULL OR
        old_item->>'title' != new_item->>'title' OR
        old_item->'content' != new_item->'content' OR
        old_item->>'duration' != new_item->>'duration'
      );

      -- Only update if slide changed
      IF slide_changed THEN
        -- Serialize content array to text
        content_array := ARRAY(SELECT jsonb_array_elements_text(new_item->'content'));
        content_text := array_to_string(content_array, ' ');

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
        ) VALUES (
          target_user_id,
          NEW.id,
          new_item->>'id',
          new_item->>'title',
          normalize_text(new_item->>'title'),
          content_text,
          normalize_text(content_text),
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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to presentations table
DROP TRIGGER IF EXISTS trg_sync_slide_fingerprints ON presentations;
CREATE TRIGGER trg_sync_slide_fingerprints
  AFTER INSERT OR UPDATE OF timetable_data ON presentations
  FOR EACH ROW
  EXECUTE FUNCTION sync_slide_fingerprints_incremental();

-- ============================================================
-- PHASE 7: Migration Validation Queries
-- ============================================================
-- Run these queries to validate successful migration
-- Expected results documented inline
-- ============================================================

-- Validation 1: Verify extension
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    RAISE EXCEPTION 'VALIDATION FAILED: pg_trgm extension not found';
  END IF;
  RAISE NOTICE 'VALIDATION PASSED: pg_trgm extension enabled';
END $$;

-- Validation 2: Verify table structure
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'slide_fingerprints'
  ) THEN
    RAISE EXCEPTION 'VALIDATION FAILED: slide_fingerprints table not found';
  END IF;
  RAISE NOTICE 'VALIDATION PASSED: slide_fingerprints table exists';
END $$;

-- Validation 3: Verify indexes
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'slide_fingerprints';

  IF index_count < 4 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: Expected 4+ indexes, found %', index_count;
  END IF;
  RAISE NOTICE 'VALIDATION PASSED: % indexes created', index_count;
END $$;

-- Validation 4: Verify RLS enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'slide_fingerprints'
      AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'VALIDATION FAILED: RLS not enabled on slide_fingerprints';
  END IF;
  RAISE NOTICE 'VALIDATION PASSED: RLS enabled';
END $$;

-- Validation 5: Verify trigger attached
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sync_slide_fingerprints'
  ) THEN
    RAISE EXCEPTION 'VALIDATION FAILED: Trigger not attached to presentations table';
  END IF;
  RAISE NOTICE 'VALIDATION PASSED: Trigger attached';
END $$;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Next steps:
--   1. Run prototype test suite: psql $DB_URL -f tests/migration/test-slide-fingerprinting.sql
--   2. Monitor trigger performance: SELECT * FROM pg_stat_user_functions WHERE funcname = 'sync_slide_fingerprints_incremental';
--   3. Validate query performance: EXPLAIN ANALYZE SELECT ... FROM slide_fingerprints WHERE similarity(...) > 0.95;
-- ============================================================

-- ============================================================
-- ROLLBACK PROCEDURES (EMERGENCY USE ONLY)
-- ============================================================
-- Uncomment and run if migration needs to be reverted
-- ============================================================

-- DROP TRIGGER IF EXISTS trg_sync_slide_fingerprints ON presentations;
-- DROP FUNCTION IF EXISTS sync_slide_fingerprints_incremental();
-- DROP TABLE IF EXISTS slide_fingerprints CASCADE;
-- DROP FUNCTION IF EXISTS normalize_text(TEXT);
-- -- Note: Do NOT drop pg_trgm extension (safe to leave enabled)
