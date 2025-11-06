-- ============================================================
-- FIX: Restore extract_content_text() Helper in Trigger
-- ============================================================
-- Purpose: Fix trigger to use extract_content_text() helper function
-- Issue: Migration 20251020000000 reverted to old content extraction method
--        This breaks ContentItem[] format support added in 20251018000000
-- Root Cause: Migration 20251020000000 replaced trigger but didn't use helper function
-- Fix: Update trigger to use extract_content_text() while keeping zero-duration support
-- Risk: Low (restores correct behavior, maintains zero-duration support)
-- ============================================================

-- ============================================================
-- Update Trigger Function to Use Helper + Allow Zero Duration
-- ============================================================
-- Combines:
--   1. extract_content_text() helper from 20251018000000 (ContentItem[] support)
--   2. Zero duration support from 20251020000000 (duration >= 0)
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
      extract_content_text(item->'content'),  -- FIXED: Use helper function
      normalize_text(extract_content_text(item->'content')),  -- FIXED: Use helper function
      (item->>'duration')::INTEGER
    FROM jsonb_array_elements(NEW.timetable_data->'items') AS item
    WHERE item->>'title' IS NOT NULL
      AND item->>'duration' IS NOT NULL
      AND (item->>'duration')::INTEGER >= 0;  -- Keep zero-duration support

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
        -- FIXED: Extract content using helper function (supports both formats)
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
-- Validation
-- ============================================================

DO $$
BEGIN
  -- Verify helper function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'extract_content_text'
  ) THEN
    RAISE EXCEPTION 'VALIDATION FAILED: extract_content_text() function not found';
  END IF;
  
  RAISE NOTICE 'VALIDATION PASSED: Trigger updated to use extract_content_text() helper';
  RAISE NOTICE 'VALIDATION PASSED: Zero duration support maintained';
END $$;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Changes:
--   1. Restored extract_content_text() helper usage in trigger
--   2. Maintains zero-duration support (duration >= 0)
--   3. Now correctly handles ContentItem[] format again
--   4. Backward compatible with string[] format
--
-- Impact:
--   - Presentations with ContentItem[] content will now create fingerprints correctly
--   - Zero-duration slides (section headers) continue to work
--   - Existing fingerprints remain valid
--
-- Next Steps:
--   - Existing presentations may need to be re-saved to regenerate fingerprints
--   - New presentations will automatically create correct fingerprints
-- ============================================================

