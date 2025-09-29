# Sprint 35: Netlify Production Performance Optimization

**Sprint Goal:** Eliminate 1-2 second navigation delays in Netlify production, achieving sub-500ms timetable navigation experience

**Based on:**
- [Netlify Production Performance Audit](../audits/netlify-production-performance-audit-2025-09-25.md)
- [Performance Optimization Action Plan](../../docs/performance-optimization-action-plan.md)
- [Sprint 35 CI/CD Strategy](../../docs/sprint-35-cicd-strategy.md)

**Sprint Duration:** 3-4 weeks (5 PRs, progressive deployment)
**CI/CD Strategy:** Multi-PR deployment with risk isolation and performance validation
**Priority:** Critical (User Experience Impact)
**Status:** PR #4 deployed to production ✅

## 🎯 Sprint Objectives

### Primary Goal
Transform unbearably slow Netlify production navigation (1-2 seconds) into responsive user experience (200-500ms), achieving 70-85% performance improvement through systematic database, frontend, and infrastructure optimizations.

### Success Criteria
1. ✅ **Database Performance**: Query time <50ms average (from 80-200ms)
2. ✅ **Navigation Speed**: Timetable list loading <300ms (from 800-1200ms)
3. ✅ **Bundle Optimization**: Main chunk <200KB (from 277KB)
4. ✅ **Cache Hit Rate**: >70% for repeated navigation
5. ✅ **React Performance**: <12 re-renders per navigation (from 15-20)
6. ✅ **Network Optimization**: XLSX library lazy-loaded (1.3MB reduction)
7. ✅ **User Experience**: Sub-500ms time-to-interactive
8. ✅ **Production Stability**: <0.1% error rate maintained

## 📋 Task Breakdown by Pull Request (CI/CD Integrated)

**🚨 CRITICAL: Each PR is independently deployable with automated validation and rollback capability**

### 🗃️ **PR #1: Database Performance Foundation** 🟢 LOW RISK
**Branch:** `perf/database-indexes`
**CI/CD Pipeline:** Database migration validation → Staging deployment → Performance benchmarks → Production deployment

#### Task 1.1: Create Performance Indexes Migration 🔧
**Priority:** Critical | **Agentic Time:** 5 minutes | **Human Estimate:** 4-6 hours | **Expected Impact:** 60% query improvement

**Root Cause:** Missing composite indexes causing 80-200ms query delays

**Implementation Steps:**
- [ ] **Create migration file** `supabase/migrations/20250925000001_performance_indexes.sql`
  ```sql
  -- Composite index for efficient sorted queries
  CREATE INDEX CONCURRENTLY idx_presentations_user_updated
  ON presentations(user_id, updated_at DESC);

  -- Fast gamma_url lookups
  CREATE INDEX CONCURRENTLY idx_presentations_gamma_url
  ON presentations(gamma_url);

  -- JSONB path queries
  CREATE INDEX CONCURRENTLY idx_presentations_timetable_gin
  ON presentations USING gin (timetable_data);
  ```
- [ ] **CI/CD Pipeline Setup:**
  - Migration syntax validation in GitHub Actions
  - Staging database deployment with performance benchmarks
  - Production deployment during low-traffic window
  - Automated rollback if query performance degrades
- [ ] **Performance Monitoring:**
  - Query timing logs in API routes
  - Alerts for queries >100ms
  - Before/after performance comparison

**Target:** Database queries <50ms average, list queries <30ms
**CI/CD Success Criteria:** Zero downtime deployment, 60% query improvement validated

---

### 🗃️ **PR #2: React Performance Quick Wins** 🟡 LOW-MEDIUM RISK
**Branch:** `perf/react-optimization`
**CI/CD Pipeline:** Bundle analysis → React DevTools profiling → A/B testing (10% → 100% traffic)

#### Task 2.1: Implement React.memo and useCallback 🔧
**Priority:** High | **Agentic Time:** 15 minutes | **Human Estimate:** 6-8 hours | **Expected Impact:** 50% render improvement

**Root Cause:** Unnecessary re-renders and missing memoization

