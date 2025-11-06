# Extension Data Flow Diagram

## 📋 Executive Summary

This document traces the complete data flow through the Chrome extension, from device pairing to presentation save, identifying all API calls, data transformations, and error handling paths.

---

## 🔄 Complete Authentication Flow

### **Phase 1: Device Registration**

```mermaid
sequenceDiagram
    participant S as Simulator/Extension
    participant DA as DeviceAuth
    participant API as Backend API
    participant DB as Database

    S->>DA: registerDevice(apiBaseUrl)
    DA->>DA: generateDeviceFingerprint()
    DA->>DA: getOrGenerateInstallId()
    Note over DA: Creates: "inst_" + 32 random hex chars
    DA->>DA: extractUserAgentMajor()
    Note over DA: Example: "Chrome120"
    DA->>DA: sha256Hash(installId + "|" + userAgent)
    Note over DA: Fingerprint: 64-char hex string

    DA->>API: POST /api/devices/register
    Note over DA,API: Headers:<br/>Content-Type: application/json<br/>Body: { device_fingerprint: "..." }

    API->>DB: INSERT INTO devices
    API-->>DA: 200 OK
    Note over API,DA: { deviceId, code, expiresAt }

    DA->>DA: saveDeviceInfo(info)
    Note over DA: Stored in chrome.storage.local
    DA-->>S: DeviceInfo { deviceId, code, expiresAt }
```

**Request Example**:
```http
POST /api/devices/register
Content-Type: application/json

{
  "device_fingerprint": "a3f2b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0"
}
```

**Response Example**:
```json
{
  "deviceId": "dev_a1b2c3d4e5f6",
  "code": "GAMMA-XYZ-789",
  "expiresAt": "2025-10-05T17:45:00.000Z"
}
```

**Storage Pattern**:
```javascript
// Stored in chrome.storage.local as:
{
  "device_info_v1": {
    "deviceId": "dev_a1b2c3d4e5f6",
    "code": "GAMMA-XYZ-789",
    "expiresAt": "2025-10-05T17:45:00.000Z"
  },
  "install_id_v1": "inst_a1b2c3d4e5f6789012345678901234"
}
```

---

### **Phase 2: User Pairing (Web Browser)**

```mermaid
sequenceDiagram
    participant E as Extension
    participant DA as DeviceAuth
    participant B as Browser Tab
    participant W as Web App
    participant API as Backend API

    E->>DA: buildSignInUrl(webBaseUrl, code)
    DA-->>E: URL with params
    Note over DA,E: /?source=extension&code=GAMMA-XYZ-789

    E->>B: chrome.tabs.create({ url })
    B->>W: Navigate to web app
    W->>W: Parse URL params
    W->>W: Show pairing UI
    Note over W: User clicks "Pair Device"

    W->>API: POST /api/auth/pair-device
    Note over W,API: { code: "GAMMA-XYZ-789", userId: "..." }
    API->>API: Link device to user
    API-->>W: 200 OK
    W->>W: Show success message
    W->>B: Close tab (optional)
```

**Pairing URL Format**:
```
https://productory-powerups.netlify.app/?source=extension&code=GAMMA-XYZ-789
```

**Web App Behavior** (NOT in extension code):
1. Parse `code` from URL query params
2. Display pairing UI with code
3. User clicks "Pair Device"
4. Send POST to `/api/auth/pair-device` with user's auth token
5. Server links device to user account

---

### **Phase 3: Token Exchange (Polling)**

```mermaid
sequenceDiagram
    participant E as Extension
    participant DA as DeviceAuth
    participant API as Backend API

    E->>DA: pollExchangeUntilLinked(apiBaseUrl, deviceId, code)

    loop Every 2.5 seconds (max 5 minutes)
        DA->>API: POST /api/devices/exchange
        Note over DA,API: { deviceId, code }

        alt Device Not Linked Yet
            API-->>DA: 404 Not Found
            Note over DA: Continue polling
        else Device Linked (Success)
            API-->>DA: 200 OK { token, expiresAt }
            DA->>DA: saveToken({ token, expiresAt })
            DA-->>E: DeviceToken
            Note over E: Authentication complete!
        else Error
            API-->>DA: 500 Error
            Note over DA: Log and retry
        end

        DA->>DA: Wait 2500ms
    end

    Note over DA: If 5 minutes elapsed:<br/>Return null (timeout)
```

