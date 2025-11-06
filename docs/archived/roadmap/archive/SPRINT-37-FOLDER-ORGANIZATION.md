# Sprint 37: Folder Organization for Gamma Presentations

**Sprint Timeline**: 4-6 weeks (October 2 - November 8, 2025)
**Complexity**: High
**Priority**: High
**Status**: Planning Complete - Ready for Execution

---

## Executive Summary

Implement hierarchical folder organization for Gamma presentations in the web application's sidebar, enabling users to create folders, organize presentations, and manage their content efficiently. This feature transforms the current flat list into a structured, navigable tree view with drag-and-drop support.

**Key Objectives**:
- Enable folder creation, renaming, moving, and deletion
- Support drag-and-drop presentation organization
- Maintain real-time sync with SWR caching
- Ensure mobile-responsive design
- Achieve <300ms operation response times

**Dependencies**:
- Sprint 36 complete (duration suggestion feature)
- Supabase database with Sprint 21 auth pattern
- Next.js 15, React 19, shadcn/ui components
- SWR 2.3.6 for caching

---

## Architecture Overview

### Database Schema
```
folders table:
- id (UUID, PK)
- user_id (UUID, FK to users)
- name (VARCHAR)
- parent_folder_id (UUID, FK to folders, nullable)
- position (INTEGER)
- created_at, updated_at

presentations table:
- Add: folder_id (UUID, FK to folders, nullable, ON DELETE SET NULL)
```

### API Endpoints
```
GET    /api/folders/list
POST   /api/folders/create
PATCH  /api/folders/[id]
DELETE /api/folders/[id]
PATCH  /api/presentations/[id]/move
POST   /api/presentations/bulk-move
GET    /api/presentations/list?folderId=uuid  (modified)
```

### UI Components
```
components/folders/
├── FolderTreeView.tsx       # Recursive tree component
├── FolderItem.tsx           # Single folder row
├── CreateFolderDialog.tsx   # Create modal
├── RenameFolderDialog.tsx   # Rename modal
├── DeleteFolderDialog.tsx   # Delete confirmation
├── MoveToFolderMenu.tsx     # Folder picker
└── types.ts                 # TypeScript interfaces
```

---

## Phase 1: Database Foundation

**Duration**: 1-2 days (agentic execution: 2-4 hours)
**Risk Level**: Medium (database migrations require careful testing)
**Agent**: `backend-dev`, `code-analyzer`

### Tasks

#### Task 1.1: Create Folders Table Migration
**Priority**: Critical
**Estimated Time**: 30 minutes
**Dependencies**: None

**Acceptance Criteria**:
- Migration file created: `20251002000001_add_folders_table.sql`
- Table includes all required columns with constraints
- RLS policies use Sprint 21 pattern: `user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())`
- Indexes created for performance:
  - `idx_folders_user_id`
  - `idx_folders_parent_id`
  - `idx_folders_user_parent`
  - `idx_folders_tree` (composite: user_id, parent_folder_id, position)

**Implementation**:
```sql
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  parent_folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT folder_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT no_self_parent CHECK (id != parent_folder_id)
);

-- Indexes
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_folders_parent_id ON folders(parent_folder_id);
CREATE INDEX idx_folders_user_parent ON folders(user_id, parent_folder_id);
CREATE INDEX idx_folders_tree ON folders(user_id, parent_folder_id, position);

-- RLS
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

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

**Testing**:
```bash
# Create migration
supabase migration new add_folders_table

# Test locally
supabase db reset
psql -h localhost -U postgres -d postgres -c "SELECT * FROM folders;"
```

**Rollback Plan**:
```sql
DROP TABLE IF EXISTS folders CASCADE;
```

---

#### Task 1.2: Add folder_id to Presentations
**Priority**: Critical
**Estimated Time**: 15 minutes
**Dependencies**: Task 1.1

**Acceptance Criteria**:
- `folder_id` column added to presentations table
- Foreign key constraint with `ON DELETE SET NULL`
- Indexes created for folder queries
- Existing presentations unaffected (folder_id defaults to NULL)

**Implementation**:
```sql
-- Add folder reference
ALTER TABLE presentations
ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

-- Index for folder queries
CREATE INDEX idx_presentations_folder_id ON presentations(folder_id);

-- Composite index for user+folder queries
CREATE INDEX idx_presentations_user_folder ON presentations(user_id, folder_id);

-- Update existing performance index
DROP INDEX IF EXISTS idx_presentations_user_updated;
CREATE INDEX idx_presentations_user_folder_updated
ON presentations(user_id, folder_id, updated_at DESC);
```

**Testing**:
```sql
-- Verify column added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'presentations' AND column_name = 'folder_id';

