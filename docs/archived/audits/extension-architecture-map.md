# Extension Architecture Map

## 📋 Executive Summary

This document maps the complete architecture of the Chrome extension to identify components needed for a standalone Node.js simulator.

**Key Finding**: The extension is a well-architected, multi-layer system with clear separation between:
- Browser-specific messaging (background.js)
- UI rendering (sidebar.js)
- Shared business logic (packages/shared)
- Authentication/storage infrastructure

---

## 🗂️ Complete File Structure

### Core Extension Files

```
packages/extension/
├── background.js                    # Service Worker (message broker)
├── content.ts                       # Content script (slide extraction)
├── sidebar/
│   ├── sidebar.js                   # Main UI logic + auth flows
│   ├── sidebar.html                 # UI structure
│   └── sidebar.css                  # Styling
├── popup/
│   └── popup.js                     # Extension popup (minimal)
├── auth/
│   └── index.ts                     # Auth wrapper (re-exports @shared/auth)
├── shared-config/
│   ├── index.ts                     # Config manager + feature flags
│   ├── environment.local.ts         # Local dev config
│   └── environment.production.ts    # Production config
├── lib/
│   ├── storage.js                   # Legacy storage helpers
│   └── timetable.js                 # Timetable generation + export
├── manifest.json                    # Extension manifest (dev)
└── manifest.production.json         # Extension manifest (prod)
```

### Shared Infrastructure (Critical for Simulator)

```
packages/shared/
├── auth/
│   ├── device.ts                    # Device pairing + token management
│   ├── unified-auth.ts              # Unified auth manager
│   └── index.ts                     # Auth exports
└── storage/
    ├── index.ts                     # Storage manager + cloud sync
    └── index.test.ts                # Storage tests
```

---

## 🔑 Component Classification

### **CRITICAL** (Must extract for simulator)

1. **Device Authentication** (`packages/shared/auth/device.ts`)
   - Device registration
   - Token exchange/refresh
   - Device fingerprinting
   - Authorized fetch with bearer tokens

2. **Storage Manager** (`packages/shared/storage/index.ts`)
   - Cloud sync logic (syncToCloud, syncFromCloud)
   - Retry with exponential backoff
   - API communication patterns

3. **Configuration System** (`packages/extension/shared-config/`)
   - Environment selection (local vs production)
   - API base URL configuration
   - Feature flags

4. **API Endpoints** (identified in code)
   - POST `/api/devices/register` - Device registration
   - POST `/api/devices/exchange` - Token exchange
   - POST `/api/devices/refresh` - Token refresh
   - POST `/api/presentations/save` - Save presentation
   - GET `/api/presentations/get?url={url}` - Get presentation
   - GET `/api/presentations/list` - List presentations
   - GET `/api/user/profile` - Get user profile

### **IMPORTANT** (For data generation)

5. **Timetable Generation** (`packages/extension/lib/timetable.js`)
   - Slide → Timetable transformation
   - Time calculation logic
   - Data structure definitions

### **OPTIONAL** (Browser UI - skip for simulator)

6. **UI Components**
   - sidebar.js (UI rendering)
   - background.js (message broker)
   - content.ts (slide extraction)

---

## 🔗 Dependency Graph

```
Simulator (Node.js)
  ├── @shared/auth/device.ts        [CRITICAL]
  │   └── @shared/storage (for token storage)
  ├── @shared/storage/index.ts      [CRITICAL]
  │   └── deviceAuth (for authorized fetch)
  ├── shared-config/                [CRITICAL]
  │   ├── environment.local.ts
  │   └── environment.production.ts
  └── lib/timetable.js              [IMPORTANT]
      └── Mock slide data
```

**Key Insight**: Circular dependency between `DeviceAuth` and `StorageManager`:
- DeviceAuth uses StorageManager to store tokens
- StorageManager uses DeviceAuth for authorized API calls

**Solution for Simulator**:
- Use a simple file-based or in-memory storage mock
- Break the circular dependency by injecting storage into DeviceAuth

---

## 📊 Data Flow Mapping

### 1. Device Pairing Flow
```
1. DeviceAuth.registerDevice(apiBaseUrl)
   ↓
2. POST /api/devices/register
   Body: { device_fingerprint: "sha256_hash" }
   ↓
3. Server Response: { deviceId, code, expiresAt }
   ↓
4. DeviceAuth.saveDeviceInfo(info)
   ↓
5. Build pairing URL: /auth/device-pairing?code={code}&source=extension
   ↓
6. User completes pairing in browser
   ↓
7. DeviceAuth.pollExchangeUntilLinked()
   ↓
8. POST /api/devices/exchange { deviceId, code }
   ↓
9. Server Response: { token, expiresAt }
   ↓
10. DeviceAuth.saveToken(token)
```