**Implementation Steps:**
- [ ] **TimetableCard.tsx Optimization:**
  ```typescript
  export default React.memo(function TimetableCard({
    presentation, onView, onExport, onDelete
  }: TimetableCardProps) {
    const handleView = useCallback(() => {
      onView(presentation.id)
    }, [presentation.id, onView])
    // ... rest of component
  })
  ```
- [ ] **TimetablesClient.tsx Optimization:**
  ```typescript
  const fetchPresentations = useCallback(async () => {
    // Existing fetch logic
  }, [])

  const handleCardAction = useCallback((action: string, id: string) => {
    // Action handling
  }, [])
  ```
- [ ] **TimetableDetailClient.tsx Auto-save Fix:**
  ```typescript
  const debouncedSave = useCallback(
    debounce((presentation: Presentation) => {
      onSave(presentation)
      setHasUnsavedChanges(false)
    }, 1000),
    [onSave]
  )
  ```
- [ ] **CI/CD Pipeline:**
  - Bundle size analysis (ensure no increase)
  - React DevTools profiler integration in CI
  - A/B testing framework with performance metrics
  - Progressive rollout: 10% → 25% → 50% → 100%
- [x] **Vitest regression suite updated:** `packages/web/src/tests/performance/TimetableComponents.test.tsx` migrated to Vitest (2025-09-29) covering memoized handlers + data fetch flows

**Target:** <12 re-renders per navigation, eliminate dual state issues
**CI/CD Success Criteria:** 50% render reduction, stable bundle size, no user complaints

---

### 🗃️ **PR #3: Bundle Optimization** 🟠 MEDIUM RISK
**Branch:** `perf/bundle-splitting`
**CI/CD Pipeline:** Webpack analysis → Lighthouse CI → Core Web Vitals monitoring → Gradual rollout

#### Task 3.1: Implement Dynamic Imports and Bundle Splitting 🔧
**Priority:** High | **Agentic Time:** 20 minutes | **Human Estimate:** 3-4 hours | **Expected Impact:** 1.3MB reduction

**Root Cause:** Heavy XLSX library loaded synchronously, poor chunk splitting

**Implementation Steps:**
- [ ] **XLSX Dynamic Import Implementation:**
  ```typescript
  // In export functions
  const handleExportXLSX = async () => {
    const XLSX = await import('xlsx')
    const { exportToXLSX } = await import('./utils/exportEnhanced')
    return exportToXLSX(presentation, XLSX)
  }
  ```
- [ ] **Next.js Bundle Optimization:**
  ```javascript
  // Enhanced webpack config in next.config.js
  webpack: (config, { dev }) => {
    if (!dev) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          xlsx: {
            test: /[\\/]node_modules[\\/]xlsx/,
            name: 'xlsx',
            chunks: 'async',
            priority: 30
          },
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui/,
            name: 'radix-ui',
            chunks: 'all',
            priority: 20
          }
        }
      }
    }
    return config
  }
  ```
- [ ] **CI/CD Pipeline:**
  - Bundle analyzer reports in GitHub Actions
  - Lighthouse performance score validation
  - Core Web Vitals regression detection
  - Feature flag for dynamic imports (instant rollback capability)

**Target:** Main chunk <200KB, XLSX lazy-loaded, 25% bundle reduction
**CI/CD Success Criteria:** Lighthouse score >90, no loading performance regression

---

### 🗃️ **PR #4: Client-Side Caching** 🔴 HIGH RISK
**Branch:** `perf/client-caching`
**CI/CD Pipeline:** Cache hit/miss monitoring → Feature flag rollout → Performance regression detection

#### Task 4.1: Implement SWR and API Caching 🔧
**Priority:** Medium | **Agentic Time:** 30 minutes | **Human Estimate:** 8-10 hours | **Expected Impact:** >70% cache hit rate

**Root Cause:** Zero client-side caching causing repeated API calls

**Implementation Steps:**
- [x] **SWR Integration (deployed 2025-09-29):**
  ```typescript
  // TimetablesClient.tsx
  import useSWR from 'swr'

  const { data: presentations, error, isLoading, mutate } = useSWR(
    '/api/presentations/list',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
      revalidateOnReconnect: false
    }
  )
  ```