-- Test cascade behavior
INSERT INTO folders (user_id, name) VALUES (...) RETURNING id;
UPDATE presentations SET folder_id = '...' WHERE id = '...';
DELETE FROM folders WHERE id = '...';
SELECT folder_id FROM presentations WHERE id = '...'; -- Should be NULL
```

---

#### Task 1.3: Create Helper Functions
**Priority**: High
**Estimated Time**: 45 minutes
**Dependencies**: Task 1.1

**Acceptance Criteria**:
- `get_folder_path()` returns breadcrumb trail
- `get_folder_presentation_count()` returns count including subfolders
- Functions handle edge cases (NULL parent, circular refs)

**Implementation**:
```sql
-- Get folder path (breadcrumb trail)
CREATE OR REPLACE FUNCTION get_folder_path(folder_uuid UUID)
RETURNS TABLE(id UUID, name VARCHAR, depth INTEGER) AS $$
  WITH RECURSIVE folder_tree AS (
    SELECT
      f.id,
      f.name,
      f.parent_folder_id,
      1 as depth
    FROM folders f
    WHERE f.id = folder_uuid

    UNION ALL

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

-- Get presentation count (including subfolders)
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

**Testing**:
```sql
-- Test folder path
SELECT * FROM get_folder_path('test-folder-uuid');

-- Test presentation count
SELECT get_folder_presentation_count('test-folder-uuid');
```

---

#### Task 1.4: Circular Reference Prevention Trigger
**Priority**: Critical
**Estimated Time**: 30 minutes
**Dependencies**: Task 1.1

**Acceptance Criteria**:
- Trigger prevents circular folder references
- Error message is clear and user-friendly
- Performance impact minimal (<10ms overhead)

**Implementation**:
```sql
CREATE OR REPLACE FUNCTION prevent_folder_cycles()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_folder_id IS NOT NULL THEN
    IF EXISTS (
      WITH RECURSIVE parents AS (
        SELECT parent_folder_id FROM folders WHERE id = NEW.parent_folder_id
        UNION ALL
        SELECT f.parent_folder_id
        FROM folders f
        INNER JOIN parents p ON f.id = p.parent_folder_id
      )
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
```

**Testing**:
```sql
-- Should succeed
INSERT INTO folders (user_id, name, parent_folder_id)
VALUES ('user-uuid', 'Parent', NULL) RETURNING id;

INSERT INTO folders (user_id, name, parent_folder_id)
VALUES ('user-uuid', 'Child', 'parent-uuid') RETURNING id;

-- Should fail with error
UPDATE folders SET parent_folder_id = 'child-uuid' WHERE id = 'parent-uuid';
```

---

#### Task 1.5: Deploy Database Migration
**Priority**: Critical
**Estimated Time**: 15 minutes
**Dependencies**: Tasks 1.1-1.4

**Acceptance Criteria**:
- Migration deployed to remote database successfully
- `supabase migration list` shows Local|Remote sync
- Supabase Dashboard visual confirmation shows tables/indexes
- No breaking changes to existing presentations

**Deployment Process**:
```bash
# Step 1: Verify migration files locally
ls -la supabase/migrations/20251002*

# Step 2: Test local deployment
supabase db reset
supabase migration list

# Step 3: Deploy to remote (PRODUCTION)
supabase db push --linked --include-all

# Step 4: Validate deployment
supabase migration list
# Local and Remote columns should match

# Step 5: Visual confirmation in Supabase Dashboard
# - Check folders table exists
# - Check indexes created
# - Check RLS policies active
```

**Validation**:
```bash
# Test on remote database
psql -h [supabase-host] -U postgres -d postgres

# Check table structure
\d folders
\d presentations

# Check indexes
\di idx_folders_*
\di idx_presentations_folder*

# Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'folders';
```

**Rollback Plan**:
```bash
# If deployment fails, repair and redeploy
supabase migration repair --status reverted [migration_id]
supabase db push --linked --include-all
```

---

#### Task 1.6: Database Validation Tests
**Priority**: High
**Estimated Time**: 30 minutes
**Dependencies**: Task 1.5

**Acceptance Criteria**:
- Unit tests for helper functions pass
- Integration tests for RLS policies pass
- Performance tests validate query speed (<50ms)

**Test File**: `tests/database/folders.test.sql`
```sql
-- Test 1: Folder creation with RLS
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "test-auth-id"}';

INSERT INTO folders (user_id, name)
VALUES ((SELECT id FROM users WHERE auth_id = 'test-auth-id'), 'Test Folder');

SELECT COUNT(*) FROM folders WHERE name = 'Test Folder'; -- Should be 1
ROLLBACK;

-- Test 2: Circular reference prevention
BEGIN;
INSERT INTO folders (user_id, name) VALUES (...) RETURNING id as parent_id;
INSERT INTO folders (user_id, name, parent_folder_id) VALUES (..., parent_id) RETURNING id as child_id;
-- This should raise exception:
UPDATE folders SET parent_folder_id = child_id WHERE id = parent_id;
ROLLBACK;

-- Test 3: Presentation count function
BEGIN;
INSERT INTO folders (user_id, name) VALUES (...) RETURNING id as folder_id;
INSERT INTO presentations (user_id, folder_id, ...) VALUES (..., folder_id, ...);
SELECT get_folder_presentation_count(folder_id); -- Should be 1
ROLLBACK;
```

---

### Phase 1 Success Criteria

- All 5 migration files created and deployed
- Supabase Dashboard shows tables, indexes, policies
- Helper functions return correct results
- Circular reference trigger prevents cycles
- Zero breaking changes to existing presentations
- All database tests pass
- Query performance <50ms for typical operations

### Phase 1 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Migration conflicts with existing schema | Test with `supabase db reset` locally first |
| RLS policies block legitimate access | Use Sprint 21 auth pattern consistently |
| Circular reference trigger too slow | Index parent_folder_id, limit recursion depth |
| Cascade deletes remove wrong data | Use ON DELETE SET NULL for presentations.folder_id |

---

## Phase 2: API Endpoints

**Duration**: 2-3 days (agentic execution: 4-6 hours)
**Risk Level**: Medium (authentication, caching complexity)
**Agent**: `backend-dev`, `coder`, `tester`

### Tasks

#### Task 2.1: GET /api/folders/list
**Priority**: Critical
**Estimated Time**: 45 minutes
**Dependencies**: Phase 1 complete

**Acceptance Criteria**:
- Returns hierarchical folder list for authenticated user
- Includes presentation count per folder
- Supports ETag caching
- Response time <100ms (p95)

**API Contract**:
```typescript
// Request
GET /api/folders/list
Authorization: Bearer [token] OR Cookie: [session]

// Response (200 OK)
{
  "success": true,
  "folders": [
    {
      "id": "uuid",
      "name": "Spring 2024",
      "parentFolderId": null,
      "position": 0,
      "itemCount": 5,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "count": 1
}

// Response (401 Unauthorized)
{
  "error": "Authentication required"
}
```

**Implementation**: `/packages/web/src/app/api/folders/list/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getDatabaseUserId, createAuthenticatedSupabaseClient } from '@/utils/auth-helpers';
import { createClient } from '@/utils/supabase/server';
import { withCors, handleOPTIONS } from '@/utils/cors';
import { generateETag, handleConditionalRequest, addCacheHeaders } from '@/utils/cache-helpers';

export const runtime = 'nodejs';

export async function OPTIONS(request: NextRequest) {
  return handleOPTIONS(request);
}

export async function GET(request: NextRequest) {
  try {
    const startedAt = Date.now();

    // Authenticate
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return withCors(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
        request
      );
    }

    const dbUserId = await getDatabaseUserId(authUser);
    if (!dbUserId) {
      return withCors(
        NextResponse.json({ error: 'User not found' }, { status: 404 }),
        request
      );
    }

    const supabase = authUser.source === 'device-token'
      ? await createClient()
      : await createAuthenticatedSupabaseClient(authUser);

    // Query folders with presentation count
    const { data: folders, error } = await supabase
      .from('folders')
      .select('id, name, parent_folder_id, position, created_at, updated_at')
      .order('position', { ascending: true });

    if (error) {
      console.error('[Folders List] Error:', error);
      return withCors(
        NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 }),
        request
      );
    }

    // Get presentation counts for each folder
    const foldersWithCounts = await Promise.all(
      (folders || []).map(async (folder) => {
        const { data: count } = await supabase.rpc('get_folder_presentation_count', {
          folder_uuid: folder.id
        });

        return {
          id: folder.id,
          name: folder.name,
          parentFolderId: folder.parent_folder_id,
          position: folder.position,
          itemCount: count || 0,
          createdAt: folder.created_at,
          updatedAt: folder.updated_at
        };
      })
    );

    const durationMs = Date.now() - startedAt;
    console.log(`[perf][folders:list] duration=${durationMs}ms count=${foldersWithCounts.length}`);

    const responseData = {
      success: true,
      folders: foldersWithCounts,
      count: foldersWithCounts.length
    };

    // ETag caching
    const etag = generateETag(foldersWithCounts);
    const conditionalResponse = handleConditionalRequest(request, etag);
    if (conditionalResponse) {
      return withCors(conditionalResponse, request);
    }

    const response = NextResponse.json(responseData);
    return withCors(
      addCacheHeaders(response, etag, { maxAge: 60, staleWhileRevalidate: 120, private: true }),
      request
    );
  } catch (error) {
    console.error('[Folders List] Unexpected error:', error);
    return withCors(
      NextResponse.json({ error: 'Internal server error' }, { status: 500 }),
      request
    );
  }
}
```

**Testing**:
```bash
# Unit test
curl -H "Authorization: Bearer [token]" http://localhost:3000/api/folders/list

# Integration test
npm run test:api -- --testPathPattern=folders/list
```

---

#### Task 2.2: POST /api/folders/create
**Priority**: Critical
**Estimated Time**: 45 minutes
**Dependencies**: Task 2.1

**Acceptance Criteria**:
- Creates folder with name and optional parent
- Validates name not empty
- Returns created folder with generated ID
- Invalidates SWR cache

**API Contract**:
```typescript
// Request
POST /api/folders/create
Content-Type: application/json
{
  "name": "New Folder",
  "parentFolderId": "uuid" | null
}

// Response (201 Created)
{
  "success": true,
  "folder": {
    "id": "uuid",
    "name": "New Folder",
    "parentFolderId": null,
    "position": 0,
    "itemCount": 0,
    "createdAt": "2025-10-02T...",
    "updatedAt": "2025-10-02T..."
  }
}

// Response (400 Bad Request)
{
  "error": "Folder name is required"
}
```

**Implementation**: `/packages/web/src/app/api/folders/create/route.ts`
```typescript
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return withCors(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
        request
      );
    }

    const dbUserId = await getDatabaseUserId(authUser);
    const body = await request.json();
    const { name, parentFolderId } = body;

    // Validation
    if (!name || name.trim().length === 0) {
      return withCors(
        NextResponse.json({ error: 'Folder name is required' }, { status: 400 }),
        request
      );
    }

    const supabase = authUser.source === 'device-token'
      ? await createClient()
      : await createAuthenticatedSupabaseClient(authUser);

    // Get next position
    const { data: existingFolders } = await supabase
      .from('folders')
      .select('position')
      .eq('parent_folder_id', parentFolderId)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = existingFolders && existingFolders.length > 0
      ? existingFolders[0].position + 1
      : 0;

    // Insert folder
    const { data: folder, error } = await supabase
      .from('folders')
      .insert({
        user_id: dbUserId,
        name: name.trim(),
        parent_folder_id: parentFolderId,
        position: nextPosition
      })
      .select()
      .single();

    if (error) {
      console.error('[Folders Create] Error:', error);
      return withCors(
        NextResponse.json({ error: 'Failed to create folder' }, { status: 500 }),
        request
      );
    }

    const responseData = {
      success: true,
      folder: {
        id: folder.id,
        name: folder.name,
        parentFolderId: folder.parent_folder_id,
        position: folder.position,
        itemCount: 0,
        createdAt: folder.created_at,
        updatedAt: folder.updated_at
      }
    };

    return withCors(
      NextResponse.json(responseData, { status: 201 }),
      request
    );
  } catch (error) {
    console.error('[Folders Create] Unexpected error:', error);
    return withCors(
      NextResponse.json({ error: 'Internal server error' }, { status: 500 }),
      request
    );
  }
}
```

---

#### Task 2.3: PATCH /api/folders/[id]
**Priority**: High
**Estimated Time**: 45 minutes
**Dependencies**: Task 2.2

**Acceptance Criteria**:
- Supports rename (update name)
- Supports move (update parentFolderId and position)
- Validates circular references
- Updates updated_at timestamp

**Implementation**: `/packages/web/src/app/api/folders/[id]/route.ts`
```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return withCors(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
        request
      );
    }

    const folderId = params.id;
    const body = await request.json();
    const { name, parentFolderId, position } = body;

    const supabase = authUser.source === 'device-token'
      ? await createClient()
      : await createAuthenticatedSupabaseClient(authUser);

    const updateData: any = { updated_at: new Date().toISOString() };

    if (name !== undefined) {
      if (name.trim().length === 0) {
        return withCors(
          NextResponse.json({ error: 'Folder name cannot be empty' }, { status: 400 }),
          request
        );
      }
      updateData.name = name.trim();
    }

    if (parentFolderId !== undefined) {
      updateData.parent_folder_id = parentFolderId;
    }

    if (position !== undefined) {
      updateData.position = position;
    }

    const { data: folder, error } = await supabase
      .from('folders')
      .update(updateData)
      .eq('id', folderId)
      .select()
      .single();

    if (error) {
      console.error('[Folders Update] Error:', error);

      // Check for circular reference error
      if (error.message?.includes('Circular folder reference')) {
        return withCors(
          NextResponse.json({ error: 'Cannot move folder: would create circular reference' }, { status: 400 }),
          request
        );
      }

      return withCors(
        NextResponse.json({ error: 'Failed to update folder' }, { status: 500 }),
        request
      );
    }

    const responseData = {
      success: true,
      folder: {
        id: folder.id,
        name: folder.name,
        parentFolderId: folder.parent_folder_id,
        position: folder.position,
        createdAt: folder.created_at,
        updatedAt: folder.updated_at
      }
    };

    return withCors(NextResponse.json(responseData), request);
  } catch (error) {
    console.error('[Folders Update] Unexpected error:', error);
    return withCors(
      NextResponse.json({ error: 'Internal server error' }, { status: 500 }),
      request
    );
  }
}
```

---

#### Task 2.4: DELETE /api/folders/[id]
**Priority**: High
**Estimated Time**: 30 minutes
**Dependencies**: Task 2.3

**Acceptance Criteria**:
- Deletes folder and all subfolders (cascade)
- Moves presentations to root (folder_id = NULL)
- Returns count of moved presentations
- Cannot delete folder owned by another user

**Implementation**: `/packages/web/src/app/api/folders/[id]/route.ts`
```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return withCors(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
        request
      );
    }

    const folderId = params.id;
    const supabase = authUser.source === 'device-token'
      ? await createClient()
      : await createAuthenticatedSupabaseClient(authUser);

    // Get presentation count before delete (for response)
    const { data: count } = await supabase.rpc('get_folder_presentation_count', {
      folder_uuid: folderId
    });

    // Delete folder (presentations auto-moved to NULL by ON DELETE SET NULL)
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId);

    if (error) {
      console.error('[Folders Delete] Error:', error);
      return withCors(
        NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 }),
        request
      );
    }

    const responseData = {
      success: true,
      movedPresentations: count || 0
    };

    return withCors(NextResponse.json(responseData), request);
  } catch (error) {
    console.error('[Folders Delete] Unexpected error:', error);
    return withCors(
      NextResponse.json({ error: 'Internal server error' }, { status: 500 }),
      request
    );
  }
}
```

---

#### Task 2.5: PATCH /api/presentations/[id]/move
**Priority**: High
**Estimated Time**: 30 minutes
**Dependencies**: Task 2.1

**Acceptance Criteria**:
- Moves presentation to specified folder
- Supports moving to root (folderId = null)
- Updates updated_at timestamp
- Invalidates SWR cache for both old and new folder

**Implementation**: `/packages/web/src/app/api/presentations/[id]/move/route.ts`
```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return withCors(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
        request
      );
    }

    const presentationId = params.id;
    const body = await request.json();
    const { folderId } = body;

    const supabase = authUser.source === 'device-token'
      ? await createClient()
      : await createAuthenticatedSupabaseClient(authUser);

    const { data: presentation, error } = await supabase
      .from('presentations')
      .update({
        folder_id: folderId,
        updated_at: new Date().toISOString()
      })
      .eq('id', presentationId)
      .select()
      .single();

    if (error) {
      console.error('[Presentation Move] Error:', error);
      return withCors(
        NextResponse.json({ error: 'Failed to move presentation' }, { status: 500 }),
        request
      );
    }

    const responseData = {
      success: true,
      presentation: {
        id: presentation.id,
        folderId: presentation.folder_id,
        updatedAt: presentation.updated_at
      }
    };

    return withCors(NextResponse.json(responseData), request);
  } catch (error) {
    console.error('[Presentation Move] Unexpected error:', error);
    return withCors(
      NextResponse.json({ error: 'Internal server error' }, { status: 500 }),
      request
    );
  }
}
```

---

#### Task 2.6: POST /api/presentations/bulk-move
**Priority**: Medium
**Estimated Time**: 30 minutes
**Dependencies**: Task 2.5

**Acceptance Criteria**:
- Moves multiple presentations to folder in single operation
- Atomic transaction (all succeed or all fail)
- Returns count of moved presentations

**Implementation**: `/packages/web/src/app/api/presentations/bulk-move/route.ts`
```typescript
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return withCors(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
        request
      );
    }

    const body = await request.json();
    const { presentationIds, folderId } = body;

    if (!Array.isArray(presentationIds) || presentationIds.length === 0) {
      return withCors(
        NextResponse.json({ error: 'presentationIds array is required' }, { status: 400 }),
        request
      );
    }

    const supabase = authUser.source === 'device-token'
      ? await createClient()
      : await createAuthenticatedSupabaseClient(authUser);

    // Bulk update in single query
    const { data, error } = await supabase
      .from('presentations')
      .update({
        folder_id: folderId,
        updated_at: new Date().toISOString()
      })
      .in('id', presentationIds)
      .select('id');

    if (error) {
      console.error('[Presentations Bulk Move] Error:', error);
      return withCors(
        NextResponse.json({ error: 'Failed to move presentations' }, { status: 500 }),
        request
      );
    }

    const responseData = {
      success: true,
      movedCount: data?.length || 0
    };

    return withCors(NextResponse.json(responseData), request);
  } catch (error) {
    console.error('[Presentations Bulk Move] Unexpected error:', error);
    return withCors(
      NextResponse.json({ error: 'Internal server error' }, { status: 500 }),
      request
    );
  }
}
```

---

#### Task 2.7: Update /api/presentations/list with Folder Filtering
**Priority**: Critical
**Estimated Time**: 45 minutes
**Dependencies**: Task 2.1

**Acceptance Criteria**:
- Supports `?folderId=uuid` query parameter
- Returns presentations in specified folder only
- Returns folder breadcrumb path
- Maintains ETag caching per folder

**Implementation**: Modify `/packages/web/src/app/api/presentations/list/route.ts`
```typescript
export async function GET(request: NextRequest) {
  try {
    const startedAt = Date.now();
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');

    // ... existing auth code ...

    const supabase = await createAuthenticatedSupabaseClient(authUser);

    // Query presentations with optional folder filter
    let query = supabase
      .from('presentations')
      .select('id,title,gamma_url,start_time,total_duration,timetable_data,created_at,updated_at,folder_id');

    if (folderId) {
      query = query.eq('folder_id', folderId);
    } else if (folderId === null) {
      // Root folder: presentations with no folder
      query = query.is('folder_id', null);
    }

    query = query.order('updated_at', { ascending: false });

    const { data: presentations, error } = await query;

    if (error) {
      console.error('[Presentations List] Error:', error);
      return withCors(
        NextResponse.json({ error: 'Failed to fetch presentations' }, { status: 500 }),
        request
      );
    }

    // Get folder path if folderId provided
    let currentFolder = null;
    if (folderId) {
      const { data: pathData } = await supabase.rpc('get_folder_path', {
        folder_uuid: folderId
      });

      currentFolder = {
        id: folderId,
        path: pathData || []
      };
    }

    const formattedPresentations = presentations.map(p => ({
      id: p.id,
      title: p.title,
      presentationUrl: p.gamma_url,
      startTime: p.start_time,
      totalDuration: p.total_duration,
      slideCount: p.timetable_data?.items?.length || 0,
      timetableData: p.timetable_data,
      folderId: p.folder_id,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));

    const responseData = {
      success: true,
      presentations: formattedPresentations,
      count: formattedPresentations.length,
      currentFolder
    };

    // ETag includes folderId for proper cache invalidation
    const etag = generateETag({ folderId, presentations: formattedPresentations });
    const conditionalResponse = handleConditionalRequest(request, etag);
    if (conditionalResponse) {
      return withCors(conditionalResponse, request);
    }

    const response = NextResponse.json(responseData);
    return withCors(
      addCacheHeaders(response, etag, { maxAge: 60, staleWhileRevalidate: 120, private: true }),
      request
    );
  } catch (error) {
    console.error('[Presentations List] Unexpected error:', error);
    return withCors(
      NextResponse.json({ error: 'Internal server error' }, { status: 500 }),
      request
    );
  }
}
```

---

#### Task 2.8: API Integration Tests
**Priority**: High
**Estimated Time**: 1 hour
**Dependencies**: Tasks 2.1-2.7

**Acceptance Criteria**:
- All API endpoints have integration tests
- Tests cover success and error cases
- Tests validate authentication and authorization
- Tests check cache invalidation

**Test File**: `tests/api/folders.test.ts`
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser, deleteTestUser, getAuthToken } from './test-helpers';

