-- ============================================================
-- FIX: Handle ContentItem[] Objects in Slide Fingerprint Trigger
-- ============================================================
-- Purpose: Fix "cannot extract elements from a scalar" error when content is ContentItem[] instead of string[]
-- Author: Sprint 39 Team
-- Date: October 18, 2025
-- Risk: Low (backward compatible, handles both formats)
-- Issue: Extension sends content as [{"type":"paragraph","text":"..."}] but trigger expects ["string1","string2"]
-- ============================================================

-- Helper function to extract text from content field (supports both string[] and ContentItem[])
CREATE OR REPLACE FUNCTION extract_content_text(content_field JSONB)
RETURNS TEXT AS $$
DECLARE
  content_text TEXT := '';
  elem JSONB;
BEGIN
  -- Handle NULL or empty content
  IF content_field IS NULL OR jsonb_array_length(content_field) = 0 THEN
    RETURN '';
  END IF;

  -- Iterate over array elements
  FOR elem IN SELECT * FROM jsonb_array_elements(content_field) LOOP
    -- Check if element is a string (legacy format)
    IF jsonb_typeof(elem) = 'string' THEN
      content_text := content_text || ' ' || (elem #>> '{}');

    -- Check if element is an object with 'text' field (ContentItem format)
    ELSIF jsonb_typeof(elem) = 'object' AND elem ? 'text' THEN
      content_text := content_text || ' ' || (elem->>'text');

      -- Also include subItems if present
      IF elem ? 'subItems' AND jsonb_typeof(elem->'subItems') = 'array' THEN
        content_text := content_text || ' ' ||
          array_to_string(
            ARRAY(SELECT jsonb_array_elements_text(elem->'subItems')),
            ' '
          );
      END IF;
    END IF;
  END LOOP;

  -- Trim leading/trailing whitespace
  RETURN trim(content_text);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comment
COMMENT ON FUNCTION extract_content_text(JSONB) IS
  'Extracts text from content field supporting both string[] and ContentItem[] formats';

-- ============================================================
-- Update Trigger Function to Use Helper
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
      extract_content_text(item->'content'),
      normalize_text(extract_content_text(item->'content')),
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
        -- Extract content using helper function (supports both formats)
        content_text := extract_content_text(new_item->'content');

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

-- ============================================================
-- Validation Tests
-- ============================================================

-- Test 1: Helper function with string array (legacy format)
DO $$
DECLARE
  result TEXT;
BEGIN
  result := extract_content_text('["Hello world", "Testing 123"]'::jsonb);
  IF result != 'Hello world Testing 123' THEN
    RAISE EXCEPTION 'VALIDATION FAILED: String array extraction returned "%"', result;
  END IF;
  RAISE NOTICE 'VALIDATION PASSED: String array extraction works';
END $$;

-- Test 2: Helper function with ContentItem objects (new format)
DO $$
DECLARE
  result TEXT;
BEGIN
  result := extract_content_text(
    '[{"type":"paragraph","text":"Hello world","subItems":[]}, {"type":"list_item","text":"Main point","subItems":["Sub 1","Sub 2"]}]'::jsonb
  );
  IF result NOT LIKE '%Hello world%' OR result NOT LIKE '%Main point%' OR result NOT LIKE '%Sub 1%' THEN
    RAISE EXCEPTION 'VALIDATION FAILED: ContentItem extraction returned "%"', result;
  END IF;
  RAISE NOTICE 'VALIDATION PASSED: ContentItem extraction works';
END $$;

-- Test 3: Helper function with empty/null content
DO $$
DECLARE
  result TEXT;
BEGIN
  result := extract_content_text(NULL);
  IF result != '' THEN
    RAISE EXCEPTION 'VALIDATION FAILED: NULL content should return empty string';
  END IF;

  result := extract_content_text('[]'::jsonb);
  IF result != '' THEN
    RAISE EXCEPTION 'VALIDATION FAILED: Empty array should return empty string';
  END IF;

  RAISE NOTICE 'VALIDATION PASSED: Empty/NULL content handling works';
END $$;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Changes:
--   1. Added extract_content_text() helper function
--   2. Updated sync_slide_fingerprints_incremental() to use helper
--   3. Now supports both string[] and ContentItem[] formats
--   4. Backward compatible with existing data
--
-- Testing:
--   - Legacy presentations with content: ["text1", "text2"] will continue to work
--   - New presentations with content: [{"type":"paragraph","text":"..."}] will now work
--   - SubItems are included in text extraction for better similarity matching
-- ============================================================

-- ============================================================
-- ROLLBACK PROCEDURES (EMERGENCY USE ONLY)
-- ============================================================
-- To rollback this migration, restore the original trigger function:
--
-- DROP FUNCTION IF EXISTS extract_content_text(JSONB);
--
-- Then restore the original sync_slide_fingerprints_incremental() function
-- from migration 20251001154438_slide_fingerprints.sql
-- ============================================================
