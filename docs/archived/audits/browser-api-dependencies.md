# Browser API Dependencies Audit

## 📋 Executive Summary

This audit identifies ALL browser-specific APIs used by the Chrome extension and categorizes them by criticality for the Node.js simulator.

**Key Finding**: Only **3 browser APIs** are used in the critical authentication/storage flow:
1. `chrome.storage.local` - CRITICAL (must mock)
2. `fetch()` - CRITICAL (use Node.js fetch or axios)
3. `crypto.subtle` - OPTIONAL (has fallback)

---

## 🔍 Complete Browser API Inventory

### **CRITICAL APIs** (Must mock for simulator)

#### 1. Chrome Storage API
**Files**: `packages/shared/storage/index.ts`

```javascript
// Usage patterns found:
chrome.storage.local.set({ [key]: value }, callback)
chrome.storage.local.get(key, callback)
chrome.storage.local.remove(key, callback)
chrome.storage.local.clear(callback)
```

**Purpose**:
- Store device tokens
- Store device info
- Store configuration
- Store timetable data

**Mock Strategy**:
```javascript
// Option 1: File-based mock (persistent)
class FileStorageMock {
  async set(items) {
    await fs.writeFile('./storage.json', JSON.stringify(items))
  }
  async get(keys) {
    const data = await fs.readFile('./storage.json')
    return JSON.parse(data)
  }
}

// Option 2: In-memory mock (session-only)
class MemoryStorageMock {
  constructor() { this.data = {} }
  async set(items) { Object.assign(this.data, items) }
  async get(keys) { return { [keys]: this.data[keys] } }
}
```

**Complexity**: ⭐⭐☆☆☆ (Easy - simple key-value storage)

---

#### 2. Fetch API
**Files**: `packages/shared/auth/device.ts`, `packages/shared/storage/index.ts`

```javascript
// Usage patterns found:
fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ...' },
  body: JSON.stringify(data),
  credentials: 'include'
})
```

**Purpose**:
- All API communication
- Device registration/exchange
- Token refresh
- Presentation save/load

**Mock Strategy**:
```javascript
// Use Node.js native fetch (18+) or axios
import fetch from 'node-fetch'; // or use built-in fetch

// For testing: Mock responses
const mockFetch = (url, options) => {
  if (url.includes('/api/devices/register')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({
        deviceId: 'mock-device-id',
        code: 'ABC123',
        expiresAt: new Date(Date.now() + 600000).toISOString()
      })
    })
  }
  // ... other endpoints
}
```

**Complexity**: ⭐☆☆☆☆ (Very Easy - Node.js has native fetch)

---

### **OPTIONAL APIs** (Has fallback)

#### 3. Crypto API (crypto.subtle)
**Files**: `packages/shared/auth/device.ts`

```javascript
// Usage pattern:
if (typeof crypto !== 'undefined' && crypto.subtle) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  // Use hash for device fingerprinting
} else {
  // Fallback: Simple numeric hash
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
  }
}
```

**Purpose**: Device fingerprinting (SHA-256 hashing)

**Mock Strategy**:
```javascript
// Node.js crypto module
import crypto from 'crypto';

const sha256 = (input) => {
  return crypto.createHash('sha256').update(input).digest('hex');
}
```

**Complexity**: ⭐☆☆☆☆ (Very Easy - Node.js crypto module)

---

### **NON-CRITICAL APIs** (Not needed for simulator)

#### 4. Chrome Runtime API
**Files**: `packages/extension/background.js`, `packages/extension/sidebar/sidebar.js`

```javascript
chrome.runtime.connect({ name: 'sidebar' })
chrome.runtime.onConnect.addListener(port => {})
chrome.runtime.lastError
chrome.runtime.onInstalled.addListener(() => {})
```

**Purpose**: Inter-component messaging (background ↔ sidebar ↔ content script)

**Simulator Impact**: ❌ **NOT NEEDED** - Simulator runs standalone, no messaging

---

#### 5. Chrome Tabs API
**Files**: `packages/extension/background.js`

```javascript
chrome.tabs.get(tabId, callback)
chrome.tabs.query({ active: true, currentWindow: true })
chrome.tabs.onActivated.addListener(activeInfo => {})
chrome.tabs.create({ url: 'https://...' })
```

**Purpose**: Tab management, open pairing URL in browser

**Simulator Impact**: ❌ **NOT NEEDED** - Simulator doesn't manage browser tabs

---

#### 6. Chrome Scripting API
**Files**: `packages/extension/background.js`

```javascript
chrome.scripting.executeScript({
  target: { tabId: tabId },
  files: ['content.js']
})
```

**Purpose**: Inject content script to extract slides from Gamma

**Simulator Impact**: ❌ **NOT NEEDED** - Simulator uses mock slide data

---

#### 7. Chrome Side Panel API
**Files**: `packages/extension/background.js`

```javascript
chrome.sidePanel.open({ windowId: tab.windowId })
```

**Purpose**: Open extension sidebar

**Simulator Impact**: ❌ **NOT NEEDED** - Simulator is CLI-based

---

#### 8. LocalStorage API
**Files**: `packages/shared/auth/unified-auth.ts`

```javascript
localStorage.getItem('gamma_auth_state')
localStorage.setItem('gamma_auth_state', JSON.stringify(data))
localStorage.removeItem('gamma_auth_state')
```

**Purpose**: Unified auth state management

