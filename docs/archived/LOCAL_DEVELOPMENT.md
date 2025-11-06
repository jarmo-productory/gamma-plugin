# Local Development Setup Guide

**Last Updated:** October 5, 2025
**Sprint:** 38 - Presentation Save Stabilization

---

## Overview

This guide explains how to set up and use the local development environment for the Productory Powerups for Gamma extension. Local development allows you to:

- Test changes without deploying to production
- Debug with full logging and stack traces
- Iterate faster with hot-reloading API server
- Validate presentation save flows locally

---

## Prerequisites

1. **Node.js** v18+ and npm installed
2. **Chrome browser** for extension testing
3. **Supabase CLI** (optional, for database changes)
4. **Git** for version control

---

## Quick Start

### 1. Start Local Development Server

```bash
# Terminal 1: Start Next.js dev server
cd packages/web
PORT=3000 npm run dev
```

The API will be available at `http://localhost:3000/api/*`

### 2. Build Local Extension

```bash
# Terminal 2: Build extension for local development
npm run build:local
```

This creates an extension in `packages/extension/dist/` configured to use `localhost:3000`.

### 3. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `packages/extension/dist` folder
5. The extension will appear in your toolbar

### 4. Test the Save Flow

1. Navigate to a Gamma presentation (e.g., `https://gamma.app/docs/test`)
2. Open the extension sidebar
3. Click "Login" to pair your device
4. Make changes to the presentation
5. Click "Save" - data will be sent to `localhost:3000`

---

## Build Commands

### Local Development

```bash
# Build extension pointing to localhost:3000
npm run build:local

# Output: packages/extension/dist/
# Config: apiBaseUrl = "http://localhost:3000"
# Debug: debugMode = true, loggingEnabled = true
```

### Production Build

```bash
# Build extension pointing to production API
npm run build:prod

# Output: packages/extension/dist-prod/
# Config: apiBaseUrl = "https://productory-powerups.netlify.app"
# Debug: debugMode = false, loggingEnabled = false
```

### Standard Build (Production)

```bash
# Alias for production build
npm run build:extension

# Same as npm run build:prod
```

---

## Environment Configuration

### Local Environment (`environment.local.ts`)

```typescript
export const ENVIRONMENT_CONFIG: EnvironmentConfig = {
  environment: 'development',
  apiBaseUrl: 'http://localhost:3000',
  webBaseUrl: 'http://localhost:3000',
  enableAnalytics: false,
  logLevel: 'debug',
  maxStorageSize: 50,
  syncIntervalMs: 30000,
};

export const DEBUG_MODE = true;
export const LOGGING_ENABLED = true;
```

### Production Environment (`environment.production.ts`)

```typescript
export const ENVIRONMENT_CONFIG: EnvironmentConfig = {
  environment: 'production',
  apiBaseUrl: 'https://productory-powerups.netlify.app',
  webBaseUrl: 'https://productory-powerups.netlify.app',
  enableAnalytics: false,
  logLevel: 'info',
  maxStorageSize: 50,
  syncIntervalMs: 30000,
};

export const DEBUG_MODE = false;
export const LOGGING_ENABLED = false;
```

### Build-Time Tree Shaking

The Vite build system automatically:
1. Replaces `__BUILD_ENV__` constant with literal string (`'local'` or `'production'`)
2. Tree-shakes unused imports (removes unused environment files)
3. Produces optimized bundles with no runtime overhead

---

## API Endpoints (Local Development)

When using `npm run build:local`, the extension will call these local endpoints:

### Authentication
- `POST /api/devices/register` - Register new device
- `POST /api/devices/exchange` - Exchange pairing code for token
- `POST /api/devices/refresh` - Refresh expired token
- `GET /api/user/profile` - Get current user profile

### Presentations
- `POST /api/presentations/save` - Save/update presentation
- `GET /api/presentations/get?url=<gamma_url>` - Retrieve presentation
- `GET /api/presentations/list` - List user's presentations

