# Extension Simulator Implementation Guide

## Table of Contents
1. [Implementation Phases](#implementation-phases)
2. [Phase 1: Project Setup](#phase-1-project-setup)
3. [Phase 2: Core Infrastructure](#phase-2-core-infrastructure)
4. [Phase 3: Auth Flow Implementation](#phase-3-auth-flow-implementation)
5. [Phase 4: Testing & Validation](#phase-4-testing--validation)
6. [Phase 5: Documentation & Deployment](#phase-5-documentation--deployment)
7. [Code Examples](#code-examples)
8. [Validation Checklist](#validation-checklist)

---

## Implementation Phases

### Overview
The simulator will be built in 5 phases, each deliverable and testable independently:

```
Phase 1: Project Setup (1-2 hours)
└── Initialize Node.js project, TypeScript, dependencies

Phase 2: Core Infrastructure (2-3 hours)
├── File-based storage implementation
├── Configuration system
└── Browser API mocks

Phase 3: Auth Flow Implementation (3-4 hours)
├── Device registration
├── Token exchange polling
└── Token refresh logic

Phase 4: Testing & Validation (2-3 hours)
├── Unit tests
├── Integration tests
└── Comparison with extension

Phase 5: Documentation & Deployment (1-2 hours)
└── CLI documentation, CI/CD setup
```

**Total Estimated Time:** 9-14 hours

---

## Phase 1: Project Setup

### 1.1 Create Project Structure

```bash
# Create simulator package directory
mkdir -p packages/simulator/{src,config,data,test}
cd packages/simulator

# Initialize package.json
npm init -y

# Update package name and scripts
```

**packages/simulator/package.json:**
```json
{
  "name": "productory-powerups-simulator",
  "version": "1.0.0",
  "description": "Standalone simulator for Chrome extension authentication flow",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/index.ts",
    "simulator": "npm run build && node dist/index.js",
    "simulator:dev": "NODE_ENV=local npm run simulator",
    "simulator:prod": "NODE_ENV=production npm run simulator",
    "test": "jest",
    "clean": "rm -rf dist data/*.json"
  },
  "keywords": ["auth", "simulator", "chrome-extension"],
  "author": "Jarmo Tuisk",
  "license": "MIT"
}
```

### 1.2 Install Dependencies

```bash
# Production dependencies
npm install dotenv node-fetch@3

# Development dependencies
npm install --save-dev \
  typescript \
  @types/node \
  ts-node \
  jest \
  @types/jest \
  ts-jest
```

### 1.3 TypeScript Configuration

**packages/simulator/tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["../shared/*"],
      "@simulator/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### 1.4 Environment Templates

**config/local.env.example:**
```env
# Local Development Configuration
API_BASE_URL=http://localhost:3000
WEB_BASE_URL=http://localhost:3000
ENVIRONMENT=development
LOG_LEVEL=debug
POLL_INTERVAL_MS=2500
MAX_WAIT_MS=300000
```

**config/production.env.example:**
```env
# Production Configuration
API_BASE_URL=https://productory-powerups.netlify.app
WEB_BASE_URL=https://productory-powerups.netlify.app
ENVIRONMENT=production
LOG_LEVEL=info
POLL_INTERVAL_MS=2500
MAX_WAIT_MS=300000
```

### 1.5 Git Configuration

**packages/simulator/.gitignore:**
```
# Dependencies
node_modules/

# Build output
dist/

# Runtime data (contains tokens!)
data/*.json
!data/.gitkeep

# Environment files
config/*.env
!config/*.env.example

# Test coverage
coverage/

# IDE
.vscode/
.idea/
```

### 1.6 Create Directory Structure

```bash
# Create all directories
mkdir -p src/{auth,mocks,config,storage,utils}
mkdir -p test/{unit,integration}
mkdir -p data

# Create placeholder files
touch src/index.ts
touch src/auth/simulator.ts
touch src/auth/types.ts
touch src/mocks/chrome-apis.ts
touch src/storage/file-storage.ts
touch src/config/environment.ts
touch src/utils/logger.ts
touch data/.gitkeep

# Copy environment templates
cp config/local.env.example config/local.env
cp config/production.env.example config/production.env
```

**Validation:**
```bash
# Verify structure
tree packages/simulator -L 2

# Expected output:
# packages/simulator/
# ├── config/
# │   ├── local.env
# │   ├── local.env.example
# │   ├── production.env
# │   └── production.env.example
# ├── data/
# │   └── .gitkeep
# ├── package.json
# ├── src/
# │   ├── auth/
# │   ├── config/
# │   ├── mocks/
# │   ├── storage/
# │   └── utils/
# ├── test/
# │   ├── integration/
# │   └── unit/
# └── tsconfig.json
```

---

## Phase 2: Core Infrastructure

### 2.1 File-based Storage Implementation

**src/storage/file-storage.ts:**
```typescript
import * as fs from 'fs';
import * as path from 'path';

export interface StorageManager {
  save(key: string, value: any): Promise<void>;
  load(key: string): Promise<any>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

export class FileStorageManager implements StorageManager {
  private dataDir: string;

  constructor(dataDir: string = './data') {
    this.dataDir = dataDir;
    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  async save(key: string, value: any): Promise<void> {
    const filePath = this.getFilePath(key);
    const tempPath = `${filePath}.tmp`;

    // Atomic write: write to temp file, then rename
    await fs.promises.writeFile(
      tempPath,
      JSON.stringify(value, null, 2),
      'utf-8'
    );
    await fs.promises.rename(tempPath, filePath);
  }

  async load(key: string): Promise<any> {
    const filePath = this.getFilePath(key);

    if (!fs.existsSync(filePath)) {
      return null;
    }

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
      if (file !== '.gitkeep') {
        await fs.promises.unlink(path.join(this.dataDir, file));
      }
    }
  }

  private getFilePath(key: string): string {
    // Sanitize key to prevent directory traversal
    const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.dataDir, `${sanitizedKey}.json`);
  }
}
```

**Test:**
```bash
# Create test file
cat > test/unit/file-storage.test.ts << 'EOF'
import { FileStorageManager } from '../../src/storage/file-storage';
import * as fs from 'fs';
import * as path from 'path';

describe('FileStorageManager', () => {
  const testDir = './test-data';
  let storage: FileStorageManager;

  beforeEach(() => {
    storage = new FileStorageManager(testDir);
  });

  afterEach(async () => {
    await storage.clear();
    fs.rmdirSync(testDir);
  });

  it('should save and load data', async () => {
    await storage.save('test_key', { value: 'test' });
    const loaded = await storage.load('test_key');
    expect(loaded).toEqual({ value: 'test' });
  });

  it('should return null for missing keys', async () => {
    const loaded = await storage.load('missing_key');
    expect(loaded).toBeNull();
  });

  it('should remove data', async () => {
    await storage.save('test_key', { value: 'test' });
    await storage.remove('test_key');
    const loaded = await storage.load('test_key');
    expect(loaded).toBeNull();
  });
});
EOF

npm test
```

### 2.2 Configuration System

**src/config/environment.ts:**
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

export function loadConfig(env?: 'local' | 'production'): SimulatorConfig {
  // Determine environment from arg or NODE_ENV
  const environment = env || (process.env.NODE_ENV === 'production' ? 'production' : 'local');

  // Load environment file
  const envFile = path.join(__dirname, `../../config/${environment}.env`);
  dotenv.config({ path: envFile });

  // Build config with defaults
  return {
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
    webBaseUrl: process.env.WEB_BASE_URL || 'http://localhost:3000',
    environment: (process.env.ENVIRONMENT as 'development' | 'production') || 'development',
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '2500', 10),
    maxWaitMs: parseInt(process.env.MAX_WAIT_MS || '300000', 10),
  };
}
```

**src/config/index.ts:**
```typescript
export * from './environment';
```

### 2.3 Browser API Mocks

**src/mocks/chrome-apis.ts:**
```typescript
import { FileStorageManager } from '../storage/file-storage';

// Mock chrome.storage.local using FileStorageManager
class ChromeStorageMock {
  private storage: FileStorageManager;

  constructor(dataDir: string = './data') {
    this.storage = new FileStorageManager(dataDir);
  }

  async get(keys: string | string[]): Promise<any> {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    const result: any = {};

    for (const key of keyArray) {
      const value = await this.storage.load(key);
      if (value !== null) {
        result[key] = value;
      }
    }

    return result;
  }

  async set(items: { [key: string]: any }): Promise<void> {
    for (const [key, value] of Object.entries(items)) {
      await this.storage.save(key, value);
    }
  }

  async remove(keys: string | string[]): Promise<void> {
    const keyArray = Array.isArray(keys) ? keys : [keys];

    for (const key of keyArray) {
      await this.storage.remove(key);
    }
  }

  async clear(): Promise<void> {
    await this.storage.clear();
  }
}

// Setup global chrome mock
export function setupChromeMocks(dataDir: string = './data'): void {
  (global as any).chrome = {
    storage: {
      local: new ChromeStorageMock(dataDir)
    },
    runtime: {
      id: 'simulator-mock-extension-id',
      getManifest: () => ({ version: '1.0.0' })
    }
  };
}
```

### 2.4 Logging Utility

**src/utils/logger.ts:**
```typescript
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private level: LogLevel;
  private levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug('[DEBUG]', ...args);
    }
  }

  info(...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info('[INFO]', ...args);
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn('[WARN]', ...args);
    }
  }

  error(...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error('[ERROR]', ...args);
    }
  }

  private shouldLog(msgLevel: LogLevel): boolean {
    const currentLevelIndex = this.levels.indexOf(this.level);
    const msgLevelIndex = this.levels.indexOf(msgLevel);
    return msgLevelIndex >= currentLevelIndex;
  }
}

export const logger = new Logger();
```

---

## Phase 3: Auth Flow Implementation

### 3.1 Copy and Adapt DeviceAuth

**Strategy:** Reuse DeviceAuth from shared package with minimal changes

```bash
# Copy DeviceAuth to simulator (for reference/modification if needed)
cp ../shared/auth/device.ts src/auth/device-auth.ts

# Or use it directly via import (preferred):
# No copy needed, just import from @shared/auth/device
```

**src/auth/device-auth.ts** (if copying):
- Keep all core logic identical
- Only change: Use FileStorageManager instead of chrome.storage

**OR use directly (recommended):**
```typescript
// src/auth/index.ts
import { DeviceAuth } from '@shared/auth/device';
import { FileStorageManager } from '../storage/file-storage';

// Create instance with file storage
export const deviceAuth = new DeviceAuth(
  new FileStorageManager('./data')
);
```

### 3.2 Auth Simulator Orchestration

**src/auth/simulator.ts:**
```typescript
import { DeviceAuth, DeviceInfo, DeviceToken } from './device-auth';
import { SimulatorConfig } from '../config';
import { logger } from '../utils/logger';

export interface AuthStatus {
  isRegistered: boolean;
  isPaired: boolean;
  isTokenValid: boolean;
  deviceId?: string;
  expiresAt?: string;
}

export class AuthSimulator {
  private deviceAuth: DeviceAuth;
  private config: SimulatorConfig;

  constructor(deviceAuth: DeviceAuth, config: SimulatorConfig) {
    this.deviceAuth = deviceAuth;
    this.config = config;
    logger.setLevel(config.logLevel);
  }

  async register(): Promise<DeviceInfo> {
    logger.info('Registering new device...');

    const deviceInfo = await this.deviceAuth.registerDevice(
      this.config.apiBaseUrl
    );

    const pairingUrl = this.deviceAuth.buildSignInUrl(
      this.config.webBaseUrl,
      deviceInfo.code
    );

    logger.info('✅ Device registered successfully!');
    logger.info('');
    logger.info('📋 Pairing Code:', deviceInfo.code);
    logger.info('🔗 Pairing URL:', pairingUrl);
    logger.info('');
    logger.info('⏳ Open this URL in browser to complete pairing.');
    logger.info(`   Expires at: ${new Date(deviceInfo.expiresAt).toLocaleString()}`);

    return deviceInfo;
  }

  async pair(code?: string): Promise<DeviceToken> {
    logger.info('Starting pairing process...');

    // Get stored device info
    const deviceInfo = await this.deviceAuth.getStoredDeviceInfo();

    if (!deviceInfo) {
      throw new Error('No device registered. Run "register" first.');
    }

    // Validate code if provided
    if (code && deviceInfo.code !== code) {
      throw new Error(`Invalid pairing code. Expected: ${deviceInfo.code}`);
    }

    logger.info(`Polling for pairing confirmation (device: ${deviceInfo.deviceId})...`);
    logger.info('⏳ Waiting for user to complete pairing in browser...');

    const token = await this.deviceAuth.pollExchangeUntilLinked(
      this.config.apiBaseUrl,
      deviceInfo.deviceId,
      deviceInfo.code,
      {
        intervalMs: this.config.pollIntervalMs,
        maxWaitMs: this.config.maxWaitMs,
      }
    );

    if (!token) {
      throw new Error('Pairing timeout - please try again');
    }

    logger.info('✅ Pairing successful!');
    logger.info(`   Token expires at: ${new Date(token.expiresAt).toLocaleString()}`);

    return token;
  }

  async refresh(): Promise<DeviceToken> {
    logger.info('Refreshing device token...');

    const token = await this.deviceAuth.getValidTokenOrRefresh(
      this.config.apiBaseUrl
    );

    if (!token) {
      throw new Error('No valid token found. Please pair device first.');
    }

    logger.info('✅ Token refreshed successfully!');
    logger.info(`   New expiry: ${new Date(token.expiresAt).toLocaleString()}`);

    return token;
  }

  async status(): Promise<AuthStatus> {
    const deviceInfo = await this.deviceAuth.getStoredDeviceInfo();
    const token = await this.deviceAuth.getStoredToken();
    const isTokenValid = token ? !this.isExpired(token.expiresAt) : false;

    const status: AuthStatus = {
      isRegistered: !!deviceInfo,
      isPaired: !!token,
      isTokenValid,
      deviceId: deviceInfo?.deviceId,
      expiresAt: token?.expiresAt,
    };

    // Display status
    logger.info('📊 Auth Status:');
    logger.info(`   Registered: ${status.isRegistered ? '✅' : '❌'}`);
    logger.info(`   Paired: ${status.isPaired ? '✅' : '❌'}`);
    logger.info(`   Token Valid: ${status.isTokenValid ? '✅' : '❌'}`);

    if (status.deviceId) {
      logger.info(`   Device ID: ${status.deviceId}`);
    }

    if (status.expiresAt) {
      logger.info(`   Expires: ${new Date(status.expiresAt).toLocaleString()}`);
    }

    return status;
  }

  async clear(): Promise<void> {
    logger.info('Clearing all stored data...');

    await this.deviceAuth.clearToken();
    // Also clear device info by setting to null
    await this.deviceAuth.saveDeviceInfo(null as any);

    logger.info('✅ All data cleared');
  }

  private isExpired(expiresAt: string): boolean {
    return new Date(expiresAt) <= new Date();
  }
}
```

### 3.3 CLI Entry Point

**src/index.ts:**
```typescript
#!/usr/bin/env node

import { DeviceAuth } from '@shared/auth/device';
import { FileStorageManager } from './storage/file-storage';
import { AuthSimulator } from './auth/simulator';
import { loadConfig } from './config';
import { setupChromeMocks } from './mocks/chrome-apis';
import { logger } from './utils/logger';

async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  if (!command || command === 'help') {
    showHelp();
    process.exit(0);
  }

  try {
    // Setup environment
    setupChromeMocks();
    const config = loadConfig();
    const storage = new FileStorageManager('./data');
    const deviceAuth = new DeviceAuth(storage);
    const simulator = new AuthSimulator(deviceAuth, config);

    // Execute command
    switch (command) {
      case 'register':
        await simulator.register();
        break;

      case 'pair':
        await simulator.pair(arg);
        break;

      case 'refresh':
        await simulator.refresh();
        break;

      case 'status':
        await simulator.status();
        break;

      case 'clear':
        await simulator.clear();
        break;

      default:
        logger.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    logger.error('❌ Error:', (error as Error).message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
Productory Powerups Extension Simulator
========================================

Usage: npm run simulator <command> [args]

Commands:
  register              Register a new device and get pairing code
  pair [code]           Complete device pairing (optional code validation)
  refresh               Refresh the current device token
  status                Show current authentication status
  clear                 Clear all stored data
  help                  Show this help message

Environment:
  Use npm run simulator:dev for local API (default)
  Use npm run simulator:prod for production API

Examples:
  npm run simulator register
  npm run simulator pair 123456
  npm run simulator:prod refresh
  npm run simulator status
  npm run simulator clear
  `);
}

// Run CLI
main();
```

---

## Phase 4: Testing & Validation

### 4.1 Unit Tests

**test/unit/auth-simulator.test.ts:**
```typescript
import { AuthSimulator } from '../../src/auth/simulator';
import { DeviceAuth } from '@shared/auth/device';
import { FileStorageManager } from '../../src/storage/file-storage';
import { SimulatorConfig } from '../../src/config';

describe('AuthSimulator', () => {
  let simulator: AuthSimulator;
  let storage: FileStorageManager;
  let config: SimulatorConfig;

  beforeEach(() => {
    storage = new FileStorageManager('./test-data');
    config = {
      apiBaseUrl: 'http://localhost:3000',
      webBaseUrl: 'http://localhost:3000',
      environment: 'development',
      logLevel: 'error', // Suppress logs in tests
      pollIntervalMs: 100,
      maxWaitMs: 1000,
    };
    const deviceAuth = new DeviceAuth(storage);
    simulator = new AuthSimulator(deviceAuth, config);
  });

  afterEach(async () => {
    await storage.clear();
  });

  it('should show unregistered status initially', async () => {
    const status = await simulator.status();
    expect(status.isRegistered).toBe(false);
    expect(status.isPaired).toBe(false);
  });

  it('should handle missing device info gracefully', async () => {
    await expect(simulator.pair()).rejects.toThrow('No device registered');
  });
});
```

### 4.2 Integration Tests

**test/integration/auth-flow.test.ts:**
```typescript
describe('Full Auth Flow (Integration)', () => {
  it('should complete full registration and pairing flow', async () => {
    // Note: This requires a running API server
    // For CI/CD, mock the API endpoints

    // 1. Register device
    const deviceInfo = await simulator.register();
    expect(deviceInfo.deviceId).toBeDefined();

    // 2. Simulate pairing in browser
    // (In real test, use test user credentials)

    // 3. Poll for token
    const token = await simulator.pair(deviceInfo.code);
    expect(token.token).toBeDefined();

    // 4. Verify status
    const status = await simulator.status();
    expect(status.isTokenValid).toBe(true);
  });
});
```

### 4.3 Comparison Testing

**test/comparison/network-requests.test.ts:**
```typescript
// Compare network requests between extension and simulator
describe('Network Request Comparison', () => {
  it('should match extension device registration request', async () => {
    // Capture simulator request
    const simulatorRequest = await captureRequest(() => simulator.register());

    // Compare with extension request (from DevTools export)
    const extensionRequest = loadExtensionRequest('register.json');

    expect(simulatorRequest.method).toBe(extensionRequest.method);
    expect(simulatorRequest.headers).toMatchObject(extensionRequest.headers);
    expect(simulatorRequest.body).toEqual(extensionRequest.body);
  });
});
```

---

## Phase 5: Documentation & Deployment

### 5.1 README Documentation

**packages/simulator/README.md:**
```markdown
# Extension Simulator

Standalone Node.js simulator for testing Chrome extension authentication flow.

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Configure environment
cp config/local.env.example config/local.env

# Register device
npm run simulator register

# Complete pairing in browser, then:
npm run simulator pair <CODE>

# Check status
npm run simulator status
\`\`\`

## Commands

- `register` - Register new device
- `pair [code]` - Complete pairing
- `refresh` - Refresh token
- `status` - Show auth status
- `clear` - Clear all data

## Configuration

Edit `config/local.env` for local development or `config/production.env` for production testing.

## Testing

\`\`\`bash
npm test
\`\`\`

See [Implementation Guide](../../documents/architecture/simulator-implementation-guide.md) for details.
```

### 5.2 CI/CD Integration

**.github/workflows/test-simulator.yml:**
```yaml
name: Test Extension Simulator

on:
  push:
    paths:
      - 'packages/simulator/**'
      - 'packages/shared/auth/**'
  pull_request:
    paths:
      - 'packages/simulator/**'

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: packages/simulator
        run: npm install

      - name: Run tests
        working-directory: packages/simulator
        run: npm test

      - name: Build simulator
        working-directory: packages/simulator
        run: npm run build

      - name: Test device registration
        working-directory: packages/simulator
        run: npm run simulator register
        env:
          API_BASE_URL: ${{ secrets.TEST_API_URL }}
```

---

## Code Examples

### Example 1: Manual Auth Flow Test

```bash
# Terminal 1: Start simulator
cd packages/simulator
npm run simulator:dev register

# Output:
# ✅ Device registered successfully!
#
# 📋 Pairing Code: 123456
# 🔗 Pairing URL: http://localhost:3000/?source=extension&code=123456
#
# ⏳ Open this URL in browser to complete pairing.

# Terminal 2: Open browser and complete pairing
open "http://localhost:3000/?source=extension&code=123456"
# (Sign in with test account)

# Terminal 1: Complete pairing
npm run simulator pair 123456

# Output:
# ✅ Pairing successful!
#    Token expires at: 10/6/2025, 12:00:00 PM
```

### Example 2: Automated Test Script

```typescript
// test/e2e/automated-flow.ts
import { AuthSimulator } from '../../src/auth/simulator';

async function runAutomatedTest() {
  const simulator = createSimulator();

  // 1. Register
  console.log('Step 1: Register device');
  const deviceInfo = await simulator.register();

  // 2. Auto-pair (using test credentials)
  console.log('Step 2: Auto-complete pairing');
  await autoPairDevice(deviceInfo.code); // Helper function

  // 3. Exchange token
  console.log('Step 3: Exchange token');
  const token = await simulator.pair();

  // 4. Verify
  console.log('Step 4: Verify status');
  const status = await simulator.status();

  if (status.isTokenValid) {
    console.log('✅ Automated test PASSED');
  } else {
    throw new Error('Automated test FAILED');
  }
}
```

### Example 3: Token Refresh Monitoring

```typescript
// scripts/monitor-token.ts
import { AuthSimulator } from '../src/auth/simulator';

async function monitorToken() {
  const simulator = createSimulator();

  setInterval(async () => {
    const status = await simulator.status();

    if (!status.isTokenValid) {
      console.log('⚠️  Token expired, refreshing...');
      try {
        await simulator.refresh();
        console.log('✅ Token refreshed');
      } catch (err) {
        console.error('❌ Refresh failed:', err);
      }
    } else {
      console.log('✅ Token still valid');
    }
  }, 60000); // Check every minute
}
```

---

## Validation Checklist

### ✅ Phase 1: Project Setup
- [ ] Package.json configured with all scripts
- [ ] TypeScript compiles without errors
- [ ] Environment files created (local & production)
- [ ] Directory structure matches specification
- [ ] .gitignore excludes sensitive data

### ✅ Phase 2: Core Infrastructure
- [ ] FileStorageManager saves/loads JSON correctly
- [ ] Configuration loads from environment files
- [ ] Chrome API mocks work with DeviceAuth
- [ ] Logger outputs at correct levels
- [ ] All unit tests pass

### ✅ Phase 3: Auth Flow
- [ ] Device registration returns deviceId and code
- [ ] Pairing URL builds correctly
- [ ] Token exchange polls until success/timeout
- [ ] Token refresh updates stored token
- [ ] Clear command removes all data

### ✅ Phase 4: Testing
- [ ] Unit tests cover all modules (>80% coverage)
- [ ] Integration test completes full auth flow
- [ ] Network requests match extension behavior
- [ ] Error scenarios handled gracefully

### ✅ Phase 5: Documentation
- [ ] README documents all commands
- [ ] Implementation guide is complete
- [ ] CI/CD workflow runs successfully
- [ ] Troubleshooting guide covers common issues

---

## Production Safety Measures

### Security Checklist
- [ ] Token files are gitignored
- [ ] Environment files are gitignored
- [ ] No hardcoded credentials in code
- [ ] File permissions set to 600 for sensitive data
- [ ] HTTPS used for production API calls

### Operational Checklist
- [ ] Error messages are user-friendly
- [ ] Logging doesn't expose sensitive data
- [ ] Graceful handling of network failures
- [ ] Clear instructions for troubleshooting
- [ ] Version compatibility documented

---

## Next Steps After Implementation

1. **Validate Against Extension:**
   - Run identical auth flows
   - Compare network requests
   - Verify token formats match

2. **Create Test Suite:**
   - Add more edge case tests
   - Test network failure scenarios
   - Validate token expiry handling

3. **Documentation:**
   - Record demo video
   - Create troubleshooting FAQ
   - Document API endpoint changes

4. **CI/CD Integration:**
   - Add to deployment pipeline
   - Automate auth flow validation
   - Monitor test coverage

---

**Document Version:** 1.0
**Last Updated:** 2025-10-05
**Implementation Time Estimate:** 9-14 hours
**Status:** Ready for Development
