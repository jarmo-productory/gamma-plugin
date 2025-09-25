-- Final Performance Indexes for Sprint 35 - Database Query Optimization
-- Fixed: Removed NOW() function which caused IMMUTABLE error
-- Target: Reduce query time from 80-200ms to <50ms

-- Drop existing basic indexes if they exist (cleanup from failed attempts)
DROP INDEX IF EXISTS idx_presentations_user_id;
DROP INDEX IF EXISTS idx_presentations_gamma_url;
DROP INDEX IF EXISTS idx_presentations_user_updated;
DROP INDEX IF EXISTS idx_presentations_timetable_gin;
DROP INDEX IF EXISTS idx_presentations_recent;
DROP INDEX IF EXISTS idx_presentations_list_covering;

-- 1. Composite index for user presentations ordered by updated_at (most common query pattern)
-- This handles queries like: SELECT * FROM presentations WHERE user_id = ? ORDER BY updated_at DESC
CREATE INDEX idx_presentations_user_updated
ON presentations (user_id, updated_at DESC);

-- 2. Fast lookup index for gamma_url (unique lookups)
-- This handles queries like: SELECT * FROM presentations WHERE gamma_url = ?
CREATE INDEX idx_presentations_gamma_url
ON presentations (gamma_url);

-- 3. JSONB GIN index for timetable_data optimization (complex queries on JSON fields)
-- This handles queries like: SELECT * FROM presentations WHERE timetable_data @> '{"key": "value"}'
-- GIN indexes are optimal for JSONB containment operations
CREATE INDEX idx_presentations_timetable_gin
ON presentations USING GIN (timetable_data);

-- 4. Covering index for presentation list queries (includes commonly selected columns)
-- This allows index-only scans for list views
CREATE INDEX idx_presentations_list_covering
ON presentations (user_id, updated_at DESC)
INCLUDE (title, gamma_url, total_duration);

-- Update table statistics for query planner optimization
ANALYZE presentations;