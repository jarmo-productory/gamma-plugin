# Folder Organization for Gamma Presentations - Technical Audit Report

**Date**: October 2, 2025
**Agent**: Research Specialist
**Task ID**: folder-organization-audit
**Version**: 1.1 (Corrected for Sprint 21 auth patterns)

---

## Executive Summary

This audit analyzes the requirements, implementation approach, and technical considerations for implementing hierarchical folder organization for Gamma presentations in the web application's left sidebar. The current system displays a flat list of presentations with no organizational structure. This feature will enable users to create folders, organize presentations hierarchically, and manage their content more efficiently.

**Key Findings**:
- Current implementation uses a flat presentation list with no folder support
- Database schema requires minimal changes (single `folders` table + foreign key)
- Existing UI component system (shadcn/ui) provides excellent foundation
- SWR-based caching system needs folder-aware invalidation
- Real-time sync considerations for folder operations

---

## 1. Current Implementation Analysis

### 1.1 Database Schema (Presentations)

**Table**: `presentations`
```sql
CREATE TABLE presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  gamma_url VARCHAR UNIQUE NOT NULL,
  start_time VARCHAR DEFAULT '09:00',
  total_duration INTEGER DEFAULT 0,
  timetable_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes**:
- `idx_presentations_user_id` on `user_id`
- `idx_presentations_gamma_url` on `gamma_url`

**RLS Policies**: Enabled with user-scoped access via `users.auth_id = auth.uid()` pattern (Sprint 21)

### 1.2 Current UI Architecture

**Sidebar Component**: `/packages/web/src/components/layouts/AppSidebar.tsx`
- Uses shadcn/ui `Sidebar` components
- Static menu structure defined in `menuData` array
- Navigation items: Timetables, Analytics, Settings
- Current structure:
  ```typescript
  const menuData = [
    {
      title: "Gamma",
      icon: Presentation,
      items: [
        { title: "Timetables", url: "/gamma/timetables", icon: Calendar },
        { title: "Analytics", url: "/gamma/analytics", icon: BarChart3 }
      ]
    }
  ]
  ```

**Presentation List**: `/packages/web/src/app/gamma/timetables/TimetablesClient.tsx`
- Fetches presentations via SWR: `useSWR('/api/presentations/list')`
- Displays grid of presentation cards (`TimetableGrid` component)
- Operations: View, Export (CSV), Delete
- No folder context or organization

**API Endpoint**: `/packages/web/src/app/api/presentations/list/route.ts`
- Supports device token and Supabase session auth
- Returns flat list ordered by `updated_at DESC`
- Implements ETag caching with `generatePresentationsListETag()`
- Performance logging for queries >100ms

### 1.3 Tech Stack

**Frontend**:
- Next.js 15.4.6 (App Router)
- React 19.1.0
- TypeScript 5.x
- shadcn/ui components (Radix UI primitives)
- SWR 2.3.6 for data fetching
- Lucide React for icons

**Backend**:
- Next.js API routes (Node.js runtime)
- Supabase (PostgreSQL 15+)
- Row Level Security (RLS) enabled

**State Management**:
- SWR for server state
- React hooks for local state
- No global state management (Redux/Zustand)

---

## 2. Research: Folder Organization Patterns

### 2.1 Best Practice Analysis

**Reference Applications Studied**:
1. **Google Drive** - Nested folders with breadcrumbs, drag-and-drop
2. **Notion** - Hierarchical pages with indentation, emoji icons
3. **VS Code** - Tree view with expand/collapse, file operations
4. **Dropbox** - Folder tree with keyboard navigation

### 2.2 Common UX Patterns

**Folder Display**:
- ✅ Tree structure with indentation (2-4 levels recommended max)
- ✅ Expand/collapse icons (ChevronRight/ChevronDown)
- ✅ Folder icons differentiate from files
- ✅ Drag-and-drop for reorganization
- ✅ Right-click context menus
- ✅ Inline rename capability

**Folder Operations**:
- Create new folder (button + keyboard shortcut)
- Rename folder (double-click or F2)
- Delete folder (confirm dialog if contains items)
- Move folder (drag-and-drop or cut/paste)
- Bulk move presentations (multi-select)

**Navigation**:
- Breadcrumb trail for current location
- "All Presentations" root view
- Collapse/expand all folders
- Search across all folders
- Recent items quick access

### 2.3 Recommended Approach

**Hierarchical Folders** (vs Tags):
- ✅ Intuitive mental model (file system familiarity)
- ✅ Clear parent-child relationships
- ✅ Easier to implement with PostgreSQL recursive queries
- ⚠️ Single parent limitation (vs many-to-many tags)
- ⚠️ Requires move operations vs multi-tag assignments

**Rationale**: Given the education/presentation context, users expect folder-like organization. Tags could be added later as complementary feature.

---

## 3. Database Design

### 3.1 Folders Table Schema

```sql
-- Folders table for hierarchical organization
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  parent_folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0, -- For manual ordering within parent
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT folder_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT no_self_parent CHECK (id != parent_folder_id)
);

