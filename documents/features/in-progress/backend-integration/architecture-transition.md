# Architecture Transition Plan

## Current Architecture (v0.0.5)

```
┌─────────────────────────────────────────────────────────┐
│                    Chrome Extension                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │   Popup     │    │  Background  │    │  Content   │ │
│  │   (HTML)    │◀──▶│   Service    │◀──▶│   Script   │ │
│  └─────────────┘    │   Worker     │    │  (Gamma)   │ │
│                     └──────┬───────┘    └────────────┘ │
│                            │                             │
│  ┌─────────────────────────▼──────────────────────────┐ │
│  │                    Sidebar UI                       │ │
│  │  • Timetable Display                               │ │
│  │  • Duration Editor                                 │ │
│  │  • Export Functions (CSV/XLSX)                     │ │
│  └─────────────────────────┬──────────────────────────┘ │
│                            │                             │
│  ┌─────────────────────────▼──────────────────────────┐ │
│  │              Chrome Storage (Local)                 │ │
│  │  • Timetables by presentation URL                  │ │
│  │  • User preferences                                │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Sprint 0: Foundation Layer (No User Impact)

```
┌─────────────────────────────────────────────────────────┐
│                    Chrome Extension                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │   Popup     │    │  Background  │    │  Content   │ │
│  │   (HTML)    │◀──▶│   Service    │◀──▶│   Script   │ │
│  └─────────────┘    │   Worker     │    │  (Gamma)   │ │
│                     └──────┬───────┘    └────────────┘ │
│                            │                             │
│  ┌─────────────────────────▼──────────────────────────┐ │
│  │                    Sidebar UI                       │ │
│  │  • Timetable Display                               │ │
│  │  • Duration Editor                                 │ │
│  │  • Export Functions                                │ │
│  │  • 🔐 Sign In (disabled)  ← NEW                   │ │
│  │  • ☁️ Sync Status (local) ← NEW                   │ │
│  └─────────────────────────┬──────────────────────────┘ │
│                            │                             │
│  ┌─────────────────────────▼──────────────────────────┐ │
│  │              Abstraction Layers (NEW)              │ │
│  ├────────────────────────────────────────────────────┤ │
│  │  • StorageManager (wraps chrome.storage)           │ │
│  │  • AuthManager (always returns guest)              │ │
│  │  • Config System (feature flags)                   │ │
│  └─────────────────────────┬──────────────────────────┘ │
│                            │                             │
│  ┌─────────────────────────▼──────────────────────────┐ │
│  │              Chrome Storage (Local)                 │ │
│  │  • Same data, accessed via abstraction             │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

New Project Structure:
/gamma-plugin/
  /src/           (existing, untouched)
  /shared/        (NEW - future shared code)
  /web/           (NEW - placeholder for dashboard)
  /tests/         (NEW - test infrastructure)
```

## Sprint 1-2: Authentication & Web Dashboard

```
┌─────────────────────────────────────────────────────────┐
│                    Chrome Extension                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │                  Sidebar UI                      │   │
│  │  • 🔐 Sign In (active) → Opens web dashboard   │   │
│  │  • ☁️ Sync Status (shows actual status)        │   │
│  │  • All existing features work offline          │   │
│  └─────────────────────────┬───────────────────────┘   │
│                            │                             │
│  ┌─────────────────────────▼──────────────────────────┐ │
│  │              Enhanced Abstraction Layers            │ │
│  ├────────────────────────────────────────────────────┤ │
│  │  • StorageManager (local + cloud ready)            │ │
│  │  • AuthManager (Clerk integration)                 │ │
│  │  • SyncManager (queues changes)                    │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS (when online)
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Web Dashboard (NEW)                     │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌──────────────────────────┐   │
│  │   Landing Page  │    │    User Dashboard        │   │
│  │  (Public info)  │    │  • Presentation list     │   │
│  └─────────────────┘    │  • Account settings      │   │
│                         │  • Timetable viewer      │   │
│  ┌─────────────────┐    └──────────────────────────┘   │
│  │  Sign In Page   │                                    │
│  │  (Clerk Auth)   │    Hosted on Netlify              │
│  └─────────────────┘                                    │
└─────────────────────────────────────────────────────────┘
                            │
                            │ Direct connection
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend Services                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌──────────────────────────┐   │
│  │     Clerk       │    │      Supabase            │   │
│  │  (Auth & User   │    │  • PostgreSQL DB         │   │
│  │   Management)   │    │  • Row Level Security    │   │
│  └─────────────────┘    │  • Real-time sync        │   │
│                         └──────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Sprint 3-4: Full Cloud Sync

```
┌─────────────────────────────────────────────────────────┐
│              Unified Gamma Timetable System              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐         ┌────────────────────┐   │
│  │ Chrome Extension │◀────────▶│   Web Dashboard    │   │
│  │                  │  Shared  │                    │   │
│  │ • Offline first  │  State   │ • Full management  │   │
│  │ • Auto sync      │          │ • Multi-device     │   │
│  │ • Instant updates│          │ • Collaboration    │   │
│  └──────────────────┘         └────────────────────┘   │
│           │                              │               │
│           └──────────────┬───────────────┘               │
│                          ▼                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │              Sync & Storage Layer                  │ │
│  ├────────────────────────────────────────────────────┤ │
│  │  • Conflict resolution (last-write-wins)           │ │
│  │  • Offline queue management                        │ │
│  │  • Incremental sync protocol                       │ │
│  │  • Version tracking                                │ │
│  └────────────────────────────────────────────────────┘ │
│                          │                               │
│                          ▼                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │                 Supabase Backend                   │ │
│  ├────────────────────────────────────────────────────┤ │
│  │  Tables:                                           │ │
│  │  • users (managed by Clerk)                        │ │
│  │  • presentations                                   │ │
│  │  • timetables                                      │ │
│  │  • timetable_items                                 │ │
│  │  • sync_metadata                                   │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Key Transition Points

### 1. User Experience Continuity

- Extension continues to work exactly as before
- New features are introduced gradually
- Cloud sync is opt-in, not forced
- Local storage remains the primary data store

### 2. Technical Migration Path

```
Current State → Sprint 0 → Sprint 1-2 → Sprint 3-4
     ↓             ↓           ↓            ↓
Local Only    Abstractions  Auth Added  Full Sync
No Changes    No UI Change  Opt-in Login Cloud Backup
```

### 3. Data Flow Evolution

**Current**:

```
Gamma.app → Content Script → Background → Sidebar → Chrome Storage
```

**Future (with backward compatibility)**:

```
Gamma.app → Content Script → Background → Sidebar → Storage Manager
                                                          ↓
                                            ┌─────────────┴──────────────┐
                                            │                            │
                                     Chrome Storage              Supabase (if auth)
                                     (always saves)              (best effort sync)
```

### 4. Feature Flags Control

```javascript
const features = {
  cloudSync: false, // Sprint 0: false
  // Sprint 1: false
  // Sprint 2: true (beta)
  // Sprint 3: true (all)

  authentication: false, // Sprint 0: false
  // Sprint 1: true

  webDashboard: false, // Sprint 0: false
  // Sprint 2: true

  autoSync: false, // Sprint 0: false
  // Sprint 3: true

  collaboration: false, // Future sprint
};
```

## Success Criteria

1. **Zero Disruption**: Existing users see no breaking changes
2. **Graceful Enhancement**: New features enhance, not replace
3. **Performance**: No degradation in extension responsiveness
4. **Reliability**: Cloud sync failures don't affect local functionality
5. **Adoption**: Measured rollout with user feedback loops