**Exchange Request**:
```http
POST /api/devices/exchange
Content-Type: application/json

{
  "deviceId": "dev_a1b2c3d4e5f6",
  "code": "GAMMA-XYZ-789"
}
```

**Exchange Response** (when linked):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2025-10-06T16:45:00.000Z"
}
```

**Token Storage**:
```javascript
// Stored in chrome.storage.local as:
{
  "device_token_v1": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2025-10-06T16:45:00.000Z"
  }
}
```

---

## 🔐 Token Management Flow

### **Token Refresh**

```mermaid
sequenceDiagram
    participant C as Caller (Storage/Auth)
    participant DA as DeviceAuth
    participant API as Backend API

    C->>DA: getValidTokenOrRefresh(apiBaseUrl)
    DA->>DA: getStoredToken()
    DA->>DA: Check if expired

    alt Token Valid
        DA-->>C: Return existing token
    else Token Expired (within 5s)
        DA->>API: POST /api/devices/refresh
        Note over DA,API: Headers:<br/>Authorization: Bearer {old_token}

        alt Refresh Success
            API-->>DA: 200 OK { token, expiresAt }
            DA->>DA: saveToken(newToken)
            DA-->>C: Return new token
        else Refresh Failed
            API-->>DA: 401 Unauthorized
            DA-->>C: Return null
            Note over C: User must re-authenticate
        end
    end
```

**Refresh Request**:
```http
POST /api/devices/refresh
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{}
```

**Refresh Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...(new_token)",
  "expiresAt": "2025-10-06T17:45:00.000Z"
}
```

---

### **Authorized Fetch Pattern**

```mermaid
sequenceDiagram
    participant SM as StorageManager
    participant DA as DeviceAuth
    participant API as Backend API

    SM->>DA: authorizedFetch(apiBaseUrl, path, options)
    DA->>DA: getValidTokenOrRefresh(apiBaseUrl)

    alt Token Available
        DA->>DA: Build full URL
        DA->>DA: Set headers:<br/>Authorization: Bearer {token}<br/>Content-Type: application/json
        DA->>API: fetch(url, { headers })
        API-->>DA: Response
        DA-->>SM: Response
    else No Token
        DA-->>SM: throw Error("not_authenticated")
    end
```

**Example Authorized Request**:
```http
GET /api/user/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

---

## 💾 Presentation Save Flow

### **Complete Save Sequence**

```mermaid
sequenceDiagram
    participant U as User (Sidebar)
    participant S as Sidebar.js
    participant SM as StorageManager
    participant DA as DeviceAuth
    participant API as Backend API
    participant DB as Supabase DB

    U->>S: Edit timetable (change duration)
    S->>S: Mark userMadeChanges = true
    S->>S: Trigger debouncedSave (2000ms)

    Note over S: After 2 second debounce...

    S->>SM: saveDataWithSync(key, data, options)
    SM->>SM: save(key, data) to chrome.storage.local
    SM->>SM: Check if cloudSync enabled

    alt Cloud Sync Enabled
        SM->>SM: extractPresentationUrl(key)
        SM->>SM: autoSyncIfAuthenticated()
        SM->>DA: getValidTokenOrRefresh(apiBaseUrl)

        alt Token Valid
            SM->>SM: Normalize timetable items
            Note over SM: Filter items, ensure:<br/>- id: string<br/>- title: string<br/>- duration: number

            SM->>SM: Build request payload
            Note over SM: {<br/>  gamma_url,<br/>  title,<br/>  start_time,<br/>  total_duration,<br/>  timetable_data<br/>}

            SM->>DA: authorizedFetch("/api/presentations/save")
            DA->>API: POST /api/presentations/save
            Note over DA,API: Authorization: Bearer {token}

            API->>DB: UPSERT presentation
            DB-->>API: Success
            API-->>DA: 200 OK { success, data }
            DA-->>SM: Response
            SM-->>S: Sync complete
            S->>S: Reset userMadeChanges = false
        else Token Invalid
            DA-->>SM: Error: not_authenticated
            SM->>SM: Silently fail (auto-sync is non-critical)
        end
    else Cloud Sync Disabled
        SM-->>S: Local save only
    end
