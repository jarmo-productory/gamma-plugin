# Sprint 30 — Single Timetable View

**Status:** 📋 Planning  
**Sprint Window:** Ready for execution  
**Owner:** Claude Code AI  
**Related Audit:** `documents/audits/single-timetable-view-expansion-audit.md`

## Mission

Transform the current timetables overview into a powerful, presenter-focused experience by implementing dedicated single timetable views. Enable users to view, edit, and interact with individual presentation timetables through a streamlined interface that goes beyond the basic grid layout — providing the same core functionality as the sidebar but in a more powerful, full-featured format.

## Goals

- **Enhanced Timetable Display**: Dedicated full-page view for individual presentation timetables with timeline visualization
- **Streamlined Actions**: Same as sidebar functionality but more powerful — enhanced export, time adjustments, and presentation-focused features  
- **Presenter Experience**: Clean, professional interface optimized for presentation preparation and delivery
- **Seamless Integration**: Natural navigation flow from timetables grid with consistent design patterns

## Success Criteria

### Functional Requirements
- ✅ Display individual presentation timetable with full detail view
- ✅ Enable time adjustments (start time, individual slide durations)
- ✅ Provide enhanced export options (CSV, XLSX with professional formatting)
- ✅ Show comprehensive presentation statistics and metadata
- ✅ Support responsive design across all device sizes
- ✅ Integrate seamlessly with existing navigation and authentication

### Performance Requirements
- ✅ Page load time < 2 seconds for typical timetables (50-100 slides)
- ✅ Smooth interactions and real-time updates without page refresh
- ✅ Export generation < 5 seconds for standard presentations
- ✅ Optimized rendering for large timetables (100+ slides)

### User Experience Requirements
- ✅ Intuitive navigation from timetables grid via "View" button
- ✅ Clear visual hierarchy with professional presentation focus
- ✅ Consistent with existing design system (Sofia Sans, UI components)
- ✅ Accessible design meeting WCAG 2.1 AA standards

## Scope

### In Scope
- **New Route**: `/gamma/timetables/[id]` with comprehensive single timetable view
- **Component Architecture**: Dedicated components for timeline visualization, slide cards, and time editing
- **Enhanced Exports**: Professional CSV/XLSX formatting with presentation metadata
- **Time Management**: Interactive start time and duration editing capabilities
- **Statistics Display**: Total duration, slide count, timing insights, and presentation metadata
- **Mobile Optimization**: Responsive design with touch-friendly controls

### Out of Scope (Future Sprints)
- Real-time collaboration features
- Presentation timer and live tracking functionality
- Advanced analytics and engagement metrics
- Bulk editing across multiple presentations
- Share/collaboration links and permissions

## Work Items

### 1) Frontend Route Architecture
- **Create** `/gamma/timetables/[id]` dynamic route structure
- **Implement** main page component with proper loading and error states
- **Setup** TypeScript types and integration with existing presentation schema
- **Integrate** with existing authentication and layout patterns

### 2) Core Components Development  
- **TimetableDetailView**: Main container component with custom table layout
- **CustomEditableTable**: Custom virtual-scrolled table using shadcn Table primitives
- **EditableDurationCell**: Click-to-edit duration input with flexible parsing (`ms` library)
- **EditableStartTimeCell**: Global start time editor with auto-recalculation
- **TimetableActions**: Header action bar with auto-save status and export dropdown
- **PresentationStats**: Summary with slide count, total duration, and original presentation link

### 3) Interactive Features & Libraries
- **Flexible Input Parsing**: Use `ms` library to parse "5m", "5 min", "00:05" formats automatically
- **Auto-Recalculation**: Immediate recalculation of all times when start time or any duration changes
- **Auto-Save**: Immediate save on blur/enter with spinner feedback in header
- **Virtual Scrolling**: Handle 100+ slides efficiently using react-virtuoso with custom table rows
- **Enhanced Exports**: Professional CSV/XLSX via dropdown with metadata