---

## Testing the Save Flow

### 1. Device Pairing (First Time)

```bash
# Extension calls local API
POST http://localhost:3000/api/devices/register
Response: { deviceId, code, expiresAt }

# User opens web app with code
http://localhost:3000/?source=extension&code=ABC123

# Extension polls for linking
POST http://localhost:3000/api/devices/exchange
Response: { token, expiresAt, userId }
```

### 2. Presentation Save

```bash
# Extension saves presentation
POST http://localhost:3000/api/presentations/save
Authorization: Bearer <device-token>
Content-Type: application/json

{
  "gamma_url": "https://gamma.app/docs/test-123",
  "title": "Test Presentation",
  "start_time": "09:00",
  "total_duration": 60,
  "timetable_data": {
    "title": "Test Presentation",
    "items": [
      {
        "id": "slide-1",
        "title": "Introduction",
        "duration": 10,
        "startTime": "09:00",
        "endTime": "09:10"
      }
    ],
    "startTime": "09:00",
    "totalDuration": 60
  }
}

Response: {
  "success": true,
  "presentation": { id, gamma_url, title, ... }
}
```

---

## Debugging

### Enable Debug Logging

Local builds automatically have `debugMode = true` and `loggingEnabled = true`.

**Chrome DevTools Console:**
```javascript
// Extension logs
[SIDEBAR] Connected to background
[AuthManager] Token refreshed successfully
[StorageManager] Saved timetable-https://gamma.app/docs/test

// API logs (from Next.js dev server)
[API] POST /api/presentations/save
[API] Device token validated: user-123
[API] RPC called: rpc_upsert_presentation_from_device
```

### Common Debug Patterns

**Check Current Config:**
```javascript
// In extension console
chrome.storage.local.get('app_config_v4', console.log)

// Should show apiBaseUrl: "http://localhost:3000"
```

**Verify Environment Injection:**
```bash
# Check built files contain correct URL
cat packages/extension/dist/sidebar.js | grep -o "localhost:3000"
# Should return: localhost:3000
```

**Test API Directly:**
```bash
# Register device
curl -X POST http://localhost:3000/api/devices/register \
  -H "Content-Type: application/json" \
  -d '{"device_fingerprint":"test-123"}'

# Save presentation (with valid token)
curl -X POST http://localhost:3000/api/presentations/save \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"gamma_url":"https://gamma.app/test","title":"Test","timetable_data":{}}'
```

---

## Troubleshooting

### Issue: Extension Still Using Production API

**Symptom:** Extension sends requests to `productory-powerups.netlify.app` instead of `localhost:3000`

**Solution:**
```bash
# 1. Verify BUILD_ENV is set
BUILD_ENV=local npm run build:extension

# 2. Check built config
cat packages/extension/dist/sidebar.js | grep apiBaseUrl
# Should contain: "http://localhost:3000"

# 3. Reload extension in Chrome
# chrome://extensions/ → Click refresh icon
```

### Issue: CORS Errors in Local Development

**Symptom:** `Access-Control-Allow-Origin` errors in browser console

**Solution:**
Next.js dev server automatically handles CORS for `localhost` origins. If issues persist:

```typescript
// packages/web/next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};
```

### Issue: Database Connection Errors

**Symptom:** `connection refused` or `ECONNREFUSED` errors from Supabase

**Solution:**
```bash
# 1. Check Supabase environment variables
cat packages/web/.env.local | grep SUPABASE

# Should have:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# 2. Test Supabase connection
curl https://your-project.supabase.co/rest/v1/ \
  -H "apikey: your-anon-key"
```

### Issue: Device Token Not Saving

**Symptom:** Extension shows "Authentication required" after pairing