```

**Save Request Payload**:
```http
POST /api/presentations/save
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "gamma_url": "https://gamma.app/docs/my-presentation-xyz123",
  "title": "Course Introduction - Week 1",
  "start_time": "09:00",
  "total_duration": 120,
  "timetable_data": {
    "title": "Course Introduction - Week 1",
    "startTime": "09:00",
    "totalDuration": 120,
    "items": [
      {
        "id": "slide-1",
        "title": "Welcome",
        "duration": 5,
        "startTime": "09:00",
        "endTime": "09:05",
        "content": [
          { "type": "paragraph", "text": "Welcome to the course" }
        ]
      },
      {
        "id": "slide-2",
        "title": "Agenda",
        "duration": 10,
        "startTime": "09:05",
        "endTime": "09:15",
        "content": [
          { "type": "list_item", "text": "Introduction", "subItems": [] }
        ]
      }
    ]
  }
}
```

**Save Response**:
```json
{
  "success": true,
  "data": {
    "id": "pres_a1b2c3d4",
    "presentationUrl": "https://gamma.app/docs/my-presentation-xyz123",
    "userId": "user_x1y2z3",
    "updatedAt": "2025-10-05T16:45:30.123Z"
  }
}
```

---

### **Data Normalization Logic**

**Before API Call** (in StorageManager):
```javascript
// Normalize items to satisfy API validation
const normalizedItems = timetableData.items
  .map(item => ({
    id: String(item?.id ?? ''),              // Ensure string
    title: String(item?.title ?? ''),        // Ensure string
    duration: Number(item?.duration ?? 0),   // Ensure number
    startTime: item?.startTime?.slice(0, 5), // HH:MM format
    endTime: item?.endTime?.slice(0, 5),     // HH:MM format
    content: item?.content                   // Preserve as-is
  }))
  .filter(item =>
    item.id &&                               // Must have id
    item.title &&                            // Must have title
    typeof item.duration === 'number'        // Must have numeric duration
  );
```

**Why Normalization is Needed**:
1. API expects strict types (string id, string title, number duration)
2. Slide extraction may produce inconsistent types
3. User edits may leave items in invalid state
4. Filtering removes malformed items

---

## 📥 Presentation Load Flow

### **Sync from Cloud**

```mermaid
sequenceDiagram
    participant U as User (Sidebar)
    participant S as Sidebar.js
    participant SM as StorageManager
    participant DA as DeviceAuth
    participant API as Backend API
    participant DB as Supabase DB

    U->>S: Open presentation
    S->>S: Check currentPresentationUrl changed
    S->>S: Try to load from local storage

    S->>SM: syncFromCloud(presentationUrl)
    SM->>DA: getValidTokenOrRefresh(apiBaseUrl)

    alt Token Valid
        SM->>DA: authorizedFetch("/api/presentations/get?url=...")
        DA->>API: GET /api/presentations/get
        Note over DA,API: Authorization: Bearer {token}

        API->>DB: SELECT * FROM presentations WHERE url = ?

        alt Presentation Found
            DB-->>API: Presentation data
            API->>API: Normalize items (ensure id, title, duration)
            API-->>DA: 200 OK { timetableData, updatedAt }
            DA-->>SM: Response
            SM->>SM: Map updatedAt → lastModified
            SM-->>S: { success: true, data: timetableData }

            S->>S: Compare cloud vs local timestamps
            alt Cloud Newer
                S->>S: Use cloud version
                S->>S: Save to local storage (offline access)
                S->>S: Render timetable
            else Local Newer
                S->>S: Keep local version
                Note over S: User's local edits preserved
            end
        else Presentation Not Found
            API-->>DA: 404 Not Found
            DA-->>SM: Error response
            SM-->>S: { success: false, error: "Presentation not found" }
            S->>S: Use local version (if exists)
        end
    else No Token
        DA-->>SM: Error: not_authenticated
        SM-->>S: { success: false, error: "Not authenticated" }
        S->>S: Use local version only
    end
```

**Load Request**:
```http
GET /api/presentations/get?url=https%3A%2F%2Fgamma.app%2Fdocs%2Fmy-presentation-xyz123
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Load Response**:
```json
{
  "timetableData": {
    "title": "Course Introduction - Week 1",
    "startTime": "09:00",
    "totalDuration": 120,
    "lastModified": "2025-10-05T16:45:30.123Z",
    "items": [...]
  },
  "updatedAt": "2025-10-05T16:45:30.123Z"
}
```

---