### 4) Testing Implementation
- **Component Tests**: Unit tests for all new components using Vitest + Testing Library
- **Utility Tests**: Time calculations, formatting helpers, enhanced export functions
- **Integration Tests**: Navigation flow from grid to detail view and back
- **Accessibility Tests**: ARIA labels, keyboard navigation, focus management
- **Responsive Tests**: Mobile breakpoint behavior, touch interactions
- **Performance Tests**: Large timetable rendering, export generation timing

### 5) Polish & Design Spec Compliance
- **UI/UX Design Spec Adherence**: Validate ALL implementation against `documents/core/design/UI_UX_Design_Spec.md`
- **Content Screen Shell**: Implement Section 6 standard structure (header + outer + inner)
- **Component System**: Use ONLY `packages/web/src/components/ui/*` - no custom components
- **Mobile Optimization**: Section 7 responsive patterns, 768px breakpoint, no horizontal scroll
- **Accessibility**: Section 10 compliance (ARIA labels, keyboard nav, focus management)
- **Action Rows**: Section 13 button placement, sizing, alignment rules
- **Border & Spacing**: Token-based system, standard padding and gap patterns
- **Loading States**: Skeleton screens and smooth transitions per established patterns

## Technical Implementation

### Frontend Architecture

```typescript
// Route Structure - Enhanced Table View
/gamma/timetables/[id]/
├── page.tsx                     // Main page component
├── components/
│   ├── TimetableDetailView.tsx  // Main container with custom table
│   ├── CustomEditableTable.tsx  // Custom virtual-scrolled table with shadcn Table primitives
│   ├── EditableDurationCell.tsx // Inline duration editing with ms library
│   ├── EditableStartTimeCell.tsx// Global start time editor
│   ├── TimetableActions.tsx     // Header actions with auto-save status
│   └── PresentationStats.tsx    // Summary stats + original link
├── utils/
│   ├── timeCalculations.ts      // Time manipulation with ms library
│   ├── inputParsing.ts          // Flexible time/duration parsing utilities
│   └── export-enhanced.ts       // Enhanced CSV/XLSX export
└── __tests__/
    ├── components/
    │   ├── TimetableDetailView.test.tsx
    │   ├── CustomEditableTable.test.tsx  
    │   └── EditableDurationCell.test.tsx
    ├── utils/
    │   ├── timeCalculations.test.ts
    │   ├── inputParsing.test.ts
    │   └── export-enhanced.test.ts
    └── integration/
        └── table-editing-flow.test.tsx
```

### Component Integration

```typescript
// MANDATORY: Follow UI/UX Design Spec - documents/core/design/UI_UX_Design_Spec.md
import { TimetableData, Presentation } from '@/types/presentations'
import { Button, Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/*'
import AppLayout from '@/components/layouts/AppLayout'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Loader2, ExternalLink } from 'lucide-react'
import ms from 'ms' // Flexible time parsing: "5m", "5 min", "00:05"

// Enhanced Table UI Structure:
// <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
//   <SidebarTrigger />
//   <PresentationIcon className="h-5 w-5" />
//   <h1 className="text-lg font-semibold">{presentation.title}</h1>
//   {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
//   <DropdownMenu>Export</DropdownMenu>
// </header>
// <div className="flex flex-1 flex-col gap-4 p-4">
//   <PresentationStats />
//   <EditableDataTable /> // Virtual scrolling + inline editing
// </div>

// Key Libraries:
// - shadcn Table primitives (Table, TableHeader, TableBody, TableRow, TableCell)
// - ms library (flexible time input parsing: "5m" → 300000ms → "5 minutes")
// - react-virtuoso (virtual scrolling for 100+ slides)
// - Custom implementation = full control over editing, auto-save, recalculation
```

### API Integration

**✅ No New Endpoints Required**
- `GET /api/presentations/[id]` — Retrieve single presentation (existing)
- `PUT /api/presentations/save` — Update presentation data (existing)
- All existing RLS security and device token authentication maintained

## Database & Backend

### Schema Assessment: ✅ NO CHANGES REQUIRED

The existing `presentations` table fully supports all requirements:

