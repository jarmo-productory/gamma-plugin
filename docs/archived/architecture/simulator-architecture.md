# Extension Simulator Architecture Specification

## Executive Summary

This document defines the architecture for a standalone Node.js simulator that replicates the Chrome extension's authentication flow for development and testing purposes. The simulator enables testing device pairing, token exchange, and API integration without requiring Chrome browser installation.

## 1. System Overview

### 1.1 Purpose
- **Development Testing**: Validate auth flow changes without browser
- **API Debugging**: Test device pairing and token exchange in isolation
- **CI/CD Integration**: Automate auth flow validation in pipelines
- **Cross-platform**: Run auth tests on any Node.js environment

### 1.2 Core Capabilities
- Device registration and pairing simulation
- Token exchange and refresh flows
- Authenticated API requests
- Storage persistence (file-based)
- Environment configuration (local/production)

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                 Extension Simulator                      │
│                                                          │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────┐ │
│  │   CLI Tool   │  │  Auth Flow  │  │  Mock Browser  │ │
│  │   (index.ts) │──│  Simulator  │──│  APIs          │ │
│  └──────────────┘  └─────────────┘  └────────────────┘ │
│         │                 │                   │          │
│         ▼                 ▼                   ▼          │
│  ┌──────────────────────────────────────────────────┐  │
│  │          Shared Code (Reused from Extension)      │  │
│  │   • DeviceAuth     • StorageManager               │  │
│  │   • ConfigManager  • Type Definitions             │  │
│  └──────────────────────────────────────────────────┘  │
│         │                 │                   │          │
│         ▼                 ▼                   ▼          │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────┐ │
│  │  File-based  │  │   Config    │  │   Network      │ │
│  │  Storage     │  │   System    │  │   Client       │ │
│  └──────────────┘  └─────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │  Productory Powerups Web API        │
        │  • /api/devices/register            │
        │  • /api/devices/exchange            │
        │  • /api/devices/refresh             │
        │  • /api/user/profile                │
        └─────────────────────────────────────┘
```

## 3. Project Structure

```
packages/simulator/
├── src/
│   ├── index.ts                    # CLI entry point
│   ├── auth/
│   │   ├── simulator.ts            # Auth flow orchestration
│   │   ├── device-auth.ts          # Reused from shared/auth/device.ts
│   │   └── types.ts                # Auth-specific types
│   ├── mocks/
│   │   ├── chrome-apis.ts          # Browser API mocks
│   │   ├── storage.ts              # chrome.storage → fs mock
│   │   └── crypto.ts               # crypto.subtle mock (if needed)
│   ├── config/
│   │   ├── environment.ts          # Environment selection
│   │   ├── index.ts                # Reused ConfigManager
│   │   └── types.ts                # Config types
│   ├── storage/
│   │   ├── file-storage.ts         # File-based StorageManager impl
│   │   └── index.ts                # Storage abstraction
│   └── utils/
│       ├── logger.ts               # Console logging utilities
│       ├── validation.ts           # Input validation
│       └── network.ts              # HTTP client utilities
├── data/                           # Runtime data directory
│   ├── device_info_v1.json        # Device registration data
│   ├── device_token_v1.json       # Current device token
│   ├── install_id_v1.json         # Stable install ID
│   └── app_config_v4.json         # App configuration
├── config/
│   ├── local.env                   # Local API configuration
│   └── production.env              # Production API configuration
├── package.json
├── tsconfig.json
└── README.md
```

## 4. Module Design

### 4.1 CLI Entry Point (`src/index.ts`)

**Responsibilities:**
- Parse command-line arguments
- Initialize configuration and storage
- Orchestrate auth flow simulation
- Display results and status

**Commands:**
```bash
npm run simulator register          # Register new device
npm run simulator pair <CODE>       # Complete pairing with web code
npm run simulator refresh           # Refresh existing token
npm run simulator status            # Show auth status
npm run simulator test              # Run full auth flow test
npm run simulator clear             # Clear all stored data
```

**Key Functions:**
```typescript
async function main() {
  const command = process.argv[2];
  const config = await loadConfig();
  const storage = new FileStorage('./data');
  const simulator = new AuthSimulator(config, storage);

  switch (command) {
    case 'register': await simulator.register(); break;
    case 'pair': await simulator.pair(process.argv[3]); break;
    case 'refresh': await simulator.refresh(); break;
    case 'status': await simulator.status(); break;
    case 'test': await simulator.runFullTest(); break;
    case 'clear': await simulator.clearAll(); break;
    default: showHelp();
  }
}
```

### 4.2 Auth Simulator (`src/auth/simulator.ts`)

**Responsibilities:**
- Orchestrate device pairing flow
- Handle token exchange and refresh
- Validate auth state
- Provide status reporting

**Core Methods:**
```typescript
class AuthSimulator {
  private deviceAuth: DeviceAuth;
  private config: Config;
  private storage: FileStorage;

