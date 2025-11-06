# Comprehensive Performance Optimization Action Plan
**Target:** Reduce timetable navigation delays from 1-2s to 200-500ms (70-85% improvement)
**Based on:** Netlify Production Performance Audit - September 25, 2025
**Implementation Timeline:** 3-4 weeks with immediate quick wins

---

## 🎯 Executive Summary

### Current Performance Issues
The audit identified **1-2 second navigation delays** in the timetables flow caused by:
- **Database Performance (40% impact)** - Missing indexes, over-fetching, no caching
- **Frontend Issues (25% impact)** - React re-renders, dual state management, auto-save problems
- **Network/CDN (20% impact)** - Heavy XLSX library, asset optimization, request waterfall
- **Bundle Optimization (15% impact)** - Poor code splitting, large chunks

### Expected Results After Implementation
- **Navigation speed:** 70-85% faster timetable loading
- **User experience:** <1.5s time to interactive (currently 2.3-3.1s)
- **Scalability:** Support 1000+ presentations efficiently
- **Reliability:** Maintained <0.1% error rates throughout optimization

---

## 🚀 Phase 1: Immediate Quick Wins (Week 1)
**Target:** 40% improvement in navigation speed
**Effort:** High impact, low-to-medium implementation effort

### 1.1 Database Performance Optimizations (2-3 days)

#### Critical Index Creation
**File:** Database migration or direct SQL execution
**Expected Impact:** 60% reduction in query time (200ms → 80ms)

```sql
-- 🎯 PRIORITY 1: Composite index for sorted queries (30 minutes)
CREATE INDEX CONCURRENTLY idx_presentations_user_updated
ON presentations(user_id, updated_at DESC);

-- 🎯 PRIORITY 1: Pagination support (2 hours)
CREATE OR REPLACE FUNCTION rpc_list_presentations_metadata(
  p_user_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
) RETURNS TABLE (
  id uuid, title text, gamma_url text, start_time text,
  total_duration integer, slide_count integer,
  created_at timestamp, updated_at timestamp
)
LANGUAGE sql STABLE
AS $$
  SELECT p.id, p.title, p.gamma_url, p.start_time, p.total_duration,
    COALESCE(jsonb_array_length(p.timetable_data->'items'), 0)::integer as slide_count,
    p.created_at, p.updated_at
  FROM presentations p
  WHERE p.user_id = p_user_id
  ORDER BY p.updated_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- 🎯 PRIORITY 2: JSONB path indexes for search (1 hour)
CREATE INDEX CONCURRENTLY idx_presentations_title_gin
ON presentations USING gin ((timetable_data->'title'));
```

#### API Endpoint Updates
**Files:** `/api/presentations/list` endpoint
**Expected Impact:** 50-200KB reduction per list request

```typescript
// ✅ IMMEDIATE FIX: Remove heavy timetable_data from list queries
// File: packages/web/src/app/api/presentations/list/route.ts

export async function GET(request: Request) {
  // ... auth logic ...

  // ❌ BEFORE: Over-fetching with full timetable data
  // const { data: presentations } = await supabase
  //   .from('presentations')
  //   .select('*')  // Includes heavy JSONB data

  // ✅ AFTER: Metadata-only with pagination
  const url = new URL(request.url)
  const limit = parseInt(url.searchParams.get('limit') || '20')
  const offset = parseInt(url.searchParams.get('offset') || '0')

  const { data: presentations } = await supabase
    .rpc('rpc_list_presentations_metadata', {
      p_user_id: dbUserId,
      p_limit: limit,
      p_offset: offset
    })

  return NextResponse.json({
    success: true,
    presentations: presentations || [],
    pagination: {
      limit,
      offset,
      hasMore: presentations?.length === limit
    }
  })
}
```

### 1.2 React Performance Optimizations (2-3 days)

#### React.memo Implementation
**Files:** TimetableCard, TimetableGrid, TimetablesClient components
**Expected Impact:** 40% reduction in re-renders (15-20 → 8-12)

```typescript
// ✅ PRIORITY 1: Memoize TimetableCard component
// File: packages/web/src/app/gamma/timetables/components/TimetableCard.tsx

import React from 'react'

interface TimetableCardProps {
  presentation: {
    id: string
    title: string
    updatedAt: string
    // ... other props
  }
  onView: (id: string) => void
  onExport: (id: string) => void
  onDelete: (id: string) => void
}

export default React.memo(function TimetableCard({
  presentation, onView, onExport, onDelete
}: TimetableCardProps) {
  return (
    <div className="timetable-card">
      {/* Component UI */}
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for optimal re-rendering
  return prevProps.presentation.id === nextProps.presentation.id &&
         prevProps.presentation.updatedAt === nextProps.presentation.updatedAt
})
```

#### useCallback for Event Handlers
**File:** `packages/web/src/app/gamma/timetables/TimetablesClient.tsx`