```sql
-- Current schema supports all functionality
CREATE TABLE presentations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title VARCHAR NOT NULL,                    -- ✅ Presentation metadata
  gamma_url VARCHAR UNIQUE NOT NULL,         -- ✅ Source identification
  start_time VARCHAR DEFAULT '09:00',        -- ✅ Configurable timing
  total_duration INTEGER DEFAULT 0,         -- ✅ Duration calculations
  timetable_data JSONB NOT NULL,            -- ✅ Complete slide data
  created_at TIMESTAMP DEFAULT NOW(),       -- ✅ Metadata
  updated_at TIMESTAMP DEFAULT NOW()        -- ✅ Change tracking
);
```

**Data Sufficiency**: ✅ Complete
- Presentation metadata, timing data, slide content, and user association all supported
- JSONB field enables flexible content storage and future enhancements
- Existing RLS policies provide proper security isolation

## User Experience Flow

### Navigation Pattern
1. **Grid View**: User sees all timetables in `/gamma/timetables`
2. **View Action**: Clicks "View" button on presentation card
3. **Detail View**: Navigates to `/gamma/timetables/[id]` with full presentation
4. **Interactive Experience**: Edit times, view details, export, navigate back

### Key UX Principles
- **Presenter-Focused**: Clean, professional interface optimized for presentation preparation
- **Streamlined Power**: Same core functionality as sidebar but with enhanced capabilities
- **Design Spec Compliance**: MANDATORY adherence to `documents/core/design/UI_UX_Design_Spec.md`
- **Progressive Enhancement**: Basic viewing works, advanced features layer on top

### Design System Constraints
- **Content Screen Shell**: Must follow Section 6 standard shell (header + outer wrapper + inner container)
- **Component System**: Use ONLY `packages/web/src/components/ui/*` components (Section 4)
- **Design Tokens**: Semantic token palette only - NO hardcoded colors (Section 3)  
- **Action Rows**: Follow Section 13 button placement, sizing, and alignment rules
- **Border System**: 1px borders with token colors, elevation for hover states
- **Spacing System**: Standard page shell (`px-4`, `p-4`, `gap-4`) and card patterns
- **Typography**: Sofia Sans integration consistent with existing implementation

## Validation & Acceptance Tests

### End-to-End Scenarios
1. **Navigation Flow**: From grid → detail view → back with proper state management
2. **Time Editing**: Modify start time and slide durations with live preview
3. **Export Functionality**: Generate CSV/XLSX with professional formatting
4. **Mobile Experience**: Full functionality on tablet and phone screen sizes
5. **Performance**: Smooth rendering with large presentations (100+ slides)

### Technical Validation
- **TypeScript**: Zero compilation errors, full type safety
- **Design Spec Compliance**: All implementation must pass UI/UX Design Spec validation
- **Responsive Design**: Follow Section 7 - mobile breakpoint at 768px, no horizontal scrolling
- **Accessibility**: WCAG 2.1 AA compliance per Section 10 (keyboard nav, focus rings, ARIA labels)
- **Integration**: Seamless operation with existing authentication and data flow

### Design Validation Checklist (Mandatory)
- ✅ Uses `AppLayout` and `SidebarProvider` (Section 5)
- ✅ Follows standard content screen shell structure (Section 6)  
- ✅ Uses only `ui/*` components with semantic tokens (Sections 3-4)
- ✅ Action rows follow placement and alignment rules (Section 13)
- ✅ Border system: 1px thickness, token colors, elevation for hover
- ✅ Spacing system: standard page shell and card patterns
- ✅ No hardcoded colors, custom margins, or ad hoc styling
- ✅ Mobile responsive with proper breakpoint handling

## Non-Functional Requirements

### Performance
- **Page Load**: < 2 seconds for typical timetables
- **Interactivity**: < 100ms response for UI interactions
- **Export Speed**: < 5 seconds for standard presentations
- **Memory Usage**: Efficient rendering for large datasets