### 2. Presentation Save Flow
```
1. User edits timetable in sidebar
   ↓
2. Debounced save triggered (2000ms)
   ↓
3. StorageManager.syncToCloud(presentationUrl, data)
   ↓
4. DeviceAuth.getValidTokenOrRefresh(apiBaseUrl)
   ↓
5. DeviceAuth.authorizedFetch("/api/presentations/save")
   Headers: { Authorization: "Bearer {token}" }
   Body: {
     gamma_url: "https://gamma.app/...",
     title: "Presentation Title",
     start_time: "09:00",
     total_duration: 120,
     timetable_data: { items: [...], ... }
   }
   ↓
6. Server validates and stores
   ↓
7. Response: { success, data }
```

### 3. Authentication Check Flow
```
1. AuthManager.isAuthenticated()
   ↓
2. DeviceAuth.getStoredToken()
   ↓
3. Check token.expiresAt > Date.now()
   ↓
4. If expired: DeviceAuth.refresh(apiBaseUrl, token)
   ↓
5. POST /api/devices/refresh
   Headers: { Authorization: "Bearer {old_token}" }
   ↓
6. Response: { token: "new_token", expiresAt: "..." }
   ↓
7. DeviceAuth.saveToken(newToken)
```

---

## 🛠️ Critical Interfaces for Simulator

### DeviceAuth Interface
```typescript
class DeviceAuth {
  // Token management
  async getStoredToken(): Promise<DeviceToken | null>
  async getValidTokenOrRefresh(apiBaseUrl: string): Promise<DeviceToken | null>

  // Device registration
  async registerDevice(apiBaseUrl: string): Promise<DeviceInfo>
  async getOrRegisterDevice(apiBaseUrl: string): Promise<DeviceInfo>

  // Token exchange
  async exchange(apiBaseUrl: string, deviceId: string, code: string): Promise<DeviceToken | null>
  async pollExchangeUntilLinked(apiBaseUrl: string, deviceId: string, code: string): Promise<DeviceToken | null>

  // Authorized requests
  async authorizedFetch(apiBaseUrl: string, path: string, init?: RequestInit): Promise<Response>

  // Device fingerprinting
  async generateDeviceFingerprint(): Promise<string>
}
```

### StorageManager Interface
```typescript
class StorageManager {
  // Cloud sync
  async syncToCloud(presentationUrl: string, timetableData: any, options: {
    title?: string;
    apiBaseUrl?: string;
    deviceAuth?: DeviceAuth;
  }): Promise<CloudSyncResult>

  async syncFromCloud(presentationUrl: string, options: {
    apiBaseUrl?: string;
    deviceAuth?: DeviceAuth;
  }): Promise<CloudSyncResult>

  // Retry logic
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    context: string,
    isRetriableError?: (error: any) => boolean
  ): Promise<T>
}
```

---

## 🎯 What to Extract for Simulator

### **Must Have** (Core functionality)
1. ✅ `packages/shared/auth/device.ts` - Complete file
2. ✅ `packages/shared/storage/index.ts` - syncToCloud, syncFromCloud, retryWithBackoff methods
3. ✅ `packages/extension/shared-config/environment.*.ts` - Environment configs
4. ✅ API endpoint patterns and request/response formats

### **Should Have** (Testing)
5. ✅ `packages/extension/lib/timetable.js` - For generating mock timetable data
6. ✅ Sample presentation URLs and timetable structures

### **Nice to Have** (Validation)
7. ⚠️ Request/response validation schemas
8. ⚠️ Error handling patterns

---

## 📝 Key Takeaways

1. **Clear Architecture**: Extension has excellent separation of concerns
2. **Shared Logic**: Authentication and storage are already platform-agnostic
3. **Minimal Browser Dependencies**: Only chrome.storage and fetch (both mockable)
4. **Well-Documented**: Code has clear comments and type definitions
5. **Environment Aware**: Build-time configuration for local vs production

**Next Steps for Simulator**:
- Extract device.ts and storage manager
- Mock chrome.storage with file-based or memory storage
- Use Node.js fetch (or axios) for HTTP requests
- Load environment config at runtime (not build-time)