```typescript
// ✅ PRIORITY 1: Memoize event handlers (30 minutes)
import { useCallback } from 'react'

export default function TimetablesClient({ user }: TimetablesClientProps) {
  // ... existing state ...

  const handleView = useCallback((id: string) => {
    router.push(`/gamma/timetables/${id}`)
  }, [router])

  const handleExport = useCallback(async (id: string) => {
    const presentation = presentations.find(p => p.id === id)
    if (!presentation) return

    exportToCSV(presentation)
    toast.success(`Timetable exported: ${presentation.title}`)
  }, [presentations])

  const handleDeleteClick = useCallback((id: string) => {
    setPresentationToDelete(id)
    setDeleteDialogOpen(true)
  }, [])

  // ... rest of component
}
```

#### Loading States and Skeletons
**File:** `packages/web/src/app/gamma/timetables/loading.tsx` (new file)

```typescript
// ✅ PRIORITY 1: Add proper loading states (2 hours)
export default function TimetablesLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
            <div className="h-2 bg-gray-200 rounded animate-pulse w-1/2"></div>
            <div className="flex gap-2 mt-4">
              <div className="h-8 bg-gray-200 rounded animate-pulse flex-1"></div>
              <div className="h-8 bg-gray-200 rounded animate-pulse w-20"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 1.3 Bundle Optimization Quick Wins (1 day)

#### XLSX Dynamic Import
**File:** `packages/web/src/app/gamma/timetables/utils/export.ts`

```typescript
// ✅ PRIORITY 1: Dynamic XLSX import (1 hour)
// Reduces main bundle by 1.3MB immediately

export async function exportToXLSX(presentation: Presentation) {
  // Show loading state while importing XLSX
  const loadingToast = toast.loading('Preparing export...')

  try {
    // Dynamic import reduces main bundle size by 1.3MB
    const XLSX = await import('xlsx')

    const worksheet = XLSX.utils.json_to_sheet(presentation.items)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Timetable')

    const filename = `${presentation.title}-timetable.xlsx`
    XLSX.writeFile(workbook, filename)

    toast.dismiss(loadingToast)
    toast.success('Export completed!')
  } catch (error) {
    toast.dismiss(loadingToast)
    toast.error('Export failed')
    console.error('XLSX export error:', error)
  }
}
```

### Expected Phase 1 Results
- **List Load Time:** 800-1200ms → 480-720ms (40% improvement)
- **Database Queries:** 80-200ms → 30-80ms (60% improvement)
- **React Re-renders:** 15-20 → 8-12 (40% reduction)
- **Main Bundle Size:** Immediate 1.3MB reduction (XLSX removed)

---

## 🛠 Phase 2: Medium-Term Optimizations (Week 2)
**Target:** Additional 30% improvement
**Focus:** Caching, code splitting, and API optimization

### 2.1 Client-Side Caching Implementation (2-3 days)

#### SWR Integration
**Installation:** `npm install swr`
**Expected Impact:** >70% cache hit rate, <100ms subsequent navigations

```typescript
// ✅ Custom hook for cached presentations
// File: packages/web/src/hooks/usePresentations.ts (new file)

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function usePresentations(limit = 20, offset = 0) {
  const { data, error, mutate, isLoading } = useSWR(
    `/api/presentations/list?limit=${limit}&offset=${offset}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30s cache
      errorRetryCount: 3,
      errorRetryInterval: 1000
    }
  )

  return {
    presentations: data?.presentations || [],
    pagination: data?.pagination,
    isLoading,
    error,
    mutate // For cache invalidation
  }
}

// Update TimetablesClient.tsx to use the hook
export default function TimetablesClient({ user }: TimetablesClientProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [presentationToDelete, setPresentationToDelete] = useState<string | null>(null)

  // ✅ Replace useState with SWR hook
  const { presentations, isLoading, mutate } = usePresentations()

  // ... rest of component with mutate for cache updates
}
```

#### Optimistic Updates
```typescript
// ✅ Optimistic delete with cache update
const handleDeleteConfirm = useCallback(async () => {
  if (!presentationToDelete) return

  try {
    // Optimistic update - remove from UI immediately
    mutate(
      (currentData) => ({
        ...currentData,
        presentations: currentData.presentations.filter(
          p => p.id !== presentationToDelete
        )
      }),
      false // Don't revalidate immediately
    )

    const response = await fetch(`/api/presentations/${presentationToDelete}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error('Delete failed')
    }

    toast.success('Timetable deleted successfully')
    // Revalidate to ensure sync
    mutate()
  } catch (error) {
    // Revert optimistic update on error
    mutate()
    toast.error('Failed to delete timetable')
  } finally {
    setDeleteDialogOpen(false)
    setPresentationToDelete(null)
  }
}, [presentationToDelete, mutate])
```

### 2.2 Advanced Code Splitting (2 days)

#### Route-Level Splitting
```typescript
// ✅ Lazy load heavy components
// File: packages/web/src/app/gamma/timetables/components/index.ts

import { lazy, Suspense } from 'react'