-- Indexes for performance
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_folders_parent_id ON folders(parent_folder_id);
CREATE INDEX idx_folders_user_parent ON folders(user_id, parent_folder_id);

-- Composite index for tree queries
CREATE INDEX idx_folders_tree ON folders(user_id, parent_folder_id, position);

-- Enable RLS
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Sprint 21 pattern: users.auth_id → auth.uid())
CREATE POLICY "Users can view own folders" ON folders
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can create own folders" ON folders
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can update own folders" ON folders
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can delete own folders" ON folders
  FOR DELETE USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );
```

### 3.2 Presentations Table Modification

```sql
-- Add folder reference to presentations
ALTER TABLE presentations
ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

-- Index for folder queries (corrected: on presentations table)
CREATE INDEX idx_presentations_folder_id ON presentations(folder_id);

-- Composite index for user folder queries
CREATE INDEX idx_presentations_user_folder ON presentations(user_id, folder_id);

-- Update existing performance index to include folder_id
DROP INDEX IF EXISTS idx_presentations_user_updated;
CREATE INDEX idx_presentations_user_folder_updated
ON presentations(user_id, folder_id, updated_at DESC);
```

**Design Notes**:
- `folder_id` is nullable (presentations can exist outside folders)
- `ON DELETE SET NULL`: When folder deleted, presentations move to root
- Alternative: `ON DELETE CASCADE` (delete presentations with folder) - NOT RECOMMENDED
- `ON DELETE RESTRICT` (prevent folder deletion if contains items) - OPTIONAL

**Important Corrections (v1.1)**:
- ✅ RLS policies use Sprint 21 pattern: `user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())`
- ✅ Index `idx_presentations_folder_id` correctly targets `presentations` table (not `folders`)
- ✅ Cycle-prevention trigger walks upward from `NEW.parent_folder_id` to detect loops

### 3.3 Helper Functions

```sql
-- Get folder path (breadcrumb trail)
CREATE OR REPLACE FUNCTION get_folder_path(folder_uuid UUID)
RETURNS TABLE(id UUID, name VARCHAR, depth INTEGER) AS $$
  WITH RECURSIVE folder_tree AS (
    -- Base case: start with the given folder
    SELECT
      f.id,
      f.name,
      f.parent_folder_id,
      1 as depth
    FROM folders f
    WHERE f.id = folder_uuid

    UNION ALL

    -- Recursive case: get parent folders
    SELECT
      f.id,
      f.name,
      f.parent_folder_id,
      ft.depth + 1
    FROM folders f
    INNER JOIN folder_tree ft ON f.id = ft.parent_folder_id
  )
  SELECT id, name, depth
  FROM folder_tree
  ORDER BY depth DESC;
$$ LANGUAGE SQL STABLE;

