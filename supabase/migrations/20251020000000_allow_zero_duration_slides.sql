-- ============================================================
-- SPRINT 39: Allow Zero-Duration Slides (Section Headers)
-- ============================================================
-- Purpose: Fix database constraint to allow slides with 0 duration
-- Issue: Section header slides (like "1. Sissejuhatus") have 0 duration
--        but CHECK constraint required duration > 0
-- Root Cause: Original migration assumed all slides must have duration > 0
-- Fix: Change constraint to duration >= 0 and update trigger
-- Risk: Low (backward compatible - only allows additional valid data)
-- ============================================================

-- ============================================================
-- PHASE 1: Drop Old CHECK Constraint
-- ============================================================

ALTER TABLE slide_fingerprints
DROP CONSTRAINT IF EXISTS slide_fingerprints_duration_check;

-- ============================================================
-- PHASE 2: Add New CHECK Constraint (Allow Zero)
-- ============================================================

ALTER TABLE slide_fingerprints
ADD CONSTRAINT slide_fingerprints_duration_check CHECK (duration >= 0);

-- ============================================================
-- PHASE 3: Update Trigger Function to Allow Zero Duration
-- ============================================================
-- The trigger function previously filtered out slides with duration <= 0
-- Now it should allow duration >= 0
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
      AND (item->>'duration')::INTEGER >= 0;  -- CHANGED: Allow zero duration

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

-- ============================================================
-- PHASE 4: Validation
-- ============================================================

DO $$
BEGIN
  -- Verify constraint allows zero
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'slide_fingerprints_duration_check'
      AND check_clause LIKE '%>=%'
  ) THEN
    RAISE EXCEPTION 'VALIDATION FAILED: Constraint does not allow zero duration';
  END IF;
  RAISE NOTICE 'VALIDATION PASSED: Zero duration slides now allowed';
END $$;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Impact: Section header slides with 0 duration can now be saved
-- Testing: Try saving a presentation with section headers from extension
-- ============================================================