// Heavy components loaded on demand
export const TimetableDetailView = lazy(() =>
  import('./TimetableDetailView').then(module => ({ default: module.TimetableDetailView }))
)

export const ExportDropdown = lazy(() =>
  import('./ExportDropdown')
)

export const TimetableEditor = lazy(() =>
  import('./TimetableEditor')
)

// ✅ Suspense wrapper component
export function LazyTimetableDetailView(props: any) {
  return (
    <Suspense fallback={<TimetableDetailSkeleton />}>
      <TimetableDetailView {...props} />
    </Suspense>
  )
}
```

#### Component-Level Splitting
```typescript
// ✅ Split large components by feature
// File: packages/web/src/app/gamma/timetables/[id]/TimetableDetailClient.tsx

import { lazy, Suspense } from 'react'

const TimetableEditor = lazy(() => import('../components/TimetableEditor'))
const ExportOptions = lazy(() => import('../components/ExportOptions'))
const SharingControls = lazy(() => import('../components/SharingControls'))

export default function TimetableDetailClient({ presentation }: Props) {
  const [activeTab, setActiveTab] = useState('view')

  return (
    <div className="timetable-detail">
      {/* Always-visible header */}
      <TimetableHeader presentation={presentation} />

      {/* Lazy-loaded tabs based on user interaction */}
      {activeTab === 'edit' && (
        <Suspense fallback={<div>Loading editor...</div>}>
          <TimetableEditor presentation={presentation} />
        </Suspense>
      )}

      {activeTab === 'export' && (
        <Suspense fallback={<div>Loading export options...</div>}>
          <ExportOptions presentation={presentation} />
        </Suspense>
      )}

      {activeTab === 'share' && (
        <Suspense fallback={<div>Loading sharing options...</div>}>
          <SharingControls presentation={presentation} />
        </Suspense>
      )}
    </div>
  )
}
```

### 2.3 API Response Caching (1 day)

#### Server-Side Caching Headers
```typescript
// ✅ Add proper cache headers to API responses
// File: packages/web/src/app/api/presentations/list/route.ts

export async function GET(request: Request) {
  try {
    // ... existing logic ...

    const response = NextResponse.json({
      success: true,
      presentations: presentations || [],
      pagination: { limit, offset, hasMore: presentations?.length === limit }
    })

    // ✅ Add cache headers for better performance
    response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=600')
    response.headers.set('ETag', `"${JSON.stringify(presentations).length}-${Date.now()}"`)

    return response
  } catch (error) {
    // ... error handling
  }
}
```

### Expected Phase 2 Results
- **List Load Time:** 480-720ms → 150-300ms (cached) / 300-500ms (uncached)
- **Bundle Size:** 277KB → <200KB main chunk (28% reduction)
- **Cache Hit Rate:** 0% → >70% for subsequent navigations
- **Subsequent Navigation:** <100ms when cached

---

## 🏗 Phase 3: Long-Term Architecture Improvements (Week 3-4)
**Target:** Additional 15% improvement + scalability
**Focus:** Advanced architecture, real-time updates, monitoring

### 3.1 Database Architecture Optimization (Week 3)

#### JSONB Structure Normalization
**Expected Impact:** Support 1000+ presentations efficiently, faster queries

```sql
-- ✅ Normalize heavy JSONB data into relational structure
CREATE TABLE timetable_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID REFERENCES presentations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 5,
  start_time TEXT,
  end_time TEXT,
  content JSONB,
  item_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_timetable_items_presentation_order
ON timetable_items(presentation_id, item_order);

-- ✅ Update presentations table to remove heavy JSONB
ALTER TABLE presentations DROP COLUMN IF EXISTS timetable_data;
ALTER TABLE presentations ADD COLUMN item_count INTEGER DEFAULT 0;

-- ✅ Trigger to maintain item count
CREATE OR REPLACE FUNCTION update_presentation_item_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE presentations
  SET item_count = (
    SELECT COUNT(*)
    FROM timetable_items
    WHERE presentation_id = COALESCE(NEW.presentation_id, OLD.presentation_id)
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.presentation_id, OLD.presentation_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_item_count
  AFTER INSERT OR UPDATE OR DELETE ON timetable_items
  FOR EACH ROW EXECUTE FUNCTION update_presentation_item_count();
```

#### Advanced Query Optimization
```sql
-- ✅ Optimized query for presentation with items
CREATE OR REPLACE FUNCTION rpc_get_presentation_with_items(
  p_presentation_id uuid,
  p_user_id uuid
) RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'presentation', to_json(p.*),
    'items', COALESCE(items_array, '[]'::json)
  )
  INTO result
  FROM presentations p
  LEFT JOIN (
    SELECT
      presentation_id,
      json_agg(
        json_build_object(
          'id', id,
          'title', title,
          'duration', duration,
          'start_time', start_time,
          'end_time', end_time,
          'content', content,
          'order', item_order
        ) ORDER BY item_order
      ) as items_array
    FROM timetable_items
    WHERE presentation_id = p_presentation_id
    GROUP BY presentation_id
  ) items ON items.presentation_id = p.id
  WHERE p.id = p_presentation_id AND p.user_id = p_user_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### 3.2 Real-Time Updates with Optimistic UI (Week 3)

