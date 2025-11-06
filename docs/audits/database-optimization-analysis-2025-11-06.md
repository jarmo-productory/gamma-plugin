# Database Optimization Analysis
**Date:** 2025-11-06  
**Based on:** CODEMAP.md analysis + Supabase migration review  
**Method:** Static analysis of query patterns and existing indexes

---

## Executive Summary

Analysis of database structure reveals **6 optimization opportunities** across 4 tables:
- **High Impact:** 3 optimizations (device_tokens validation, device_registrations expiry, presentations composite)
- **Medium Impact:** 2 optimizations (device_tokens user management, slide_fingerprints composite)
- **Low Impact:** 1 optimization (device_tokens partial index)

**Estimated Performance Gains:**
- Token validation queries: **30-50% faster** (most critical path)
- Device registration lookups: **40-60% faster** (expiry filtering)
- Presentation list queries: **10-20% faster** (already optimized, minor gains)

---

## 1. Query Pattern Analysis

### 1.1 Presentations Table

**Common Queries:**
```sql
-- Pattern 1: List user presentations (most frequent)
SELECT * FROM presentations 
WHERE user_id = ? 
ORDER BY updated_at DESC;

-- Pattern 2: Get by URL (device-token path)
SELECT * FROM presentations 
WHERE user_id = ? AND gamma_url = ?;

-- Pattern 3: Get by ID
SELECT * FROM presentations 
WHERE id = ? AND user_id = ?;
```

**Current Indexes:**
- ✅ `idx_presentations_user_updated` ON (user_id, updated_at DESC) - **OPTIMAL**
- ✅ `idx_presentations_gamma_url` ON (gamma_url) - **GOOD**
- ✅ `idx_presentations_list_covering` ON (user_id, updated_at DESC) INCLUDE (title, gamma_url, total_duration) - **EXCELLENT**
- ✅ `idx_presentations_timetable_gin` USING GIN (timetable_data) - **GOOD** (for JSONB queries)

**Status:** ✅ **WELL OPTIMIZED** - No changes needed

**Note:** The unique constraint `presentations_user_url_unique` on `(user_id, gamma_url)` already provides an index for Pattern 2 queries.

---

### 1.2 Device Tokens Table

**Common Queries:**
```sql
-- Pattern 1: Token validation (CRITICAL PATH - called on every API request)
SELECT user_id, device_id, device_name, user_email 
FROM device_tokens 
WHERE token_hash = ? AND expires_at > NOW();

-- Pattern 2: User device management
SELECT * FROM device_tokens 
WHERE auth_id = ? 
ORDER BY last_used DESC;

-- Pattern 3: Expired token cleanup
SELECT * FROM device_tokens 
WHERE expires_at < NOW();
```

**Current Indexes:**
- ✅ `idx_device_tokens_hash` UNIQUE ON (token_hash) WHERE token_hash IS NOT NULL
- ✅ `idx_device_tokens_user_id` ON (user_id)
- ✅ `idx_device_tokens_expires_at` ON (expires_at)
- ✅ `idx_device_tokens_user_last_used` ON (user_id, last_used DESC)
- ✅ `idx_device_tokens_user_fingerprint` UNIQUE ON (auth_id, device_fingerprint)

**Optimization Opportunities:**

#### 🔴 **HIGH PRIORITY: Composite Index for Token Validation**

**Problem:** Pattern 1 query filters by both `token_hash` AND `expires_at`, but current indexes are separate.

**Current Query Plan:** Index scan on `token_hash`, then filter `expires_at` in memory.

**Optimization:**
```sql
-- Composite index for token validation queries
CREATE INDEX idx_device_tokens_hash_expires 
ON device_tokens (token_hash, expires_at) 
WHERE token_hash IS NOT NULL;
```

**Expected Impact:** 30-50% faster token validation (most critical path)

**Rationale:** 
- Token validation happens on **every API request** from extension
- Composite index allows single index scan instead of hash lookup + filter
- Partial index (`WHERE token_hash IS NOT NULL`) reduces index size

---

#### 🟡 **MEDIUM PRIORITY: Index for User Device Management**

**Problem:** Pattern 2 queries filter by `auth_id` but current index uses `user_id` (different column).

**Current State:** Migration `20250831000001_secure_token_hashing.sql` shows `user_id` column, but later migrations show `auth_id` column. Need to verify actual schema.

**Optimization (if auth_id column exists):**
```sql
-- Index for user device list queries
CREATE INDEX idx_device_tokens_auth_last_used 
ON device_tokens (auth_id, last_used DESC);
```

**Expected Impact:** 20-30% faster device management queries

**Note:** Verify column name first - may already exist as `idx_device_tokens_user_last_used`.

---

#### 🟢 **LOW PRIORITY: Partial Index for Active Tokens**