- [x] **API Cache Headers (ETag + Cache-Control live):**
  ```typescript
  // In API routes
  const response = NextResponse.json(data)
  response.headers.set('Cache-Control', 'private, max-age=60, s-maxage=300')
  response.headers.set('ETag', generateETag(data))
  return response
  ```
- [x] **Cache Invalidation Strategy (optimistic mutate shipped):**
  ```typescript
  const handlePresentationUpdate = useCallback(async (id: string, updates: any) => {
    // Optimistic update
    mutate(optimisticUpdate(presentations, id, updates), false)
    // API call
    const result = await updatePresentation(id, updates)
    // Revalidate
    mutate()
  }, [presentations, mutate])
  ```
- [ ] **CI/CD Pipeline:**
  - Cache hit/miss ratio monitoring in staging _(deferred to Sprint 36)_
  - Performance regression monitoring (cached vs uncached) _(deferred)_
  - Automatic rollback if error rate increases >0.5% _(deferred)_
- [x] **Feature flag rollout:** Enabled for 100% traffic on 2025-09-29 (no incidents)

**Target:** >70% cache hit rate, sub-100ms cached navigation
**CI/CD Success Criteria:** Cache performance validated, no data consistency issues

**Deployment Evidence (2025-09-29):**
- Netlify deploy `68da28d3c8d4630007b00326` (commit `522374c`) published ✅
- `curl https://productory-powerups.netlify.app/api/health` → `200` with JSON body and timestamp
- `curl https://productory-powerups.netlify.app/api/user/profile` → `401` (`Authentication required`) confirming routing without regression
- Monitoring automation and staged cache analytics scheduled for Sprint 36 planning session.

---

### 🗃️ **PR #5: Advanced State Management** 🔴🔴 VERY HIGH RISK
**Branch:** `perf/state-management`
**CI/CD Pipeline:** Shadow deployment → Canary deployment (5%) → Full regression suite → Progressive rollout

#### Task 5.1: Implement useReducer and Context Optimization 🔧
**Priority:** Low | **Agentic Time:** 45 minutes | **Human Estimate:** 8-12 hours | **Expected Impact:** Final 15% improvement

**Root Cause:** Complex state management causing performance bottlenecks

**Implementation Steps:**
- [x] **TimetableDetailView useReducer:** Implemented reducer-driven draft state with auto-save debounce
  ```typescript
  const timetableReducer = (state: TimetableState, action: TimetableAction) => {
    switch (action.type) {
      case 'UPDATE_SLIDE':
        return { ...state, slides: updateSlide(state.slides, action.payload) }
      case 'RECALCULATE_TIMES':
        return { ...state, ...recalculateAllTimes(state) }
      default:
        return state
    }
  }

  const [state, dispatch] = useReducer(timetableReducer, initialState)
  ```
- [x] **Context Splitting:** Data/actions contexts power `PresentationStats` & `SimpleEditableTable` via `TimetableProvider`
- [x] **Reducer unit tests:** `packages/web/src/app/gamma/timetables/[id]/components/__tests__/TimetableReducer.test.ts` validates duration + start-time recalculations
  ```typescript
  // Separate data from actions to prevent unnecessary re-renders
  const TimetableDataContext = createContext()
  const TimetableActionsContext = createContext()
  ```
- [ ] **CI/CD Pipeline:**
  - Comprehensive integration test suite
  - Shadow deployment (parallel system testing)
  - Canary deployment with 5% real user traffic
  - Full performance regression suite
  - User experience monitoring (error rates, navigation times)
  - Immediate feature flag rollback capability

**Target:** Predictable state management, architectural stability
**CI/CD Success Criteria:** <0.1% error rate maintained, user experience metrics improved

## 📅 **Implementation Timeline & Risk Management**

### **Week 1: Foundation (PRs 1-2)** 🟢🟡 LOW-MEDIUM RISK
- **PR #1:** Database indexes (Agentic: 5 min, Human est: 4-6h)
- **PR #2:** React.memo optimization (Agentic: 15 min, Human est: 6-8h)
- **Expected Impact:** 40% navigation improvement
- **Deployment:** Immediate production after staging validation