#### Supabase Real-Time Integration
```typescript
// ✅ Real-time presentations updates
// File: packages/web/src/hooks/useRealtimePresentations.ts (new file)

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useRealtimePresentations(mutate: Function) {
  useEffect(() => {
    const subscription = supabase
      .channel('presentations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'presentations'
        },
        (payload) => {
          console.log('Real-time presentation change:', payload)

          // Update local cache optimistically
          mutate((currentData: any) => {
            if (!currentData) return currentData

            const { eventType, new: newRecord, old: oldRecord } = payload

            switch (eventType) {
              case 'INSERT':
                return {
                  ...currentData,
                  presentations: [newRecord, ...currentData.presentations]
                }
              case 'UPDATE':
                return {
                  ...currentData,
                  presentations: currentData.presentations.map((p: any) =>
                    p.id === newRecord.id ? { ...p, ...newRecord } : p
                  )
                }
              case 'DELETE':
                return {
                  ...currentData,
                  presentations: currentData.presentations.filter(
                    (p: any) => p.id !== oldRecord.id
                  )
                }
              default:
                return currentData
            }
          }, false) // Don't revalidate, we have fresh data
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [mutate])
}

// Update usePresentations hook to include real-time
export function usePresentations(limit = 20, offset = 0) {
  const { data, error, mutate, isLoading } = useSWR(
    `/api/presentations/list?limit=${limit}&offset=${offset}`,
    fetcher,
    { /* existing options */ }
  )

  // Add real-time updates
  useRealtimePresentations(mutate)

  return { presentations: data?.presentations || [], error, mutate, isLoading }
}
```

### 3.3 Advanced State Management (Week 4)

#### Centralized State with useReducer
```typescript
// ✅ Replace multiple useState with useReducer
// File: packages/web/src/app/gamma/timetables/hooks/useTimetablesState.ts (new file)

interface TimetablesState {
  presentations: Presentation[]
  loading: boolean
  error: string | null
  filters: {
    search: string
    sortBy: 'updated_at' | 'created_at' | 'title'
    sortOrder: 'asc' | 'desc'
  }
  pagination: {
    page: number
    limit: number
    hasMore: boolean
  }
  selection: {
    selectedIds: Set<string>
    selectAll: boolean
  }
  dialogs: {
    deleteDialogOpen: boolean
    presentationToDelete: string | null
    exportDialogOpen: boolean
  }
}

type TimetablesAction =
  | { type: 'SET_PRESENTATIONS'; payload: Presentation[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_FILTERS'; payload: Partial<TimetablesState['filters']> }
  | { type: 'UPDATE_PAGINATION'; payload: Partial<TimetablesState['pagination']> }
  | { type: 'TOGGLE_SELECTION'; payload: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'OPEN_DELETE_DIALOG'; payload: string }
  | { type: 'CLOSE_DELETE_DIALOG' }

function timetablesReducer(state: TimetablesState, action: TimetablesAction): TimetablesState {
  switch (action.type) {
    case 'SET_PRESENTATIONS':
      return { ...state, presentations: action.payload, loading: false }

    case 'SET_LOADING':
      return { ...state, loading: action.payload }

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }

    case 'UPDATE_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
        pagination: { ...state.pagination, page: 0 } // Reset pagination on filter
      }

    case 'UPDATE_PAGINATION':
      return {
        ...state,
        pagination: { ...state.pagination, ...action.payload }
      }

    case 'TOGGLE_SELECTION':
      const newSelectedIds = new Set(state.selection.selectedIds)
      if (newSelectedIds.has(action.payload)) {
        newSelectedIds.delete(action.payload)
      } else {
        newSelectedIds.add(action.payload)
      }
      return {
        ...state,
        selection: {
          ...state.selection,
          selectedIds: newSelectedIds,
          selectAll: newSelectedIds.size === state.presentations.length
        }
      }

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selection: { selectedIds: new Set(), selectAll: false }
      }

    case 'OPEN_DELETE_DIALOG':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          deleteDialogOpen: true,
          presentationToDelete: action.payload
        }
      }

    case 'CLOSE_DELETE_DIALOG':
      return {
        ...state,
        dialogs: {
          ...state.dialogs,
          deleteDialogOpen: false,
          presentationToDelete: null
        }
      }

    default:
      return state
  }
}

export function useTimetablesState() {
  const [state, dispatch] = useReducer(timetablesReducer, {
    presentations: [],
    loading: true,
    error: null,
    filters: {
      search: '',
      sortBy: 'updated_at',
      sortOrder: 'desc'
    },
    pagination: {
      page: 0,
      limit: 20,
      hasMore: true
    },
    selection: {
      selectedIds: new Set(),
      selectAll: false
    },
    dialogs: {
      deleteDialogOpen: false,
      presentationToDelete: null,
      exportDialogOpen: false
    }
  })

  return { state, dispatch }
}
```