### Security & RLS
- **Authentication**: Leverage existing device token and session-based auth
- **Row Level Security**: All data access respects existing RLS policies
- **No Service Role**: Continue using regular Supabase client for user operations
- **Data Privacy**: Users only see their own presentation data

### Maintainability
- **Code Quality**: TypeScript coverage, ESLint compliance
- **Component Reuse**: Leverage existing UI component library
- **Testing**: Unit tests for utilities, integration tests for user flows
- **Documentation**: Component docs and implementation examples

## Risks & Mitigations

### Technical Risks

**🟡 Medium Risk: Performance with Large Timetables**
- **Risk**: Rendering 100+ slide items could impact performance
- **Mitigation**: Virtual scrolling, pagination, or progressive loading
- **Impact**: Low — most presentations have < 100 slides

**🟡 Medium Risk: State Management Complexity**  
- **Risk**: Managing edit state, unsaved changes, and real-time calculations
- **Mitigation**: Use React patterns established in existing components
- **Impact**: Low — well-understood patterns available

### User Experience Risks

**🟡 Medium Risk: Feature Discoverability**
- **Risk**: Users may not discover or understand the new detailed view
- **Mitigation**: Clear "View" buttons, intuitive navigation, proper onboarding hints
- **Impact**: Medium — could affect feature adoption

**🟢 Low Risk: Data Consistency**
- **Risk**: Concurrent edits between extension and web interface
- **Mitigation**: Use existing save/sync patterns with conflict detection
- **Impact**: Low — existing systems handle this robustly

## Implementation Phases

### Phase 1: Foundation
- Route structure and page component
- Basic presentation data fetching and display
- Integration with existing layout and authentication

### Phase 2: Core Components
- Timeline visualization and slide card components
- Time editing functionality with live preview
- Enhanced export capabilities

### Phase 3: Polish & Integration
- Mobile responsive design
- Accessibility improvements
- Navigation flow and user experience refinements

### Phase 4: Testing & Validation
- **Component Tests**: Write unit tests for TimetableDetailView, SlideCard, TimeEditor components
- **Utility Tests**: Test time calculations, formatting functions, enhanced export logic
- **Integration Tests**: End-to-end navigation flow and data persistence
- **Accessibility Tests**: Validate ARIA compliance, keyboard navigation, screen reader support
- **Performance Tests**: Large timetable rendering benchmarks, export timing validation
- **Cross-device Testing**: Mobile, tablet, desktop compatibility verification

## Rollout Strategy

### Development Approach
4. **Continuous Integration**: Deploy and test frequently using existing CI/CD

### Launch Readiness
- **User Documentation**: Update help content with new navigation patterns
- **Performance Monitoring**: Establish baselines and alerting
- **Feedback Collection**: Prepare channels for user input and iteration

## Success Metrics

### User Engagement
- **Feature Adoption**: Percentage of users who discover and use detail view
- **Time Spent**: Average session duration in detail view vs grid view
- **Action Completion**: Export usage, time editing engagement

### Technical Performance  
- **Page Load Times**: Monitor P95 load performance across device types
- **Error Rates**: Track and minimize 4xx/5xx responses for the new route
- **User Experience**: Core Web Vitals (LCP, CLS, INP) remain within targets

## Future Enhancements (Post-Sprint)

### Sprint 31+ Opportunities
- **Real-Time Collaboration**: Multi-user editing and live updates
- **Presentation Mode**: Full-screen timer and presenter tools  
- **Advanced Analytics**: Slide engagement and timing optimization
- **Template Library**: Save and reuse timing patterns
- **Mobile App**: PWA features and offline capability

## Conclusion

Sprint 30 represents a natural evolution of the timetables functionality, transforming a basic grid overview into a powerful, presenter-focused experience. By leveraging existing infrastructure and maintaining design consistency, this sprint delivers significant user value with minimal technical risk and complexity.

The implementation builds directly on the comprehensive audit findings, ensuring high feasibility and maximum code reuse while providing the enhanced functionality that presenters need for professional presentation preparation and delivery.

---

**Ready for Team Review**: This sprint plan is prepared for technical review and approval by the full team before execution begins.