describe('Folders API', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const user = await createTestUser();
    userId = user.id;
    authToken = await getAuthToken(user.email);
  });

  afterAll(async () => {
    await deleteTestUser(userId);
  });

  describe('GET /api/folders/list', () => {
    it('should return folders for authenticated user', async () => {
      const response = await fetch('http://localhost:3000/api/folders/list', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.folders)).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await fetch('http://localhost:3000/api/folders/list');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/folders/create', () => {
    it('should create folder with valid data', async () => {
      const response = await fetch('http://localhost:3000/api/folders/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'Test Folder' })
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.folder.name).toBe('Test Folder');
    });

    it('should reject empty folder name', async () => {
      const response = await fetch('http://localhost:3000/api/folders/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: '' })
      });

      expect(response.status).toBe(400);
    });
  });

  // Additional tests for PATCH, DELETE, move operations...
});
```

**Run Tests**:
```bash
npm run test:api -- --testPathPattern=folders
```

---

### Phase 2 Success Criteria

- All 8 API endpoints functional and tested
- Authentication works with device tokens and sessions
- ETag caching reduces server load
- Response times <300ms (p95)
- Integration tests pass with 90%+ coverage
- Error handling provides clear, actionable messages

### Phase 2 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Cache invalidation bugs | Use SWR mutate() with specific cache keys per folder |
| Race conditions on concurrent updates | Use database transactions, optimistic locking |
| Circular reference detection fails | Test trigger thoroughly, add UI validation |
| Performance degradation with many folders | Index parent_folder_id, limit recursion depth |

---

## Phase 3: UI Components

**Duration**: 3-4 days (agentic execution: 6-8 hours)
**Risk Level**: Medium (complex recursive tree, state management)
**Agent**: `coder`, `reviewer`, `tester`

### Tasks

#### Task 3.1: FolderTreeView Component
**Priority**: Critical
**Estimated Time**: 2 hours
**Dependencies**: Phase 2 complete

**Acceptance Criteria**:
- Renders recursive folder tree
- Supports expand/collapse
- Highlights active folder
- Handles empty state
- Performance: renders 100 folders in <100ms

**Implementation**: `/packages/web/src/components/folders/FolderTreeView.tsx`
```typescript
'use client';