### Expected Phase 3 Results
- **Total Navigation Improvement:** 85% overall reduction in delays
- **Database Performance:** Support 1000+ presentations with <30ms queries
- **Real-time Updates:** Instant UI updates without page refresh
- **Scalability:** Efficient state management for large datasets
- **User Experience:** <100ms optimal navigation for cached content

---

## 📋 Implementation Checklist with File Locations

### Week 1: Critical Database & React Optimizations

#### Database Optimizations (Priority 1)
- [ ] **SQL Migration File**: Create `/database/migrations/001_performance_indexes.sql`
  - [ ] Add composite index: `idx_presentations_user_updated`
  - [ ] Create pagination RPC: `rpc_list_presentations_metadata`
  - [ ] Add JSONB indexes for search functionality

#### API Endpoint Updates (Priority 1)
- [ ] **File**: `/packages/web/src/app/api/presentations/list/route.ts`
  - [ ] Remove `timetable_data` from list queries (50-200KB reduction per request)
  - [ ] Add pagination parameters (`limit`, `offset`)
  - [ ] Add cache headers (`Cache-Control`, `ETag`)
  - [ ] Error handling for pagination edge cases

#### React Component Optimizations (Priority 1)
- [ ] **File**: `/packages/web/src/app/gamma/timetables/components/TimetableCard.tsx`
  - [ ] Wrap with `React.memo` and custom comparison function
  - [ ] Expected: 40% reduction in re-renders

- [ ] **File**: `/packages/web/src/app/gamma/timetables/TimetablesClient.tsx`
  - [ ] Add `useCallback` for `handleView`, `handleExport`, `handleDeleteClick`
  - [ ] Expected: Stable references, fewer child re-renders

- [ ] **File**: `/packages/web/src/app/gamma/timetables/loading.tsx` (new)
  - [ ] Create skeleton loading component
  - [ ] Add to route for immediate loading feedback

#### Bundle Optimization (Priority 2)
- [ ] **File**: `/packages/web/src/app/gamma/timetables/utils/export.ts`
  - [ ] Replace static XLSX import with dynamic import
  - [ ] Expected: 1.3MB immediate bundle size reduction
  - [ ] Add loading states during dynamic import

### Week 2: Caching & Code Splitting

#### Client-Side Caching (Priority 1)
- [ ] **Install**: `npm install swr`
- [ ] **File**: `/packages/web/src/hooks/usePresentations.ts` (new)
  - [ ] Create SWR hook for presentations with 30s cache
  - [ ] Add optimistic updates for mutations
  - [ ] Expected: >70% cache hit rate, <100ms subsequent navigations

- [ ] **File**: `/packages/web/src/app/gamma/timetables/TimetablesClient.tsx`
  - [ ] Replace `useState` + `useEffect` with `usePresentations` hook
  - [ ] Update delete logic to use optimistic updates with `mutate`

#### Advanced Code Splitting (Priority 1)
- [ ] **File**: `/packages/web/src/app/gamma/timetables/components/index.ts` (new)
  - [ ] Create lazy-loaded components for heavy features
  - [ ] Add Suspense wrappers with proper fallbacks

- [ ] **File**: `/packages/web/src/app/gamma/timetables/[id]/TimetableDetailClient.tsx`
  - [ ] Implement tab-based lazy loading
  - [ ] Split editor, export, and sharing components
  - [ ] Expected: <200KB main bundle chunk

#### API Caching Enhancement (Priority 2)
- [ ] **Files**: All `/api/presentations/*` routes
  - [ ] Add appropriate cache headers based on data sensitivity
  - [ ] Implement ETag-based conditional requests
  - [ ] Expected: 25% reduction in API response time for cached requests

### Week 3-4: Advanced Architecture

#### Database Architecture (Week 3)
- [ ] **Migration**: `/database/migrations/002_normalize_jsonb.sql`
  - [ ] Create `timetable_items` table
  - [ ] Migrate data from JSONB to relational structure
  - [ ] Add triggers for data consistency
  - [ ] **Risk**: High - requires data migration strategy

- [ ] **File**: `/packages/web/src/app/api/presentations/[id]/route.ts`
  - [ ] Update to use normalized data structure
  - [ ] Implement new RPC for fetching presentation with items

#### Real-Time Updates (Week 3)
- [ ] **File**: `/packages/web/src/hooks/useRealtimePresentations.ts` (new)
  - [ ] Implement Supabase real-time subscriptions
  - [ ] Integrate with SWR cache for optimistic updates
  - [ ] Expected: Instant UI updates without refresh

#### Advanced State Management (Week 4)
- [ ] **File**: `/packages/web/src/app/gamma/timetables/hooks/useTimetablesState.ts` (new)
  - [ ] Replace multiple `useState` with `useReducer`
  - [ ] Centralize all timetables-related state
  - [ ] Expected: Better performance with complex state updates