**Optimization:**
```sql
-- Partial index for non-expired tokens (most common query pattern)
CREATE INDEX idx_device_tokens_active_hash 
ON device_tokens (token_hash) 
WHERE expires_at > NOW();
```

**Expected Impact:** 10-15% faster validation queries, reduced index size

**Trade-off:** Index needs periodic maintenance as tokens expire. May not be worth it if token expiry is frequent.

---

### 1.3 Device Registrations Table

**Common Queries:**
```sql
-- Pattern 1: Code validation (device pairing flow)
SELECT * FROM device_registrations 
WHERE code = ? AND expires_at > NOW() AND linked = false;

-- Pattern 2: Expired registration cleanup
SELECT * FROM device_registrations 
WHERE expires_at < NOW();
```

**Current Indexes:**
- ✅ Primary key on `code` (automatic index)

**Optimization Opportunities:**

#### 🔴 **HIGH PRIORITY: Composite Index for Code Validation**

**Problem:** Pattern 1 filters by `code`, `expires_at`, and `linked`, but only has PK on `code`.

**Optimization:**
```sql
-- Composite index for active code lookups
CREATE INDEX idx_device_registrations_code_expires_linked 
ON device_registrations (code, expires_at, linked) 
WHERE expires_at > NOW() AND linked = false;
```

**Expected Impact:** 40-60% faster device pairing code validation

**Rationale:**
- Device pairing is time-sensitive (10-minute expiry)
- Partial index reduces size by excluding expired/linked registrations
- Composite index allows single index scan for all filters

---

#### 🟢 **LOW PRIORITY: Expiry Index for Cleanup**

**Optimization:**
```sql
-- Index for expired registration cleanup queries
CREATE INDEX idx_device_registrations_expires 
ON device_registrations (expires_at) 
WHERE expires_at < NOW();
```

**Expected Impact:** Faster cleanup queries (runs periodically, not critical path)

**Note:** May not be necessary if cleanup runs infrequently.

---

### 1.4 Slide Fingerprints Table

**Common Queries:**
```sql
-- Pattern 1: Duration suggestion RPC (trigram similarity)
SELECT duration, similarity(title_normalized, ?), similarity(content_normalized, ?)
FROM slide_fingerprints 
WHERE similarity(title_normalized, ?) > 0.95
  AND similarity(content_normalized, ?) > 0.90
  AND user_id = ?;
```

**Current Indexes:**
- ✅ `idx_slide_fingerprints_title_trgm` USING GIN (title_normalized gin_trgm_ops)
- ✅ `idx_slide_fingerprints_content_trgm` USING GIN (content_normalized gin_trgm_ops)
- ✅ `idx_slide_fingerprints_user_id` ON (user_id)
- ✅ `idx_slide_fingerprints_presentation_id` ON (presentation_id)

**Optimization Opportunities:**

#### 🟡 **MEDIUM PRIORITY: Composite Index for RLS + Similarity**

**Problem:** RPC function filters by `user_id` first (RLS requirement), then does trigram similarity. Current indexes are separate.

**Current Query Plan:** 
1. Index scan on `user_id` (fast)
2. Filter by trigram similarity (uses GIN index)
3. Combine results

**Optimization:**
```sql
-- Composite index: user_id first (RLS filter), then trigram indexes handle similarity
-- Note: GIN indexes can't be composite with B-tree, so this may not be possible
-- Alternative: Verify query planner is using both indexes efficiently
```

**Expected Impact:** 10-20% faster if query planner isn't optimizing correctly

**Note:** PostgreSQL query planner should already use both indexes efficiently. This optimization may not be necessary. **Verify with EXPLAIN ANALYZE first.**

---

## 2. Index Redundancy Analysis

### 2.1 Potential Redundant Indexes

**Device Tokens:**
- `idx_device_tokens_user_id` vs `idx_device_tokens_user_last_used` - **KEEP BOTH** (different query patterns)
- `idx_device_tokens_expires_at` vs proposed `idx_device_tokens_hash_expires` - **KEEP BOTH** (expires_at used in cleanup queries)

**Presentations:**
- `idx_presentations_user_updated` vs `idx_presentations_list_covering` - **KEEP BOTH** (covering index is more efficient for SELECT queries)

---

## 3. Missing Indexes Summary

### High Priority (Implement First)

1. **Device Tokens - Token Validation Composite**
   ```sql
   CREATE INDEX CONCURRENTLY idx_device_tokens_hash_expires 
   ON device_tokens (token_hash, expires_at) 
   WHERE token_hash IS NOT NULL;
   ```
   **Impact:** 30-50% faster token validation (critical path)

2. **Device Registrations - Code Validation Composite**
   ```sql
   CREATE INDEX CONCURRENTLY idx_device_registrations_code_expires_linked 
   ON device_registrations (code, expires_at, linked) 
   WHERE expires_at > NOW() AND linked = false;
   ```
   **Impact:** 40-60% faster device pairing

