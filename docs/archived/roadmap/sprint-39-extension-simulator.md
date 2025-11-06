# SPRINT 39: Extension Simulator for Production Debugging

**Created:** 2025-10-05
**Sprint Type:** 🔬 Debugging Tool + Testing Infrastructure
**Priority:** P1 - High Impact Debugging Tool
**Estimated Duration:** 2-3 days

---

## 🎯 Sprint Objective

Build a standalone Node.js simulator that replicates Chrome Extension behavior to debug production API issues in isolation. The simulator will extract extension logic, mock browser APIs, and enable testing against production endpoints without browser overhead.

---

## 📋 Problem Statement

### Current Challenge

**Debugging production API issues requires:**
1. Building extension with production config
2. Loading in Chrome browser
3. Navigating to Gamma presentation
4. Manually triggering actions
5. Inspecting network requests in DevTools
6. Repeating cycle for each code change

**Problems:**
- Slow iteration cycle (2-5 minutes per test)
- Browser environment complexity (service workers, content scripts, permissions)
- Limited visibility into extension internals
- Cannot reproduce production API calls in isolation
- Manual testing required for each change

### Solution: Extension Simulator

**Build a Node.js CLI tool that:**
- Extracts extension authentication and save logic
- Mocks Chrome APIs (storage, runtime, tabs)
- Connects to production API endpoints
- Logs all API requests/responses
- Enables rapid iteration (< 30 seconds per test)

---

## 🔍 Research Findings Analysis

### From Extension Architecture Audit

**Key Extension Components:**
1. **Device Authentication** (`packages/shared/auth/device.ts`)
   - Registration flow: `POST /api/devices/register`
   - Device pairing: User confirms in web app
   - Token exchange: `POST /api/devices/exchange` (polling)
   - Token validation: `getValidTokenOrRefresh()`

2. **Presentation Save** (`packages/shared/storage/index.ts`)
   - Local save: `chrome.storage.local.set()`
   - Cloud sync: `POST /api/presentations/save`
   - Device token auth: `Authorization: Bearer <token>`
   - Payload: `{ gamma_url, title, timetable_data }`

3. **API Integration** (`/api/presentations/save/route.ts`)
   - Validates device token
   - Calls RPC: `rpc_upsert_presentation_from_device`
   - Returns: `{ success, presentation }`

### Critical Findings from Sprint 38 Audit

**Working Flow (Post-Oct 4 Fix):**
```
Extension → Device Token → API Route → RPC → Database
           (Base64)       (Validation)  (SECURITY DEFINER)
```

**Known Issues to Simulate:**
1. Missing cookies permission (blocking production)
2. Token refresh race conditions
3. Invalid gamma_url formats
4. Silent cloud sync failures

---

## 📦 Sprint Scope

### Phase 1: Simulator Core (Priority P0)
**Duration:** Day 1 AM (4 hours)

**Deliverables:**
- [ ] Node.js project structure (`tools/extension-simulator/`)
- [ ] Chrome API mocks (`chrome.storage`, `chrome.runtime`, `chrome.tabs`)
- [ ] Environment configuration (production vs local)
- [ ] CLI entry point with command parsing

**Files to Create:**
```
tools/extension-simulator/
├── package.json
├── src/
│   ├── index.js                 # CLI entry point
│   ├── chrome-mocks.js          # Browser API mocks
│   ├── config.js                # API endpoint configuration
│   └── utils/
│       ├── logger.js            # Enhanced logging
│       └── http-client.js       # Fetch wrapper with logging
└── README.md
```

**Acceptance Criteria:**
- ✅ `npm run simulate:register` creates device registration
- ✅ Mocked `chrome.storage.local` persists to JSON file
- ✅ All API requests logged with full details
- ✅ Environment variables control API base URL

---

### Phase 2: Authentication Flow (Priority P0)
**Duration:** Day 1 PM (4 hours)

**Deliverables:**
- [ ] Extract device auth logic from extension
- [ ] Implement device registration
- [ ] Mock device pairing (simulate user confirmation)
- [ ] Token exchange polling loop
- [ ] Token persistence and validation