### Performance Monitoring Setup
- [ ] **File**: `/packages/web/src/hooks/usePerformanceMonitoring.ts` (new)
  - [ ] Custom hook for navigation timing
  - [ ] Integration with analytics service
  - [ ] Core Web Vitals tracking

- [ ] **File**: `/packages/web/lighthouse.config.js` (new)
  - [ ] Lighthouse CI configuration
  - [ ] Performance regression prevention
  - [ ] Automated performance testing in CI/CD

---

## 🔍 Success Metrics & Monitoring

### Core Performance Metrics

#### Navigation Performance Targets
| Metric | Current | Phase 1 Target | Phase 2 Target | Phase 3 Target |
|--------|---------|----------------|----------------|----------------|
| **List Load Time** | 800-1200ms | 480-720ms | 150-300ms (cached) | <150ms (optimal) |
| **Detail View Load** | 400-600ms | 240-360ms | 100-200ms (cached) | <100ms (optimal) |
| **Database Query Avg** | 80-200ms | 30-80ms | 30-50ms | <30ms |
| **Bundle Size (largest)** | 277KB | 250KB | <200KB | <180KB |
| **React Re-renders** | 15-20 | 8-12 | 5-8 | 3-5 |
| **Cache Hit Rate** | 0% | 0% | >70% | >85% |

#### Technical Quality Metrics
- **Error Rate**: Maintain <0.1% throughout optimization
- **Core Web Vitals**:
  - LCP (Largest Contentful Paint): <2.5s
  - FID (First Input Delay): <100ms
  - CLS (Cumulative Layout Shift): <0.1
- **Time to Interactive**: <1.5s (currently 2.3-3.1s)
- **API Response Time**: <200ms average

### Monitoring Implementation

#### Real-Time Performance Monitoring
```typescript
// File: packages/web/src/hooks/usePerformanceMonitoring.ts
export function usePerformanceMonitoring(pageName: string) {
  useEffect(() => {
    const navigationStart = performance.now()

    // Track Core Web Vitals
    getCLS((metric) => analytics.track('cls', metric))
    getFID((metric) => analytics.track('fid', metric))
    getFCP((metric) => analytics.track('fcp', metric))
    getLCP((metric) => analytics.track('lcp', metric))
    getTTFB((metric) => analytics.track('ttfb', metric))

    return () => {
      const navigationEnd = performance.now()
      const duration = navigationEnd - navigationStart

      analytics.track('navigation_performance', {
        page: pageName,
        duration,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      })
    }
  }, [pageName])
}
```

#### Automated Performance Testing
```yaml
# File: .github/workflows/performance-check.yml
name: Performance Regression Check
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli@0.12.x
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

#### Performance Alerting
```javascript
// File: packages/web/src/utils/performance-alerts.ts
export function setupPerformanceAlerting() {
  // Alert if navigation takes >2s (regression)
  if (navigationTime > 2000) {
    console.warn('Performance regression detected:', { navigationTime, route })
    // Send to monitoring service
  }

  // Alert if bundle size increases significantly
  if (bundleSize > 250000) { // 250KB threshold
    console.warn('Bundle size regression:', { bundleSize, route })
  }

  // Alert if error rate exceeds threshold
  if (errorRate > 0.001) { // 0.1% threshold
    console.error('Error rate threshold exceeded:', { errorRate })
  }
}
```

### Validation Procedures

#### Pre-Deployment Checklist
- [ ] **Bundle Analysis**: Confirm main chunk <200KB
- [ ] **Database Migrations**: Test in staging with production data volume
- [ ] **Performance Benchmarks**: Establish baseline before deployment
- [ ] **Rollback Plan**: Verified and tested
- [ ] **Monitoring Setup**: All alerting configured and tested

#### Post-Deployment Validation
- [ ] **Core Web Vitals**: Measure within 24 hours, confirm improvement
- [ ] **Database Performance**: Query times <50ms average
- [ ] **Error Rate**: Monitor for 48 hours, keep <0.1%
- [ ] **User Feedback**: Collect and analyze for experience improvements
- [ ] **Performance Regression**: Daily monitoring for 1 week

### Rollback Procedures

#### Immediate Rollback Triggers
1. **Error Rate >0.5%**: Automatic rollback within 5 minutes
2. **Navigation Time >3s**: Rollback within 15 minutes
3. **Database Query Failures >1%**: Immediate rollback
4. **Bundle Loading Failures >0.1%**: Rollback within 10 minutes

#### Rollback Commands
```bash
# Automated rollback script
#!/bin/bash
# File: scripts/rollback-performance-optimizations.sh

echo "🚨 Initiating performance optimization rollback..."

# Revert database changes
psql $DATABASE_URL -f database/rollbacks/001_revert_indexes.sql
psql $DATABASE_URL -f database/rollbacks/002_revert_normalization.sql