import React, { useState, useMemo } from 'react';
import { Folder } from './types';
import FolderItem from './FolderItem';

interface FolderTreeViewProps {
  folders: Folder[];
  currentFolderId?: string | null;
  onFolderClick: (folderId: string | null) => void;
  onFolderCreate: (name: string, parentId?: string) => Promise<void>;
  onFolderRename: (folderId: string, newName: string) => Promise<void>;
  onFolderDelete: (folderId: string) => Promise<void>;
  onFolderMove: (folderId: string, newParentId: string | null) => Promise<void>;
}

export default function FolderTreeView({
  folders,
  currentFolderId,
  onFolderClick,
  onFolderCreate,
  onFolderRename,
  onFolderDelete,
  onFolderMove
}: FolderTreeViewProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Build hierarchical tree structure
  const folderTree = useMemo(() => {
    const folderMap = new Map<string, Folder & { children: Folder[] }>();

    // First pass: create map entries
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    // Second pass: build parent-child relationships
    const rootFolders: (Folder & { children: Folder[] })[] = [];
    folders.forEach(folder => {
      const folderNode = folderMap.get(folder.id)!;

      if (folder.parentFolderId === null) {
        rootFolders.push(folderNode);
      } else {
        const parent = folderMap.get(folder.parentFolderId);
        if (parent) {
          parent.children.push(folderNode);
        } else {
          // Parent not found (orphaned), add to root
          rootFolders.push(folderNode);
        }
      }
    });

    return rootFolders;
  }, [folders]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const renderFolder = (folder: Folder & { children: Folder[] }, depth: number = 0) => (
    <FolderItem
      key={folder.id}
      folder={folder}
      depth={depth}
      isExpanded={expandedFolders.has(folder.id)}
      isActive={currentFolderId === folder.id}
      onToggle={() => toggleFolder(folder.id)}
      onClick={() => onFolderClick(folder.id)}
      onRename={(newName) => onFolderRename(folder.id, newName)}
      onDelete={() => onFolderDelete(folder.id)}
      onMove={(newParentId) => onFolderMove(folder.id, newParentId)}
      onCreateSubfolder={(name) => onFolderCreate(name, folder.id)}
    >
      {folder.children.length > 0 && expandedFolders.has(folder.id) && (
        <div className="ml-4">
          {folder.children.map(child => renderFolder(child, depth + 1))}
        </div>
      )}
    </FolderItem>
  );

  if (folders.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        No folders yet. Create your first folder to organize presentations.
      </div>
    );
  }

  return (
    <div className="folder-tree">
      {folderTree.map(folder => renderFolder(folder, 0))}
    </div>
  );
}
```

---

#### Task 3.2: FolderItem Component
**Priority**: Critical
**Estimated Time**: 1.5 hours
**Dependencies**: Task 3.1

**Acceptance Criteria**:
- Displays folder name, icon, item count
- Expand/collapse chevron
- Active state highlighting
- Right-click context menu
- Keyboard navigation support

**Implementation**: `/packages/web/src/components/folders/FolderItem.tsx`
```typescript
'use client';

import React, { useState } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown, MoreVertical } from 'lucide-react';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Folder as FolderType } from './types';

interface FolderItemProps {
  folder: FolderType;
  depth: number;
  isExpanded: boolean;
  isActive: boolean;
  onToggle: () => void;
  onClick: () => void;
  onRename: (newName: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onMove: (newParentId: string | null) => Promise<void>;
  onCreateSubfolder: (name: string) => Promise<void>;
  children?: React.ReactNode;
}

export default function FolderItem({
  folder,
  depth,
  isExpanded,
  isActive,
  onToggle,
  onClick,
  onRename,
  onDelete,
  onCreateSubfolder,
  children
}: FolderItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState(folder.name);

  const hasChildren = folder.itemCount > 0 || (folder as any).children?.length > 0;

  const handleRenameSubmit = async () => {
    if (renameName.trim() && renameName !== folder.name) {
      await onRename(renameName.trim());
    }
    setIsRenaming(false);
  };

  return (
    <div>
      <SidebarMenuItem>
        <div className="flex items-center w-full group">
          {/* Expand/collapse chevron */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="p-1 hover:bg-sidebar-accent rounded-sm"
              aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}

          {/* Folder button */}
          <SidebarMenuButton
            asChild
            isActive={isActive}
            className="flex-1"
            onClick={onClick}
          >
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <FolderOpen className="h-4 w-4" />
              ) : (
                <Folder className="h-4 w-4" />
              )}

              {isRenaming ? (
                <input
                  type="text"
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit();
                    if (e.key === 'Escape') setIsRenaming(false);
                  }}
                  className="flex-1 bg-transparent border-b border-sidebar-border focus:outline-none"
                  autoFocus
                />
              ) : (
                <span className="flex-1 truncate">{folder.name}</span>
              )}

              {folder.itemCount > 0 && !isRenaming && (
                <span className="text-xs text-muted-foreground">
                  {folder.itemCount}
                </span>
              )}
            </div>
          </SidebarMenuButton>

          {/* Context menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-sidebar-accent rounded-sm"
                aria-label="Folder options"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  const name = prompt('Enter subfolder name:');
                  if (name) onCreateSubfolder(name);
                }}
              >
                Create subfolder
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setRenameName(folder.name);
                  setIsRenaming(true);
                }}
              >
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarMenuItem>

      {/* Child folders */}
      {children}
    </div>
  );
}
```

---

#### Task 3.3: CreateFolderDialog Component
**Priority**: High
**Estimated Time**: 45 minutes
**Dependencies**: Task 3.1

**Acceptance Criteria**:
- Modal dialog for creating folders
- Input validation (name required, max length)
- Parent folder selection dropdown
- Keyboard shortcuts (Escape to close, Enter to submit)

**Implementation**: `/packages/web/src/components/folders/CreateFolderDialog.tsx`
```typescript
'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Folder } from './types';

interface CreateFolderDialogProps {
  open: boolean;
  folders: Folder[];
  defaultParentId?: string | null;
  onClose: () => void;
  onCreate: (name: string, parentId: string | null) => Promise<void>;
}