**Files to Extract/Adapt:**
```
# Source Files (Extension)
packages/shared/auth/device.ts       → tools/extension-simulator/src/auth.js
packages/extension/shared-config/    → tools/extension-simulator/src/config.js

# Mocked Flows
1. registerDevice()        → POST /api/devices/register
2. buildSignInUrl()        → Generate pairing URL (no browser open)
3. pollForToken()          → POST /api/devices/exchange (loop)
4. saveToken()             → Write to .simulator-storage.json
5. getValidTokenOrRefresh() → Token validation + refresh
```

**Mock Pairing Confirmation:**
```javascript
// Instead of opening browser:
console.log('🔗 Pairing URL:', pairingUrl);
console.log('⏳ Waiting for user to link device in browser...');
console.log('💡 Tip: Open URL and click "Link Device"');

// Auto-polling
await pollForToken({ maxAttempts: 120, interval: 2500 });
```

**Acceptance Criteria:**
- ✅ `npm run simulate:pair` generates pairing code
- ✅ Displays web URL for manual pairing
- ✅ Polls exchange endpoint until token received
- ✅ Token saved to `.simulator-storage.json`
- ✅ Validation checks token expiry and refreshes

---

### Phase 3: Presentation Save (Priority P0)
**Duration:** Day 2 AM (4 hours)

**Deliverables:**
- [ ] Extract save logic from extension
- [ ] Mock timetable data generation
- [ ] Implement cloud sync function
- [ ] Error handling and retry logic
- [ ] Response validation

**Files to Extract/Adapt:**
```
# Source Files
packages/shared/storage/index.ts    → tools/extension-simulator/src/storage.js
packages/web/src/app/api/presentations/save/route.ts (reference)

# Mock Data
const mockTimetable = {
  title: 'Simulated Presentation',
  startTime: '09:00',
  totalDuration: 60,
  items: [
    { title: 'Slide 1', duration: 300 },
    { title: 'Slide 2', duration: 300 }
  ],
  lastModified: new Date().toISOString()
};
```

**Save Function:**
```javascript
async function savePresentation(options = {}) {
  const {
    gammaUrl = 'https://gamma.app/docs/simulator-test-123',
    title = 'Simulator Test',
    timetableData = mockTimetable
  } = options;

  // 1. Get valid token
  const token = await getValidTokenOrRefresh();

  // 2. Build request
  const payload = {
    gamma_url: gammaUrl,
    title: title,
    start_time: timetableData.startTime,
    total_duration: timetableData.totalDuration,
    timetable_data: timetableData
  };

  // 3. Send to API
  const response = await fetch(`${apiBaseUrl}/api/presentations/save`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  // 4. Log everything
  logRequest('POST /api/presentations/save', payload);
  logResponse(response.status, await response.json());

  return response;
}
```

**Acceptance Criteria:**
- ✅ `npm run simulate:save` saves presentation to production
- ✅ Request payload matches extension format exactly
- ✅ Response logged with full details (headers, body, status)
- ✅ Handles 401 (auth), 400 (validation), 500 (server) errors
- ✅ Can compare request with real extension via HAR export

---

### Phase 4: Debugging & Validation (Priority P1)
**Duration:** Day 2 PM (4 hours)

**Deliverables:**
- [ ] Compare simulator requests with real extension
- [ ] Identify discrepancies (headers, payload, timing)
- [ ] Fix simulator to match production behavior
- [ ] Validate error responses match extension
- [ ] Document findings

**Comparison Process:**
```bash
# 1. Capture real extension request
# In Chrome DevTools → Network → Right-click → Save as HAR

# 2. Run simulator with same params
npm run simulate:save -- --gamma-url "https://gamma.app/docs/abc123"

# 3. Compare:
- Request URL (query params, fragments)
- Headers (Authorization, Content-Type, User-Agent?)
- Payload (gamma_url format, field names, data types)
- Response (status code, body structure)
```

