# Slide Duration Prediction - Codebase Integration Analysis
**Date:** October 19, 2025
**Sprint:** 36 (Implementation Phase)
**Analyst:** Codebase Integration Analyst
**Status:** Ready for Implementation

---

## Executive Summary

This document provides a comprehensive analysis of all codebase touchpoints for integrating the slide duration prediction feature. The system is **already partially implemented** (Sprint 36) with database foundation, API endpoints, and UI components in place. This audit identifies integration points, existing code to leverage, and technical constraints.

### Key Findings
✅ **Database layer**: Fully implemented (`slide_fingerprints` table, RPC functions)
✅ **API endpoints**: Complete with similarity matching logic
✅ **UI components**: Advanced suggestion component exists but not integrated
⚠️ **Integration gap**: UI component not connected to main table view
📊 **Technical constraints**: Chrome extension bundle size ~1.3MB, no text processing libs in extension

---

## Section 1: Data Model Touchpoints

### 1.1 Slide Data Structure

**Primary Definition:** `/packages/shared/types/index.ts`
```typescript
export interface Slide {
  id: string;
  title: string;
  content: string[];
}

export interface TimetableItem {
  id: string;
  title: string;
  content: string[];
  startTime: string;
  duration: number;  // ✅ Duration field exists
  endTime: string;
}
```

**Web Application Type:** `/packages/web/src/app/gamma/timetables/types.ts`
```typescript
export interface TimetableItem {
  id: string;
  title: string;
  content: string[];
  startTime: string;
  duration: number;  // ✅ Duration field exists
  endTime: string;
}

export interface Presentation {
  id: string;
  title: string;
  presentationUrl: string;
  startTime: string;
  totalDuration: number;
  slideCount: number;
  timetableData: TimetableData;
  createdAt: string;
  updatedAt: string;
}
```

**Extension Content Script:** `/packages/extension/content.ts`
```typescript
interface SlideData {
  id: string;
  title: string;
  content: ContentItem[];  // ⚠️ Different structure (objects, not strings)
  order: number;
  level: number;
  presentationUrl: string;
}

interface ContentItem {
  type: 'paragraph' | 'image' | 'link' | 'list_item';
  text: string;
  subItems: string[];
}
```

**🔑 Integration Point:** Extension extracts slides as `ContentItem[]` but shared types expect `string[]`. Need transformation layer.

---

### 1.2 Duration Suggestion Types

**Fully Defined in Shared Types:** `/packages/shared/types/index.ts` (Lines 89-115)
```typescript
export interface DurationSuggestion {
  averageDuration: number;        // Suggested duration in minutes
  confidence: 'high' | 'medium' | 'low';
  sampleSize: number;             // Number of similar slides used
  durationRange: {
    p25: number;                  // 25th percentile
    median: number;               // 50th percentile (median)
    p75: number;                  // 75th percentile
  };
  matchQuality: {
    titleSimilarity: number;      // 0-1 score
    contentSimilarity: number;    // 0-1 score
  };
}

export interface DurationSuggestionRequest {
  title: string;
  content: string[];
}

export interface DurationSuggestionResponse {
  success: boolean;
  suggestion?: DurationSuggestion;
  message?: string;
  error?: string;
}
```

✅ **Status:** Complete type definitions, ready for use.

---

## Section 2: Storage Integration Points

### 2.1 Database Schema

**Presentations Table:** `/supabase/migrations/20240718000001_initial_schema.sql`
```sql
CREATE TABLE presentations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  gamma_url VARCHAR UNIQUE NOT NULL,
  start_time VARCHAR DEFAULT '09:00',
  total_duration INTEGER DEFAULT 0,
  timetable_data JSONB NOT NULL,  -- ✅ Contains items array with durations
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Slide Fingerprints Table:** `/supabase/migrations/20251001154438_slide_fingerprints.sql`
```sql
CREATE TABLE slide_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  presentation_id UUID REFERENCES presentations(id) ON DELETE CASCADE,
  slide_id VARCHAR NOT NULL,

  -- Original content
  title TEXT NOT NULL,
  content_text TEXT NOT NULL,
  duration INTEGER NOT NULL,

  -- Normalized for matching (immutable after normalization)
  title_normalized TEXT NOT NULL,
  content_normalized TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(presentation_id, slide_id),
  CHECK(duration > 0),
  CHECK(title != ''),
  CHECK(content_text != '')
);