  async register(): Promise<DeviceInfo> {
    // 1. Register device with API
    const deviceInfo = await this.deviceAuth.registerDevice(
      this.config.apiBaseUrl
    );

    // 2. Build pairing URL
    const pairingUrl = this.deviceAuth.buildSignInUrl(
      this.config.webBaseUrl,
      deviceInfo.code
    );

    // 3. Display pairing instructions
    console.log('Device registered successfully!');
    console.log('Pairing Code:', deviceInfo.code);
    console.log('Pairing URL:', pairingUrl);
    console.log('\nOpen this URL in browser to complete pairing.');

    return deviceInfo;
  }

  async pair(code: string): Promise<DeviceToken> {
    // 1. Get stored device info
    const deviceInfo = await this.deviceAuth.getStoredDeviceInfo();
    if (!deviceInfo || deviceInfo.code !== code) {
      throw new Error('Invalid pairing code');
    }

    // 2. Poll for token exchange
    console.log('Waiting for pairing confirmation...');
    const token = await this.deviceAuth.pollExchangeUntilLinked(
      this.config.apiBaseUrl,
      deviceInfo.deviceId,
      deviceInfo.code,
      { intervalMs: 2500, maxWaitMs: 300000 } // 5 min timeout
    );

    if (!token) {
      throw new Error('Pairing timeout - please try again');
    }

    console.log('Pairing successful!');
    return token;
  }

  async refresh(): Promise<DeviceToken> {
    const token = await this.deviceAuth.getValidTokenOrRefresh(
      this.config.apiBaseUrl
    );

    if (!token) {
      throw new Error('No valid token - please pair device first');
    }

    return token;
  }

  async status(): Promise<AuthStatus> {
    const deviceInfo = await this.deviceAuth.getStoredDeviceInfo();
    const token = await this.deviceAuth.getStoredToken();
    const isValid = token && !this.isExpired(token.expiresAt);

    return {
      isRegistered: !!deviceInfo,
      isPaired: !!token,
      isTokenValid: isValid,
      deviceId: deviceInfo?.deviceId,
      expiresAt: token?.expiresAt,
    };
  }

  async runFullTest(): Promise<void> {
    // 1. Register device
    const deviceInfo = await this.register();

    // 2. Wait for manual pairing (or auto-complete if test mode)
    console.log('\n⏳ Waiting 30 seconds for manual pairing...');
    await sleep(30000);

    // 3. Attempt token exchange
    try {
      const token = await this.pair(deviceInfo.code);
      console.log('✅ Full auth flow test: SUCCESS');
    } catch (err) {
      console.error('❌ Full auth flow test: FAILED', err);
    }
  }
}
```

### 4.3 Browser API Mocks (`src/mocks/chrome-apis.ts`)

**Purpose:** Mock Chrome Extension APIs for Node.js environment

**Strategy:**
- **chrome.storage → File system**: JSON files in `./data/`
- **chrome.runtime → No-op stubs**: Not needed for auth flow
- **crypto.subtle → Node crypto**: Use Node.js crypto module

**Implementation:**
```typescript
// Mock chrome.storage.local
class FileStorageMock {
  private dataDir: string;

  constructor(dataDir = './data') {
    this.dataDir = dataDir;
    fs.mkdirSync(dataDir, { recursive: true });
  }