### **Week 2: Major Optimizations (PRs 3-4)** 🟠🔴 MEDIUM-HIGH RISK
- **PR #3:** Bundle splitting (Agentic: 20 min, Human est: 3-4h)
- **PR #4:** SWR caching (Agentic: 30 min, Human est: 8-10h)
- **Expected Impact:** Additional 30% improvement
- **Deployment:** Feature flag rollout, progressive traffic

### **Week 3: Architecture (PR #5)** 🔴🔴 VERY HIGH RISK
- **PR #5:** State management (Agentic: 45 min, Human est: 8-12h)
- **Expected Impact:** Final 15% improvement + architectural stability
- **Deployment:** Canary deployment, shadow testing

### **Week 4: Monitoring & Documentation**
- Performance monitoring validation
- Success metrics documentation
- Post-deployment optimization
**Priority:** High | **Effort:** 8-10 hours | **Expected Impact:** >70% cache hit rate

**Root Cause:** Zero client-side caching causing repeated API calls
- [x] **Implement SWR for presentation data (live 2025-09-29)**
  ```typescript
  const { data, error, isLoading } = useSWR('/api/presentations/list', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000
  })
  ```
- [x] **Add optimistic UI updates**
  - Mutations mutate cache immediately, skeletons guard loading
- [x] **Cache invalidation strategy**
  - Cache tags + mutate() revalidation deployed
- [x] **API response caching headers**
  ```typescript
  response.headers.set('Cache-Control', 'private, max-age=60, s-maxage=300')
  ```

**Target:** >70% cache hit rate, sub-100ms cached navigation

#### Task 2.2: Advanced Code Splitting 🔧
**Priority:** Medium | **Effort:** 6-8 hours | **Expected Impact:** 25% bundle reduction

**Root Cause:** No route-level or component-level code splitting
- [ ] **Route-based code splitting**
  - Implement dynamic imports for major routes
  - Add loading boundaries for each route section
- [ ] **Component-level lazy loading**
  ```typescript
  const TimetableDetailView = lazy(() => import('./components/TimetableDetailView'))
  ```
- [ ] **Implement route prefetching**
  ```typescript
  const handleCardHover = useCallback((id: string) => {
    router.prefetch(`/gamma/timetables/${id}`)
  }, [router])
  ```
- [ ] **Critical path optimization**
  - Identify and preload critical components
  - Defer non-critical functionality

**Target:** 25% reduction in initial bundle size, smart prefetching

#### Task 2.3: API Performance Enhancement 🔧
**Priority:** Medium | **Effort:** 4-6 hours | **Expected Impact:** 30% API improvement

**Root Cause:** Dual authentication overhead and inefficient patterns
- [ ] **Optimize authentication flow**
  - Combine device token and Supabase auth checks
  - Implement authentication caching
- [ ] **Request batching implementation**
  - Group multiple API calls where possible
  - Implement request deduplication
- [ ] **Response compression optimization**
  - Enable API response compression
  - Optimize JSON payload sizes

**Target:** <200ms API response times, reduced authentication overhead

### 🏗️ **Phase 3: Architecture Improvements (Week 3-4) - Final 15% Improvement**

#### Task 3.1: Advanced State Management 🔧
**Priority:** Medium | **Effort:** 8-12 hours | **Expected Impact:** Architecture scalability

**Root Cause:** Complex state management patterns causing performance issues
- [ ] **Implement useReducer for complex state**
  - Replace useState with useReducer in TimetableDetailView
  - Create predictable state transitions
- [ ] **State normalization**
  - Normalize nested presentation data
  - Implement proper data relationships
- [ ] **Context optimization**
  - Implement context splitting for different data domains
  - Add context selectors to prevent unnecessary renders

**Target:** Predictable state management, reduced complexity

#### Task 3.2: Database Architecture Optimization 🔧
**Priority:** Low | **Effort:** 12-16 hours | **Expected Impact:** Long-term scalability