**Validation Checklist:**
- [ ] Same API endpoint called
- [ ] Same HTTP method (POST)
- [ ] Same Authorization header format
- [ ] Same request payload structure
- [ ] Same response handling
- [ ] Same error behavior

**Acceptance Criteria:**
- ✅ Simulator requests indistinguishable from extension
- ✅ Error messages identical (401, 400, 500)
- ✅ Success responses identical (200, presentation data)
- ✅ Network timing logged (request → response)
- ✅ Discrepancies documented in findings report

---

## 🛠️ Technical Architecture

### Project Structure

```
tools/extension-simulator/
├── package.json
├── .env.example
├── .gitignore
├── README.md
│
├── src/
│   ├── index.js              # CLI entry point
│   │   - Command parsing (yargs)
│   │   - Environment setup
│   │   - Execution orchestration
│   │
│   ├── config.js             # Configuration
│   │   - API base URL (production vs local)
│   │   - Storage paths
│   │   - Debug flags
│   │
│   ├── chrome-mocks.js       # Browser API mocks
│   │   - chrome.storage.local
│   │   - chrome.runtime
│   │   - chrome.tabs
│   │
│   ├── auth.js               # Device authentication
│   │   - registerDevice()
│   │   - pollForToken()
│   │   - getValidTokenOrRefresh()
│   │   - saveToken()
│   │
│   ├── storage.js            # Presentation save
│   │   - savePresentation()
│   │   - syncToCloud()
│   │   - buildPayload()
│   │
│   └── utils/
│       ├── logger.js         # Enhanced logging
│       │   - Request/response logging
│       │   - HAR-compatible format
│       │   - Colored console output
│       │
│       ├── http-client.js    # HTTP wrapper
│       │   - Fetch with retries
│       │   - Request/response logging
│       │   - Error handling
│       │
│       └── mock-data.js      # Test data generators
│           - mockTimetable()
│           - mockSlides()
│
├── storage/                  # Simulated chrome.storage
│   └── .simulator-storage.json
│
└── logs/                     # Request/response logs
    ├── 2025-10-05-register.json
    ├── 2025-10-05-exchange.json
    └── 2025-10-05-save.json
```

### Chrome API Mocks

**Implementation:**
```javascript
// chrome-mocks.js
const fs = require('fs').promises;
const path = require('path');

const STORAGE_FILE = path.join(__dirname, '../storage/.simulator-storage.json');

const chrome = {
  storage: {
    local: {
      async get(keys) {
        const data = JSON.parse(await fs.readFile(STORAGE_FILE, 'utf8'));
        if (Array.isArray(keys)) {
          return keys.reduce((acc, key) => {
            if (data[key]) acc[key] = data[key];
            return acc;
          }, {});
        }
        return { [keys]: data[keys] };
      },

      async set(items) {
        const data = JSON.parse(await fs.readFile(STORAGE_FILE, 'utf8'));
        Object.assign(data, items);
        await fs.writeFile(STORAGE_FILE, JSON.stringify(data, null, 2));
      },

      async remove(keys) {
        const data = JSON.parse(await fs.readFile(STORAGE_FILE, 'utf8'));
        const keysArray = Array.isArray(keys) ? keys : [keys];
        keysArray.forEach(key => delete data[key]);
        await fs.writeFile(STORAGE_FILE, JSON.stringify(data, null, 2));
      }
    }
  },

  runtime: {
    sendMessage: (message) => {
      console.log('[MOCK] chrome.runtime.sendMessage:', message);
    }
  },

  tabs: {
    create: ({ url }) => {
      console.log('[MOCK] Would open browser tab:', url);
      console.log('💡 Copy this URL and paste in browser to complete pairing');
    }
  }
};

module.exports = { chrome };
```

### Environment Configuration

```javascript
// config.js
require('dotenv').config();

const ENV = process.env.SIMULATOR_ENV || 'production';

const configs = {
  production: {
    apiBaseUrl: 'https://productory-powerups.netlify.app',
    debugMode: false,
    logLevel: 'info'
  },
  local: {
    apiBaseUrl: 'http://localhost:3000',
    debugMode: true,
    logLevel: 'debug'
  }
};

module.exports = configs[ENV];
```