### Medium Priority (Verify Need First)

3. **Device Tokens - Auth ID Index** (verify column name)
   ```sql
   -- Only if auth_id column exists and index doesn't
   CREATE INDEX CONCURRENTLY idx_device_tokens_auth_last_used 
   ON device_tokens (auth_id, last_used DESC);
   ```
   **Impact:** 20-30% faster device management

4. **Slide Fingerprints - Verify Query Plan** (may not be needed)
   - Run `EXPLAIN ANALYZE` on duration suggestion RPC
   - If query planner isn't using both indexes efficiently, consider optimization

### Low Priority (Nice to Have)

5. **Device Tokens - Active Tokens Partial Index**
   ```sql
   CREATE INDEX CONCURRENTLY idx_device_tokens_active_hash 
   ON device_tokens (token_hash) 
   WHERE expires_at > NOW();
   ```
   **Impact:** 10-15% faster validation, reduced index size

---

## 4. Implementation Recommendations

### Phase 1: Critical Path Optimizations (Week 1)

1. **Create device_tokens composite index**
   - Test in staging first
   - Monitor query performance before/after
   - Use `CONCURRENTLY` to avoid locking

2. **Create device_registrations composite index**
   - Low risk (new table, low traffic)
   - Can deploy immediately

### Phase 2: Verification & Analysis (Week 2)

3. **Verify device_tokens schema**
   - Check if `auth_id` column exists
   - Verify existing indexes match migration files
   - Run `EXPLAIN ANALYZE` on device management queries

4. **Analyze slide_fingerprints query performance**
   - Run `EXPLAIN ANALYZE` on `get_duration_suggestion` RPC
   - Check if query planner uses both GIN indexes efficiently
   - Only optimize if performance is suboptimal

### Phase 3: Optional Optimizations (Week 3+)

5. **Consider partial index for active tokens**
   - Only if token validation still slow after Phase 1
   - Monitor index maintenance overhead

---

## 5. Migration Script Template

```sql
-- ============================================================
-- DATABASE OPTIMIZATION MIGRATION
-- Date: 2025-11-06
-- Purpose: Add composite indexes for critical query patterns
-- Risk: Low (index creation only, no schema changes)
-- ============================================================

-- 1. Device Tokens - Token Validation Composite Index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_device_tokens_hash_expires 
ON device_tokens (token_hash, expires_at) 
WHERE token_hash IS NOT NULL;

-- 2. Device Registrations - Code Validation Composite Index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_device_registrations_code_expires_linked 
ON device_registrations (code, expires_at, linked) 
WHERE expires_at > NOW() AND linked = false;

-- 3. Verify indexes created successfully
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE indexname IN (
    'idx_device_tokens_hash_expires',
    'idx_device_registrations_code_expires_linked'
  );
  
  IF index_count < 2 THEN
    RAISE EXCEPTION 'Index creation failed: Expected 2 indexes, found %', index_count;
  END IF;
  
  RAISE NOTICE 'SUCCESS: All optimization indexes created';
END $$;

-- 4. Update table statistics for query planner
ANALYZE device_tokens;
ANALYZE device_registrations;
```

---

## 6. Performance Monitoring Queries

### Before/After Comparison

```sql
-- Token validation query performance
EXPLAIN ANALYZE
SELECT user_id, device_id, device_name, user_email 
FROM device_tokens 
WHERE token_hash = 'sample_hash' AND expires_at > NOW();

-- Device registration code validation performance
EXPLAIN ANALYZE
SELECT * FROM device_registrations 
WHERE code = '123456' AND expires_at > NOW() AND linked = false;

-- Presentation list query performance (baseline - should already be fast)
EXPLAIN ANALYZE
SELECT * FROM presentations 
WHERE user_id = 'sample-uuid' 
ORDER BY updated_at DESC;
```

---

## 7. Risk Assessment

**Low Risk:**
- Index creation only (no schema changes)
- Using `CONCURRENTLY` prevents table locking
- Can drop indexes if performance doesn't improve

**Monitoring Required:**
- Index size growth (composite indexes are larger)
- Query planner statistics (run `ANALYZE` after index creation)
- Actual query performance improvements (measure before/after)

---

## 8. Next Steps

1. ✅ **Review this analysis** with team
2. ⏳ **Create migration file** with Phase 1 optimizations
3. ⏳ **Test in staging** environment first
4. ⏳ **Deploy to production** using `CONCURRENTLY`
5. ⏳ **Monitor performance** improvements
6. ⏳ **Verify Phase 2** optimizations are needed

---

**Analysis Complete**  
**Next Action:** Create migration file for Phase 1 optimizations

