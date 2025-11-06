# Sprint 35 CI/CD Strategy & Multi-PR Deployment Plan

## 🎯 **Strategic Overview**

**Problem:** Sprint 35 performance optimizations are high-risk changes that could break production
**Solution:** 5 isolated PRs with progressive deployment and performance validation at each step

## 📋 **Multi-PR Strategy (5 PRs, Not 1)**

### **PR #1: Database Performance Foundation** 🟢 LOW RISK
**Branch:** `perf/database-indexes`
**Files Changed:**
- `supabase/migrations/20250925000001_performance_indexes.sql`
- Minor API endpoint optimizations

**Database Changes:**
```sql
-- Performance indexes migration
CREATE INDEX CONCURRENTLY idx_presentations_user_updated
ON presentations(user_id, updated_at DESC);

CREATE INDEX CONCURRENTLY idx_presentations_gamma_url
ON presentations(gamma_url);

CREATE INDEX CONCURRENTLY idx_presentations_timetable_gin
ON presentations USING gin (timetable_data);
```

**Deployment Strategy:**
1. CI validates migration syntax
2. Staging deployment with performance benchmarks
3. Production deployment during low-traffic window
4. Immediate performance monitoring

**Expected Impact:** 60% database query improvement
**Rollback Plan:** `DROP INDEX` commands ready

---

### **PR #2: React Performance Quick Wins** 🟡 LOW-MEDIUM RISK
**Branch:** `perf/react-optimization`
**Files Changed:**
- `packages/web/src/app/gamma/timetables/components/TimetableCard.tsx`
- `packages/web/src/app/gamma/timetables/TimetablesClient.tsx`
- `packages/web/src/app/gamma/timetables/[id]/TimetableDetailClient.tsx`

**Changes:**
```typescript
// Add React.memo to prevent unnecessary re-renders
export default React.memo(function TimetableCard({ presentation, onView, onExport, onDelete }) {
  // Add useCallback for event handlers
  const handleView = useCallback(() => onView(presentation.id), [presentation.id, onView])
  // ... component logic
})
```

**Deployment Strategy:**
1. Automated bundle size analysis in CI
2. React DevTools profiling in staging
3. A/B test with 10% traffic initially
4. Progressive rollout: 10% → 25% → 50% → 100%

**Expected Impact:** 50% reduction in React re-renders
**Rollback Plan:** Feature flag instant disable

---

### **PR #3: Bundle Optimization** 🟠 MEDIUM RISK
**Branch:** `perf/bundle-splitting`
**Files Changed:**
- `packages/web/next.config.js` (webpack optimizations)
- Dynamic import implementations for heavy libraries

**Changes:**
```javascript
// Enhanced webpack splitting
config.optimization.splitChunks = {
  chunks: 'all',
  cacheGroups: {
    vendor: { test: /[\\/]node_modules[\\/]/, name: 'vendors', maxSize: 200000 },
    xlsx: { test: /[\\/]node_modules[\\/]xlsx/, name: 'xlsx', chunks: 'async' }
  }
}
```

**Deployment Strategy:**
1. Bundle analyzer reports in CI
2. Lighthouse performance scores validation
3. Core Web Vitals monitoring during deployment
4. Gradual rollout with bundle size monitoring

**Expected Impact:** 25% bundle size reduction, 1.3MB XLSX lazy-loaded
**Rollback Plan:** Revert next.config.js, disable dynamic imports

---

### **PR #4: Caching Implementation** 🔴 HIGH RISK
**Branch:** `perf/client-caching`
**Files Changed:**
- API routes (cache headers)
- Client components (SWR integration)
- Cache invalidation logic

**Changes:**
```typescript
// SWR integration
const { data, error, isLoading } = useSWR('/api/presentations/list', fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 60000
})

// API cache headers
response.headers.set('Cache-Control', 'private, max-age=60, s-maxage=300')
```

**Deployment Strategy:**
1. Cache hit/miss ratio monitoring in staging
2. Feature flag controlled rollout
3. Cache invalidation testing with real data changes
4. Performance regression monitoring (cache vs no-cache)

**Expected Impact:** >70% cache hit rate, sub-100ms cached navigation
**Rollback Plan:** Feature flag instant disable, cache flush commands

---

### **PR #5: Advanced Architecture** 🔴🔴 VERY HIGH RISK
**Branch:** `perf/state-management`
**Files Changed:**
- Complex state management patterns
- Context optimization
- useReducer implementations

**Changes:**
```typescript
// Replace complex useState with useReducer
const [state, dispatch] = useReducer(timetableReducer, initialState)

// Optimized context splitting
const TimetableDataContext = createContext()
const TimetableActionsContext = createContext()
```