### CLI Commands

```json
{
  "scripts": {
    "simulate:register": "node src/index.js register",
    "simulate:pair": "node src/index.js pair",
    "simulate:save": "node src/index.js save",
    "simulate:validate": "node src/index.js validate-token",
    "simulate:local": "SIMULATOR_ENV=local node src/index.js"
  }
}
```

---

## 📊 Implementation Timeline

### Day 1: Core Simulator & Authentication

**Morning (4 hours):**
- ✅ Project setup (package.json, folder structure)
- ✅ Chrome API mocks (storage, runtime, tabs)
- ✅ Environment configuration
- ✅ CLI scaffolding (yargs command parser)
- ✅ Logging utilities (request/response logger)

**Afternoon (4 hours):**
- ✅ Extract device auth logic from extension
- ✅ Implement register command
- ✅ Implement pair command (with polling)
- ✅ Token storage and validation
- ✅ Test against production API

**Deliverable:** Working authentication flow simulation

---

### Day 2: Save Flow & Validation

**Morning (4 hours):**
- ✅ Extract save logic from extension
- ✅ Implement save command
- ✅ Mock timetable data
- ✅ Error handling (401, 400, 500)
- ✅ Response validation

**Afternoon (4 hours):**
- ✅ Compare simulator with real extension
- ✅ Fix discrepancies
- ✅ Validate identical behavior
- ✅ Document findings
- ✅ Create troubleshooting guide

**Deliverable:** Production-ready simulator tool

---

### Day 3: Documentation & Integration

**Morning (2 hours):**
- ✅ README with usage examples
- ✅ Configuration guide (.env.example)
- ✅ Troubleshooting section
- ✅ API endpoint reference

**Afternoon (2 hours):**
- ✅ Integration with existing debug workflow
- ✅ Add simulator to CLAUDE.md tools section
- ✅ Team training session (demo)
- ✅ Sprint retrospective

**Deliverable:** Team-ready debugging tool

---

## ✅ Acceptance Criteria

### P0: Core Functionality
- ✅ Simulator successfully registers device with production API
- ✅ Pairing flow works (manual browser confirmation)
- ✅ Token exchange polling completes successfully
- ✅ Presentation save returns 200 with valid data
- ✅ Error responses match real extension behavior

### P1: Accuracy & Reliability
- ✅ Request payloads identical to real extension
- ✅ Response handling matches extension logic
- ✅ Network timing logged for performance analysis
- ✅ Can reproduce all production API scenarios
- ✅ Error messages provide actionable debugging info

### P2: Developer Experience
- ✅ CLI commands clear and intuitive
- ✅ Configuration via .env file
- ✅ Comprehensive logging (request/response)
- ✅ Documentation complete and accurate
- ✅ Can debug production issues in < 5 minutes

---

## 🧪 Testing Strategy

### Unit Tests
```javascript
// test/chrome-mocks.test.js
describe('Chrome API Mocks', () => {
  it('should persist data to JSON file', async () => {
    await chrome.storage.local.set({ test: 'value' });
    const result = await chrome.storage.local.get('test');
    expect(result.test).toBe('value');
  });
});

// test/auth.test.js
describe('Device Authentication', () => {
  it('should register device and return pairing code', async () => {
    const { deviceId, code } = await registerDevice();
    expect(code).toMatch(/^[A-Z0-9]{10,}$/);
  });
});
```

### Integration Tests
```javascript
// test/save-flow.test.js
describe('Presentation Save Flow', () => {
  it('should save presentation to production', async () => {
    // 1. Register device
    const { deviceId, code } = await registerDevice();

    // 2. Mock pairing (requires manual step)
    console.log('Manually link device:', buildSignInUrl(code));
    await waitForUserConfirmation();

    // 3. Exchange for token
    const { token } = await pollForToken({ deviceId, code });

    // 4. Save presentation
    const response = await savePresentation({
      gammaUrl: 'https://gamma.app/docs/test-123',
      title: 'Integration Test'
    });

    expect(response.status).toBe(200);
    expect(response.data.presentation.id).toBeDefined();
  });
});
```