**Solution:**
```bash
# 1. Check token in storage
# Chrome DevTools → Application → Storage → Local Storage
# Key: device_token_v1

# 2. Verify token format
{
  "token": "sha256-hashed-token",
  "expiresAt": "2025-10-06T12:00:00Z",
  "userId": "uuid-here"
}

# 3. Test token validation
curl http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer <token>"
```

---

## Local Database Setup (Optional)

If you want to test database changes locally:

### 1. Start Local Supabase

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase instance
supabase start

# Note the local URLs:
# API URL: http://localhost:54321
# Studio URL: http://localhost:54323
```

### 2. Update Environment

```bash
# packages/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-key>
```

### 3. Apply Migrations

```bash
# Apply all migrations to local database
supabase db reset

# Or apply specific migration
supabase db push --local
```

---

## Production Deployment

When ready to deploy to production:

### 1. Build Production Extension

```bash
npm run build:prod
# Output: packages/extension/dist-prod/
```

### 2. Test Production Build Locally

```bash
# Load dist-prod/ folder in Chrome
# Extension will use production API
# Test pairing and save flows
```

### 3. Deploy Web App

```bash
# Deploy Next.js app to Netlify
cd packages/web
npm run build
netlify deploy --prod
```

### 4. Package Extension for Chrome Web Store

```bash
# Create production zip
npm run package:prod
# Output: extension-production.zip

# Upload to Chrome Web Store
# https://chrome.google.com/webstore/developer/dashboard
```

---

## Best Practices

### 1. Always Use Build Commands

❌ **Don't:**
```bash
vite build  # Uses default environment
```

✅ **Do:**
```bash
npm run build:local   # Explicit local build
npm run build:prod    # Explicit production build
```

### 2. Verify Environment After Build

```bash
# Check API URL in built files
cat packages/extension/dist/sidebar.js | grep apiBaseUrl

# Local should show: "http://localhost:3000"
# Production should show: "https://productory-powerups.netlify.app"
```

### 3. Keep Local and Production in Sync

```bash
# Test locally first
npm run build:local
# Test extension with localhost:3000

# Then build production
npm run build:prod
# Test extension with production API

# Deploy when both work
```

### 4. Use Debug Mode for Development

Local builds have debug mode enabled by default. This provides:
- Full console logging
- Detailed error messages
- Stack traces
- Network request details

Production builds have debug mode disabled for:
- Performance
- Security (no sensitive data leaks)
- Clean user experience

---

## File Structure

```
gamma-plugin/
├── packages/
│   ├── extension/
│   │   ├── dist/                    # Local build output
│   │   ├── dist-prod/              # Production build output
│   │   ├── shared-config/
│   │   │   ├── environment.local.ts       # Local config
│   │   │   ├── environment.production.ts  # Production config
│   │   │   └── index.ts                   # Config manager
│   │   ├── background.js
│   │   ├── content.ts
│   │   └── sidebar/
│   └── web/
│       ├── src/app/api/           # API routes
│       └── .env.local             # Local environment vars
├── vite.config.js                 # Build configuration
└── package.json                   # Build scripts
```

---

## Next Steps

1. **Start Local Development:**
   ```bash
   npm run build:local
   PORT=3000 npm run dev:web
   ```

2. **Test Save Flow:**
   - Load extension in Chrome
   - Pair device with localhost
   - Save presentation
   - Verify data in local database

3. **Iterate Quickly:**
   - Make code changes
   - Rebuild: `npm run build:local`
   - Reload extension in Chrome
   - Test changes

4. **Deploy to Production:**
   ```bash
   npm run build:prod
   # Test production build
   # Deploy when ready
   ```

---

## Support

- **Documentation:** `/docs/`
- **Sprint Plan:** `/documents/roadmap/sprint-38-presentation-save-stabilization.md`
- **Architecture:** `/documents/core/technical/presentations-save-architecture.md`
- **Troubleshooting:** `/documents/debugging/presentation-save-troubleshooting.md`

---

**Happy Developing! 🚀**