## ⚠️ Error Handling Patterns

### **Retry with Exponential Backoff**

```javascript
// Used in StorageManager for all API calls
async retryWithBackoff(operation, context, isRetriableError) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      // Check if error is retriable
      if (!isRetriableError(error)) {
        throw error; // Don't retry auth errors (401, 403)
      }

      if (attempt === maxRetries) {
        throw error; // Max retries reached
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      await sleep(delay);
    }
  }
}

// Error classification
isRetriableNetworkError(error) {
  // DON'T retry: Auth errors (401, 403), Client errors (400-499 except 429)
  if (error.status === 401 || error.status === 403) return false;
  if (error.status >= 400 && error.status < 500 && error.status !== 429) return false;

  // DO retry: Network errors, Server errors (5xx), Rate limiting (429)
  return error.name === 'TypeError' ||  // Network failure
         error.status >= 500 ||         // Server error
         error.status === 429 ||        // Rate limit
         !error.status;                 // Unknown error
}
```

**Retry Examples**:
- ✅ **RETRY**: 500 Internal Server Error, Network timeout, 429 Too Many Requests
- ❌ **NO RETRY**: 401 Unauthorized, 403 Forbidden, 400 Bad Request, 404 Not Found

---

### **Error Propagation**

```mermaid
graph TD
    A[API Error] --> B{Is Retriable?}
    B -->|Yes| C[Retry with backoff]
    B -->|No| D[Throw immediately]
    C --> E{Max retries?}
    E -->|No| C
    E -->|Yes| D
    D --> F[Caller handles error]
    F --> G{Critical operation?}
    G -->|Yes| H[Show error to user]
    G -->|No| I[Silent failure + log]
```

**Example Error Handling** (in sidebar.js):
```javascript
// Manual save (critical - show error)
try {
  const result = await storageManager.syncToCloud(...);
  if (result.success) {
    showSyncMessage('Saved successfully', 'success');
  } else {
    throw new Error(result.error);
  }
} catch (error) {
  showSyncMessage(`Save failed: ${error.message}`, 'error');
}

// Auto-sync (non-critical - silent failure)
try {
  await storageManager.autoSyncIfAuthenticated(...);
} catch (error) {
  console.warn('[SIDEBAR] Auto-sync failed (non-critical):', error);
  // Don't show error to user
}
```

---

## 📊 Data Transformation Summary

### **Key Transformations**

1. **Device Fingerprint** (DeviceAuth):
   ```
   installId (32 hex) + userAgent → SHA-256 → 64 hex chars
   ```

2. **Timetable Items** (StorageManager):
   ```
   Raw items → Normalize types → Filter invalid → API payload
   ```

3. **Timestamps** (Storage ↔ API):
   ```
   client: lastModified (ISO string)
   server: updatedAt (ISO string)
   Mapping: updatedAt → lastModified (on load)
   ```

4. **Time Format** (UI ↔ Storage):
   ```
   Full: "09:00:00"
   Stored: "09:00" (HH:MM only)
   ```

---

## 🎯 Critical Paths for Simulator

### **Must Implement**:
1. ✅ Device registration → token exchange flow
2. ✅ Token refresh logic
3. ✅ Authorized fetch with Bearer token
4. ✅ Retry with exponential backoff
5. ✅ Presentation save with normalization
6. ✅ Presentation load with conflict resolution

### **Can Skip**:
7. ❌ Chrome messaging (background ↔ sidebar)
8. ❌ UI rendering and event handlers
9. ❌ Slide extraction from DOM
10. ❌ Tab management

### **Mock Data Needed**:
11. ✅ Sample presentation URLs
12. ✅ Sample timetable structures
13. ✅ Mock API responses (for testing)

---

## 📝 Key Takeaways

1. **Well-Structured Flow**: Clear separation between auth, storage, and UI
2. **Robust Error Handling**: Retry logic with smart error classification
3. **Conflict Resolution**: Local vs cloud timestamp comparison
4. **Non-Critical Paths**: Auto-sync failures are silent (good UX)
5. **Data Normalization**: API expects strict types, code ensures compliance

**Simulator Complexity**: ⭐⭐⭐☆☆ (Moderate)
- Auth flow: Standard OAuth-like device pairing
- Storage: Simple REST API calls with Bearer auth
- Error handling: Well-defined retry patterns
- Main challenge: Coordinating multiple async operations