**Root Cause:** JSONB storage preventing efficient queries
- [ ] **Evaluate JSONB to relational migration**
  - Design normalized schema for timetable data
  - Create migration strategy with zero downtime
- [ ] **Advanced caching layer**
  - Implement Redis/memory caching for frequent queries
  - Add cache warming strategies
- [ ] **Query optimization analysis**
  - Set up query performance monitoring
  - Optimize expensive operations

**Target:** Support 1000+ presentations efficiently, <20ms complex queries

#### Task 3.3: Real-Time Performance Monitoring 🔧
**Priority:** Medium | **Effort:** 6-8 hours | **Expected Impact:** Operational excellence

**Root Cause:** No performance monitoring in production
- [ ] **Implement Core Web Vitals tracking**
  ```typescript
  // Track navigation timing
  performance.mark('navigation-start')
  // ... navigation code
  performance.mark('navigation-end')
  ```
- [ ] **Set up performance alerts**
  - Monitor for performance regressions
  - Automatic rollback triggers
- [ ] **User experience metrics**
  - Track real user navigation times
  - Monitor error rates and timeouts
- [ ] **Performance budget enforcement**
  - Set up Lighthouse CI
  - Prevent performance regressions in CI/CD

**Target:** Real-time performance visibility, automatic regression prevention

## 🎯 Success Metrics & Monitoring

### Key Performance Indicators
- **Navigation Speed**: Target <300ms (baseline: 800-1200ms)
- **Database Performance**: Target <50ms (baseline: 80-200ms)
- **Bundle Size**: Target <200KB (baseline: 277KB)
- **Cache Hit Rate**: Target >70% (baseline: 0%)
- **User Experience**: Target <500ms TTI (baseline: 1-2s)

### Performance Testing Protocol
1. **Before/After Measurements**: Record baseline metrics before each phase
2. **Load Testing**: Test with realistic data volumes (100+ presentations)
3. **Network Simulation**: Test with throttled connections (3G, slow 4G)
4. **Cross-Browser Validation**: Verify performance across Chrome, Firefox, Safari
5. **Production Validation**: Monitor real user metrics post-deployment

## 🔄 Implementation Strategy

### Phase Execution Order
1. **Week 1**: Focus on high-impact, low-risk optimizations (database indexes, React.memo)
2. **Week 2**: Medium-risk structural changes with proper testing
3. **Week 3-4**: Architecture improvements with feature flags and gradual rollout

### Risk Mitigation
- **Feature Flags**: Use flags for major changes to enable quick rollback
- **Gradual Rollout**: Deploy optimizations progressively (10%, 25%, 50%, 100%)
- **Performance Monitoring**: Continuous monitoring during rollout
- **Rollback Plan**: Automated rollback triggers if performance degrades

### Validation Checkpoints
- **Daily**: Performance metrics review and trend analysis
- **End of Each Phase**: Comprehensive performance testing and user validation
- **Pre-Production**: Full load testing and performance audit
- **Post-Deployment**: 48-hour monitoring with rollback readiness

## 📈 Expected Business Impact

### User Experience
- **Immediate**: 70-85% faster navigation creates responsive feel
- **Engagement**: Reduced bounce rate from performance frustration
- **Scalability**: Support 10x current user load with maintained performance

### Technical Excellence
- **Maintainability**: Clean architecture enables faster future development
- **Reliability**: Monitoring and alerting prevent performance regressions
- **Developer Experience**: Faster local development and deployment cycles

### Success Definition
Sprint 35 is considered successful when:
1. ✅ All Phase 1 optimizations deployed and validated (40% improvement)
2. ✅ Production navigation consistently <500ms (70%+ improvement achieved)
3. ✅ Zero performance regressions introduced
4. ✅ Performance monitoring system operational
5. ✅ User satisfaction metrics improved (based on support tickets/feedback)

---

**Next Steps After Sprint 35:**
- Continuous performance monitoring and optimization
- Implement advanced caching strategies (CDN edge caching)
- Scale performance improvements to other application areas
- Performance culture and best practices documentation
