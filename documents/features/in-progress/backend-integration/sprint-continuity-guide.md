# Sprint Continuity Guide

## Overview

This guide ensures smooth transitions between sprints, maintaining the principle of preserving existing functionality while progressively adding cloud capabilities.

## Sprint Flow & Dependencies

### Sprint 0: Foundation (No User Impact)

**What Gets Built:**

- Abstraction layers (Storage, Auth, Config)
- Directory structure for future features
- TypeScript definitions
- Feature flag system
- Disabled UI elements for future features

**What Users See:**

- No changes (extension works exactly as before)
- Small UI hints about future features (disabled)

**Key Outputs for Next Sprint:**

- `StorageManager` class ready for enhancement
- `AuthManager` class ready for Clerk integration
- Config system ready for feature toggling
- Build system ready for dual targets

---

### Sprint 1: Authentication & Dashboard Shell

**Prerequisites from Sprint 0:**

- ✅ StorageManager abstraction
- ✅ AuthManager abstraction
- ✅ Config system with feature flags
- ✅ Enhanced build configuration

**What Gets Built:**

- Clerk authentication in AuthManager
- Basic Next.js web dashboard
- Extension UI with active auth buttons
- Communication between extension and web
- Sync queue preparation (not active)

**What Users See:**

- "Sign In" button in extension (active)
- Can create account via web dashboard
- Auth state persists across sessions
- Extension still works offline
- "Sync Enabled" indicator (but no actual sync yet)

**Key Outputs for Next Sprint:**

- Authenticated users identified
- Web dashboard deployed and accessible
- Sync queue mechanism in place
- User base ready for cloud features

---

### Sprint 2: Manual Sync & Data Management

**Prerequisites from Sprint 1:**

- ✅ Working authentication flow
- ✅ Web dashboard with user sessions
- ✅ Sync queue in StorageManager
- ✅ Extension-to-web communication

**What Gets Built:**

- Supabase integration in web dashboard
- Manual "Save to Cloud" button in extension
- Manual "Load from Cloud" button in extension
- Presentation list in web dashboard
- Basic conflict resolution UI

**What Users See:**

- Can manually save timetables to cloud
- Can manually load timetables from cloud
- Web dashboard shows their presentations
- Clear feedback on sync status
- Conflicts handled gracefully

**Key Outputs for Next Sprint:**

- Proven sync mechanism
- User data in Supabase
- Conflict resolution patterns
- Performance baselines

---

### Sprint 3: Auto-Sync & Offline Support

**Prerequisites from Sprint 2:**

- ✅ Manual sync working reliably
- ✅ Supabase schema proven
- ✅ Conflict resolution tested
- ✅ User feedback incorporated

**What Gets Built:**

- Service Worker sync implementation
- Automatic sync on changes
- Offline queue with retry logic
- Real-time sync status indicators
- Sync settings/preferences

**What Users See:**

- Changes sync automatically
- Works seamlessly offline
- Visual sync status updates
- Can control sync behavior
- Faster than manual sync

---

## Key Continuity Principles

### 1. **Progressive Enhancement**

Each sprint builds on the previous without breaking existing functionality:

- Sprint 0: Invisible foundation
- Sprint 1: Visible but optional auth
- Sprint 2: Manual cloud features
- Sprint 3: Automatic cloud features

### 2. **Feature Flag Progression**

```javascript
// Sprint 0
{
  authentication: false,
  cloudSync: false,
  webDashboard: false,
  autoSync: false
}

// Sprint 1
{
  authentication: true,  // ← Enabled
  cloudSync: false,
  webDashboard: true,   // ← Enabled
  autoSync: false
}

// Sprint 2
{
  authentication: true,
  cloudSync: true,      // ← Enabled
  webDashboard: true,
  autoSync: false
}

// Sprint 3
{
  authentication: true,
  cloudSync: true,
  webDashboard: true,
  autoSync: true        // ← Enabled
}
```

### 3. **Data Flow Evolution**

**Sprint 0**:

```
User Action → Chrome Storage (only path)
```

**Sprint 1**:

```
User Action → Chrome Storage → Sync Queue (if authenticated)
```

**Sprint 2**:

```
User Action → Chrome Storage → Sync Queue → Manual Sync → Supabase
```

**Sprint 3**:

```
User Action → Chrome Storage → Auto Sync → Supabase
                    ↓
              Offline Queue (if needed)
```

### 4. **Testing Between Sprints**

Before moving to next sprint:

1. Verify all existing features still work
2. Test with feature flags in different states
3. Ensure graceful degradation
4. Validate data migrations
5. Check performance metrics

### 5. **Rollback Strategy**

Each sprint can be rolled back independently:

- Feature flags can disable new features
- Extension continues working with local storage
- No data loss during rollback
- Clear communication to users

## Migration Checkpoints

### Sprint 0 → Sprint 1

- [ ] StorageManager tested and working
- [ ] AuthManager stub implemented
- [ ] Config system operational
- [ ] Build process supports dual targets
- [ ] No user-facing changes detected

### Sprint 1 → Sprint 2

- [ ] Authentication flow complete
- [ ] Users can sign in/out
- [ ] Web dashboard accessible
- [ ] Extension still works offline
- [ ] Sync queue mechanism tested

### Sprint 2 → Sprint 3

- [ ] Manual sync reliable
- [ ] Conflict resolution working
- [ ] Performance acceptable
- [ ] User feedback positive
- [ ] Data integrity maintained

## Risk Mitigation

1. **Feature Isolation**: Each feature behind its own flag
2. **Gradual Rollout**: Beta users → Power users → Everyone
3. **Monitoring**: Track errors, performance, adoption
4. **Communication**: Clear changelog and documentation
5. **Support**: FAQ and troubleshooting guides ready