# Deploy previous version
netlify deploy --prod --dir=.netlify/previous-build

# Clear CDN cache to ensure immediate effect
curl -X POST "https://api.netlify.com/api/v1/sites/$SITE_ID/deploys" \
  -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN"

echo "✅ Rollback completed"
```

---

## ⚠️ Risk Assessment & Mitigation

### High-Risk Implementation Areas

#### 1. Database Schema Changes (Phase 3)
**Risk Level**: 🔴 HIGH
**Impact**: Potential data loss, extended downtime
**Probability**: Medium (complex migration)

**Mitigation Strategy**:
- **Blue-Green Deployment**: Maintain parallel environment during migration
- **Comprehensive Backup**: Full database backup before migration
- **Gradual Migration**: Migrate data in batches, not all at once
- **Rollback Plan**: Automated rollback within 5 minutes if issues arise

```sql
-- Example migration safety approach
BEGIN;
  -- Create new structure alongside existing
  CREATE TABLE timetable_items_new AS
  SELECT * FROM timetable_items LIMIT 0;

  -- Migrate data in batches
  INSERT INTO timetable_items_new
  SELECT * FROM old_jsonb_structure
  WHERE created_at > NOW() - INTERVAL '1 day'
  LIMIT 1000;

  -- Validate migration
  SELECT COUNT(*) FROM timetable_items_new;
COMMIT; -- Only if validation passes
```

#### 2. Client-Side Caching Introduction (Phase 2)
**Risk Level**: 🟡 MEDIUM
**Impact**: Stale data display, user confusion
**Probability**: Medium (cache invalidation complexity)

**Mitigation Strategy**:
- **Conservative TTL**: Start with 30-second cache, increase gradually
- **Manual Refresh**: Always provide user option to force refresh
- **Stale-While-Revalidate**: Show cached data while fetching fresh data
- **Comprehensive Testing**: Test all CRUD operations with caching

```typescript
// Safe caching implementation
const { data, error } = useSWR(
  `/api/presentations/list`,
  fetcher,
  {
    revalidateOnFocus: true, // Refresh when user returns to tab
    revalidateOnReconnect: true, // Refresh on network reconnect
    revalidateOnMount: true, // Always check on mount
    dedupingInterval: 30000, // Conservative 30s deduping
    errorRetryCount: 3, // Retry failures
    onError: (error) => {
      // Always fall back to fresh fetch on cache errors
      console.warn('Cache error, falling back to fresh fetch:', error)
    }
  }
)
```

#### 3. Code Splitting Implementation (Phase 2)
**Risk Level**: 🟡 MEDIUM
**Impact**: Component loading failures, broken UX
**Probability**: Low (well-established pattern)

**Mitigation Strategy**:
- **Graceful Fallbacks**: Comprehensive error boundaries
- **Progressive Enhancement**: Core functionality works without lazy components
- **Network Failure Handling**: Retry logic for failed dynamic imports
- **Testing**: Extensive testing with slow/failed network conditions

```typescript
// Safe code splitting with error handling
const TimetableEditor = lazy(() =>
  import('./TimetableEditor')
    .catch(error => {
      console.error('Failed to load TimetableEditor:', error)
      // Return minimal fallback component
      return {
        default: () => <div>Editor temporarily unavailable. Please refresh.</div>
      }
    })
)

// Comprehensive error boundary
class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, chunkError: false }
  }

  static getDerivedStateFromError(error) {
    // Handle chunk loading errors specifically
    if (error.name === 'ChunkLoadError') {
      return { hasError: true, chunkError: true }
    }
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    if (this.state.chunkError) {
      // Automatically refresh to reload chunks
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Refreshing...</div>
    }
    return this.props.children
  }
}
```

### Medium-Risk Implementation Areas

#### 1. React Performance Optimizations (Phase 1)
**Risk Level**: 🟢 LOW-MEDIUM
**Impact**: Component behavior changes, over-optimization
**Probability**: Low (standard React patterns)

**Mitigation Strategy**:
- **Gradual Implementation**: One component at a time
- **Comprehensive Testing**: Test all component interactions
- **Performance Profiling**: Use React DevTools to verify improvements
- **Rollback Strategy**: Easy to remove React.memo if issues arise

#### 2. API Response Format Changes (Phase 1)
**Risk Level**: 🟢 LOW-MEDIUM
**Impact**: Frontend-backend contract issues
**Probability**: Low (additive changes only)

**Mitigation Strategy**:
- **Backward Compatibility**: New API fields, don't remove existing
- **API Versioning**: Version API endpoints if breaking changes needed
- **Gradual Migration**: Support both formats during transition
- **Contract Testing**: Automated tests for API contracts

### Deployment Safety Measures

#### Feature Flag Implementation
```typescript
// File: packages/web/src/utils/feature-flags.ts
export const FEATURE_FLAGS = {
  PERFORMANCE_OPTIMIZATIONS: process.env.ENABLE_PERFORMANCE_OPTIMIZATIONS === 'true',
  CLIENT_CACHING: process.env.ENABLE_CLIENT_CACHING === 'true',
  CODE_SPLITTING: process.env.ENABLE_CODE_SPLITTING === 'true',
  REAL_TIME_UPDATES: process.env.ENABLE_REAL_TIME_UPDATES === 'true'
} as const