### Manual Validation
```bash
# 1. Register device
npm run simulate:register
# Output: Device ID, Pairing Code, Pairing URL

# 2. Complete pairing
# (Open URL in browser, authenticate, click "Link Device")

# 3. Validate token
npm run simulate:validate
# Output: Token valid, expires at 2025-10-06T10:00:00Z

# 4. Save presentation
npm run simulate:save -- --gamma-url "https://gamma.app/docs/abc123"
# Output: 200 OK, presentation ID: xyz-789

# 5. Compare with real extension
# (Capture HAR from Chrome DevTools)
npm run simulate:compare -- --har-file extension-save.har
# Output: Requests identical ✅
```

---

## ⚠️ Risks & Mitigations

### Risk 1: API Behavioral Differences
**Problem:** Simulator might not perfectly replicate browser environment
**Likelihood:** Medium
**Impact:** Medium (false positives/negatives in debugging)

**Mitigation:**
- Extract exact extension code (minimal adaptation)
- Use same HTTP client library (node-fetch vs fetch API)
- Log all requests in HAR-compatible format
- Validate against real extension requests
- Document known differences (User-Agent, CORS)

### Risk 2: Authentication Flow Complexity
**Problem:** Device pairing requires manual browser step
**Likelihood:** Low
**Impact:** Low (usability issue, not functionality)

**Mitigation:**
- Clear console instructions for pairing
- Auto-open pairing URL if possible (via `open` package)
- Support pre-existing token (skip pairing for repeat runs)
- Document pairing flow in README

### Risk 3: Production API Rate Limiting
**Problem:** Repeated simulator runs might trigger rate limits
**Likelihood:** Low
**Impact:** Medium (blocks testing)

**Mitigation:**
- Use local API for development (SIMULATOR_ENV=local)
- Cache tokens for 24 hours (avoid re-registration)
- Respect token expiry (refresh instead of re-register)
- Document rate limits in troubleshooting guide

### Risk 4: Code Drift
**Problem:** Extension code changes invalidate simulator
**Likelihood:** Medium
**Impact:** Medium (simulator becomes stale)

**Mitigation:**
- Keep simulator in monorepo (`tools/extension-simulator`)
- Reference extension files directly where possible
- CI check: Compare simulator with extension logic
- Documentation: Update procedure when extension changes

---

## 📁 File Structure Reference

### Source Files (Extension)
```
packages/extension/
├── manifest.json                      # Extension metadata
├── background.js                      # Service worker (already has sidebar handler)
├── content.ts                         # Gamma DOM extraction (NOT NEEDED for simulator)
├── sidebar/
│   └── sidebar.js                     # UI and save trigger (EXTRACT save logic)
└── shared-config/
    ├── index.ts                       # Config manager (EXTRACT)
    ├── environment.local.ts           # Local config (REFERENCE)
    └── environment.production.ts      # Production config (REFERENCE)

packages/shared/
├── auth/
│   └── device.ts                      # Device auth (EXTRACT ALL)
└── storage/
    └── index.ts                       # Save logic (EXTRACT syncToCloud, autoSyncIfAuthenticated)

packages/web/src/app/api/
└── presentations/save/
    └── route.ts                       # API endpoint (REFERENCE for validation)
```

### Simulator Files (New)
```
tools/extension-simulator/
├── package.json
├── .env.example
├── .gitignore
├── README.md
├── src/
│   ├── index.js                       # CLI
│   ├── config.js                      # Config
│   ├── chrome-mocks.js                # Mocks
│   ├── auth.js                        # From device.ts
│   ├── storage.js                     # From storage/index.ts
│   └── utils/
│       ├── logger.js
│       ├── http-client.js
│       └── mock-data.js
├── storage/
│   └── .simulator-storage.json
├── logs/
└── test/
    ├── chrome-mocks.test.js
    ├── auth.test.js
    └── save-flow.test.js
```