export default function CreateFolderDialog({
  open,
  folders,
  defaultParentId,
  onClose,
  onCreate
}: CreateFolderDialogProps) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(defaultParentId || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Folder name is required');
      return;
    }

    if (name.length > 255) {
      setError('Folder name is too long (max 255 characters)');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onCreate(name.trim(), parentId);
      setName('');
      setParentId(null);
      onClose();
    } catch (err) {
      setError('Failed to create folder. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Organize your presentations by creating a new folder.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder="e.g., Spring 2024"
                maxLength={255}
                autoFocus
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent-folder">Parent Folder (Optional)</Label>
              <Select
                value={parentId || 'root'}
                onValueChange={(value) => setParentId(value === 'root' ? null : value)}
              >
                <SelectTrigger id="parent-folder">
                  <SelectValue placeholder="Select parent folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Root (No parent)</SelectItem>
                  {folders.map(folder => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Folder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

#### Task 3.4: RenameFolderDialog Component
**Priority**: Medium
**Estimated Time**: 30 minutes
**Dependencies**: Task 3.2

**Acceptance Criteria**:
- Simple inline or modal rename
- Validation (name required, not empty)
- Escape to cancel, Enter to save

**Implementation**: Inline rename in FolderItem (already implemented in Task 3.2)

---

#### Task 3.5: DeleteFolderDialog Component
**Priority**: High
**Estimated Time**: 30 minutes
**Dependencies**: Task 3.2

**Acceptance Criteria**:
- Confirmation dialog with warning
- Shows count of presentations that will be moved to root
- Shows count of subfolders that will be deleted
- Destructive action styling (red button)

**Implementation**: `/packages/web/src/components/folders/DeleteFolderDialog.tsx`
```typescript
'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Folder } from './types';

interface DeleteFolderDialogProps {
  open: boolean;
  folder: Folder | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteFolderDialog({
  open,
  folder,
  onClose,
  onConfirm
}: DeleteFolderDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  if (!folder) return null;

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Folder</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{folder.name}</strong>?
            {folder.itemCount > 0 && (
              <div className="mt-2 p-2 bg-muted rounded-md">
                <p className="text-sm">
                  <strong>{folder.itemCount}</strong> presentation{folder.itemCount !== 1 ? 's' : ''}
                  {' '}will be moved to the root folder.
                </p>
              </div>
            )}
            <p className="mt-2 text-destructive">
              This action cannot be undone. All subfolders will also be deleted.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete Folder'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

#### Task 3.6: MoveToFolderMenu Component
**Priority**: Medium
**Estimated Time**: 45 minutes
**Dependencies**: Task 3.1

**Acceptance Criteria**:
- Dropdown menu showing folder tree
- Shows "Move to Root" option
- Prevents moving to current folder
- Updates presentation location immediately

**Implementation**: `/packages/web/src/components/folders/MoveToFolderMenu.tsx`
```typescript
'use client';

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Folder, FolderUp } from 'lucide-react';
import { Folder as FolderType } from './types';

interface MoveToFolderMenuProps {
  folders: FolderType[];
  currentFolderId?: string | null;
  onMove: (folderId: string | null) => Promise<void>;
  children: React.ReactNode;
}

export default function MoveToFolderMenu({
  folders,
  currentFolderId,
  onMove,
  children
}: MoveToFolderMenuProps) {
  const handleMove = async (folderId: string | null) => {
    if (folderId === currentFolderId) return; // Already in this folder
    await onMove(folderId);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={() => handleMove(null)}
          disabled={currentFolderId === null}
        >
          <FolderUp className="mr-2 h-4 w-4" />
          Move to Root
        </DropdownMenuItem>

        {folders.length > 0 && <DropdownMenuSeparator />}

        {folders.map(folder => (
          <DropdownMenuItem
            key={folder.id}
            onClick={() => handleMove(folder.id)}
            disabled={currentFolderId === folder.id}
          >
            <Folder className="mr-2 h-4 w-4" />
            {folder.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

#### Task 3.7: Integrate into AppSidebar
**Priority**: Critical
**Estimated Time**: 1 hour
**Dependencies**: Tasks 3.1-3.6

**Acceptance Criteria**:
- FolderTreeView appears in Gamma section
- "All Presentations" root item above folders
- "New Folder" button at bottom of tree
- Sidebar state persists across navigation

**Implementation**: Modify `/packages/web/src/components/layouts/AppSidebar.tsx`
```typescript
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import {
  Calendar,
  BarChart3,
  Presentation,
  Settings,
  User,
  Link2,
  ChevronsUpDown,
  LogOut,
  FolderPlus,
  Folders,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import FolderTreeView from '@/components/folders/FolderTreeView';
import CreateFolderDialog from '@/components/folders/CreateFolderDialog';
import DeleteFolderDialog from '@/components/folders/DeleteFolderDialog';
import { swrConfig, cacheKeys } from '@/lib/swr-config';
import { toast } from 'sonner';

// ... existing imports and menuData ...

export default function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [deleteFolderOpen, setDeleteFolderOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<any>(null);

  // Fetch folders
  const { data: foldersData } = useSWR(
    cacheKeys.folders.list(),
    swrConfig.fetcher!,
    swrConfig
  );

  const folders = foldersData?.success ? foldersData.folders : [];

  // Extract current folder from URL
  const searchParams = new URLSearchParams(pathname.split('?')[1] || '');
  const currentFolderId = searchParams.get('folderId');

  const handleFolderClick = (folderId: string | null) => {
    if (folderId === null) {
      router.push('/gamma/timetables');
    } else {
      router.push(`/gamma/timetables?folderId=${folderId}`);
    }
  };

  const handleCreateFolder = async (name: string, parentId: string | null) => {
    try {
      const response = await fetch('/api/folders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentFolderId: parentId })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Folder created successfully');
        mutate(cacheKeys.folders.list());
      } else {
        toast.error('Failed to create folder');
      }
    } catch (error) {
      console.error('Create folder error:', error);
      toast.error('Failed to create folder');
    }
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Folder renamed');
        mutate(cacheKeys.folders.list());
      } else {
        toast.error('Failed to rename folder');
      }
    } catch (error) {
      console.error('Rename folder error:', error);
      toast.error('Failed to rename folder');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    const folder = folders.find((f: any) => f.id === folderId);
    setFolderToDelete(folder);
    setDeleteFolderOpen(true);
  };

  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;

    try {
      const response = await fetch(`/api/folders/${folderToDelete.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Folder deleted. ${data.movedPresentations} presentations moved to root.`);
        mutate(cacheKeys.folders.list());
        mutate(cacheKeys.presentations.list());

        // If we're viewing the deleted folder, navigate to root
        if (currentFolderId === folderToDelete.id) {
          router.push('/gamma/timetables');
        }
      } else {
        toast.error('Failed to delete folder');
      }
    } catch (error) {
      console.error('Delete folder error:', error);
      toast.error('Failed to delete folder');
    } finally {
      setDeleteFolderOpen(false);
      setFolderToDelete(null);
    }
  };

  const handleMoveFolder = async (folderId: string, newParentId: string | null) => {
    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentFolderId: newParentId })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Folder moved');
        mutate(cacheKeys.folders.list());
      } else {
        if (data.error?.includes('circular')) {
          toast.error('Cannot move folder: would create circular reference');
        } else {
          toast.error('Failed to move folder');
        }
      }
    } catch (error) {
      console.error('Move folder error:', error);
      toast.error('Failed to move folder');
    }
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        {/* ... existing header ... */}
      </SidebarHeader>

      <SidebarContent>
        {/* Gamma Section with Folders */}
        <SidebarGroup>
          <SidebarGroupLabel>Gamma</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* All Presentations (root) */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/gamma/timetables' && !currentFolderId}
                  tooltip="All Presentations"
                >
                  <Link href="/gamma/timetables">
                    <Folders className="h-4 w-4" />
                    <span>All Presentations</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Folder Tree */}
              <FolderTreeView
                folders={folders}
                currentFolderId={currentFolderId}
                onFolderClick={handleFolderClick}
                onFolderCreate={handleCreateFolder}
                onFolderRename={handleRenameFolder}
                onFolderDelete={handleDeleteFolder}
                onFolderMove={handleMoveFolder}
              />

              {/* New Folder Button */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setCreateFolderOpen(true)}>
                  <FolderPlus className="h-4 w-4" />
                  <span>New Folder</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Analytics */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/gamma/analytics'}
                  tooltip="Analytics"
                >
                  <Link href="/gamma/analytics">
                    <BarChart3 className="h-4 w-4" />
                    <span>Analytics</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings Section */}
        {/* ... existing settings section ... */}
      </SidebarContent>

      <SidebarFooter>
        {/* ... existing footer ... */}
      </SidebarFooter>

      <SidebarRail />

      {/* Dialogs */}
      <CreateFolderDialog
        open={createFolderOpen}
        folders={folders}
        onClose={() => setCreateFolderOpen(false)}
        onCreate={handleCreateFolder}
      />

      <DeleteFolderDialog
        open={deleteFolderOpen}
        folder={folderToDelete}
        onClose={() => {
          setDeleteFolderOpen(false);
          setFolderToDelete(null);
        }}
        onConfirm={confirmDeleteFolder}
      />
    </Sidebar>
  );
}
```

---

#### Task 3.8: Update TimetablesClient for Folder Context
**Priority**: Critical
**Estimated Time**: 1 hour
**Dependencies**: Task 3.7

**Acceptance Criteria**:
- Displays folder breadcrumb if viewing folder
- Shows folder-specific presentations
- "Move to Folder" action on presentation cards
- Optimistic updates when moving presentations

**Implementation**: Modify `/packages/web/src/app/gamma/timetables/TimetablesClient.tsx`
```typescript
'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import AppLayout from '@/components/layouts/AppLayout';
import { StickyHeader } from '@/components/ui/sticky-header';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronRight } from 'lucide-react';
import TimetableGrid from './components/TimetableGrid';
import MoveToFolderMenu from '@/components/folders/MoveToFolderMenu';
import { swrConfig, cacheKeys } from '@/lib/swr-config';
import { toast } from 'sonner';

// ... existing imports ...

export default function TimetablesClient({ user }: TimetablesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const folderId = searchParams.get('folderId');

  // Fetch presentations (filtered by folder if provided)
  const presentationsCacheKey = folderId
    ? `${cacheKeys.presentations.list()}?folderId=${folderId}`
    : cacheKeys.presentations.list();

  const { data, error, isLoading } = useSWR(
    presentationsCacheKey,
    swrConfig.fetcher!,
    swrConfig
  );

  // Fetch folders for move menu
  const { data: foldersData } = useSWR(
    cacheKeys.folders.list(),
    swrConfig.fetcher!,
    swrConfig
  );

  const presentations = useMemo(() => {
    return data?.success ? data.presentations : [];
  }, [data]);

  const folders = foldersData?.success ? foldersData.folders : [];
  const currentFolder = data?.currentFolder;

  // ... existing handlers (handleView, handleExport, handleDelete) ...

  const handleMovePresentation = useCallback(async (
    presentationId: string,
    targetFolderId: string | null
  ) => {
    try {
      // Optimistic update
      const currentData = data;
      const optimisticPresentations = presentations.filter(
        (p: any) => p.id !== presentationId
      );

      mutate(
        presentationsCacheKey,
        currentData ? {
          ...currentData,
          presentations: optimisticPresentations,
          count: optimisticPresentations.length
        } : undefined,
        false
      );

      const response = await fetch(`/api/presentations/${presentationId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: targetFolderId })
      });

      const responseData = await response.json();

      if (responseData.success) {
        toast.success('Presentation moved');

        // Invalidate both old and new folder caches
        mutate(presentationsCacheKey);
        if (targetFolderId) {
          mutate(`${cacheKeys.presentations.list()}?folderId=${targetFolderId}`);
        } else {
          mutate(cacheKeys.presentations.list());
        }
        mutate(cacheKeys.folders.list()); // Update item counts
      } else {
        // Revert on failure
        mutate(presentationsCacheKey, currentData);
        toast.error('Failed to move presentation');
      }
    } catch (error) {
      // Revert on error
      mutate(presentationsCacheKey, data);
      console.error('Move presentation error:', error);
      toast.error('Failed to move presentation');
    }
  }, [data, presentations, presentationsCacheKey]);

  return (
    <AppLayout user={user}>
      <StickyHeader>
        <div className="flex items-center gap-2 flex-1">
          <Calendar className="h-5 w-5" />

          {/* Breadcrumb navigation */}
          {currentFolder?.path && currentFolder.path.length > 0 ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/gamma/timetables')}
              >
                All Presentations
              </Button>
              {currentFolder.path.map((folder: any, index: number) => (
                <React.Fragment key={folder.id}>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/gamma/timetables?folderId=${folder.id}`)}
                  >
                    {folder.name}
                  </Button>
                </React.Fragment>
              ))}
            </div>
          ) : (
            <h1 className="text-lg font-semibold">Timetables</h1>
          )}
        </div>
      </StickyHeader>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <TimetableGrid
          presentations={presentations}
          loading={isLoading}
          onView={handleView}
          onExport={handleExport}
          onDelete={handleDeleteClick}
          onMove={handleMovePresentation}
          folders={folders}
          currentFolderId={folderId}
        />
      </div>

      {/* ... existing delete dialog ... */}
    </AppLayout>
  );
}
```

**Modify TimetableGrid** to include move action:
```typescript
// In TimetableGrid component, add move action to each card
<MoveToFolderMenu
  folders={folders}
  currentFolderId={currentFolderId}
  onMove={(folderId) => onMove(presentation.id, folderId)}
>
  <Button variant="ghost" size="sm">
    <FolderInput className="h-4 w-4 mr-2" />
    Move to Folder
  </Button>
</MoveToFolderMenu>
```

---

#### Task 3.9: SWR Cache Key Management
**Priority**: High
**Estimated Time**: 30 minutes
**Dependencies**: Task 3.8

**Acceptance Criteria**:
- Cache keys include folderId for proper scoping
- Invalidation strategy invalidates related caches
- No stale data displayed after folder operations

**Implementation**: Update `/packages/web/src/lib/swr-config.ts`
```typescript
export const cacheKeys = {
  presentations: {
    list: (folderId?: string | null) =>
      folderId ? `/api/presentations/list?folderId=${folderId}` : '/api/presentations/list',
    detail: (id: string) => `/api/presentations/${id}`
  },
  folders: {
    list: () => '/api/folders/list',
    detail: (id: string) => `/api/folders/${id}`
  }
};

// Invalidation helpers
export const invalidateFolderCaches = () => {
  mutate(cacheKeys.folders.list());
  mutate((key) => typeof key === 'string' && key.startsWith('/api/presentations/list'));
};

export const invalidatePresentationCaches = (oldFolderId?: string | null, newFolderId?: string | null) => {
  if (oldFolderId) {
    mutate(cacheKeys.presentations.list(oldFolderId));
  } else {
    mutate(cacheKeys.presentations.list());
  }

  if (newFolderId) {
    mutate(cacheKeys.presentations.list(newFolderId));
  } else {
    mutate(cacheKeys.presentations.list());
  }

  mutate(cacheKeys.folders.list()); // Update counts
};
```

---

### Phase 3 Success Criteria

- FolderTreeView renders 100+ folders smoothly
- All components follow shadcn/ui patterns
- Sidebar integration maintains responsive design
- SWR caching prevents unnecessary API calls
- Optimistic updates provide instant feedback
- No UI flicker during folder operations
- Keyboard navigation works (Tab, Enter, Escape, Arrow keys)
- Mobile: sidebar becomes drawer, touch-friendly targets

### Phase 3 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Tree recursion performance issues | Memoize folder tree, use React.memo for FolderItem |
| SWR cache invalidation misses | Document cache key patterns, add invalidation helpers |
| UI state out of sync with server | Use optimistic updates + revalidation on success |
| Mobile UX suffers from desktop patterns | Test on mobile, add touch-specific interactions |

---

## Phase 4: Drag-and-Drop Interactions

**Duration**: 2 days (agentic execution: 3-4 hours)
**Risk Level**: Medium (browser compatibility, touch support)
**Agent**: `coder`, `tester`

### Tasks

#### Task 4.1: Install @dnd-kit Packages
**Priority**: Critical
**Estimated Time**: 5 minutes
**Dependencies**: Phase 3 complete

**Acceptance Criteria**:
- Packages installed without conflicts
- TypeScript types available
- Bundle size impact acceptable (<50KB gzipped)

**Implementation**:
```bash
npm install @dnd-kit/core@^6.1.0 @dnd-kit/sortable@^8.0.0 @dnd-kit/utilities@^3.2.2
```

**Validation**:
```bash
npm list @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

#### Task 4.2: DndContext Provider Setup
**Priority**: Critical
**Estimated Time**: 45 minutes
**Dependencies**: Task 4.1

**Acceptance Criteria**:
- DndContext wraps TimetablesClient
- Collision detection configured
- Sensors configured (mouse, touch, keyboard)
- Drop animation configured

**Implementation**: Modify `/packages/web/src/app/gamma/timetables/TimetablesClient.tsx`
```typescript
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

export default function TimetablesClient({ user }: TimetablesClientProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    // Presentation dropped on folder
    if (active.id !== over.id) {
      const presentationId = active.id as string;
      const targetFolderId = over.id as string;

      // Determine if drop target is folder or root
      const isFolderTarget = folders.some((f: any) => f.id === targetFolderId);
      const finalFolderId = isFolderTarget ? targetFolderId : null;

      await handleMovePresentation(presentationId, finalFolderId);
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <AppLayout user={user}>
        {/* ... existing header ... */}

        <div className="flex flex-1 flex-col gap-4 p-4">
          <SortableContext items={presentations.map((p: any) => p.id)}>
            <TimetableGrid
              presentations={presentations}
              loading={isLoading}
              onView={handleView}
              onExport={handleExport}
              onDelete={handleDeleteClick}
              onMove={handleMovePresentation}
              folders={folders}
              currentFolderId={folderId}
            />
          </SortableContext>
        </div>

        {/* Drag overlay for visual feedback */}
        <DragOverlay>
          {activeId ? (
            <div className="bg-card border rounded-lg p-4 shadow-lg opacity-80">
              {presentations.find((p: any) => p.id === activeId)?.title}
            </div>
          ) : null}
        </DragOverlay>
      </AppLayout>
    </DndContext>
  );
}
```

---

#### Task 4.3: Draggable Presentation Cards
**Priority**: High
**Estimated Time**: 45 minutes
**Dependencies**: Task 4.2

**Acceptance Criteria**:
- Presentation cards draggable
- Drag handle visible on hover
- Visual feedback during drag
- Works on touch devices

**Implementation**: Update TimetableGrid card component
```typescript
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

function DraggableTimetableCard({ presentation, ...props }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: presentation.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Drag handle */}
      <button
        className="absolute top-2 left-2 p-1 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Existing card content */}
      <TimetableCard presentation={presentation} {...props} />
    </div>
  );
}
```

---

#### Task 4.4: Droppable Folder Items
**Priority**: High
**Estimated Time**: 45 minutes
**Dependencies**: Task 4.2

**Acceptance Criteria**:
- Folders accept dropped presentations
- Visual feedback when hovering over folder
- Drop zone highlighting
- Prevent drop on same folder

**Implementation**: Update FolderItem component
```typescript
import { useDroppable } from '@dnd-kit/core';

export default function FolderItem({ folder, ...props }: FolderItemProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: folder.id,
    data: { type: 'folder', folder }
  });

  return (
    <div ref={setNodeRef}>
      <SidebarMenuItem>
        <div
          className={cn(
            "flex items-center w-full group transition-colors",
            isOver && "bg-sidebar-accent ring-2 ring-primary"
          )}
        >
          {/* Existing folder content */}
        </div>
      </SidebarMenuItem>
      {children}
    </div>
  );
}
```

---

#### Task 4.5: Visual Feedback for Drag Operations
**Priority**: Medium
**Estimated Time**: 30 minutes
**Dependencies**: Tasks 4.3, 4.4

**Acceptance Criteria**:
- Semi-transparent drag preview
- Drop zone highlighting (green = valid, red = invalid)
- Forbidden cursor for invalid drops
- Smooth animations

**Implementation**: Add CSS and DragOverlay customization
```css
/* Add to globals.css */
.drag-preview {
  @apply bg-card border-2 border-primary rounded-lg p-4 shadow-2xl opacity-90;
  cursor: grabbing;
}

.drop-zone-valid {
  @apply ring-2 ring-green-500 bg-green-50 dark:bg-green-950;
}

.drop-zone-invalid {
  @apply ring-2 ring-red-500 bg-red-50 dark:bg-red-950;
  cursor: not-allowed;
}
```

---

#### Task 4.6: Optimistic Updates During Drag
**Priority**: High
**Estimated Time**: 30 minutes
**Dependencies**: Task 4.2

**Acceptance Criteria**:
- Presentation moves immediately in UI
- Reverts if API call fails
- Loading state during API call
- Error toast on failure

**Implementation**: Already implemented in Task 3.8 `handleMovePresentation`

---

#### Task 4.7: Error Handling for Failed Drops
**Priority**: Medium
**Estimated Time**: 30 minutes
**Dependencies**: Task 4.6

**Acceptance Criteria**:
- Clear error messages
- UI reverts to pre-drop state
- Retry option for network errors
- Logging for debugging

**Implementation**: Enhanced error handling in drag handlers
```typescript
const handleDragEnd = async (event: DragEndEvent) => {
  try {
    // ... existing drag logic ...

    await handleMovePresentation(presentationId, finalFolderId);
  } catch (error) {
    console.error('Drag-and-drop error:', error);

    if (error instanceof TypeError && error.message.includes('fetch')) {
      toast.error('Network error. Please check your connection and try again.', {
        action: {
          label: 'Retry',
          onClick: () => handleMovePresentation(presentationId, finalFolderId)
        }
      });
    } else {
      toast.error('Failed to move presentation. Please try again.');
    }

    // Revert optimistic update
    mutate(presentationsCacheKey);
  } finally {
    setActiveId(null);
  }
};
```

---

### Phase 4 Success Criteria

- Drag-and-drop works on desktop (mouse)
- Drag-and-drop works on mobile (touch)
- Keyboard navigation allows moving presentations (Space to grab, Arrow keys to move)
- Visual feedback clear and responsive
- No performance issues during drag operations
- Error handling graceful with rollback
- Accessibility: screen readers announce drag/drop actions

### Phase 4 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Browser compatibility issues | Test on Chrome, Firefox, Safari, Edge |
| Touch devices don't work | Use PointerSensor (supports both mouse and touch) |
| Performance issues during drag | Use CSS transforms, avoid re-renders |
| Accidental drags | Set activation distance (8px movement required) |

---

## Phase 5: Polish & Optimization

**Duration**: 2-3 days (agentic execution: 4-6 hours)
**Risk Level**: Low (refinement and optimization)
**Agent**: `coder`, `tester`, `reviewer`

### Tasks

#### Task 5.1: Keyboard Navigation
**Priority**: High
**Estimated Time**: 1 hour
**Dependencies**: Phase 4 complete

**Acceptance Criteria**:
- Arrow Up/Down: Navigate folders
- Arrow Right: Expand folder
- Arrow Left: Collapse folder
- F2: Rename selected folder
- Delete: Delete selected folder
- Ctrl/Cmd+N: New folder
- Escape: Cancel current action

**Implementation**: Add keyboard event handlers to FolderTreeView
```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault();
      // Move focus to previous folder
      break;
    case 'ArrowDown':
      e.preventDefault();
      // Move focus to next folder
      break;
    case 'ArrowRight':
      e.preventDefault();
      // Expand focused folder
      break;
    case 'ArrowLeft':
      e.preventDefault();
      // Collapse focused folder
      break;
    case 'F2':
      e.preventDefault();
      // Start rename on focused folder
      break;
    case 'Delete':
      e.preventDefault();
      // Delete focused folder
      break;
  }
};

// Add to AppSidebar
useEffect(() => {
  const handleGlobalKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      setCreateFolderOpen(true);
    }
  };

  window.addEventListener('keydown', handleGlobalKeyDown);
  return () => window.removeEventListener('keydown', handleGlobalKeyDown);
}, []);
```

---

#### Task 5.2: Context Menu Integration
**Priority**: Medium
**Estimated Time**: 45 minutes
**Dependencies**: Phase 3 complete

**Acceptance Criteria**:
- Right-click on folder shows context menu
- Right-click on presentation shows move menu
- Context menu actions same as button actions
- Works on desktop only (long-press on mobile)

**Implementation**: Add right-click handlers
```typescript
// In FolderItem
const handleContextMenu = (e: React.MouseEvent) => {
  e.preventDefault();
  // Show dropdown menu at cursor position
  setContextMenuOpen(true);
};

<div onContextMenu={handleContextMenu}>
  {/* Folder content */}
</div>
```

---

#### Task 5.3: Mobile Touch Optimizations
**Priority**: High
**Estimated Time**: 1 hour
**Dependencies**: Phase 4 complete

**Acceptance Criteria**:
- Touch targets 48px minimum
- Long-press shows context menu (500ms)
- Swipe gestures for expand/collapse
- Sidebar becomes drawer on mobile
- Breadcrumb scrolls horizontally

**Implementation**: Add touch event handlers and responsive CSS
```typescript
// Long-press for context menu
const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);

