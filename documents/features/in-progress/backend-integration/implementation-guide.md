# Implementation Guide: Seamless Backend Integration

## Overview

This guide details how to evolve the Gamma Timetable Extension from its current local-only state to a cloud-enabled application without disrupting existing users.

## Current State Analysis

### What We Have

1. **Working Chrome Extension** (v0.0.5)
   - Content script extracts Gamma slides
   - Sidebar displays timetable with customizable durations
   - Local storage persists data per presentation URL
   - Export functionality (CSV, XLSX, clipboard)
   - Background script manages communication

2. **Technology Stack**
   - Vanilla JavaScript (migrating to TypeScript)
   - Vite build system
   - Chrome Extension Manifest V3
   - No external UI framework (plain DOM manipulation)

3. **Key Features Working Today**
   - Auto-detection of Gamma presentations
   - Real-time slide updates via MutationObserver
   - Persistent storage of custom durations
   - Multiple export formats
   - Side panel UI

## Transition Strategy

### Phase 1: Foundation (Sprint 0)

**Goal**: Add infrastructure without changing functionality

#### 1. Storage Evolution

```javascript
// Current: Direct chrome.storage usage
await saveData(`timetable-${presentationUrl}`, timetable);

// Enhanced: Storage abstraction
const storage = new StorageManager();
await storage.save(`timetable-${presentationUrl}`, timetable);

// StorageManager initially just wraps existing functions
class StorageManager {
  async save(key, data) {
    // For now, just use local storage
    return saveData(key, data);
  }

  // Future: Will add cloud sync
  async syncToCloud(key, data) {
    if (!this.isAuthenticated) return;
    // Upload to Supabase
  }
}
```

#### 2. Authentication Preparation

```javascript
// Add to sidebar.js
import { AuthManager } from '../lib/auth.js';

const auth = new AuthManager();

// Check auth status (always false initially)
const isLoggedIn = await auth.isAuthenticated();

// Update UI to show login option (disabled)
const authButton = isLoggedIn
  ? '<button disabled>👤 Account</button>'
  : '<button disabled>🔐 Sign In (Coming Soon)</button>';
```

#### 3. Configuration System

```javascript
// src/config/index.js
export const config = {
  features: {
    cloudSync: false,
    authentication: false,
    webDashboard: false,
  },
  version: {
    current: '0.0.5',
    minimumForCloud: '0.1.0',
  },
};

// Use in sidebar.js
if (config.features.cloudSync) {
  // Show sync status
  showCloudStatus();
}
```

### Phase 2: Authentication Integration (Sprint 1)

#### 1. Clerk Integration

```javascript
// src/lib/auth.js evolution
import { getClerkToken } from './clerk-client.js';

export class AuthManager {
  async initialize() {
    // Check if user has existing session
    this.token = await getClerkToken();
  }

  async signIn() {
    // Open web dashboard for login
    chrome.tabs.create({
      url: 'https://gamma-timetable.app/sign-in?from=extension',
    });
  }

  async isAuthenticated() {
    return !!this.token;
  }
}
```

#### 2. Graceful Degradation

```javascript
// Enhanced storage manager
class StorageManager {
  constructor(auth) {
    this.auth = auth;
  }

  async save(key, data) {
    // Always save locally first
    await saveData(key, data);

    // Try cloud sync if authenticated
    if (await this.auth.isAuthenticated()) {
      try {
        await this.syncToCloud(key, data);
        this.updateSyncStatus('synced');
      } catch (error) {
        console.warn('Cloud sync failed, data saved locally', error);
        this.updateSyncStatus('local-only');
      }
    }
  }
}
```

### Phase 3: Web Dashboard (Sprint 2)

#### 1. Shared Components

```typescript
// shared/types/timetable.types.ts
export interface Presentation {
  id: string;
  url: string;
  title: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimetableData {
  presentationId: string;
  items: TimetableItem[];
  settings: TimetableSettings;
  version: number;
}
```

#### 2. Next.js App Structure

```
/web/
  /pages/
    /api/          # API routes (future)
    index.tsx      # Landing page
    dashboard.tsx  # User dashboard
    sign-in.tsx    # Clerk sign-in
  /components/
    TimetableView.tsx  # Reused from extension
    PresentationList.tsx
```

### Phase 4: Data Synchronization (Sprint 3)

#### 1. Sync Protocol

```javascript
// src/lib/sync.js
export class SyncManager {
  constructor(storage, auth) {
    this.storage = storage;
    this.auth = auth;
    this.syncQueue = [];
  }

  async performSync() {
    if (!navigator.onLine || !(await this.auth.isAuthenticated())) {
      return;
    }

    // Get local changes since last sync
    const changes = await this.getLocalChanges();

    // Push to Supabase
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.from('timetables').upsert(changes);

    if (!error) {
      await this.updateLastSyncTime();
    }
  }
}
```

#### 2. Conflict Resolution

```javascript
// Simple last-write-wins strategy
async resolveConflict(local, remote) {
  // Compare timestamps
  if (local.updatedAt > remote.updatedAt) {
    return local;
  }
  return remote;
}
```

## Migration Checklist

### For Each Sprint

- [ ] All existing features continue to work
- [ ] New features are behind feature flags
- [ ] TypeScript types are added for new code
- [ ] Documentation is updated
- [ ] Tests are written for new functionality

### User Communication

1. **In-Extension Messaging**

   ```javascript
   // Show non-intrusive update notice
   if (hasNewFeatures() && !user.hasSeenNotice) {
     showUpdateBanner({
       message: 'New: Cloud sync available! Sign in to access your timetables anywhere.',
       actions: ['Learn More', 'Dismiss'],
     });
   }
   ```

2. **Gradual Feature Introduction**
   - Start with "Coming Soon" indicators
   - Enable features for beta users first
   - Full rollout after stability confirmed

### Backward Compatibility

1. **Data Format Versioning**

   ```javascript
   const TIMETABLE_VERSION = 2;

   function migrateTimetableData(data) {
     if (!data.version || data.version < TIMETABLE_VERSION) {
       // Migrate old format
       return {
         ...data,
         version: TIMETABLE_VERSION,
         // Add new fields with defaults
         syncEnabled: false,
         lastSyncTime: null,
       };
     }
     return data;
   }
   ```

2. **Feature Detection**
   ```javascript
   // Check capabilities before using
   if (chrome.storage.sync) {
     // Use sync storage
   } else {
     // Fall back to local
   }
   ```

## Risk Mitigation

1. **Rollback Plan**
   - Keep previous version in Chrome Web Store
   - Feature flags can disable new functionality
   - Local storage remains source of truth

2. **Performance Monitoring**
   - Track sync performance
   - Monitor API response times
   - Alert on error rates

3. **User Data Protection**
   - Always save locally first
   - Implement exponential backoff for sync
   - Clear error messages for sync failures

## Success Metrics

1. **Technical Metrics**
   - Zero increase in error rates
   - Page load time remains < 100ms
   - Sync completes in < 2 seconds

2. **User Metrics**
   - 95% of users experience no disruption
   - 20% adoption of cloud features in first month
   - Support tickets remain flat

## Next Steps

1. Begin Sprint 0 implementation
2. Set up development environment
3. Create feature flag system
4. Start TypeScript migration for new files
5. Document architecture decisions