**Mock Strategy** (if needed):
```javascript
class LocalStorageMock {
  constructor() { this.data = {} }
  getItem(key) { return this.data[key] || null }
  setItem(key, value) { this.data[key] = value }
  removeItem(key) { delete this.data[key] }
}

global.localStorage = new LocalStorageMock();
```

**Complexity**: ⭐☆☆☆☆ (Very Easy)
**Simulator Impact**: ⚠️ **MAY NEED** - Only if using unified-auth.ts (can be skipped)

---

#### 9. Navigator API
**Files**: `packages/shared/auth/device.ts`

```javascript
const ua = navigator.userAgent;
const chromeMatch = ua.match(/Chrome\/(\d+)/);
```

**Purpose**: Extract browser version for device fingerprinting

**Mock Strategy**:
```javascript
global.navigator = {
  userAgent: 'Node.js Simulator/1.0.0 (Chrome/120)'
};
```

**Complexity**: ⭐☆☆☆☆ (Very Easy)
**Simulator Impact**: ⚠️ **RECOMMENDED** - For accurate device fingerprinting

---

#### 10. Window API
**Files**: `packages/shared/auth/unified-auth.ts`

```javascript
window.dispatchEvent(new CustomEvent('gamma-auth-changed', { detail: data }))
window.dispatchEvent(new CustomEvent('gamma-auth-logout'))
```

**Purpose**: Event-driven UI updates

**Simulator Impact**: ❌ **NOT NEEDED** - Simulator doesn't use events

---

## 📊 Dependency Summary Table

| API | Files | Purpose | Simulator Need | Mock Complexity |
|-----|-------|---------|----------------|-----------------|
| **chrome.storage.local** | storage/index.ts | Token/data storage | ✅ CRITICAL | ⭐⭐☆☆☆ Easy |
| **fetch()** | device.ts, storage/index.ts | API communication | ✅ CRITICAL | ⭐☆☆☆☆ Very Easy |
| **crypto.subtle** | device.ts | Device fingerprinting | ⚠️ OPTIONAL | ⭐☆☆☆☆ Very Easy |
| **navigator.userAgent** | device.ts | Browser detection | ⚠️ RECOMMENDED | ⭐☆☆☆☆ Very Easy |
| **localStorage** | unified-auth.ts | Auth state (unified) | ⚠️ OPTIONAL | ⭐☆☆☆☆ Very Easy |
| **chrome.runtime** | background.js, sidebar.js | Messaging | ❌ NOT NEEDED | N/A |
| **chrome.tabs** | background.js | Tab management | ❌ NOT NEEDED | N/A |
| **chrome.scripting** | background.js | Content injection | ❌ NOT NEEDED | N/A |
| **chrome.sidePanel** | background.js | Open sidebar | ❌ NOT NEEDED | N/A |
| **window** | unified-auth.ts | Events | ❌ NOT NEEDED | N/A |

---

## 🎯 Simulator Mock Requirements

### **Minimum Viable Mocks** (Must have)
```javascript
// 1. Chrome Storage Mock
global.chrome = {
  storage: {
    local: new FileStorageMock('./simulator-storage.json')
  }
};

// 2. Fetch (use Node.js native or node-fetch)
import fetch from 'node-fetch'; // if Node < 18
// OR use built-in fetch in Node 18+

// 3. Navigator (for fingerprinting)
global.navigator = {
  userAgent: 'Node.js Simulator/1.0.0 (Chrome/120)'
};

// 4. Crypto (use Node.js crypto)
import crypto from 'crypto';
global.crypto = {
  subtle: {
    digest: async (algo, data) => {
      const hash = crypto.createHash('sha256');
      hash.update(Buffer.from(data));
      return hash.digest();
    }
  }
};
```

### **Optional Mocks** (If using unified auth)
```javascript
// LocalStorage Mock
global.localStorage = {
  data: {},
  getItem(k) { return this.data[k] || null },
  setItem(k, v) { this.data[k] = v },
  removeItem(k) { delete this.data[k] }
};

// Window Mock (for events)
global.window = {
  dispatchEvent: () => {} // no-op for simulator
};
```

---

## 🔐 CORS and Credentials Handling

### **Issue**: Extension uses `credentials: 'include'`
```javascript
fetch(url, {
  credentials: 'include'  // Sends cookies with request
})
```

**Purpose**: Send session cookies for authentication

**Simulator Strategy**:
1. **Option A**: Remove `credentials: 'include'` (use Bearer tokens only)
2. **Option B**: Implement cookie jar for Node.js fetch
3. **Option C**: Override fetch to strip credentials option

**Recommendation**: Use Option A - Bearer tokens are sufficient

---

## 📝 Key Takeaways

### ✅ **Good News**
1. **Minimal Browser Dependencies**: Only 3 critical APIs needed
2. **All Mockable**: Every browser API has a simple Node.js equivalent
3. **Well Abstracted**: Shared code is already platform-agnostic
4. **No DOM Dependencies**: No document.querySelector, etc. in critical paths

### ⚠️ **Challenges**
1. **Chrome Storage**: Need persistent storage mock (file-based recommended)
2. **Credentials Handling**: May need to strip `credentials: 'include'` from fetch
3. **Device Fingerprinting**: Navigator mock needed for consistent device IDs

### 🎯 **Total Mock Effort**
- **Time Estimate**: 2-4 hours
- **Complexity**: Low (all standard Node.js APIs)
- **Lines of Code**: ~100 lines for all mocks

**Next Steps**:
1. Create mock implementations in `/simulator/mocks/`
2. Test each mock independently
3. Integrate mocks with extracted extension code