  async get(key: string): Promise<any> {
    const filePath = path.join(this.dataDir, `${key}.json`);
    if (!fs.existsSync(filePath)) return null;
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  async set(key: string, value: any): Promise<void> {
    const filePath = path.join(this.dataDir, `${key}.json`);
    await fs.promises.writeFile(
      filePath,
      JSON.stringify(value, null, 2),
      'utf-8'
    );
  }

  async remove(key: string): Promise<void> {
    const filePath = path.join(this.dataDir, `${key}.json`);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}

// Global mock setup
global.chrome = {
  storage: {
    local: new FileStorageMock()
  }
};
```

### 4.4 Storage Abstraction (`src/storage/file-storage.ts`)

**Purpose:** File-based implementation of StorageManager interface

**Key Features:**
- Reuse StorageManager interface from `packages/shared/storage`
- Store data as JSON files
- Atomic writes for data safety
- Directory structure matching extension keys

**Implementation:**
```typescript
import { StorageManager } from '@shared/storage';
import * as fs from 'fs';
import * as path from 'path';

export class FileStorageManager implements StorageManager {
  private dataDir: string;

  constructor(dataDir = './data') {
    this.dataDir = dataDir;
    fs.mkdirSync(dataDir, { recursive: true });
  }

  async save(key: string, value: any): Promise<void> {
    const filePath = this.getFilePath(key);
    const tempPath = `${filePath}.tmp`;

    // Atomic write
    await fs.promises.writeFile(
      tempPath,
      JSON.stringify(value, null, 2),
      'utf-8'
    );
    await fs.promises.rename(tempPath, filePath);
  }

  async load(key: string): Promise<any> {
    const filePath = this.getFilePath(key);
    if (!fs.existsSync(filePath)) return null;

    const content = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  async remove(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  async clear(): Promise<void> {
    const files = await fs.promises.readdir(this.dataDir);
    for (const file of files) {
      await fs.promises.unlink(path.join(this.dataDir, file));
    }
  }

  private getFilePath(key: string): string {
    return path.join(this.dataDir, `${key}.json`);
  }
}
```

### 4.5 Configuration System (`src/config/environment.ts`)

**Purpose:** Environment-based configuration matching extension setup

**Configuration Sources:**
1. Environment files (`config/local.env`, `config/production.env`)
2. Environment variables (override files)
3. Default fallbacks

**Environment Structure:**
```typescript
// config/local.env
API_BASE_URL=http://localhost:3000
WEB_BASE_URL=http://localhost:3000
ENVIRONMENT=development
LOG_LEVEL=debug
POLL_INTERVAL_MS=2500
MAX_WAIT_MS=300000

// config/production.env
API_BASE_URL=https://productory-powerups.netlify.app
WEB_BASE_URL=https://productory-powerups.netlify.app
ENVIRONMENT=production
LOG_LEVEL=info
POLL_INTERVAL_MS=2500
MAX_WAIT_MS=300000
```

**Config Loader:**
```typescript
import * as dotenv from 'dotenv';
import * as path from 'path';

export interface SimulatorConfig {
  apiBaseUrl: string;
  webBaseUrl: string;
  environment: 'development' | 'production';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  pollIntervalMs: number;
  maxWaitMs: number;
}

export function loadConfig(env: 'local' | 'production' = 'local'): SimulatorConfig {
  const envFile = path.join(__dirname, `../../config/${env}.env`);
  dotenv.config({ path: envFile });

  return {
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
    webBaseUrl: process.env.WEB_BASE_URL || 'http://localhost:3000',
    environment: (process.env.ENVIRONMENT as any) || 'development',
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '2500'),
    maxWaitMs: parseInt(process.env.MAX_WAIT_MS || '300000'),
  };
}
```

## 5. Shared Code Reuse Strategy

### 5.1 Direct Reuse (No Changes)
These modules work identically in Node.js:
- `packages/shared/auth/device.ts` - DeviceAuth class
- `packages/shared/types/` - All type definitions

### 5.2 Adapted Reuse (Minor Changes)
These modules need small adaptations:
- `packages/shared/storage/` - Use FileStorageManager instead of chrome.storage

### 5.3 Simulator-Specific
These are new implementations:
- `src/auth/simulator.ts` - CLI orchestration
- `src/mocks/chrome-apis.ts` - Browser API mocks
- `src/storage/file-storage.ts` - File-based storage

### 5.4 Import Strategy
```typescript
// Use path aliases for shared code
// tsconfig.json:
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["../shared/*"],
      "@simulator/*": ["./src/*"]
    }
  }
}

// Example usage:
import { DeviceAuth } from '@shared/auth/device';
import { FileStorageManager } from '@simulator/storage/file-storage';
```

## 6. Authentication Flow Simulation

### 6.1 Device Registration Flow
```
┌──────────────┐
│   Simulator  │
└──────┬───────┘
       │
       │ POST /api/devices/register
       │ { device_fingerprint: "..." }
       ▼
┌─────────────────┐
│  Web API        │
│  (Supabase)     │
└────────┬────────┘
         │
         │ Response: { deviceId, code, expiresAt }
         ▼