const handleTouchStart = () => {
  const timer = setTimeout(() => {
    setContextMenuOpen(true);
  }, 500);
  setPressTimer(timer);
};

const handleTouchEnd = () => {
  if (pressTimer) {
    clearTimeout(pressTimer);
    setPressTimer(null);
  }
};

// Responsive CSS
@media (max-width: 768px) {
  .folder-item {
    min-height: 48px;
    padding: 12px 16px;
  }

  .breadcrumb {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}
```

---

#### Task 5.4: Performance Tuning
**Priority**: High
**Estimated Time**: 1 hour
**Dependencies**: Phases 3 & 4 complete

**Acceptance Criteria**:
- React.memo for FolderItem component
- Virtualization if >100 folders
- Debounced search (300ms)
- Lazy loading for deeply nested folders
- Bundle size <500KB total

**Implementation**:
```typescript
// Memoize FolderItem
const FolderItem = React.memo(({ folder, ...props }: FolderItemProps) => {
  // ... existing implementation
}, (prevProps, nextProps) => {
  return (
    prevProps.folder.id === nextProps.folder.id &&
    prevProps.folder.name === nextProps.folder.name &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isExpanded === nextProps.isExpanded
  );
});

// Virtualization for large lists (optional)
import { useVirtualizer } from '@tanstack/react-virtual';

const folderVirtualizer = useVirtualizer({
  count: folders.length,
  getScrollElement: () => scrollParentRef.current,
  estimateSize: () => 40,
  overscan: 5,
});
```

---

#### Task 5.5: Empty States and Loading Skeletons
**Priority**: Medium
**Estimated Time**: 45 minutes
**Dependencies**: Phase 3 complete

**Acceptance Criteria**:
- Empty folder state shows helpful message
- Loading skeleton during fetch
- Error state with retry button
- Graceful degradation

**Implementation**:
```typescript
// Empty state
{folders.length === 0 && !isLoading && (
  <div className="p-6 text-center text-muted-foreground">
    <Folder className="mx-auto h-12 w-12 mb-4 opacity-50" />
    <p className="text-sm font-medium">No folders yet</p>
    <p className="text-xs mt-1">Create your first folder to organize presentations</p>
    <Button
      variant="outline"
      size="sm"
      className="mt-4"
      onClick={() => setCreateFolderOpen(true)}
    >
      Create Folder
    </Button>
  </div>
)}

// Loading skeleton
{isLoading && (
  <div className="space-y-2">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="flex items-center gap-2 p-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 flex-1" />
      </div>
    ))}
  </div>
)}