-- GIN indexes for trigram similarity (pg_trgm)
CREATE INDEX idx_slide_fingerprints_title_trgm
ON slide_fingerprints USING GIN (title_normalized gin_trgm_ops);

CREATE INDEX idx_slide_fingerprints_content_trgm
ON slide_fingerprints USING GIN (content_normalized gin_trgm_ops);
```

**Auto-Sync Trigger:** `/supabase/migrations/20251001154438_slide_fingerprints.sql` (Lines 175-306)
```sql
CREATE OR REPLACE FUNCTION sync_slide_fingerprints()
RETURNS TRIGGER AS $$
-- Incremental sync: Only update changed slides
-- Automatically extracts slides from presentations.timetable_data JSONB
-- Uses normalize_text() function for consistent matching
```

✅ **Integration Complete:** Fingerprints auto-sync on presentation save/update.

---

### 2.2 Chrome Extension Storage

**Storage Abstraction:** `/packages/extension/lib/storage.js`
```javascript
import {
  saveData as sharedSaveData,
  loadData as sharedLoadData,
} from '@shared/storage';

export function saveData(key, value) {
  return sharedSaveData(key, value);
}

export function loadData(key) {
  return sharedLoadData(key);
}
```

**Shared Storage Manager:** `/packages/shared/storage/index.ts`
```typescript
export interface PresentationSummary {
  id: string;
  title: string;
  gamma_url: string;
  // ... metadata fields
}
```

**🔑 Integration Point:** Extension uses `chrome.storage.local` with ~5MB quota. Duration suggestions should be fetched from API, not stored locally.

---

### 2.3 LocalStorage State Management

**Duration Suggestion State:** `/packages/web/src/lib/durationSuggestions.ts` (Lines 53-186)
```typescript
export interface SlideState {
  userEdited: boolean;
  suggestionDismissed: boolean;
  lastSuggestion?: {
    duration: number;
    confidence: string;
    timestamp: number;
    accepted: boolean;
  };
}

// Key format: gamma_slide_state_v1_{presentationId}_{slideId}
function getStorageKey(presentationId: string, slideId: string): string {
  return `${STORAGE_PREFIX}${STORAGE_VERSION}_${presentationId}_${slideId}`;
}

export function loadSlideState(presentationId: string, slideId: string): SlideState
export function saveSlideState(presentationId: string, slideId: string, state: Partial<SlideState>): void
export function markSlideAsEdited(presentationId: string, slideId: string): void
export function dismissSuggestion(presentationId: string, slideId: string): void
export function acceptSuggestion(presentationId: string, slideId: string, suggestion: DurationSuggestion): void
export function clearPresentationState(presentationId: string): void
```

✅ **Status:** Complete state management utility ready for use.

---

## Section 3: UI Integration Points

### 3.1 Duration Cell Components (Existing)

**Standard Editable Cell:** `/packages/web/src/app/gamma/timetables/[id]/components/EditableDurationCell.tsx`
- Simple click-to-edit duration
- No suggestion capability
- Currently used in main table

**Advanced Cell with Suggestions:** `/packages/web/src/app/gamma/timetables/[id]/components/EditableDurationCellWithSuggestion.tsx` (269 lines)
```tsx
interface EditableDurationCellWithSuggestionProps {
  duration: number;
  onDurationChange: (newDurationString: string) => void;
  slideId: string;
  presentationId: string;
  slideTitle: string;
  slideContent: string[];
}