// Usage in components
export default function TimetablesClient({ user }: Props) {
  // Use feature flag for gradual rollout
  if (FEATURE_FLAGS.CLIENT_CACHING) {
    return <TimetablesClientWithCaching user={user} />
  }

  // Fallback to original implementation
  return <TimetablesClientOriginal user={user} />
}
```

#### Automated Performance Monitoring
```yaml
# File: .github/workflows/performance-monitoring.yml
name: Continuous Performance Monitoring
on:
  schedule:
    - cron: '0 */6 * * *' # Every 6 hours
  workflow_dispatch:

jobs:
  performance-check:
    runs-on: ubuntu-latest
    steps:
      - name: Run Lighthouse
        run: |
          lhci autorun --config=lighthouse.ci.js

      - name: Check Performance Regression
        run: |
          # Compare with baseline metrics
          node scripts/check-performance-regression.js

      - name: Alert on Regression
        if: failure()
        run: |
          # Automatically create issue or send Slack alert
          curl -X POST $SLACK_WEBHOOK \
            -d '{"text":"🚨 Performance regression detected in production"}'
```

#### Circuit Breaker Pattern
```typescript
// File: packages/web/src/utils/circuit-breaker.ts
class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'

  constructor(
    private failureThreshold = 5,
    private resetTimeout = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open'
      } else {
        throw new Error('Circuit breaker is open')
      }
    }

    try {
      const result = await fn()
      this.reset()
      return result
    } catch (error) {
      this.recordFailure()
      throw error
    }
  }

  private recordFailure() {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.failureThreshold) {
      this.state = 'open'
    }
  }

  private reset() {
    this.failures = 0
    this.state = 'closed'
  }
}

// Usage for API calls
const apiCircuitBreaker = new CircuitBreaker(3, 30000)

export async function fetchPresentations() {
  return apiCircuitBreaker.execute(async () => {
    const response = await fetch('/api/presentations/list')
    if (!response.ok) throw new Error('API failed')
    return response.json()
  })
}
```

---

## 🏁 Conclusion & Next Steps

### Summary of Expected Improvements

This comprehensive optimization plan targets **70-85% reduction in timetable navigation delays** through a systematic three-phase approach:

**Phase 1 (Week 1)** - **40% improvement**:
- Database index optimization and pagination
- React performance improvements with memoization
- Bundle size reduction through XLSX dynamic loading

**Phase 2 (Week 2)** - **Additional 30% improvement**:
- Client-side caching with SWR implementation
- Advanced code splitting and lazy loading
- API response optimization and caching

**Phase 3 (Week 3-4)** - **Final 15% improvement + scalability**:
- Database architecture normalization
- Real-time updates with optimistic UI
- Advanced state management and monitoring

### Key Success Factors

1. **Incremental Implementation**: Each phase builds on the previous, reducing risk
2. **Comprehensive Monitoring**: Real-time performance tracking prevents regressions
3. **Robust Fallbacks**: Every optimization includes graceful degradation
4. **User-Centric Approach**: Focus on actual user experience metrics
5. **Scalability Focus**: Solutions support growth to 1000+ presentations

### Implementation Priority

**Start Immediately (Day 1)**:
1. Database index creation (30 minutes, massive impact)
2. API pagination implementation (2 hours, reduces data transfer)
3. React.memo implementation (2 hours, reduces re-renders)

**Week 1 Must-Haves**:
- All Phase 1 optimizations completed
- Performance monitoring infrastructure in place
- Baseline metrics established for comparison

**Success Validation**:
- Navigation times consistently <600ms after Week 1
- Error rates remain <0.1% throughout optimization
- User feedback shows improved experience

### Long-Term Vision

Beyond the initial 3-week optimization sprint, this foundation enables:
- **Predictive Caching**: AI-powered prefetching of likely-needed timetables
- **Progressive Web App**: Offline functionality with service worker
- **Advanced Analytics**: User behavior insights for further optimization
- **Scalable Architecture**: Support for enterprise-level usage patterns

### Final Recommendation

**Proceed with immediate Phase 1 implementation** - the quick wins provide substantial improvements with minimal risk, creating momentum and proving the optimization approach while building toward comprehensive performance transformation.

The combination of database optimization, React performance improvements, and strategic caching will deliver the **sub-500ms navigation experience** that modern users expect, positioning the Gamma Timetable Plugin as a high-performance, professional educational tool.

---

*Implementation Support Available*
*Contact: Development Team for detailed technical assistance*
*Review Date: Weekly during implementation phases*
*Success Metrics: Tracked continuously with automated reporting*