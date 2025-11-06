# Simulator Implementation Guide

## Quick Start

```bash
cd packages/simulator
npm install
npm run build

# Test infrastructure
npm run test

# Run CLI
npm run simulator -- --help
```

## Architecture Overview

### Core Components

1. **Chrome API Mocks** (`src/mocks/chrome-apis.ts`)
   - File-based `chrome.storage.local`
   - Node.js crypto wrapper for `crypto.subtle`
   - Runtime stubs

2. **File Storage** (`src/storage/file-storage.ts`)
   - Persists to `data/storage.json`
   - Compatible with DeviceAuth
   - Atomic writes

3. **DeviceAuth Wrapper** (`src/auth/device-auth-wrapper.ts`)
   - Reimplements shared/auth/device.ts logic
   - Works around ES module import issues
   - Full device flow support

4. **CLI Commands** (`src/commands/`)
   - register - Register new device
   - pair - Exchange code for token
   - save - Test authenticated save
   - status - Show auth status
   - clear - Clear all data

5. **Environment Config** (`src/config/environment.ts`)
   - Local: http://localhost:3000
   - Production: https://productory-powerups.netlify.app

6. **Logger** (`src/utils/logger.ts`)
   - Colored output with chalk
   - Request/response logging
   - Debug/info/warn/error levels

## Usage Examples

### Full Authentication Flow

```bash
# 1. Register device
npm run simulator -- register --env local
# Output:
#   Device ID: dev_xxx
#   Code: ABC123
#   Sign-in URL: http://localhost:3000/?source=extension&code=ABC123

# 2. Open URL in browser and authenticate

# 3. Poll for authorization
npm run simulator -- pair --env local
# Output:
#   Device paired successfully!
#   Token: eyJ...
#   Expires: 2024-01-01T12:00:00Z

# 4. Test authenticated request
npm run simulator -- save --env local \
  --url "https://gamma.app/docs/example" \
  --title "My Presentation"
# Output:
#   Presentation saved successfully!

# 5. Check status
npm run simulator -- status --env local
# Output:
#   Device Registration: ACTIVE
#   Authentication Token: VALID
#   Storage: 3 items
```

### Environment Switching

```bash
# Use local development server
npm run simulator -- register --env local

# Use production server
npm run simulator -- register --env production
```

### Debugging

```bash
# Check current status
npm run simulator -- status --env local

# View all storage data
node dist/index.js status --env local
# Shows:
# - device_info_v1
# - device_token_v1
# - install_id_v1

# Clear everything
npm run simulator -- clear
```

## Technical Implementation Notes

### ES Module Import Workaround

**Problem:** `shared/auth/device.ts` uses `import { StorageManager } from '../storage'`
- Node.js ES modules don't support directory imports
- Requires explicit file extension: `'../storage/index.js'`

**Solution:** Created `device-auth-wrapper.ts`
- Reimplements DeviceAuth logic
- Uses simulator's FileStorageManager
- Identical API and behavior

### Chrome Mocks Implementation

**Storage:**
```typescript
chrome.storage.local.get(keys) → Promise<Record<string, any>>
chrome.storage.local.set(items) → Promise<void>
chrome.storage.local.remove(keys) → Promise<void>
chrome.storage.local.clear() → Promise<void>
```

Persists to: `data/storage.json`

**Crypto:**
```typescript
crypto.subtle.digest('SHA-256', data) → Promise<ArrayBuffer>
```

Uses: Node.js `crypto.createHash('sha256')`

**Runtime:**
```typescript
chrome.runtime.id → string
chrome.runtime.lastError → { message: string } | undefined
```

### Global Object Handling

Node.js has read-only `crypto` and `navigator` objects:

```typescript
// Try to define, fallback to extending
try {
  Object.defineProperty(global, 'crypto', { value: mockCrypto });
} catch {
  (global.crypto as any).subtle = new CryptoSubtle();
}
```

## File Structure

```
packages/simulator/
├── src/
│   ├── auth/
│   │   └── device-auth-wrapper.ts    # DeviceAuth reimplementation
│   ├── commands/
│   │   ├── register.ts                # Register device
│   │   ├── pair.ts                    # Pair device
│   │   ├── save.ts                    # Test save
│   │   ├── status.ts                  # Check status
│   │   └── clear.ts                   # Clear data
│   ├── config/
│   │   └── environment.ts             # Environment config
│   ├── mocks/
│   │   └── chrome-apis.ts             # Chrome API mocks
│   ├── storage/
│   │   └── file-storage.ts            # File storage
│   ├── utils/
│   │   └── logger.ts                  # Logger
│   ├── index.ts                       # CLI entry
│   └── test.ts                        # Tests
├── data/                               # Storage files
├── dist/                               # Build output
├── package.json
├── tsconfig.json
├── .env                                # Environment config
├── .env.example
├── .gitignore
└── README.md
```

