# Sprint 2: Manual Sync & Supabase Integration

- **Goal:** Implement manual cloud synchronization using Supabase, allowing authenticated users to explicitly save and load their timetables while maintaining offline-first functionality.

## Prerequisites from Sprint 1

- ✅ Working Clerk authentication
- ✅ Web dashboard with user sessions
- ✅ Sync queue mechanism in StorageManager
- ✅ Extension-to-web communication established
- ✅ Users can sign in and see auth status

## Core Principles

- **Manual Control**: Users explicitly trigger sync operations
- **Offline First**: Local storage remains primary, cloud is backup
- **Clear Feedback**: Users understand sync status and conflicts
- **Data Integrity**: No data loss during sync operations

## Deliverables

### 1. **Supabase Setup & Schema**

- Configure Supabase project and database schema:

  ```sql
  -- Users table (managed by Clerk webhook)
  CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );

  -- Presentations table
  CREATE TABLE presentations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    gamma_url TEXT NOT NULL,
    title TEXT NOT NULL,
    total_slides INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, gamma_url)
  );

  -- Timetables table
  CREATE TABLE timetables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    presentation_id UUID REFERENCES presentations(id),
    name TEXT DEFAULT 'Default',
    data JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );

  -- Enable RLS
  ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;

  -- RLS Policies
  CREATE POLICY "Users can view own presentations" ON presentations
    FOR SELECT USING (user_id = auth.uid());

  CREATE POLICY "Users can insert own presentations" ON presentations
    FOR INSERT WITH CHECK (user_id = auth.uid());
  ```

### 2. **Supabase Client Integration**

- Add Supabase client to web dashboard:

  ```typescript
  // web/lib/supabase.ts
  import { createClient } from '@supabase/supabase-js';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  export const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Hook for authenticated client
  export function useSupabase() {
    const { getToken } = useAuth();

    return useMemo(() => {
      return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: async () => {
            const token = await getToken({ template: 'supabase' });
            return { Authorization: `Bearer ${token}` };
          },
        },
      });
    }, [getToken]);
  }
  ```

### 3. **Extension Sync UI**

- Add manual sync buttons to sidebar:

  ```javascript
  // sidebar.js additions
  const renderSyncControls = async () => {
    if (!config.features.cloudSync || !(await auth.isAuthenticated())) {
      return '';
    }

    return `
      <div class="sync-controls">
        <button id="save-to-cloud-btn" class="sync-btn">
          <span class="icon">☁️</span> Save to Cloud
        </button>
        <button id="load-from-cloud-btn" class="sync-btn">
          <span class="icon">📥</span> Load from Cloud
        </button>
        <div id="sync-status" class="sync-status"></div>
      </div>
    `;
  };

  // Sync handlers
  document.addEventListener('click', async e => {
    if (e.target.id === 'save-to-cloud-btn') {
      await handleSaveToCloud();
    } else if (e.target.id === 'load-from-cloud-btn') {
      await handleLoadFromCloud();
    }
  });
  ```

### 4. **Sync Manager Implementation**