export default function EditableDurationCellWithSuggestion({
  duration, onDurationChange, slideId, presentationId,
  slideTitle, slideContent
}: EditableDurationCellWithSuggestionProps) {
  // ✅ Fetches suggestions from API
  // ✅ Manages localStorage state
  // ✅ Shows suggestion badge with confidence
  // ✅ Allows accept/dismiss actions
  // ✅ Tooltip with detailed statistics
}
```

**🎯 Integration Opportunity:** Replace `EditableDurationCell` with `EditableDurationCellWithSuggestion` in main table.

---

### 3.2 Table Component Integration

**Current Table:** `/packages/web/src/app/gamma/timetables/[id]/components/CustomEditableTable.tsx`
```tsx
export default function CustomEditableTable({
  presentation,
  onStartTimeChange,
  onDurationChange
}: CustomEditableTableProps) {
  // Line 135-140: Duration cell rendering
  <td className="p-4 align-middle border-r border-border/60">
    <EditableDurationCell
      duration={item.duration}
      onDurationChange={onDurationChange}
      slideId={item.id}
    />
  </td>
}
```

**🔧 Required Change:** Replace import and pass additional props:
```tsx
import EditableDurationCellWithSuggestion from './EditableDurationCellWithSuggestion'

// In rowContent function:
<EditableDurationCellWithSuggestion
  duration={item.duration}
  onDurationChange={(newDuration) => onDurationChange(item.id, newDuration)}
  slideId={item.id}
  presentationId={presentation.id}
  slideTitle={item.title}
  slideContent={item.content}
/>
```

---

### 3.3 State Management Flow

**Reducer Pattern:** `/packages/web/src/app/gamma/timetables/[id]/components/TimetableDetailView.tsx` (Lines 1-100)
```tsx
type TimetableReducerAction =
  | { type: 'SYNC_FROM_SERVER'; payload: Presentation }
  | { type: 'UPDATE_START_TIME'; payload: string }
  | { type: 'UPDATE_DURATION'; payload: { slideId: string; minutes: number } }
  | { type: 'MARK_SAVED' }