┌──────────────────┐
│  Save to File    │
│  device_info_v1  │
│  .json           │
└──────────────────┘
```

### 6.2 Device Pairing Flow
```
┌──────────────┐      ┌─────────────────┐
│   Simulator  │      │  Browser (User) │
└──────┬───────┘      └────────┬────────┘
       │                       │
       │ Display pairing URL   │
       │ with code             │
       ├──────────────────────▶│
       │                       │
       │                       │ User signs in
       │                       │ on web app
       │                       │
       │ Poll: POST /exchange  │
       │ { deviceId, code }    │
       │◀──────────────────────┤
       │                       │
       │ 404/425 (not ready)   │
       ├──────────────────────▶│
       │                       │
       │ ... retry polling ... │
       │                       │
       │                       │ Web saves token
       │                       │ to database
       │                       │
       │ Poll: POST /exchange  │
       │◀──────────────────────┘
       │
       │ 200: { token, expiresAt }
       ▼
┌────────────────┐
│  Save to File  │
│  device_token  │
│  _v1.json      │
└────────────────┘
```

### 6.3 Token Refresh Flow
```
┌──────────────┐
│   Simulator  │
└──────┬───────┘
       │
       │ Check token expiry
       │ (expiresAt < now + 5min)
       │
       │ POST /api/devices/refresh
       │ Authorization: Bearer <old_token>
       ▼
┌─────────────────┐
│  Web API        │
└────────┬────────┘
         │
         │ Response: { token, expiresAt }
         ▼
┌──────────────────┐
│  Update File     │
│  device_token_v1 │
│  .json           │
└──────────────────┘
```

## 7. Testing Strategy

### 7.1 Manual Testing Workflow
```bash
# 1. Clean start
npm run simulator clear

# 2. Register device
npm run simulator register
# Output: Pairing code and URL

# 3. Complete pairing (in browser)
# Open URL, sign in, confirm pairing

# 4. Verify token exchange
npm run simulator pair <CODE>
# Output: Token received and saved

# 5. Check status
npm run simulator status
# Output: Auth state details

# 6. Test refresh
npm run simulator refresh
# Output: Token refreshed
```

### 7.2 Automated Testing
```typescript
// test/auth-flow.test.ts
import { AuthSimulator } from '../src/auth/simulator';

describe('Auth Flow Simulator', () => {
  it('should register device successfully', async () => {
    const simulator = new AuthSimulator(testConfig, testStorage);
    const deviceInfo = await simulator.register();

    expect(deviceInfo.deviceId).toBeDefined();
    expect(deviceInfo.code).toMatch(/^\d{6}$/);
  });

  it('should handle pairing timeout gracefully', async () => {
    const simulator = new AuthSimulator(testConfig, testStorage);
    await simulator.register();

    // Mock no pairing confirmation
    await expect(
      simulator.pair('123456', { maxWaitMs: 1000 })
    ).rejects.toThrow('Pairing timeout');
  });
});
```

### 7.3 Comparison Testing
**Goal:** Ensure simulator matches extension behavior

**Approach:**
1. Run same auth flow in extension and simulator
2. Compare network requests (headers, body, timing)
3. Compare stored data structures
4. Validate token formats match

**Network Request Comparison:**
```bash
# Extension: Capture with Chrome DevTools
# Simulator: Log all requests

# Compare:
# - Request method (POST/GET)
# - Headers (Authorization, Content-Type)
# - Request body structure
# - Response handling
```

### 7.4 Error Scenario Testing
Test these failure cases:
- **API unavailable**: Network timeout handling
- **Invalid code**: 404 response from exchange
- **Expired code**: Device info expiry check
- **Token expired**: Refresh flow trigger
- **Invalid token**: 401 handling and re-auth

## 8. Data Flow and Persistence

### 8.1 Storage Keys Mapping
Extension uses chrome.storage, simulator uses JSON files:

| Storage Key | Extension Location | Simulator Location |
|------------|-------------------|-------------------|
| device_info_v1 | chrome.storage.local | ./data/device_info_v1.json |
| device_token_v1 | chrome.storage.local | ./data/device_token_v1.json |
| install_id_v1 | chrome.storage.local | ./data/install_id_v1.json |
| app_config_v4 | chrome.storage.local | ./data/app_config_v4.json |

### 8.2 Data Structure Examples

**device_info_v1.json:**
```json
{
  "deviceId": "dev_abc123xyz789",
  "code": "123456",
  "expiresAt": "2025-10-05T20:00:00.000Z"
}
```

**device_token_v1.json:**
```json
{
  "token": "eyJhbGc...long_jwt_token",
  "expiresAt": "2025-10-06T12:00:00.000Z"
}
```

**install_id_v1.json:**
```json
"inst_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
```

## 9. Security Considerations

### 9.1 Token Storage
- **Extension**: chrome.storage.local (encrypted by Chrome)
- **Simulator**: JSON files (plaintext)
  - ⚠️ **Warning**: Simulator tokens stored in plaintext
  - 🔒 **Mitigation**: Use `.gitignore` for `./data/` directory
  - 🔒 **Mitigation**: File permissions (chmod 600 on token files)

### 9.2 Environment Secrets
- Never commit `.env` files with real credentials
- Use `.env.example` templates
- Document credential rotation process

### 9.3 Network Security
- Use HTTPS for production API calls
- Validate SSL certificates
- Handle network errors gracefully

## 10. Deployment and Usage

### 10.1 Installation
```bash
cd packages/simulator
npm install
npm run build
```

### 10.2 Configuration
```bash
# Copy environment template
cp config/local.env.example config/local.env