---

## 🎯 Success Metrics

### Debugging Speed
**Target:** < 5 minutes from issue report to root cause identification
**Measure:** Time from `npm run simulate:save` to error identified
**Baseline:** Currently 30+ minutes (build → load → test → debug)

### API Coverage
**Target:** 100% of extension API calls reproducible
**Measure:** Number of API endpoints simulator can call
**Current Coverage:**
- ✅ `/api/devices/register`
- ✅ `/api/devices/exchange`
- ✅ `/api/devices/refresh`
- ✅ `/api/presentations/save`

### Request Accuracy
**Target:** 100% match with real extension requests
**Measure:** Diff between simulator and extension HAR files
**Validation:** Headers, payload, timing all identical

### Team Adoption
**Target:** 100% of API debugging uses simulator first
**Measure:** Number of production debugs using simulator
**Success:** No manual browser testing needed for API issues

---

## 🔗 Integration Points

### With Existing Workflow
1. **Issue Reported:** Production save failing with 401
2. **Use Simulator:** `npm run simulate:save`
3. **Identify Issue:** Token validation failing (missing cookies permission)
4. **Fix Applied:** Add `"cookies"` to manifest
5. **Validate Fix:** `npm run simulate:save` → 200 OK
6. **Deploy:** Commit fix with confidence

### With Documentation
- Add simulator section to `/documents/debugging/TROUBLESHOOTING.md`
- Update `/documents/core/technical/local-development-guide.md`
- Reference in Sprint 38 final report

### With CI/CD
```yaml
# .github/workflows/test-api.yml
name: Test Production API
on: [push, pull_request]

jobs:
  test-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: cd tools/extension-simulator && npm install
      - run: npm run simulate:validate # Check token still valid
      - run: npm run simulate:save     # Test save flow
```

---

## 📚 Documentation Deliverables

### 1. Simulator README
```markdown
# Extension Simulator

Test production API endpoints without browser overhead.

## Quick Start
```bash
# Install
cd tools/extension-simulator
npm install

# Configure
cp .env.example .env
# Edit .env: Set SIMULATOR_ENV=production

# Register device
npm run simulate:register
# Output: Pairing URL

# Complete pairing in browser
# (Open URL, authenticate, link device)

# Validate token
npm run simulate:validate

# Save presentation
npm run simulate:save
```

## Commands
- `simulate:register` - Create device registration
- `simulate:pair` - Complete pairing flow
- `simulate:validate` - Check token validity
- `simulate:save` - Test presentation save
- `simulate:local` - Use local API (localhost:3000)
```

### 2. Troubleshooting Guide
```markdown
## Simulator Issues

### Problem: 401 Unauthorized
**Cause:** Missing or expired token
**Fix:**
1. Validate token: `npm run simulate:validate`
2. If expired: `npm run simulate:pair`
3. Retry save: `npm run simulate:save`

### Problem: 400 Validation Error
**Cause:** Invalid gamma_url format
**Fix:**
1. Check logs: `cat logs/2025-10-05-save.json`
2. Verify gamma_url: Must be `https://gamma.app/docs/...`
3. Update mock data in `src/utils/mock-data.js`

### Problem: Requests Don't Match Extension
**Cause:** Simulator logic diverged from extension
**Fix:**
1. Capture extension HAR: DevTools → Network → Save as HAR
2. Compare: `npm run simulate:compare -- --har extension.har`
3. Update simulator code to match
4. Retest: `npm run simulate:save`
```

### 3. Developer Onboarding
```markdown
## Using the Simulator

### When to Use
- Debugging production API issues
- Validating API changes
- Testing error scenarios
- Comparing extension behavior

### When NOT to Use
- UI/UX testing (use real extension)
- Browser API testing (use Playwright)
- E2E user flows (use Cypress)