const timetableReducer = (state: TimetableReducerState, action: TimetableReducerAction) => {
  switch (action.type) {
    case 'UPDATE_DURATION': {
      const { slideId, minutes } = action.payload
      const safeMinutes = Math.max(0, Math.round(minutes))
      const nextPresentation = clonePresentation(state.presentation)
      const updatedItems = nextPresentation.timetableData.items.map((item) =>
        item.id === slideId ? { ...item, duration: safeMinutes } : { ...item }
      )
      const recalculatedPresentation = applyRecalculation(
        nextPresentation,
        updatedItems,
        nextPresentation.timetableData.startTime
      )
      return {
        presentation: recalculatedPresentation,
        hasUnsavedChanges: true
      }
    }
  }
}
```

✅ **Status:** Existing reducer handles duration updates. No changes needed.

---

## Section 4: Save/Sync Flow

### 4.1 Presentation Save Endpoint

**API Route:** `/packages/web/src/app/api/presentations/save/route.ts` (Lines 1-180)
```typescript
export async function POST(request: NextRequest) {
  // 1. Authenticate user (device token or Supabase session)
  const authUser = await getAuthenticatedUser(request)

  // 2. Validate payload schema
  const { deprecatedCamelUsed, ...payload } = normalizeSaveRequest(rawBody)

  // 3. Save via RPC (device-token path) or direct table access (web session)
  const { data, error } = await supabase.rpc('rpc_upsert_presentation_from_device', {
    p_auth_id: authUser.userId,
    p_gamma_url: canonicalUrl,
    p_title: payload.title,
    p_timetable_data: payload.timetable_data,  // ✅ Contains slide durations
    p_start_time: payload.start_time ?? null,
    p_total_duration: payload.total_duration ?? null,
    p_email: authUser.userEmail || null,
  })

  // 4. Return formatted response
  return NextResponse.json({
    success: true,
    presentation: formattedPresentation
  })
}
```

**🔑 Critical Flow:** When presentation saves → Database trigger fires → `slide_fingerprints` table updates → Enables future suggestions

---

### 4.2 Duration Suggestion Endpoint

**API Route:** `/packages/web/src/app/api/presentations/suggestions/duration/route.ts` (Lines 1-124)
```typescript
export async function POST(request: NextRequest) {
  // 1. Authenticate user
  const authUser = await getAuthenticatedUser(request)

  // 2. Parse request body
  const { title, content } = await request.json()

  // 3. Query for similar slides using pg_trgm similarity
  const { data: matches, error } = await supabase.rpc('get_duration_suggestion', {
    p_title: title,
    p_content: content.join(' '),  // ✅ Serializes content array
    p_title_threshold: 0.95,
    p_content_threshold: 0.90
  })

  // 4. Determine confidence based on sample size and variance
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (result.sample_size >= 5 && result.coefficient_of_variation < 0.3) {
    confidence = 'high';
  } else if (result.sample_size >= 3 && result.coefficient_of_variation < 0.5) {
    confidence = 'medium';
  }

  // 5. Return suggestion
  return NextResponse.json({ success: true, suggestion })
}
```

**🔧 RPC Function:** `/supabase/migrations/20251001160705_slide_duration_suggestion_rpc.sql`
```sql
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
-- Two-tier similarity matching with IQR outlier filtering
-- Uses normalized text for consistent matching
-- Target <100ms query time
```

✅ **Status:** Complete API infrastructure ready for use.

---

## Section 5: Existing Code to Leverage

### 5.1 Text Processing Utilities

**Normalization Function (Database):** `/supabase/migrations/20251001154438_slide_fingerprints.sql` (Lines 39-54)
```sql
CREATE OR REPLACE FUNCTION normalize_text(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN regexp_replace(
    regexp_replace(
      lower(trim(input_text)),
      '[^\w\s]', '', 'g'  -- Remove punctuation
    ),
    '\s+', ' ', 'g'       -- Collapse whitespace
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**🎯 Advantage:** All text normalization happens server-side. No client-side text processing libraries needed.

---

### 5.2 Similarity Matching (PostgreSQL pg_trgm)

**Already Configured:** Extension enabled in database
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- GIN indexes for fast similarity queries
CREATE INDEX idx_slide_fingerprints_title_trgm
ON slide_fingerprints USING GIN (title_normalized gin_trgm_ops);

CREATE INDEX idx_slide_fingerprints_content_trgm
ON slide_fingerprints USING GIN (content_normalized gin_trgm_ops);
```

**Similarity Function:**
```sql
similarity(text1, text2) RETURNS FLOAT  -- 0.0 to 1.0 score
```

✅ **Status:** No additional libraries required. Native PostgreSQL functionality.

---

### 5.3 State Management Hooks

**Duration Suggestion Utilities:** `/packages/web/src/lib/durationSuggestions.ts`
```typescript
// Fetch from API
export async function fetchDurationSuggestion(
  params: FetchSuggestionParams
): Promise<DurationSuggestion | null>

// LocalStorage state management
export function loadSlideState(presentationId: string, slideId: string): SlideState
export function saveSlideState(presentationId: string, slideId: string, state: Partial<SlideState>): void
export function markSlideAsEdited(presentationId: string, slideId: string): void
export function dismissSuggestion(presentationId: string, slideId: string): void
export function acceptSuggestion(presentationId: string, slideId: string, suggestion: DurationSuggestion): void

// Authentication check
export function isUserAuthenticated(): boolean
```

✅ **Status:** Complete utility library ready for use.

---

## Section 6: Technical Constraints

### 6.1 Chrome Extension Bundle Size

**Current Size:** ~1.3MB total
```
/packages/extension/lib/*.js: 1,333,447 bytes (1.3MB)
```

**Chrome Extension Limits:**
- Service worker: 5MB quota for `chrome.storage.local`
- Content scripts: Must be lean (performance)
- No large ML libraries allowed

**✅ Decision:** All text processing happens server-side via PostgreSQL. No additional libraries needed in extension.

---

### 6.2 Web Application Dependencies

**Current Libraries:** `/packages/web/package.json`
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.56.0",  // ✅ API client
    "react": "19.1.0",                   // ✅ UI framework
    "react-virtuoso": "^4.14.0",         // ✅ Virtualized tables
    "lucide-react": "^0.541.0",          // ✅ Icons (Lightbulb, Check, X)
    "zod": "^3.23.8",                    // ✅ Schema validation
    "date-fns": "^4.1.0",                // Time formatting
    "xlsx": "^0.18.5"                    // Export functionality
  }
}
```

**No New Dependencies Required:**
- Text processing: Server-side (PostgreSQL)
- Similarity matching: Server-side (pg_trgm)
- State management: Built-in (React hooks + localStorage)

✅ **Status:** Zero additional dependencies needed.

---

### 6.3 Performance Constraints

**Database Query Performance:**
- Target: <100ms for suggestion queries
- Optimization: GIN indexes on normalized text
- Strategy: Two-tier matching (title 95%, content 90%)

**UI Performance:**
- Virtualized tables: `react-virtuoso` handles large slide lists
- Debounced API calls: Prevent excessive requests
- Cached suggestions: localStorage prevents redundant fetches

**Network Efficiency:**
- Suggestions fetched on-demand (not all slides at once)
- LocalStorage caching prevents duplicate API calls
- User actions (edit/dismiss) stored locally

✅ **Status:** Performance optimizations already in place.

---

## Section 7: Integration Roadmap

### Phase 1: Connect UI Component (Estimated: 2 hours)
**File:** `/packages/web/src/app/gamma/timetables/[id]/components/CustomEditableTable.tsx`

**Changes:**
1. Replace import:
   ```tsx
   // OLD:
   import EditableDurationCell from './EditableDurationCell'

   // NEW:
   import EditableDurationCellWithSuggestion from './EditableDurationCellWithSuggestion'
   ```

2. Update row renderer (Line 135-140):
   ```tsx
   <EditableDurationCellWithSuggestion
     duration={item.duration}
     onDurationChange={(newDuration) => onDurationChange(item.id, newDuration)}
     slideId={item.id}
     presentationId={presentation.id}
     slideTitle={item.title}
     slideContent={item.content}
   />
   ```

3. Test:
   - Suggestions appear for similar slides
   - Accept/dismiss actions work
   - State persists across page refreshes

---

### Phase 2: Extension Content Transformation (Estimated: 3 hours)
**File:** `/packages/extension/content.ts`

**Problem:** Extension extracts content as `ContentItem[]` but API expects `string[]`

**Solution:** Add content serialization utility:
```typescript
function serializeContentToStrings(content: ContentItem[]): string[] {
  return content.map(item => {
    if (item.type === 'paragraph' || item.type === 'link') {
      return item.text;
    } else if (item.type === 'list_item') {
      return [item.text, ...item.subItems].join(' ');
    } else if (item.type === 'image') {
      return `[Image: ${item.text}]`;
    }
    return '';
  }).filter(s => s.length > 0);
}
```

**Integration:** Update slide extraction:
```typescript
slides.push({
  id,
  title,
  content: serializeContentToStrings(content),  // ✅ Convert to strings
  order: idx,
  level,
  presentationUrl: window.location.href
});
```

---

### Phase 3: Testing & Validation (Estimated: 4 hours)
1. **Unit Tests:** Duration suggestion state management
2. **Integration Tests:** API endpoint with mock data
3. **E2E Tests:** Full user flow (load presentation → see suggestion → accept/dismiss)
4. **Performance Tests:** Query time benchmarks

---

### Phase 4: Documentation & Cleanup (Estimated: 2 hours)
1. Update API documentation
2. Add JSDoc comments to utility functions
3. Create user-facing help text/tooltips
4. Remove unused `EditableDurationCell` component

---

## Section 8: Risk Assessment

### Low Risk ✅
- **Database layer:** Already deployed and tested
- **API endpoints:** Existing with CORS and authentication
- **State management:** Proven localStorage pattern
- **UI component:** Fully implemented and styled

### Medium Risk ⚠️
- **Content serialization:** Extension → API format mismatch (mitigated with transformation utility)
- **Performance at scale:** Large presentations may have slow suggestion queries (mitigated with GIN indexes)
- **User experience:** Over-suggesting may annoy users (mitigated with confidence thresholds and dismiss action)

### Mitigation Strategies
1. **Thorough testing** of content transformation logic
2. **Query performance monitoring** with Supabase dashboard
3. **User feedback loop** to tune confidence thresholds
4. **Gradual rollout** starting with high-confidence suggestions only

---

## Section 9: Success Metrics

### Technical Metrics
- [ ] Suggestion API response time: <100ms (p95)
- [ ] UI component render time: <50ms
- [ ] Cache hit rate: >80% (localStorage)
- [ ] Zero additional bundle size increase

### User Experience Metrics
- [ ] Suggestion acceptance rate: >30%
- [ ] Manual edit rate decrease: >20%
- [ ] Time to complete timetable: -15%
- [ ] User satisfaction score: >4.0/5.0

---

## Section 10: Conclusion

The slide duration prediction feature has **strong technical foundations** already in place:

✅ **Database Layer:** Complete with fingerprints, triggers, RPC functions
✅ **API Layer:** Endpoints with similarity matching and authentication
✅ **UI Components:** Advanced suggestion component fully implemented
✅ **State Management:** LocalStorage utilities and reducer pattern ready
✅ **Performance:** Optimized queries with GIN indexes

**Primary Integration Gap:** UI component not connected to main table view.

**Estimated Integration Effort:** 11 hours total
- Phase 1 (Connect UI): 2 hours
- Phase 2 (Content transformation): 3 hours
- Phase 3 (Testing): 4 hours
- Phase 4 (Documentation): 2 hours

**Recommendation:** Proceed with integration. Risk is low, infrastructure is solid, and user value is clear.

---

## Appendix A: File Paths Reference

### Data Models
- `/packages/shared/types/index.ts` - Shared type definitions
- `/packages/web/src/app/gamma/timetables/types.ts` - Web application types
- `/packages/web/src/schemas/presentations.ts` - Zod validation schemas
- `/packages/extension/content.ts` - Extension slide extraction

### Database
- `/supabase/migrations/20240718000001_initial_schema.sql` - Presentations table
- `/supabase/migrations/20251001154438_slide_fingerprints.sql` - Fingerprints table + trigger
- `/supabase/migrations/20251001160705_slide_duration_suggestion_rpc.sql` - RPC function

### API Endpoints
- `/packages/web/src/app/api/presentations/save/route.ts` - Save presentation
- `/packages/web/src/app/api/presentations/suggestions/duration/route.ts` - Get suggestion

### UI Components
- `/packages/web/src/app/gamma/timetables/[id]/components/EditableDurationCellWithSuggestion.tsx` - Advanced cell (269 lines)
- `/packages/web/src/app/gamma/timetables/[id]/components/CustomEditableTable.tsx` - Main table
- `/packages/web/src/app/gamma/timetables/[id]/components/TimetableDetailView.tsx` - Reducer logic

### Utilities
- `/packages/web/src/lib/durationSuggestions.ts` - State management (204 lines)
- `/packages/extension/lib/storage.js` - Chrome storage abstraction

### Storage
- `/packages/shared/storage/index.ts` - Shared storage manager
- Chrome `localStorage` - Web application state
- Chrome `chrome.storage.local` - Extension storage

---

**End of Analysis**
