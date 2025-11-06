# SPRINT 14: Timetables View Implementation
*Created: August 28, 2025*
*Duration: 6-8 hours total*
*Status: READY FOR EXECUTION*

## Sprint Objective
Transform the Timetables page from placeholder to functional presentation management interface. Users should see their Gamma presentations as organized cards with timetable data, metadata, and management actions.

## Problem Analysis
**Current State:**
- Timetables page shows generic "under development" placeholder
- No way for users to see their created timetables from the extension
- Unnecessary "Back to Dashboard" button clutters navigation
- Missing connection between extension-created data and web interface

**User Requirements:**
- View list/grid of their own Gamma presentations with timetable data
- Privacy: only see own presentations (not others')
- Clean navigation without redundant "Back to Dashboard" button
- Professional interface matching Productory Powerups design system

## Sprint Scope

### ✅ Core Features to Implement
- **Presentation Cards Grid**: Responsive card layout for timetables
- **User Data Privacy**: Show only current user's presentations
- **Rich Metadata Display**: Title, last modified, slide count, duration
- **Navigation Cleanup**: Remove "Back to Dashboard" button
- **Loading & Empty States**: Professional loading skeletons and empty state
- **Basic Actions**: View timetable details, export functionality

### ❌ Out of Scope (Future Sprints)
- Search and filter functionality
- Advanced timetable editing in web interface
- Real-time collaboration features
- Bulk operations (delete multiple, etc.)
- Advanced sharing capabilities

## Team Assignment

### Claude III: Web App Implementation

**Phase 1: Data Layer & API (2 hours)**

**1. Database Schema & API Routes**
- **Create presentations table** if not exists:
  ```sql
  CREATE TABLE presentations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    presentation_url TEXT UNIQUE NOT NULL,
    timetable_data JSONB NOT NULL,
    slide_count INTEGER NOT NULL,
    total_duration INTEGER NOT NULL, -- in minutes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- **API Routes to implement:**
  - `GET /api/presentations/list` - Fetch user's presentations
  - `GET /api/presentations/[id]` - Get specific presentation details
  - `POST /api/presentations/save` - Save/update presentation (used by extension)
  - `DELETE /api/presentations/[id]` - Delete presentation

- **Row Level Security (RLS)**:
  - Users can only access their own presentations
  - Proper authentication checks on all endpoints

**Phase 2: UI Components (3 hours)**

**2. Component Architecture**
```
TimetablesClient.tsx
├── TimetableGrid.tsx
│   ├── TimetableCard.tsx
│   ├── LoadingSkeleton.tsx
│   └── EmptyState.tsx
└── TimetableActions.tsx
```

**3. TimetableCard Component**
- **Card Design** (following UX guidance):
  ```typescript
  interface TimetableCardProps {
    presentation: {
      id: string
      title: string
      presentationUrl: string
      slideCount: number
      totalDuration: number
      updatedAt: string
      timetableData: TimetableData
    }
    onView: (id: string) => void
    onExport: (id: string) => void
    onDelete: (id: string) => void
  }
  ```
- **Visual Hierarchy**: Title → Last Modified → Slide Count + Duration → Actions
- **Interaction Patterns**: Click to view, hover for actions
- **Responsive Design**: 1 column mobile, 2-3 tablet, 3-4 desktop

**4. Loading & Empty States**
- **LoadingSkeleton**: Match card dimensions with pulsing animation
- **EmptyState**: Branded illustration + extension installation guidance
- **Error States**: Network errors, authentication issues

**Phase 3: Integration & Polish (2-3 hours)**

**5. Data Integration**
- Connect API routes to Supabase
- Implement proper error handling
- Add optimistic updates for better UX
- Handle authentication state changes

**6. Navigation & Layout**
- **Remove "Back to Dashboard" button** per user request
- Maintain header with SidebarTrigger + Timetables title
- Ensure sidebar navigation remains primary method

**7. Export Functionality**
- Export timetable as XLSX (reuse extension logic)
- Export timetable as CSV option
- Download handling with proper filenames

### Technical Implementation Details

**File Structure:**
```
packages/web/src/app/
├── api/presentations/
│   ├── list/route.ts          # GET user presentations
│   ├── [id]/route.ts          # GET/DELETE specific presentation
│   └── save/route.ts          # POST save presentation
├── gamma/timetables/
│   ├── page.tsx               # Server component (auth check)
│   ├── TimetablesClient.tsx   # Main client component
│   └── components/
│       ├── TimetableGrid.tsx
│       ├── TimetableCard.tsx
│       ├── LoadingSkeleton.tsx
│       ├── EmptyState.tsx
│       └── TimetableActions.tsx
└── types/
    └── timetable.ts           # Shared type definitions
```

**Data Types:**
```typescript
interface TimetableData {
  title: string
  items: TimetableItem[]
  startTime: string
  totalDuration: number
  lastModified: string
}

interface TimetableItem {
  id: string
  title: string
  duration: number
  startTime: string
  endTime: string
  content: ContentItem[]
}

interface Presentation {
  id: string
  userId: string
  title: string
  presentationUrl: string
  timetableData: TimetableData
  slideCount: number
  totalDuration: number
  createdAt: string
  updatedAt: string
}
```

## UX Design Implementation

### Visual Design (Following UX Agent Guidance)

**Card Layout:**
```
┌─ Presentation Card ──────────────────┐
│ [📊 Icon] │ Presentation Title      │ 
│           │ Updated 2 hours ago     │
│           │ 12 slides • 45min total │
├───────────┼─────────────────────────┤
│ [View] [Export] [•••]               │
└─────────────────────────────────────┘
```

**Responsive Breakpoints:**
- Mobile (≤768px): 1 column, full width cards
- Tablet (769-1024px): 2 columns, medium cards
- Desktop (1025-1440px): 3 columns, standard cards  
- Large (≥1441px): 4 columns, compact cards

**Color System (Productory Powerups):**
- Cards: white background with subtle border
- Primary actions: Purple brand color (`#491A73`)
- Secondary text: Muted gray (`#475467`)
- Status indicators: Success green, warning amber, error red

### User Interaction Flow

1. **Page Load**: Show loading skeletons while fetching data
2. **Data Loaded**: Display grid of presentation cards
3. **Card Interaction**: 
   - Click anywhere → View timetable details
   - Hover → Show action buttons (Export, More menu)
4. **Actions**:
   - Export → Download XLSX/CSV file
   - Delete → Confirmation modal → Remove from grid
5. **Empty State**: Guide user to install/use extension

## Acceptance Criteria

### ✅ Functional Requirements
- [ ] Users see only their own presentations (privacy enforced)
- [ ] Presentations display as responsive card grid
- [ ] Cards show: title, last modified, slide count, duration
- [ ] Click card opens timetable view/details
- [ ] Export functionality works (XLSX format minimum)
- [ ] Delete functionality with confirmation
- [ ] Loading states display during data fetch
- [ ] Empty state guides new users appropriately
- [ ] "Back to Dashboard" button removed from header

### ✅ Technical Requirements
- [ ] RLS policies prevent cross-user data access
- [ ] API endpoints handle authentication properly
- [ ] Error states handled gracefully (network, auth, server errors)
- [ ] Responsive design works across device sizes
- [ ] Performance: <3s load time for grid of 20 presentations
- [ ] Accessibility: keyboard navigation and screen reader support

### ✅ UX Requirements
- [ ] Visual consistency with Productory Powerups design system
- [ ] Cards follow established visual hierarchy patterns
- [ ] Interactions feel responsive and intuitive
- [ ] Empty state is encouraging, not discouraging
- [ ] Loading states match final content structure
- [ ] Professional appearance suitable for educator audience

## Success Metrics

### User Experience
- **Visual Consistency**: Cards follow established Productory design patterns
- **Navigation Clarity**: Sidebar navigation feels primary, no redundant buttons
- **Information Hierarchy**: Users can quickly scan and identify presentations
- **Empty State Effectiveness**: New users understand next steps

### Technical Performance  
- **Data Privacy**: 100% user data isolation (no cross-user access)
- **Load Performance**: Page interactive within 3 seconds
- **Error Handling**: All failure modes display helpful messages
- **Responsive Design**: Functional across mobile, tablet, desktop sizes

### Feature Completeness
- **Core Functionality**: View presentations, export timetables, delete items
- **Integration**: Seamless connection with extension-created data
- **Professional Polish**: Ready for educator/trainer professional use

## Definition of Done

### Implementation Complete
- [ ] Database schema created with proper RLS policies  
- [ ] All API routes implemented and tested
- [ ] UI components built with responsive design
- [ ] Loading, empty, and error states implemented
- [ ] Export functionality working (XLSX minimum)
- [ ] Delete functionality with proper confirmation

### Quality Validation
- [ ] Manual testing across device sizes (mobile, tablet, desktop)
- [ ] Data privacy verified (users see only their presentations)
- [ ] Error scenarios tested (network issues, auth failures)
- [ ] Accessibility basics verified (keyboard nav, screen reader)
- [ ] Performance acceptable with realistic data volumes

### User Experience
- [ ] Interface feels professional and polished
- [ ] Navigation flows feel intuitive
- [ ] Visual design consistent with brand standards
- [ ] Empty state provides clear guidance for new users

---

**Sprint Owner**: Jarmo Tuisk  
**Assigned to**: Claude III (Web App Implementation)  
**Dependencies**: Database needs to accept extension data (existing API may need updates)
**Target Completion**: Transform placeholder into fully functional timetables management interface

## Implementation Strategy

### Phase 1: Foundation (Database + API)
Focus on data layer first to ensure proper user data isolation and API structure.

### Phase 2: Core UI (Cards + Grid)
Build the main presentation card grid interface with essential metadata display.

### Phase 3: Polish (States + Actions)  
Add loading states, empty states, export functionality, and interaction polish.

This sprint establishes the foundation for users to effectively manage their Gamma presentation timetables through the web interface, completing the extension ↔ web app integration loop.