// Error state
{error && (
  <div className="p-4 text-center">
    <p className="text-sm text-destructive mb-2">Failed to load folders</p>
    <Button
      variant="outline"
      size="sm"
      onClick={() => mutate(cacheKeys.folders.list())}
    >
      Retry
    </Button>
  </div>
)}
```

---

#### Task 5.6: Accessibility Audit
**Priority**: High
**Estimated Time**: 1 hour
**Dependencies**: All components complete

**Acceptance Criteria**:
- ARIA labels on all interactive elements
- Screen reader announces folder operations
- Keyboard focus visible
- Color contrast meets WCAG 2.1 AA
- Role attributes correct

**Implementation**:
```typescript
// ARIA attributes
<SidebarMenuButton
  aria-label={`${folder.name} folder, ${folder.itemCount} items`}
  aria-expanded={isExpanded}
  aria-current={isActive ? 'page' : undefined}
  role="button"
  tabIndex={0}
>
  {/* Content */}
</SidebarMenuButton>

// Screen reader announcements
const announceToScreenReader = (message: string) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);
  setTimeout(() => document.body.removeChild(announcement), 1000);
};

// Usage
await handleCreateFolder(name, parentId);
announceToScreenReader(`Folder "${name}" created successfully`);
```

**Audit Checklist**:
- [ ] Run axe DevTools audit
- [ ] Test with keyboard only (no mouse)
- [ ] Test with NVDA/JAWS screen reader
- [ ] Verify color contrast ratios
- [ ] Check focus indicators visible

---

#### Task 5.7: Error Boundaries
**Priority**: Medium
**Estimated Time**: 30 minutes
**Dependencies**: Phase 3 complete

**Acceptance Criteria**:
- Folder tree errors don't crash entire app
- Error boundary shows fallback UI
- Errors logged to console
- Reset button to retry

**Implementation**: `/packages/web/src/components/folders/FolderErrorBoundary.tsx`
```typescript
'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class FolderErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Folder tree error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-2" />
          <p className="text-sm font-medium">Failed to load folders</p>
          <p className="text-xs text-muted-foreground mt-1">
            {this.state.error?.message}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => this.setState({ hasError: false })}
          >
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage in AppSidebar
<FolderErrorBoundary>
  <FolderTreeView {...props} />
</FolderErrorBoundary>
```

---

#### Task 5.8: User Testing and Feedback
**Priority**: Medium
**Estimated Time**: Variable (2-4 hours user sessions)
**Dependencies**: All features complete

**Acceptance Criteria**:
- 5+ users test folder organization
- Feedback collected on usability
- Pain points identified and prioritized
- Quick wins implemented immediately

**Testing Script**:
```
User Testing Script - Folder Organization Feature

Setup:
- User has 10 existing presentations
- No folders created yet

Tasks:
1. Create a new folder called "Spring 2024"
2. Move 3 presentations into "Spring 2024" folder
3. Create a subfolder called "Week 1" inside "Spring 2024"
4. Move 1 presentation into "Week 1"
5. Rename "Spring 2024" to "Spring Semester 2024"
6. Delete the "Week 1" folder
7. Navigate between folders using sidebar

Questions:
- Was it clear how to create a folder?
- Was drag-and-drop intuitive?
- Did you encounter any confusing behavior?
- What would make this feature better?

