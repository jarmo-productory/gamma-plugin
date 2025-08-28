# SPRINT 11: Sidebar Dashboard Layout
*Created: August 28, 2025*
*Duration: 2-3 days*
*Status: READY FOR EXECUTION*

## Sprint Objective
Implement shadcn sidebar-based layout with collapsible design, creating dual layout architecture for utility pages vs authenticated app experience with 2-level menu hierarchy.

## Scope Definition
- ✅ Sidebar implementation with collapse-to-icons functionality
- ✅ Dual layout system: utility pages (centered) vs app layout (sidebar)
- ✅ 2-level menu structure: App name (Gamma) > Tool (Timetables)
- ✅ Responsive design across all breakpoints
- ❌ No new major features - layout transformation only
- ❌ No database schema changes
- ❌ No authentication system changes

## Research Summary ✅

### Dependency Risk Assessment
- ✅ **LOW RISK**: shadcn/ui already configured in project
- ✅ **LOW RISK**: Required dependencies already installed (@radix-ui/*, lucide-react v0.541.0, etc.)
- ✅ **LOW RISK**: Only needs CSS variables + `npx shadcn add sidebar`
- ✅ **NETLIFY SAFE**: No breaking dependencies identified
- ✅ **ICONS READY**: Lucide icons already available for menu structure

### Current Architecture Analysis
- **Utility Pages**: Centered layout (`flex items-center justify-center`)
- **Dashboard Pages**: Max-width centered with basic header
- **Root Layout**: Simple body padding, no complex layout system

## Proposed Architecture

### 1. Dual Layout System
```
/src/components/layouts/
├── UtilityLayout.tsx      # Login, logout, error pages (centered)
├── AppLayout.tsx          # Authenticated app with sidebar
└── AppSidebar.tsx         # Collapsible sidebar component
```

### 2. Sidebar Menu Structure with Lucide Icons
```tsx
📱 Productory Powerups
├── <Presentation /> Gamma
│   ├── <Calendar /> Timetables      (current dashboard functionality)
│   └── <BarChart3 /> Analytics      (future)
├── <FileText /> PowerPoint          (future app)
│   └── <Layout /> Templates         (future tool)  
└── <Settings /> Settings
    ├── <User /> Account
    └── <Link /> Integrations
```

**Level 1 (App) Icons:**
- **Gamma**: `<Presentation />` - represents presentation tools
- **PowerPoint**: `<FileText />` - document/file-based tools
- **Settings**: `<Settings />` - configuration and preferences

**Level 2 (Tool) Icons:**
- **Timetables**: `<Calendar />` - time-based scheduling
- **Analytics**: `<BarChart3 />` - data visualization
- **Templates**: `<Layout />` - design templates
- **Account**: `<User />` - user profile settings
- **Integrations**: `<Link />` - external connections

**Icon Dependency**: ✅ `lucide-react` already installed (v0.541.0)

### 3. Page Layout Assignment
- **UtilityLayout**: `/`, `/login`, `/signup`, `/auth/*`, error pages
- **AppLayout**: `/dashboard` (opening page), `/gamma/*`, `/settings/*`, future authenticated routes

### 4. Route Structure & Navigation
**Current Implementation:**
- `/dashboard` - Main opening page (keep as-is, no redirect)
- Menu items navigate to placeholder screens

**Menu Navigation Mapping:**
```
Sidebar Menu Item → Route → Page Status
├── Gamma
│   ├── Timetables → /gamma/timetables → Placeholder screen  
│   └── Analytics → /gamma/analytics → Placeholder screen
└── Settings  
    ├── Account → /settings/account → Placeholder screen
    └── Integrations → /settings/integrations → Placeholder screen
```

**Placeholder Screen Template:**
- Consistent layout with sidebar
- Page title matching menu item
- "Coming soon" or "Under development" messaging
- Navigation breadcrumb showing: App > Tool
- Back to Dashboard link for user orientation

## Implementation Plan

### Phase 1: Sidebar Setup (Day 1)
**Tasks:**
1. Install sidebar component: `npx shadcn add sidebar`
2. Add CSS variables to `globals.css` for sidebar theming
3. Test build compatibility with Netlify (critical validation step)

**Success Criteria:**
- Sidebar component installed without errors
- Build process successful
- Netlify deployment working

### Phase 2: Layout Architecture (Day 1-2)
**Tasks:**
1. Create `UtilityLayout.tsx` - extract current centered layout pattern
2. Create `AppLayout.tsx` - sidebar-based layout for authenticated users
3. Update route layouts:
   - `/` (homepage): UtilityLayout
   - `/login`, `/signup`: UtilityLayout
   - `/dashboard`: AppLayout (opening page, no redirect)
   - `/gamma/*`, `/settings/*`: AppLayout
4. Create placeholder page component template

**Success Criteria:**
- Dual layout system operational
- `/dashboard` remains as main opening page
- No regression in existing page functionality
- Clean separation of utility vs app experiences
- Placeholder pages accessible via sidebar navigation

### Phase 3: Sidebar Implementation (Day 2)
**Tasks:**
1. Create `AppSidebar.tsx` based on sidebar-07 pattern
2. Implement menu structure with 2-level hierarchy
3. Add navigation items with Lucide icons:
   - `<Presentation />` Gamma > `<Calendar />` Timetables → `/gamma/timetables`
   - `<Presentation />` Gamma > `<BarChart3 />` Analytics → `/gamma/analytics`  
   - `<Settings />` Settings > `<User />` Account → `/settings/account`
   - `<Settings />` Settings > `<Link />` Integrations → `/settings/integrations`
4. Integrate user context for personalization
5. Create placeholder pages for all new routes

**Success Criteria:**
- 2-level menu structure working
- Navigation to placeholder screens functional
- `/dashboard` remains accessible as opening page
- User information displayed appropriately
- All menu routes have corresponding placeholder pages

### Phase 4: Responsive Design (Day 2-3)
**Tasks:**
1. Desktop behavior: Full sidebar with labels
2. Tablet behavior: Collapsed to icons, expandable on hover
3. Mobile behavior: Hidden sidebar, hamburger menu
4. State persistence: Remember collapsed/expanded preference

**Success Criteria:**
- Sidebar collapses to icons on smaller screens
- Mobile responsive behavior working
- State persistence across page loads

## Responsive Behavior Design

### Breakpoints
- **`xl` (1280px+)**: Full sidebar (256px width) with labels visible
- **`lg` (1024px-1279px)**: Collapsed sidebar (64px width) with icons only
- **`md` (768px-1023px)**: Sidebar toggleable via button, overlay on mobile
- **`sm` (640px-767px)**: Hidden sidebar, hamburger menu in header

### Key States
1. **Expanded**: Full width with labels and icons
2. **Collapsed**: Icon-only with tooltips on hover
3. **Hidden**: Mobile hamburger menu overlay

## Risk Mitigation Strategy

### Technical Risks
1. **Netlify Compatibility**: Test build and deploy after sidebar installation
2. **Bundle Size**: Monitor impact of new components on build size
3. **Performance**: Ensure sidebar state management doesn't impact load times

### User Experience Risks
1. **Breaking Changes**: Ensure existing dashboard users see no regressions
2. **Navigation Confusion**: Clear visual hierarchy for app/tool structure
3. **Mobile Usability**: Responsive behavior must be intuitive

### Mitigation Actions
- Progressive enhancement: Start with desktop, add responsive features
- Fallback strategy: Keep current layout as backup if issues arise
- Component isolation: Layouts shouldn't break existing functionality

## Quality Standards

### Code Quality
- TypeScript compliance: All new components fully typed
- Component isolation: No impact on existing page functionality
- Testing strategy: Unit tests for layouts, E2E tests for navigation

### Performance Metrics
- Build time impact: < 10% increase
- Bundle size: Monitor and optimize
- Page load speed: No degradation

### User Experience
- Seamless transition: No breaking changes for existing users
- Intuitive navigation: Clear app/tool hierarchy
- Accessibility: Proper ARIA labels and keyboard navigation

## Definition of Done

### Technical Completion
- ✅ Dual layout system operational (UtilityLayout vs AppLayout)
- ✅ Sidebar collapses to icons on smaller screens
- ✅ 2-level menu structure working: Gamma > Timetables, Analytics
- ✅ All existing functionality preserved (no regressions)
- ✅ `/dashboard` remains as opening page (no forced redirect)
- ✅ Placeholder pages created for all menu routes
- ✅ TypeScript compilation: 0 errors
- ✅ Build process: npm run build succeeds
- ✅ Netlify deployment successful with no build issues

### User Experience Validation
- ✅ Mobile responsive sidebar behavior working
- ✅ Navigation between sections functional
- ✅ State persistence across page loads
- ✅ Accessibility compliance (keyboard navigation, screen readers)

### Quality Assurance
- ✅ Unit tests for new layout components
- ✅ E2E tests for navigation flows
- ✅ Performance metrics within acceptable range
- ✅ Cross-browser compatibility verified

## Outstanding Questions

1. ~~**URL Structure**: Should we redirect `/dashboard` to `/gamma/timetables` for better hierarchy?~~ ✅ **RESOLVED**: Keep `/dashboard` as opening page, no redirect
2. **Settings Placement**: Bottom of sidebar or integrated into app hierarchy?
3. **Branding Prominence**: How prominent should "Productory Powerups" be in sidebar header?
4. **Future Expansion**: Create placeholder items for PowerPoint or keep minimal?
5. **Placeholder Content**: What specific messaging should placeholder pages show?

## Success Metrics
- No increase in page load times
- Zero regressions in existing functionality
- Improved navigation UX scores (user feedback)
- Successful responsive behavior across all devices
- Build and deployment pipeline remains stable

---

**Sprint Owner**: Jarmo Tuisk  
**Assigned to**: Claude III (Web App)  
**Dependencies**: None (self-contained sprint)  
**Next Sprint**: Feature development with new sidebar navigation foundation