-- Prevent circular references (trigger)
CREATE OR REPLACE FUNCTION prevent_folder_cycles()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if new parent creates cycle
  -- Walk upward from NEW.parent_folder_id to detect if we reach NEW.id
  IF NEW.parent_folder_id IS NOT NULL THEN
    IF EXISTS (
      WITH RECURSIVE parents AS (
        -- Start from the proposed parent
        SELECT parent_folder_id FROM folders WHERE id = NEW.parent_folder_id
        UNION ALL
        -- Walk upward through ancestors
        SELECT f.parent_folder_id
        FROM folders f
        INNER JOIN parents p ON f.id = p.parent_folder_id
      )
      -- If we encounter NEW.id in the ancestor chain, it's a cycle
      SELECT 1 FROM parents WHERE parent_folder_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Circular folder reference detected';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_folder_cycles
  BEFORE INSERT OR UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION prevent_folder_cycles();

-- Get presentation count in folder (including subfolders)
CREATE OR REPLACE FUNCTION get_folder_presentation_count(folder_uuid UUID)
RETURNS INTEGER AS $$
  WITH RECURSIVE folder_tree AS (
    SELECT id FROM folders WHERE id = folder_uuid
    UNION ALL
    SELECT f.id FROM folders f
    INNER JOIN folder_tree ft ON f.parent_folder_id = ft.id
  )
  SELECT COUNT(*)::INTEGER
  FROM presentations p
  WHERE p.folder_id IN (SELECT id FROM folder_tree);
$$ LANGUAGE SQL STABLE;
```

### 3.4 Migration Strategy

**Phase 1**: Add folders table and relationships
```bash
supabase migration new add_folders_table
```

**Phase 2**: Create helper functions
```bash
supabase migration new folder_helper_functions
```

**Phase 3**: Update presentation indexes
```bash
supabase migration new optimize_folder_indexes
```

**Deployment**:
```bash
# Test locally first
supabase db reset
npm run test:api

# Deploy to remote
supabase db push --linked --include-all
```

---

## 4. API Requirements

### 4.1 Folder CRUD Endpoints

**GET** `/api/folders/list`
```typescript
// Response
{
  success: true,
  folders: [
    {
      id: "uuid",
      name: "Spring 2024",
      parentFolderId: null,
      position: 0,
      itemCount: 5, // presentations in folder
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z"
    }
  ]
}
```

**POST** `/api/folders/create`
```typescript
// Request
{
  name: "New Folder",
  parentFolderId: "uuid" | null
}

// Response
{
  success: true,
  folder: { id: "uuid", name: "New Folder", ... }
}
```

**PATCH** `/api/folders/[id]`
```typescript
// Request (rename)
{
  name: "Updated Name"
}

// Request (move)
{
  parentFolderId: "uuid" | null,
  position: 1
}

// Response
{
  success: true,
  folder: { id: "uuid", ... }
}
```

**DELETE** `/api/folders/[id]`
```typescript
// Response
{
  success: true,
  movedPresentations: 3 // presentations moved to root
}
```

### 4.2 Presentation Operations

**PATCH** `/api/presentations/[id]/move`
```typescript
// Request
{
  folderId: "uuid" | null // null = move to root
}

// Response
{
  success: true,
  presentation: { id: "uuid", folderId: "uuid", ... }
}
```

**POST** `/api/presentations/bulk-move`
```typescript
// Request
{
  presentationIds: ["uuid1", "uuid2"],
  folderId: "uuid" | null
}

// Response
{
  success: true,
  movedCount: 2
}
```

### 4.3 Optimized List Endpoint

**Modify** `/api/presentations/list`
```typescript
// Add folder filter query param
GET /api/presentations/list?folderId=uuid

// Response includes folder info
{
  success: true,
  presentations: [...],
  currentFolder: {
    id: "uuid",
    name: "Spring 2024",
    path: [ // breadcrumb trail
      { id: "root", name: "All Presentations" },
      { id: "uuid1", name: "2024" },
      { id: "uuid", name: "Spring 2024" }
    ]
  }
}
```

### 4.4 Real-time Sync Considerations

**SWR Cache Keys**:
```typescript
// Current
cacheKeys.presentations.list() // "/api/presentations/list"

// Updated
cacheKeys.presentations.list(folderId?: string)
  // "/api/presentations/list" or "/api/presentations/list?folderId=uuid"

cacheKeys.folders.list() // "/api/folders/list"
cacheKeys.folders.tree() // "/api/folders/tree"
```

**Cache Invalidation Strategy**:
```typescript
// When folder created/renamed/deleted
mutate(cacheKeys.folders.list())

// When presentation moved
mutate(cacheKeys.presentations.list(oldFolderId))
mutate(cacheKeys.presentations.list(newFolderId))
mutate(cacheKeys.folders.list()) // update counts

// Optimistic updates for instant UI feedback
```

---

## 5. UI/UX Requirements

### 5.1 Sidebar Folder Tree

**Component Structure**:
```
AppSidebar
  └─ SidebarGroup (Gamma)
       ├─ SidebarMenu
       │    ├─ SidebarMenuItem (All Presentations)
       │    └─ FolderTreeView
       │         ├─ FolderItem (recursive)
       │         │    ├─ ChevronIcon (expand/collapse)
       │         │    ├─ FolderIcon
       │         │    ├─ FolderName
       │         │    └─ ItemCount badge
       │         └─ SubFolders (recursive)
       └─ CreateFolderButton
```

**shadcn/ui Components**:
- `SidebarMenu`, `SidebarMenuItem` - base structure
- `SidebarMenuButton` - clickable items with active state
- `SidebarMenuSub`, `SidebarMenuSubItem` - nested items
- `DropdownMenu` - right-click context menu
- `Dialog` - create/rename folder modals
- `AlertDialog` - delete confirmation

### 5.2 Folder Tree Component Design

```typescript
// /packages/web/src/components/folders/FolderTreeView.tsx
interface FolderTreeViewProps {
  folders: Folder[]
  currentFolderId?: string
  onFolderClick: (folderId: string) => void
  onFolderCreate: (name: string, parentId?: string) => void
  onFolderRename: (folderId: string, newName: string) => void
  onFolderDelete: (folderId: string) => void
  onPresentationDrop: (presentationId: string, targetFolderId: string) => void
}

interface Folder {
  id: string
  name: string
  parentFolderId: string | null
  position: number
  itemCount: number
  children?: Folder[] // populated recursively
  expanded?: boolean // UI state
}
```

### 5.3 Drag-and-Drop Implementation

**Library**: `@dnd-kit/core` (recommended over react-dnd)
- Better TypeScript support
- Smaller bundle size
- Accessibility built-in

**Drop Targets**:
1. Folder items in tree (drop presentation into folder)
2. Root "All Presentations" (remove from folder)
3. Empty folder area (create new folder + move)

**Drag Sources**:
1. Presentation cards from grid
2. Folders (for folder reorganization)

**Visual Feedback**:
- Semi-transparent drag preview
- Drop zone highlighting
- Forbidden cursor for invalid drops

### 5.4 Context Menu Operations

**Right-click on Folder**:
- Create subfolder
- Rename folder
- Delete folder (with confirmation)
- Move folder
- Expand all / Collapse all

**Right-click on Presentation** (in grid):
- Move to folder (submenu with folder tree)
- Open
- Export
- Delete

### 5.5 Keyboard Navigation

**Shortcuts**:
- `Ctrl/Cmd + N` - New folder
- `F2` - Rename selected folder
- `Delete` - Delete selected folder
- `Arrow Up/Down` - Navigate folders
- `Arrow Right` - Expand folder
- `Arrow Left` - Collapse folder
- `Ctrl/Cmd + X/C/V` - Cut/Copy/Paste presentations

### 5.6 Mobile Considerations

**Responsive Design**:
- Sidebar becomes sheet/drawer on mobile (already implemented)
- Touch-friendly tap targets (48px minimum)
- Long-press for context menu
- Simplified drag-and-drop (move button instead)
- Breadcrumb navigation more critical

---

## 6. Technical Implementation Plan

### 6.1 Phase 1: Database Foundation (Sprint 1)

**Tasks**:
1. Create `folders` table migration
2. Add `folder_id` to presentations table
3. Implement helper functions (path, count)
4. Add circular reference prevention trigger
5. Create performance indexes
6. Test with sample data

**Estimated Effort**: 4-6 hours

**Validation**:
```sql
-- Test queries
SELECT * FROM get_folder_path('folder-uuid');
SELECT get_folder_presentation_count('folder-uuid');

-- Test circular reference prevention
INSERT INTO folders (user_id, name, parent_folder_id)
VALUES ('user-uuid', 'Test', 'same-uuid'); -- Should fail
```

### 6.2 Phase 2: API Endpoints (Sprint 1-2)

**Tasks**:
1. `GET /api/folders/list` - List all user folders
2. `POST /api/folders/create` - Create folder
3. `PATCH /api/folders/[id]` - Rename/move folder
4. `DELETE /api/folders/[id]` - Delete folder
5. `PATCH /api/presentations/[id]/move` - Move presentation
6. `POST /api/presentations/bulk-move` - Bulk move
7. Update `/api/presentations/list` with folder filtering

**Estimated Effort**: 8-12 hours

**Testing**:
```bash
# Unit tests
npm run test -- --testPathPattern=folders

# Integration tests
npm run test:e2e -- --grep "folder operations"
```

### 6.3 Phase 3: UI Components (Sprint 2-3)

**Tasks**:
1. `FolderTreeView` component (recursive tree)
2. `FolderItem` component (single folder with actions)
3. `CreateFolderDialog` modal
4. `RenameFolderDialog` modal
5. `DeleteFolderDialog` confirmation
6. `MoveToFolderMenu` dropdown
7. Integrate into `AppSidebar`
8. Update `TimetablesClient` for folder filtering

**Estimated Effort**: 12-16 hours

**Components Structure**:
```
/packages/web/src/components/folders/
  ├─ FolderTreeView.tsx       # Main tree component
  ├─ FolderItem.tsx           # Single folder row
  ├─ CreateFolderDialog.tsx   # Create modal
  ├─ RenameFolderDialog.tsx   # Rename modal
  ├─ DeleteFolderDialog.tsx   # Delete confirmation
  ├─ MoveToFolderMenu.tsx     # Folder picker dropdown
  └─ types.ts                 # TypeScript interfaces
```

### 6.4 Phase 4: Drag-and-Drop (Sprint 3)

**Tasks**:
1. Install `@dnd-kit/core` package
2. Implement drag context provider
3. Add draggable to presentation cards
4. Add droppable to folder items
5. Visual feedback for drag operations
6. Optimistic updates during drag
7. Error handling for failed drops

**Estimated Effort**: 6-8 hours

### 6.5 Phase 5: Polish & Optimization (Sprint 4)

**Tasks**:
1. Keyboard navigation
2. Context menu integration
3. Mobile touch improvements
4. Performance optimization (virtualization if >100 folders)
5. Empty states (no folders, no presentations)
6. Loading skeletons
7. Error boundaries
8. Accessibility audit (ARIA labels, screen reader)

**Estimated Effort**: 6-10 hours

---

## 7. Risk Assessment & Considerations

### 7.1 Technical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Recursive query performance** | Medium | Index on `parent_folder_id`, limit depth to 5 levels |
| **Race conditions in SWR cache** | Medium | Use `mutate()` with optimistic updates, atomic operations |
| **Circular folder references** | High | Database trigger prevents cycles, UI validation |
| **Drag-and-drop browser compatibility** | Low | `@dnd-kit` handles cross-browser, fallback to buttons |
| **Deep nesting UI overflow** | Low | Limit depth to 3-5 levels, horizontal scroll if needed |

### 7.2 UX Considerations

**Folder Depth**:
- Recommend 3 levels maximum for usability
- Show warning after 3 levels: "Too many nested folders may be hard to navigate"

**Default Folder Structure**:
- Don't auto-create folders for new users (keep it simple)
- Provide templates (optional): "Academic", "Business", "Personal"

**Search Behavior**:
- Search across all folders by default
- Add filter: "Search in current folder only"

**Bulk Operations**:
- Multi-select presentations (Shift+Click, Ctrl+Click)
- Bulk move to folder
- Progress indicator for operations >10 items

### 7.3 Performance Considerations

**Optimization Targets**:
- Folder tree render: <100ms
- Folder creation: <200ms
- Presentation move: <300ms
- Tree expansion: <50ms

**Optimization Strategies**:
1. **Virtual scrolling**: Use `react-virtuoso` if >100 folders
2. **Lazy loading**: Load folder contents on expand
3. **Debounce search**: 300ms delay
4. **Memoization**: React.memo for FolderItem
5. **Database**: Partial indexes for active folders

**Monitoring**:
```typescript
// Add performance tracking
const { trackRender } = usePerformanceTracker('FolderTreeView')
trackRender('tree-rendered', { folderCount: folders.length })
```

### 7.4 Data Migration

**Existing Presentations**:
- All existing presentations have `folder_id = NULL` (root)
- No migration needed for current data
- Users can organize at their own pace

**Folder Import/Export**:
- Future enhancement: Import folder structure from CSV/JSON
- Export includes folder hierarchy

---

## 8. Alternative Approaches Considered

### 8.1 Tag-based Organization (Rejected)

**Pros**:
- Many-to-many relationships (presentation in multiple "categories")
- Flexible filtering
- No depth limitations

**Cons**:
- More complex UI (tag manager, multi-select)
- No clear hierarchy
- Harder to migrate existing mental models

**Decision**: Implement folders first, add tags as complementary feature later

### 8.2 Materialized Path (Rejected)

**Schema**:
```sql
ALTER TABLE folders ADD COLUMN path TEXT; -- e.g., "root.uuid1.uuid2"
```

**Pros**:
- Faster path queries (no recursive CTE)
- Simple to query all descendants

**Cons**:
- Path updates cascade to all children (expensive)
- Path length limits (PostgreSQL text limit)
- More complex to maintain

**Decision**: Use recursive queries with proper indexing

### 8.3 Closure Table (Overkill)

**Schema**:
```sql
CREATE TABLE folder_closure (
  ancestor_id UUID,
  descendant_id UUID,
  depth INTEGER
);
```

**Pros**:
- Very fast ancestor/descendant queries
- No recursion needed

**Cons**:
- More storage (O(n²) for worst case)
- Complex insert/update logic
- Overkill for typical use case (<100 folders)

**Decision**: Not needed for current scale

---

## 9. Success Metrics

### 9.1 User Adoption

- **Week 1**: 20% of users create at least one folder
- **Month 1**: 50% of users organize presentations into folders
- **Month 3**: Average 3-5 folders per active user

### 9.2 Performance

- Folder tree renders in <100ms (p95)
- Folder operations complete in <300ms (p95)
- Zero data loss incidents
- <1% error rate on folder operations

### 9.3 User Satisfaction

- Collect feedback via in-app survey after 2 weeks
- Target: 4.5/5 satisfaction rating
- Monitor support tickets for folder-related issues

---

## 10. Future Enhancements

**Post-MVP Features**:
1. **Folder Sharing**: Share folder with other users (requires permissions system)
2. **Smart Folders**: Auto-organize by date, topic, or tags
3. **Folder Templates**: Pre-built structures for common use cases
4. **Folder Colors/Icons**: Visual customization
5. **Archive Folders**: Hide old presentations without deleting
6. **Folder Statistics**: Time spent, most viewed, etc.
7. **Quick Actions**: Recently accessed folders
8. **Folder Sync**: Sync with Google Drive/Dropbox structure

---

## 11. Recommended Implementation Roadmap

### Sprint 1 (Week 1): Database + API Foundation
- Database schema (folders table, presentations FK)
- Helper functions and triggers
- Core API endpoints (CRUD folders)
- Unit tests for database layer

### Sprint 2 (Week 2): Basic UI
- FolderTreeView component
- Create/Rename/Delete dialogs
- Sidebar integration
- SWR caching for folders

### Sprint 3 (Week 3): Interactions
- Drag-and-drop support
- Move presentation to folder
- Bulk operations
- Context menus

### Sprint 4 (Week 4): Polish
- Keyboard navigation
- Mobile optimizations
- Performance tuning
- Accessibility audit
- User testing

**Total Estimated Effort**: 36-52 hours (4-6 weeks with testing/reviews)

---

## 12. Technical Dependencies

**New Packages**:
```json
{
  "@dnd-kit/core": "^6.1.0",
  "@dnd-kit/sortable": "^8.0.0",
  "@dnd-kit/utilities": "^3.2.2"
}
```

**No Breaking Changes**:
- Backward compatible (existing presentations work without folders)
- Incremental rollout possible
- Can be feature-flagged for gradual rollout

---

## 13. Appendix

### A. SQL Schema Reference

See Section 3 for complete SQL schemas.

### B. API Contract Examples

See Section 4 for complete API specifications.

### C. Component Mockups

**Sidebar with Folders**:
```
┌─────────────────────────┐
│ Productory Powerups     │
├─────────────────────────┤
│ Gamma                   │
│   📁 All Presentations  │
│   📁 Spring 2024     (5)│
│     └─ Week 1        (3)│
│     └─ Week 2        (2)│
│   📁 Fall 2024       (8)│
│   + New Folder          │
│                         │
│   📊 Analytics          │
└─────────────────────────┘
```

### D. Related Documentation

- Database migrations: `/supabase/migrations/`
- API routes: `/packages/web/src/app/api/`
- UI components: `/packages/web/src/components/`
- Sprint planning: `/documents/roadmap/`

---

## Conclusion

Implementing folder organization for Gamma presentations is a high-value feature with moderate implementation complexity. The proposed solution leverages existing database capabilities (PostgreSQL recursive queries), modern React patterns (SWR caching), and shadcn/ui components for a consistent user experience.

**Key Success Factors**:
1. Start with MVP (basic folder CRUD + sidebar tree)
2. Incremental rollout with feature flags
3. Performance monitoring from day one
4. User feedback loop for iterations

**Next Steps**:
1. Review and approve this audit
2. Create detailed sprint plan
3. Begin Phase 1 database implementation
4. Coordinate with planner for task breakdown

---

**Generated by**: Research Agent
**Coordination Hook**: `swarm/research/folder-audit`
**Status**: Complete ✅