**Deployment Strategy:**
1. Comprehensive integration testing
2. Shadow deployment (parallel system testing)
3. Canary deployment with 5% traffic
4. Full performance regression suite
5. User experience monitoring

**Expected Impact:** Final 15% performance improvement, architectural stability
**Rollback Plan:** Immediate feature flag disable, automated fallback to previous patterns

## 🔧 **Enhanced CI/CD Pipeline Configuration**

### **Performance Validation Pipeline**
```yaml
# .github/workflows/performance-validation.yml
name: Performance Validation

on:
  pull_request:
    branches: [ main ]
    paths:
      - 'packages/web/**'
      - 'supabase/migrations/**'

jobs:
  performance-check:
    runs-on: ubuntu-latest
    steps:
      - name: Lighthouse CI
        run: lhci autorun

      - name: Bundle Size Analysis
        run: npm run analyze

      - name: Database Migration Test
        run: supabase db reset && supabase db push

      - name: Performance Regression Check
        run: npm run perf:check
```

### **Migration Deployment Pipeline**
```yaml
# Database migration job
migrate-db:
  runs-on: ubuntu-latest
  if: contains(github.event.head_commit.modified, 'supabase/migrations/')
  steps:
    - name: Run Migration (Staging)
      run: supabase db push --db-url ${{ secrets.SUPABASE_STAGING_URL }}

    - name: Validate Migration Performance
      run: npm run db:perf-test

    - name: Production Migration (on merge)
      if: github.ref == 'refs/heads/main'
      run: supabase db push --db-url ${{ secrets.SUPABASE_PROD_URL }}
```

## 📊 **Progressive Deployment Strategy**

### **Phase 1: Database + React (PRs 1-2)**
- **Week 1**: Low-risk changes with high impact
- **Rollout**: Immediate production deployment after staging validation
- **Monitoring**: Database query times, React render counts

### **Phase 2: Bundle + Caching (PRs 3-4)**
- **Week 2**: Medium/high-risk changes
- **Rollout**: Feature flag controlled, progressive traffic (10% → 100%)
- **Monitoring**: Bundle sizes, cache hit rates, Core Web Vitals

### **Phase 3: Architecture (PR 5)**
- **Week 3**: Highest risk, highest reward
- **Rollout**: Canary deployment, shadow testing, gradual rollout
- **Monitoring**: Full performance suite, user experience metrics

## 🚨 **Emergency Rollback Procedures**

### **Automated Rollback Triggers**
- Performance regression >20% from baseline
- Error rate increase >0.5%
- Core Web Vitals drop below threshold
- Database query timeout rate >5%

### **Rollback Commands**
```bash
# Feature flag instant disable
curl -X POST "$FEATURE_FLAG_API/disable/perf-optimization"

# Database migration rollback
supabase db push --db-url $PROD_URL --include-all --rollback

# Netlify deployment rollback
netlify deploy --prod --alias previous-deployment

# Emergency cache flush
curl -X POST "$CDN_API/purge-cache"
```

## 🎯 **Success Metrics Per PR**

### **PR #1 Success Criteria:**
- Database query times: <50ms average (from 80-200ms)
- Index creation: CONCURRENTLY without blocking
- Zero database downtime

### **PR #2 Success Criteria:**
- React re-renders: <12 per navigation (from 15-20)
- Bundle size stable (no increase)
- Navigation feels responsive

### **PR #3 Success Criteria:**
- Bundle size: <200KB main chunk (from 277KB)
- XLSX library: Lazy loaded (1.3MB reduction)
- Lighthouse score: >90

### **PR #4 Success Criteria:**
- Cache hit rate: >70%
- Cached navigation: <100ms
- Cache invalidation: <2s propagation

### **PR #5 Success Criteria:**
- Overall improvement: 70-85% faster navigation
- User complaints: Eliminated
- System stability: Maintained

## 🔄 **Why This Strategy Works**

### **Risk Isolation**
- Each PR can be independently rolled back
- Progressive complexity allows learning from early PRs
- Performance impact can be measured incrementally

### **Validation at Each Step**
- CI/CD validates each change individually
- Performance regression detection before production
- User experience monitoring throughout rollout

### **Business Continuity**
- No "big bang" deployment risk
- Gradual improvement maintains user trust
- Quick rollback capability if issues arise

### **Development Velocity**
- Smaller PRs = faster code reviews
- Independent deployment reduces coordination overhead
- Incremental improvements = continuous value delivery

## 📅 **Recommended Timeline**

**Week 1:** PRs 1-2 (Database + React) - Foundation
**Week 2:** PRs 3-4 (Bundle + Caching) - Major Impact
**Week 3:** PR 5 (Architecture) - Final Polish
**Week 4:** Monitoring, optimization, documentation

This strategy transforms a risky monolithic deployment into a series of validated, incremental improvements with comprehensive rollback capabilities.