## Dependencies

**Runtime:**
- `chalk@^5.3.0` - Colored terminal output
- `commander@^11.1.0` - CLI framework
- `dotenv@^16.3.1` - Environment variables

**Development:**
- `typescript@^5.3.2`
- `ts-node@^10.9.1`
- `@types/node@^20.10.0`

## Testing

### Infrastructure Tests

```bash
npm run test
```

Tests:
- ✅ chrome.storage.local works
- ✅ crypto.subtle works
- ✅ File storage works
- ✅ Environment config loads
- ✅ Logger works

### Manual Testing

1. **Device Registration**
   ```bash
   npm run simulator -- register --env local
   # Verify: Device ID, code, URL generated
   ```

2. **Storage Persistence**
   ```bash
   npm run simulator -- register --env local
   npm run simulator -- status --env local
   # Verify: Device info persists
   ```

3. **Environment Switching**
   ```bash
   npm run simulator -- register --env local
   npm run simulator -- status --env local
   # Shows localhost

   npm run simulator -- register --env production
   npm run simulator -- status --env production
   # Shows netlify URL
   ```

4. **Clear Functionality**
   ```bash
   npm run simulator -- register --env local
   npm run simulator -- clear
   npm run simulator -- status --env local
   # Verify: No device registration found
   ```

## Common Issues & Solutions

### Issue: Module not found

**Error:** `Cannot find module '../shared/storage'`

**Cause:** ES module directory import

**Solution:** Already implemented - uses device-auth-wrapper.ts

### Issue: crypto is read-only

**Error:** `Cannot set property crypto`

**Cause:** Node.js global.crypto is read-only

**Solution:** Already handled - uses defineProperty with fallback

### Issue: Build errors

**Error:** TypeScript compilation fails

**Solution:**
```bash
rm -rf dist node_modules
npm install
npm run build
```

## Development Workflow

### Making Changes

1. Edit source files in `src/`
2. Build: `npm run build`
3. Test: `npm run test`
4. Run CLI: `npm run simulator -- <command>`

### Watch Mode

```bash
npm run dev
# TypeScript recompiles on changes
```

### Adding New Commands

1. Create `src/commands/mycommand.ts`
2. Implement command function
3. Register in `src/index.ts`:
   ```typescript
   program
     .command('mycommand')
     .description('My command description')
     .action(async () => {
       await myCommandFunction();
     });
   ```
4. Rebuild and test

## Integration Testing

### With Local Backend

1. Start backend: `cd packages/web && npm run dev`
2. Register device: `npm run simulator -- register --env local`
3. Authenticate in browser
4. Pair device: `npm run simulator -- pair --env local`
5. Test save: `npm run simulator -- save --env local --url "..." --title "Test"`

### With Production Backend

1. Register: `npm run simulator -- register --env production`
2. Open production URL in browser
3. Pair: `npm run simulator -- pair --env production`
4. Test: `npm run simulator -- save --env production --url "..." --title "Test"`

## Code Quality

**Type Safety:**
- Full TypeScript coverage
- Strict mode enabled
- No implicit any

**Error Handling:**
- Try/catch in all commands
- Proper error logging
- Graceful failures

**Code Reuse:**
- Shared interfaces with extension
- Reusable DeviceAuth logic
- Consistent patterns

## Performance

- **Startup:** ~100ms
- **Storage operations:** <10ms (file-based)
- **HTTP requests:** Network dependent
- **Build time:** ~2s

## Security Notes

1. **Storage:**
   - Data stored in `data/storage.json`
   - Add to `.gitignore`
   - Never commit tokens

2. **Environment:**
   - Use `.env` for local config
   - Never commit `.env` files
   - Use `.env.example` for templates

3. **Tokens:**
   - Tokens persisted in storage
   - Cleared with `clear` command
   - Auto-refresh when expired

## Future Enhancements

Potential improvements:
- [ ] Interactive pairing flow
- [ ] QR code generation
- [ ] Batch operations
- [ ] Presentation list/get
- [ ] Automated test suite
- [ ] Performance monitoring
- [ ] Error recovery

## Support

For issues or questions:
1. Check this implementation guide
2. Review README.md
3. Check test.ts for examples
4. Examine command implementations in src/commands/

---

**Version:** 1.0.0
**Last Updated:** 2025-10-05
**Status:** Core infrastructure complete
