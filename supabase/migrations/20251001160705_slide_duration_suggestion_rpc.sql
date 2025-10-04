-- ============================================================
-- SPRINT 36: SLIDE DURATION PREDICTION - RPC FUNCTION
-- ============================================================
-- Purpose: RPC function to get duration suggestion for a slide
-- Strategy: Two-tier similarity matching (title + content) with IQR outlier filtering
-- Performance: Target <100ms query time
-- ============================================================

CREATE OR REPLACE FUNCTION get_duration_suggestion(
  p_title TEXT,
  p_content TEXT,
  p_title_threshold FLOAT DEFAULT 0.95,
  p_content_threshold FLOAT DEFAULT 0.90
)
RETURNS TABLE(
  avg_duration FLOAT,
  median FLOAT,
  p25 FLOAT,
  p75 FLOAT,
  sample_size INT,
  coefficient_of_variation FLOAT,
  avg_title_similarity FLOAT,
  avg_content_similarity FLOAT
) AS $$
DECLARE
  normalized_title TEXT;
  normalized_content TEXT;
  q1 FLOAT;
  q3 FLOAT;
  iqr FLOAT;
  lower_bound FLOAT;
  upper_bound FLOAT;
BEGIN
  -- Normalize input text
  normalized_title := normalize_text(p_title);
  normalized_content := normalize_text(p_content);

  -- Find similar slides with two-tier matching
  WITH similar_slides AS (
    SELECT
      sf.duration,
      similarity(sf.title_normalized, normalized_title) AS title_sim,
      similarity(sf.content_normalized, normalized_content) AS content_sim
    FROM slide_fingerprints sf
    WHERE similarity(sf.title_normalized, normalized_title) > p_title_threshold
      AND similarity(sf.content_normalized, normalized_content) > p_content_threshold
      AND sf.user_id = auth.uid()::uuid  -- RLS: Only user's own data (for now)
  ),
  -- Calculate IQR bounds for outlier removal
  quartiles AS (
    SELECT
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY duration) AS q1_val,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY duration) AS q3_val
    FROM similar_slides
  ),
  -- Filter outliers using IQR method
  filtered_slides AS (
    SELECT
      ss.duration,
      ss.title_sim,
      ss.content_sim
    FROM similar_slides ss, quartiles q
    WHERE ss.duration BETWEEN
      (q.q1_val - 1.5 * (q.q3_val - q.q1_val)) AND
      (q.q3_val + 1.5 * (q.q3_val - q.q1_val))
  )
  -- Calculate aggregated statistics
  SELECT
    AVG(duration)::FLOAT,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration)::FLOAT,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY duration)::FLOAT,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY duration)::FLOAT,
    COUNT(*)::INT,
    CASE
      WHEN AVG(duration) > 0 THEN (STDDEV(duration) / AVG(duration))::FLOAT
      ELSE 0::FLOAT
    END,
    AVG(title_sim)::FLOAT,
    AVG(content_sim)::FLOAT
  INTO
    avg_duration,
    median,
    p25,
    p75,
    sample_size,
    coefficient_of_variation,
    avg_title_similarity,
    avg_content_similarity
  FROM filtered_slides;

  -- Return result (NULL if no matches)
  RETURN QUERY SELECT
    COALESCE(avg_duration, 0.0),
    COALESCE(median, 0.0),
    COALESCE(p25, 0.0),
    COALESCE(p75, 0.0),
    COALESCE(sample_size, 0),
    COALESCE(coefficient_of_variation, 0.0),
    COALESCE(avg_title_similarity, 0.0),
    COALESCE(avg_content_similarity, 0.0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_duration_suggestion(TEXT, TEXT, FLOAT, FLOAT) TO authenticated;

-- Add function comment
COMMENT ON FUNCTION get_duration_suggestion IS 'Get duration suggestion for a slide based on similarity matching with IQR outlier filtering';