Metrics:
- Time to complete each task
- Number of errors/retries
- Satisfaction rating (1-5)
```

---

### Phase 5 Success Criteria

- Keyboard navigation fully functional
- Touch devices work smoothly
- Performance: 60fps during interactions
- Accessibility audit passes with no critical issues
- Empty states and error states polished
- User testing feedback positive (4+ / 5)
- No critical bugs reported

### Phase 5 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Accessibility issues missed | Use automated tools + manual testing |
| Performance regression | Monitor bundle size, use React DevTools Profiler |
| User confusion with UX | Conduct user testing early, iterate quickly |
| Mobile experience poor | Test on real devices, not just emulators |

---

## Agent Coordination Strategy

### Swarm Topology
**Recommended**: Hierarchical (coordinator + specialized agents)

```
Planner (Coordinator)
├── Backend-Dev (Phase 1, 2)
├── Coder (Phase 3, 4)
├── Tester (All phases)
└── Reviewer (Phase 5)
```

### Coordination Hooks

**Pre-Sprint**:
```bash
npx claude-flow@alpha hooks pre-task --description "sprint-37-folder-organization"
npx claude-flow@alpha swarm init --topology hierarchical --max-agents 5
```

**Per-Phase**:
```bash
# Phase 1: Database
npx claude-flow@alpha hooks pre-task --description "phase-1-database-foundation"
# Agent: backend-dev implements migrations
npx claude-flow@alpha hooks post-task --task-id "phase-1-database"

# Phase 2: API
npx claude-flow@alpha hooks pre-task --description "phase-2-api-endpoints"
# Agent: backend-dev implements API routes
npx claude-flow@alpha hooks post-task --task-id "phase-2-api"

# Phase 3: UI
npx claude-flow@alpha hooks pre-task --description "phase-3-ui-components"
# Agent: coder implements React components
npx claude-flow@alpha hooks post-task --task-id "phase-3-ui"

# Phase 4: Drag-and-Drop
npx claude-flow@alpha hooks pre-task --description "phase-4-drag-and-drop"
# Agent: coder implements @dnd-kit integration
npx claude-flow@alpha hooks post-task --task-id "phase-4-dnd"

# Phase 5: Polish
npx claude-flow@alpha hooks pre-task --description "phase-5-polish-optimization"
# Agent: coder + reviewer implement optimizations
npx claude-flow@alpha hooks post-task --task-id "phase-5-polish"
```

**Memory Keys**:
```bash
swarm/planner/sprint-37 - Overall sprint plan
swarm/backend-dev/database-schema - Database schema decisions
swarm/backend-dev/api-contracts - API endpoint contracts
swarm/coder/component-architecture - React component structure
swarm/coder/drag-and-drop-config - DnD configuration
swarm/tester/test-results - Test results per phase
swarm/reviewer/optimization-notes - Performance optimization notes
```

---

## Success Metrics and KPIs

### User Adoption
- **Week 1**: 20% of users create at least one folder
- **Week 2**: 35% of users organize presentations into folders
- **Month 1**: 50% of users actively using folders
- **Month 3**: Average 3-5 folders per active user

### Performance
- Folder tree renders in <100ms (p95)
- Folder creation in <200ms (p95)
- Presentation move in <300ms (p95)
- Tree expansion in <50ms (p95)
- Zero data loss incidents
- <1% error rate on folder operations

### User Satisfaction
- In-app survey after 2 weeks of feature release
- Target: 4.5/5 satisfaction rating
- Monitor support tickets (target: <5 folder-related tickets per week)
- Track feature usage in analytics

### Technical Quality
- Test coverage >85%
- Accessibility audit score >90
- Bundle size increase <100KB
- No critical security vulnerabilities

---

## Rollout Strategy

### Phase 1: Internal Testing (Week 1)
- Deploy to staging environment
- Internal team testing (5-10 users)
- Fix critical bugs
- Performance monitoring

### Phase 2: Beta Release (Week 2-3)
- Enable for 10% of users (feature flag)
- Collect feedback via in-app survey
- Monitor error rates and performance
- Iterate based on feedback

### Phase 3: Gradual Rollout (Week 4-5)
- 25% of users (Week 4)
- 50% of users (Week 5)
- 75% of users (Week 6)
- Monitor metrics at each stage

### Phase 4: Full Release (Week 6)
- 100% of users
- Announcement blog post
- Update documentation
- Monitor support requests

### Feature Flags
```typescript
// Feature flag configuration
const FEATURE_FLAGS = {
  folderOrganization: {
    enabled: process.env.NEXT_PUBLIC_FEATURE_FOLDERS === 'true',
    rolloutPercentage: parseInt(process.env.NEXT_PUBLIC_FOLDER_ROLLOUT_PCT || '0'),
  }
};

// Usage in code
if (FEATURE_FLAGS.folderOrganization.enabled) {
  // Show folder UI
}
```

---

## Rollback Plan

### Immediate Rollback (Critical Issues)
**Trigger**: Data loss, severe performance degradation, security vulnerability

**Steps**:
1. Set feature flag to 0% immediately
2. Deploy previous version if needed
3. Investigate issue in isolated environment
4. Communicate to affected users

### Partial Rollback (Non-Critical Issues)
**Trigger**: High error rate (>5%), user complaints (>10/day)

**Steps**:
1. Reduce rollout percentage (e.g., 50% → 25%)
2. Fix issues in staging
3. Re-test with internal users
4. Resume gradual rollout

### Database Rollback
**Scenario**: Migration causes data integrity issues

**Steps**:
```bash
# Create rollback migration
supabase migration new rollback_folders_feature

# Rollback SQL
ALTER TABLE presentations DROP COLUMN folder_id;
DROP TABLE folders CASCADE;
DROP FUNCTION get_folder_path(UUID);
DROP FUNCTION get_folder_presentation_count(UUID);
DROP FUNCTION prevent_folder_cycles();

# Deploy rollback
supabase db push --linked
```

---

## Dependencies and Prerequisites

### Technical Dependencies
- [x] Sprint 36 complete (duration suggestion feature)
- [x] Supabase database accessible
- [x] Next.js 15 and React 19 stable
- [x] shadcn/ui components library installed
- [x] SWR 2.3.6 configured

### Team Dependencies
- [ ] Design approval for folder UI patterns
- [ ] Product approval for feature scope
- [ ] QA resources for testing (2-3 days)
- [ ] DevOps support for feature flag deployment

### External Dependencies
- None (self-contained feature)

---

## Risk Assessment Matrix

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| Database migration fails | Low | High | Test locally first, have rollback ready | Backend-Dev |
| Circular reference bugs | Medium | Medium | Trigger + UI validation | Backend-Dev |
| SWR cache invalidation bugs | Medium | High | Document cache keys, test thoroughly | Coder |
| Drag-and-drop browser issues | Low | Medium | Test on multiple browsers/devices | Tester |
| Performance degradation | Medium | High | Monitor metrics, implement virtualization | Reviewer |
| User confusion with UX | Medium | Medium | User testing, iterate on feedback | Planner |
| Mobile UX poor | Low | Medium | Test on real devices early | Coder |

---

## Testing Strategy

### Unit Tests
```bash
# Database functions
npm run test:database -- folders

# API endpoints
npm run test:api -- folders

# React components
npm run test:unit -- FolderTreeView FolderItem
```

### Integration Tests
```bash
# Full folder workflow
npm run test:integration -- folder-organization

# SWR cache invalidation
npm run test:integration -- cache-invalidation
```

### E2E Tests
```bash
# Playwright tests
npm run test:e2e -- folder-organization.spec.ts
```

**E2E Test Cases**:
1. Create folder → Add presentation → Verify in folder
2. Rename folder → Verify name updated everywhere
3. Delete folder → Verify presentations moved to root
4. Drag presentation to folder → Verify move
5. Navigate folder tree → Verify breadcrumbs
6. Mobile: Open sidebar → Create folder → Close sidebar

### Performance Tests
```bash
# Load test with 100 folders
npm run test:performance -- folders

# Render performance
npm run test:performance -- folder-tree-render
```

---

## Documentation Updates

### User-Facing Documentation
- [ ] Help article: "Organizing Presentations with Folders"
- [ ] Video tutorial: Folder organization walkthrough
- [ ] FAQ: Common folder questions
- [ ] Changelog: Sprint 37 feature announcement

### Developer Documentation
- [ ] API documentation: Folder endpoints
- [ ] Component documentation: Folder components
- [ ] Database schema: Folders table reference
- [ ] Architecture decision record: Folder organization design

---

## Post-Launch Monitoring

### Week 1 Metrics
- Feature usage rate
- Error rate per endpoint
- Performance metrics (p50, p95, p99)
- User feedback sentiment

### Week 2-4 Metrics
- User adoption curve
- Folder depth distribution
- Presentations per folder average
- Support ticket volume

### Optimization Opportunities
- If avg folder depth >3: Add warning or limit
- If avg presentations per folder >50: Implement pagination
- If >10% users have >100 folders: Implement virtualization
- If search usage high: Add folder-scoped search

---

## Conclusion

Sprint 37 delivers a comprehensive folder organization system for Gamma presentations, enabling users to structure their content hierarchically with an intuitive drag-and-drop interface. The implementation leverages existing database capabilities, modern React patterns, and shadcn/ui components for a polished, performant user experience.

**Key Success Factors**:
1. Start with database foundation (ensure data integrity)
2. Build API layer with proper caching and validation
3. Create intuitive UI with keyboard and touch support
4. Optimize performance from day one
5. Test thoroughly across devices and browsers
6. Roll out gradually with feature flags
7. Monitor metrics and iterate based on feedback

**Next Steps**:
1. ✅ Review and approve this sprint plan
2. ⏭️ Initialize swarm coordination
3. ⏭️ Begin Phase 1: Database Foundation
4. ⏭️ Execute phases sequentially with parallel task execution
5. ⏭️ Deploy to staging → beta → production

**Timeline**: October 2 - November 8, 2025 (6 weeks total)

---

**Generated by**: Planning Agent
**Coordination Hook**: `swarm/planner/sprint-37`
**Status**: Complete ✅
**Ready for Execution**: Yes
**Next Action**: Initialize swarm and begin Phase 1