- Create sync logic in extension:

  ```javascript
  // src/lib/sync.js
  export class SyncManager {
    constructor(storage, auth) {
      this.storage = storage;
      this.auth = auth;
    }

    async saveToCloud() {
      try {
        this.updateStatus('syncing', 'Saving to cloud...');

        // Get current timetable
        const timetable = await this.storage.load(`timetable-${currentPresentationUrl}`);
        if (!timetable) {
          throw new Error('No timetable to save');
        }

        // Prepare data
        const syncData = {
          presentationUrl: currentPresentationUrl,
          timetable: timetable,
          timestamp: new Date().toISOString(),
        };

        // Send to web dashboard API
        const response = await fetch(`${config.webDashboardUrl}/api/sync/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await this.auth.getToken()}`,
          },
          body: JSON.stringify(syncData),
        });

        if (!response.ok) {
          throw new Error('Sync failed');
        }

        this.updateStatus('success', 'Saved to cloud successfully!');
      } catch (error) {
        this.updateStatus('error', `Failed to save: ${error.message}`);
      }
    }

    async loadFromCloud() {
      try {
        this.updateStatus('syncing', 'Loading from cloud...');

        // Fetch from web dashboard API
        const response = await fetch(
          `${config.webDashboardUrl}/api/sync/load?url=${encodeURIComponent(currentPresentationUrl)}`,
          {
            headers: {
              Authorization: `Bearer ${await this.auth.getToken()}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('No cloud data found');
        }

        const cloudData = await response.json();

        // Check for conflicts
        const localData = await this.storage.load(`timetable-${currentPresentationUrl}`);
        if (localData && localData.updatedAt > cloudData.updatedAt) {
          const overwrite = await this.confirmOverwrite(localData, cloudData);
          if (!overwrite) {
            this.updateStatus('cancelled', 'Load cancelled');
            return;
          }
        }

        // Save to local storage
        await this.storage.save(`timetable-${currentPresentationUrl}`, cloudData.timetable);

        // Refresh UI
        window.location.reload();

        this.updateStatus('success', 'Loaded from cloud successfully!');
      } catch (error) {
        this.updateStatus('error', `Failed to load: ${error.message}`);
      }
    }

    updateStatus(status, message) {
      const statusEl = document.getElementById('sync-status');
      if (statusEl) {
        statusEl.className = `sync-status ${status}`;
        statusEl.textContent = message;

        if (status === 'success' || status === 'error') {
          setTimeout(() => {
            statusEl.className = 'sync-status';
            statusEl.textContent = '';
          }, 5000);
        }
      }
    }
  }
  ```

### 5. **Web Dashboard API Routes**

- Create Next.js API routes for sync:

  ```typescript
  // web/app/api/sync/save/route.ts
  export async function POST(request: Request) {
    const { userId } = auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const data = await request.json();
    const supabase = createServerClient();

    // Upsert presentation
    const { data: presentation } = await supabase
      .from('presentations')
      .upsert({
        user_id: userId,
        gamma_url: data.presentationUrl,
        title: data.timetable.title || 'Untitled',
        total_slides: data.timetable.items.length,
      })
      .select()
      .single();

    // Save timetable
    const { error } = await supabase.from('timetables').upsert({
      presentation_id: presentation.id,
      data: data.timetable,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return new Response('Sync failed', { status: 500 });
    }

    return Response.json({ success: true });
  }

  // web/app/api/sync/load/route.ts
  export async function GET(request: Request) {
    const { userId } = auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('presentations')
      .select('*, timetables(*)')
      .eq('user_id', userId)
      .eq('gamma_url', url)
      .single();

    if (error || !data) {
      return new Response('Not found', { status: 404 });
    }

    return Response.json({
      timetable: data.timetables[0]?.data,
      updatedAt: data.timetables[0]?.updated_at,
    });
  }
  ```

### 6. **Web Dashboard Presentation List**

- Create presentation management UI:

  ```typescript
  // web/app/(dashboard)/presentations/page.tsx
  export default function PresentationsPage() {
    const { data: presentations, isLoading } = usePresentations();

    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">My Presentations</h1>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid gap-4">
            {presentations?.map((presentation) => (
              <PresentationCard
                key={presentation.id}
                presentation={presentation}
                onView={() => router.push(`/presentations/${presentation.id}`)}
                onDelete={() => handleDelete(presentation.id)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
  ```

### 7. **Conflict Resolution UI**

- Add conflict dialog to extension:

  ```javascript
  // sidebar.js
  async confirmOverwrite(localData, cloudData) {
    const modal = document.createElement('div');
    modal.className = 'sync-conflict-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Sync Conflict Detected</h3>
        <p>Your local version is newer than the cloud version.</p>
        <div class="conflict-details">
          <div>
            <strong>Local:</strong>
            Modified ${formatDate(localData.updatedAt)}
          </div>
          <div>
            <strong>Cloud:</strong>
            Modified ${formatDate(cloudData.updatedAt)}
          </div>
        </div>
        <div class="modal-actions">
          <button id="keep-local">Keep Local</button>
          <button id="use-cloud">Use Cloud</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    return new Promise((resolve) => {
      modal.querySelector('#keep-local').onclick = () => {
        modal.remove();
        resolve(false);
      };
      modal.querySelector('#use-cloud').onclick = () => {
        modal.remove();
        resolve(true);
      };
    });
  }
  ```

### 8. **Feature Flag Update**

- Enable cloud sync for Sprint 2:
  ```javascript
  // src/config/index.js
  export const config = {
    features: {
      cloudSync: true, // ← Enable manual sync
      authentication: true,
      webDashboard: true,
      autoSync: false, // Still manual only
    },
  };
  ```

### 9. **Error Handling & Retry**

- Add robust error handling:

  ```javascript
  class SyncManager {
    async retrySyncOperation(operation, maxRetries = 3) {
      let lastError;

      for (let i = 0; i < maxRetries; i++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error;
          if (i < maxRetries - 1) {
            await this.delay(Math.pow(2, i) * 1000); // Exponential backoff
          }
        }
      }

      throw lastError;
    }
  }
  ```

### 10. **Performance Monitoring**

- Track sync performance:

  ```javascript
  async saveToCloud() {
    const startTime = performance.now();

    try {
      // ... sync logic ...

      const duration = performance.now() - startTime;
      this.trackMetric('sync.save.duration', duration);
      this.trackMetric('sync.save.success', 1);
    } catch (error) {
      this.trackMetric('sync.save.error', 1);
      throw error;
    }
  }
  ```

## Testing Strategy

1. **Manual Sync Testing**:
   - Save to cloud with various timetable sizes
   - Load from cloud with conflicts
   - Test offline behavior
   - Verify error messages

2. **Data Integrity Testing**:
   - Ensure no data loss during sync
   - Verify conflict resolution
   - Test concurrent modifications

3. **Performance Testing**:
   - Measure sync times
   - Test with large timetables
   - Verify UI responsiveness

## Success Criteria

- [ ] Users can manually save timetables to cloud
- [ ] Users can manually load timetables from cloud
- [ ] Conflicts are detected and resolved gracefully
- [ ] Clear feedback on sync operations
- [ ] No data loss during sync
- [ ] Performance within acceptable limits (<2s)
- [ ] Extension continues to work offline

## Next Steps (Sprint 3 Preview)

- Implement automatic sync on changes
- Add background sync with Service Worker
- Create sync preferences/settings
- Implement real-time sync indicators
- Add sync history/audit log