# Edit with your API endpoints
vim config/local.env
```

### 10.3 Running Simulator
```bash
# Development (local API)
npm run simulator:dev register

# Production (production API)
npm run simulator:prod register
```

### 10.4 CI/CD Integration
```yaml
# .github/workflows/test-auth-flow.yml
name: Test Auth Flow
on: [push]

jobs:
  auth-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Install simulator
        run: cd packages/simulator && npm install

      - name: Test device registration
        run: npm run simulator register
        env:
          API_BASE_URL: ${{ secrets.API_BASE_URL }}

      - name: Validate auth flow
        run: npm test
```

## 11. Troubleshooting

### 11.1 Common Issues

**Issue: Device registration fails**
```
Error: registerDevice failed: 500
```
**Solution:**
- Check API_BASE_URL in config
- Verify web API is running
- Check network connectivity

**Issue: Token exchange timeout**
```
Error: Pairing timeout - please try again
```
**Solution:**
- Ensure you completed pairing in browser
- Check device code hasn't expired (5 min)
- Verify deviceId matches between register and exchange

**Issue: Token refresh fails**
```
Error: refresh failed: 401
```
**Solution:**
- Token may be invalid/revoked
- Clear data and re-pair: `npm run simulator clear`
- Check token expiry in status

### 11.2 Debug Mode
```bash
# Enable verbose logging
LOG_LEVEL=debug npm run simulator register

# View all stored data
cat ./data/*.json

# Monitor network requests
DEBUG=* npm run simulator register
```

## 12. Future Enhancements

### 12.1 Phase 2 Features
- **Web UI**: Browser-based simulator dashboard
- **Mock Server**: Embedded API server for offline testing
- **Multi-device**: Simulate multiple devices concurrently
- **Performance**: Benchmark auth flow latency

### 12.2 Advanced Testing
- **Chaos Engineering**: Random network failures
- **Load Testing**: Concurrent pairing requests
- **Security Testing**: Token manipulation attempts
- **Compatibility**: Test across Node.js versions

## 13. Dependencies

### 13.1 Required Packages
```json
{
  "dependencies": {
    "dotenv": "^16.0.0",
    "node-fetch": "^3.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  }
}
```

### 13.2 Shared Dependencies
Reuse from extension:
- No external dependencies needed (uses stdlib)
- DeviceAuth uses native fetch API
- StorageManager interface (custom implementation)

## Appendix A: API Endpoint Reference

### Register Device
```
POST /api/devices/register
Body: { device_fingerprint: string }
Response: { deviceId, code, expiresAt }
```

### Exchange Device Code
```
POST /api/devices/exchange
Body: { deviceId, code }
Response: { token, expiresAt } | 404 | 425
```

### Refresh Token
```
POST /api/devices/refresh
Headers: { Authorization: Bearer <token> }
Response: { token, expiresAt }
```

### Get User Profile
```
GET /api/user/profile
Headers: { Authorization: Bearer <token> }
Response: { user: { id, email, name, linkedAt } }
```

## Appendix B: Code Reuse Matrix

| Component | Source | Simulator Usage | Changes Required |
|-----------|--------|-----------------|------------------|
| DeviceAuth | shared/auth/device.ts | Direct import | None |
| StorageManager | shared/storage | Interface only | Custom file impl |
| ConfigManager | shared/config | Adapted | Use env files |
| Type definitions | shared/types | Direct import | None |
| AuthManager | shared/auth | Not used | Too coupled to extension |

---

**Document Version:** 1.0
**Last Updated:** 2025-10-05
**Author:** System Architect Agent
**Status:** Ready for Implementation
