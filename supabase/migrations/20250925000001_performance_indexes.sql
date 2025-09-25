-- Performance Indexes for Sprint 35 - Database Query Optimization
-- Target: Reduce query time from 80-200ms to <50ms

-- Drop existing basic indexes to replace with optimized versions
DROP INDEX IF EXISTS idx_presentations_user_id;
DROP INDEX IF EXISTS idx_presentations_gamma_url;

-- 1. Composite index for user presentations ordered by updated_at (most common query pattern)
-- This handles queries like: SELECT * FROM presentations WHERE user_id = ? ORDER BY updated_at DESC
-- CONCURRENTLY ensures no blocking during creation on production
CREATE INDEX CONCURRENTLY idx_presentations_user_updated
ON presentations (user_id, updated_at DESC);

-- 2. Fast lookup index for gamma_url (unique lookups)
-- This handles queries like: SELECT * FROM presentations WHERE gamma_url = ?
-- CONCURRENTLY ensures no blocking during creation on production
CREATE INDEX CONCURRENTLY idx_presentations_gamma_url
ON presentations (gamma_url);

-- 3. JSONB GIN index for timetable_data optimization (complex queries on JSON fields)
-- This handles queries like: SELECT * FROM presentations WHERE timetable_data @> '{"key": "value"}'
-- GIN indexes are optimal for JSONB containment operations
-- CONCURRENTLY ensures no blocking during creation on production
CREATE INDEX CONCURRENTLY idx_presentations_timetable_gin
ON presentations USING GIN (timetable_data);

-- Additional performance optimizations

-- 4. Partial index for recent presentations (last 30 days)
-- This optimizes queries for recently active presentations
CREATE INDEX CONCURRENTLY idx_presentations_recent
ON presentations (user_id, updated_at DESC)
WHERE updated_at > NOW() - INTERVAL '30 days';

-- 5. Covering index for presentation list queries (includes commonly selected columns)
-- This allows index-only scans for list views
CREATE INDEX CONCURRENTLY idx_presentations_list_covering
ON presentations (user_id, updated_at DESC)
INCLUDE (title, gamma_url, total_duration);

-- Update table statistics for query planner optimization
ANALYZE presentations;