### Best Practices
1. Always use production environment first
2. Log everything (requests, responses, errors)
3. Compare with real extension (HAR files)
4. Document findings in issue tracker
5. Update simulator if extension changes
```

---

## 🚀 Rollout Plan

### Phase 1: Development (Day 1-2)
- Build simulator core
- Extract extension logic
- Validate against production
- Document usage

### Phase 2: Team Training (Day 3 AM)
- Demo simulator capabilities
- Walk through common scenarios
- Practice debugging session
- Q&A and feedback

### Phase 3: Integration (Day 3 PM)
- Add to debugging workflow
- Update documentation references
- Set up CI checks (optional)
- Monitor usage and iterate

### Phase 4: Maintenance (Ongoing)
- Update when extension changes
- Add new API endpoints as needed
- Improve logging and UX
- Gather team feedback

---

## 💡 Future Enhancements (Out of Scope)

### Sprint 40+
- **Automated HAR Comparison:** Diff tool for simulator vs extension
- **Mock Pairing Bypass:** Auto-confirm pairing for CI testing
- **Request Replay:** Save/replay API sequences
- **Performance Profiling:** Measure API latency
- **Multi-Environment Switching:** CLI flag for API selection
- **Interactive Mode:** REPL for live debugging

### Potential Features
- GraphQL support (if API migrates)
- WebSocket simulation (if real-time added)
- Load testing (stress test production API)
- Request fuzzing (security testing)

---

## 📝 Sprint Checklist

### Pre-Sprint
- [x] Sprint plan created and reviewed
- [x] Extension architecture understood
- [x] API endpoints documented
- [x] Success criteria defined

### During Sprint

**Day 1:**
- [ ] Project structure created
- [ ] Chrome API mocks implemented
- [ ] Device auth flow working
- [ ] Token persistence validated

**Day 2:**
- [ ] Save flow implemented
- [ ] Error handling complete
- [ ] Validation against production
- [ ] Discrepancies fixed

**Day 3:**
- [ ] Documentation complete
- [ ] Team training delivered
- [ ] Integration with workflow
- [ ] Sprint retrospective

### Post-Sprint
- [ ] Simulator in production use
- [ ] First production issue debugged
- [ ] Team feedback collected
- [ ] Next sprint planned

---

## 🎉 Expected Outcomes

### Immediate Benefits
1. **Faster Debugging:** 5 minutes vs 30+ minutes per iteration
2. **Isolated Testing:** Test API without browser complexity
3. **Production Validation:** Reproduce issues exactly as they occur
4. **Team Efficiency:** No manual browser testing for API issues

### Long-term Value
1. **CI Integration:** Automated API testing in pipeline
2. **Documentation:** Living reference for API behavior
3. **Onboarding:** New devs can debug without extension knowledge
4. **Confidence:** Deploy with validated API changes

### Metrics to Track
- Time saved per debugging session
- Number of API issues resolved using simulator
- Team adoption rate (% of API debugs using simulator)
- Production bugs prevented (via CI testing)

---

## 🔗 References

### Related Documents
- `/documents/audits/extension-presentation-save-audit.md` - Extension architecture
- `/documents/audits/extension-web-pairing-flow-audit.md` - Device pairing flow
- `/documents/core/technical/Authentication_Flow_Specification.md` - Auth specification
- `/documents/roadmap/sprint-38-presentation-save-stabilization.md` - Recent fixes

### Key Code Files
- `packages/shared/auth/device.ts` - Device authentication
- `packages/shared/storage/index.ts` - Presentation save
- `packages/web/src/app/api/presentations/save/route.ts` - API endpoint
- `packages/extension/manifest.json` - Extension config

### API Endpoints
- `POST /api/devices/register` - Create device registration
- `POST /api/devices/exchange` - Exchange code for token
- `POST /api/devices/refresh` - Refresh expired token
- `POST /api/presentations/save` - Save presentation (device-token auth)

---

**Sprint Status:** Ready to Execute
**Owner:** Development Team
**Stakeholders:** Product, QA, DevOps
**Review Date:** October 8, 2025
**Target Completion:** October 8, 2025

---

**End of Sprint 39 Plan**
