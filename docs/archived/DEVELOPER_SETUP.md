# Developer Setup Guide: Gamma Plugin

**Last Updated:** October 2025 (Sprint 38)
**Estimated Setup Time:** 30 minutes

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Environment Setup](#environment-setup)
4. [Development Workflow](#development-workflow)
5. [Testing](#testing)
6. [Debugging](#debugging)
7. [Deployment](#deployment)

---

## Prerequisites

### Required Software

| Tool | Version | Installation |
|------|---------|--------------|
| **Node.js** | 18+ | [Download](https://nodejs.org/) or `nvm install 18` |
| **npm** | 9+ | Included with Node.js |
| **Git** | 2.30+ | [Download](https://git-scm.com/) |
| **Chrome** | Latest | [Download](https://www.google.com/chrome/) |
| **Supabase CLI** | Latest | `npm install -g supabase` |

### Required Accounts

- **Supabase:** Free tier account for database access
- **Netlify:** Free tier account for deployment (optional for local dev)
- **GitHub:** Repository access

### Verify Installation

```bash
# Check versions
node --version    # Should be v18.x.x or higher
npm --version     # Should be 9.x.x or higher
supabase --version  # Should be 1.x.x or higher
git --version     # Should be 2.30.x or higher

# If any command fails, install missing tool
```

---

## Quick Start

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/gamma-plugin.git
cd gamma-plugin

# Verify directory structure
ls -la
# Expected: packages/, supabase/, docs/, ...
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
npm install

# Verify installation
npm list --depth=0
# Should show: @shared/*, @extension/*, @web/*
```

### 3. Setup Environment

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your credentials
nano .env.local  # or use your preferred editor
```

**Required Environment Variables:**

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Netlify deployment
NETLIFY_AUTH_TOKEN=your-netlify-token
NETLIFY_SITE_ID=your-site-id
```

**Get Supabase Credentials:**
1. Login to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Settings → API
4. Copy `URL`, `anon key`, and `service_role key`

### 4. Setup Local Database

```bash
# Link to remote Supabase project
supabase link --project-ref <your-project-ref>

# Pull schema from remote
supabase db pull

# Or reset local database
supabase db reset

# Verify migrations
supabase migration list
# Should show all migrations as "Applied"
```

### 5. Build Extension (Local Development)

```bash
# Build extension for local development (localhost:3000)
npm run build:local

# Output should show:
# ✓ Built in XXXms
# Extension built to: packages/extension/dist
```

### 6. Load Extension in Chrome

```
1. Open Chrome and navigate to: chrome://extensions
2. Toggle "Developer mode" (top-right corner)
3. Click "Load unpacked"
4. Select: gamma-plugin/packages/extension/dist
5. Extension should appear with icon and name "Productory Powerups"
```

### 7. Start Development Server

```bash
# Start Next.js dev server on localhost:3000
npm run dev

# Server should output:
# ✓ Ready on http://localhost:3000
# ○ Compiling / ...
```

### 8. Verify Setup

```
1. Navigate to http://localhost:3000 in Chrome
2. Extension icon should be visible in Chrome toolbar
3. Click extension icon → Should open sidebar
4. Try pairing device and saving a test presentation
```

---

## Environment Setup

### Build Environments

The project supports multiple build environments:

| Environment | API Endpoint | Debug Mode | Use Case |
|-------------|-------------|-----------|----------|
| **local** | http://localhost:3000 | ✅ Enabled | Local development |
| **staging** | https://staging.example.com | ✅ Enabled | QA testing |
| **production** | https://productory-powerups.netlify.app | ❌ Disabled | Production release |

### Build Commands

```bash
# Local development (localhost:3000)
npm run build:local

# Production (Netlify)
npm run build

# Development (alias for build:local)
npm run build:dev
```

### Environment Configuration Files

**Production Config** (`packages/extension/shared-config/environment.production.ts`):
```typescript
export const ENVIRONMENT_CONFIG = {
  environment: 'production' as const,
  apiBaseUrl: 'https://productory-powerups.netlify.app',
  webBaseUrl: 'https://productory-powerups.netlify.app',
  enableAnalytics: true,
  logLevel: 'error' as const,
  maxStorageSize: 50, // MB
  syncIntervalMs: 60000 // 1 minute
};

export const DEBUG_MODE = false;
export const LOGGING_ENABLED = false;
```

**Local Config** (`packages/extension/shared-config/environment.local.ts`):
```typescript
export const ENVIRONMENT_CONFIG = {
  environment: 'development' as const,
  apiBaseUrl: 'http://localhost:3000',
  webBaseUrl: 'http://localhost:3000',
  enableAnalytics: false,
  logLevel: 'debug' as const,
  maxStorageSize: 100, // MB
  syncIntervalMs: 30000 // 30 seconds
};

export const DEBUG_MODE = true;
export const LOGGING_ENABLED = true;
```

### How Environment Selection Works

**Build-time Tree Shaking:**

```javascript
// vite.config.js
export default defineConfig({
  define: {
    __BUILD_ENV__: JSON.stringify(process.env.BUILD_ENV || 'production')
  }
});

// packages/extension/shared-config/index.ts
declare const __BUILD_ENV__: string;

export const DEFAULT_ENVIRONMENT_CONFIG =
  __BUILD_ENV__ === 'local' ? LOCAL_ENV :
  __BUILD_ENV__ === 'development' ? LOCAL_ENV :
  PROD_ENV;
```

**Result:**
- Vite replaces `__BUILD_ENV__` with literal string at build time
- Unused environment imports are tree-shaken away
- No runtime overhead for environment detection

---

## Development Workflow

### Typical Development Cycle

```bash
# 1. Start local database (if not running)
supabase start

# 2. Start dev server
npm run dev

# 3. Make code changes in your editor
# Files auto-reload on save

# 4. If extension files changed, rebuild:
npm run build:local

# 5. Reload extension in Chrome
chrome://extensions → Click reload icon

# 6. Test changes in gamma.app presentation
```

### File Structure

```
gamma-plugin/
├── packages/
│   ├── extension/          # Chrome extension code
│   │   ├── background.js   # Service worker (main extension logic)
│   │   ├── content.js      # Injected into gamma.app pages
│   │   ├── sidebar.html    # Extension UI
│   │   ├── shared-config/  # Environment configuration
│   │   └── manifest.*.json # Extension manifest files
│   ├── web/                # Next.js web application
│   │   ├── src/app/        # App router pages
│   │   ├── src/app/api/    # API routes
│   │   └── src/utils/      # Helper utilities
│   └── shared/             # Shared code (storage, types)
├── supabase/
│   ├── migrations/         # Database migrations
│   └── config.toml         # Supabase configuration
├── docs/                   # Documentation
└── tests/                  # Test files
```

### Hot Module Replacement (HMR)

**Web App (Next.js):**
- Changes to `packages/web/src/**` auto-reload
- API routes restart on change
- No manual refresh needed

**Extension:**
- Changes to extension files require rebuild: `npm run build:local`
- Then reload extension in `chrome://extensions`
- Content scripts require page refresh to reload

### Database Changes

```bash
# 1. Create new migration
supabase migration new feature_name

# 2. Edit migration file
nano supabase/migrations/20251005120000_feature_name.sql

# 3. Apply migration locally
supabase db reset

# 4. Test migration
# Run app and verify database changes work

# 5. Deploy to remote (when ready)
supabase db push --linked --include-all
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test suite
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:e2e           # End-to-end tests

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Writing Tests

**Unit Test Example** (`tests/unit/url-canonicalization.test.ts`):
```typescript
import { canonicalizeGammaUrl } from '@/utils/url';

describe('URL Canonicalization', () => {
  test('canonicalizes gamma.app URLs', () => {
    const input = 'https://gamma.app/docs/ABC-123/edit';
    const expected = 'https://gamma.app/docs/ABC-123';
    expect(canonicalizeGammaUrl(input)).toBe(expected);
  });

  test('throws on invalid URLs', () => {
    expect(() => canonicalizeGammaUrl('not-a-url')).toThrow();
  });
});
```

**Integration Test Example** (`tests/integration/presentation-save.test.ts`):
```typescript
import { createClient } from '@/utils/supabase/server';

describe('Presentation Save Flow', () => {
  test('saves presentation via RPC', async () => {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('rpc_upsert_presentation_from_device', {
      p_auth_id: testUserId,
      p_gamma_url: 'https://gamma.app/docs/test-123',
      p_title: 'Test Presentation',
      p_timetable_data: { title: 'Test', items: [] }
    });

    expect(error).toBeNull();
    expect(data).toHaveProperty('id');
  });
});
```

### Manual Testing Workflow

**Test Presentation Save:**
```
1. Open gamma.app presentation in Chrome
2. Click extension icon → Sidebar opens
3. Presentation should auto-load in sidebar
4. Click "Save to Cloud" button
5. Check browser console for logs (if debug mode)
6. Verify success message appears
7. Check Supabase dashboard → presentations table for new row
```

**Test Device Pairing:**
```
1. Navigate to http://localhost:3000
2. Login with test account
3. Navigate to /devices
4. Click "Add Device" → Note pairing code
5. Open extension → Click "Pair Device"
6. Enter pairing code → Click "Pair"
7. Should show "Device paired successfully"
8. Verify device appears in web app devices list
```

---

## Debugging

### Extension Debugging

**Background Service Worker:**
```
1. Navigate to chrome://extensions
2. Find "Productory Powerups"
3. Click "Inspect views: background page"
4. DevTools opens → Check Console tab for logs
```

**Content Script (Injected in gamma.app):**
```
1. Navigate to gamma.app presentation
2. Right-click page → "Inspect"
3. Console tab → Look for logs prefixed with [content.js]
```

**Sidebar UI:**
```
1. Click extension icon → Sidebar opens
2. Right-click sidebar → "Inspect"
3. DevTools opens → Check Console, Network, Elements tabs
```

### API Debugging

**Netlify Function Logs (Local):**
```bash
# Start dev server with verbose logging
DEBUG=* npm run dev

# Logs show:
# - Incoming requests
# - Database queries
# - Error stack traces
```

**Network Tab Debugging:**
```
1. Open DevTools (F12)
2. Network tab → Filter: /api/presentations/save
3. Click "Save to Cloud" in extension
4. Inspect request:
   - Headers: Check Authorization header
   - Payload: Verify request body format
   - Response: Check status code and body
5. Look for CORS errors (red text)
```

### Database Debugging

**SQL Query Logging:**
```sql
-- Enable query logging in Supabase Dashboard
-- Settings → Database → Enable query logging

-- Or run queries directly in SQL Editor
SELECT * FROM presentations WHERE user_id = '<user-id>';

-- Check RPC execution
SELECT * FROM rpc_upsert_presentation_from_device(
  '123e4567-e89b-12d3-a456-426614174000'::uuid,
  'https://gamma.app/docs/test',
  'Test',
  '{}'::jsonb
);
```

**Supabase CLI Logs:**
```bash
# View API logs
supabase logs --type api

# View database logs
supabase logs --type db

# Follow logs in real-time
supabase logs --type api --follow
```

### Common Debugging Scenarios

**Issue: Extension not loading presentations**
```javascript
// Check background.js console
chrome://extensions → Background page console

// Look for errors like:
// ❌ Failed to fetch slides: [error]
// ✅ Slides extracted: [count]

// Verify content script injected:
console.log('Content script injected:', !!window.extractGammaSlides);
```

**Issue: Save requests failing**
```javascript
// Check Network tab for failed request
// Look at response body for error details

// Example error response:
{
  "error": "Failed to save presentation",
  "debug": {
    "code": "P0001",
    "message": "User not found"
  }
}

// Fix: Re-pair device or check user exists in Supabase Auth
```

**Issue: Database migration failures**
```bash
# Check migration status
supabase migration list

# If out of sync, repair:
supabase migration repair --status reverted <version>

# Re-apply migrations
supabase db reset
```

---

## Deployment

### Local Testing Before Deployment

**Pre-deployment Checklist:**
- [ ] All tests passing: `npm run test`
- [ ] Build succeeds: `npm run build`
- [ ] Extension loads without errors
- [ ] Presentation save flow works end-to-end
- [ ] Database migrations applied successfully
- [ ] No console errors in production build

### Extension Deployment

**Build Production Extension:**
```bash
# 1. Build production version
npm run build

# Output: packages/extension/dist/

# 2. Test production build locally
# Load dist/ folder in chrome://extensions
# Verify API endpoint is productory-powerups.netlify.app
# Test save flow

# 3. Package for Chrome Web Store
cd packages/extension/dist
zip -r ../productory-powerups-v1.0.0.zip .

# 4. Upload to Chrome Web Store
# Navigate to: https://chrome.google.com/webstore/devconsole
# Upload productory-powerups-v1.0.0.zip
```

### Web App Deployment

**Netlify (Auto-deployment):**
```bash
# 1. Commit and push changes
git add .
git commit -m "feat: new feature"
git push origin main

# 2. Netlify auto-deploys from main branch
# Monitor: https://app.netlify.com/sites/your-site/deploys

# 3. Verify deployment
curl https://productory-powerups.netlify.app/api/health

# Expected: 200 OK
```

**Manual Netlify Deploy:**
```bash
# 1. Build locally
npm run build

# 2. Deploy to Netlify
netlify deploy --prod

# 3. Verify deployment
netlify open
```

### Database Deployment

**Deploy Migrations to Production:**
```bash
# 1. Test migrations locally first
supabase db reset

# 2. Deploy to remote database
supabase db push --linked --include-all

# 3. Verify migrations applied
supabase migration list
# Local and Remote should match

# 4. Test RPC functions
# Run test queries in Supabase Dashboard SQL Editor
```

**Rollback Migration (if needed):**
```bash
# 1. Identify migration to rollback
supabase migration list

# 2. Mark as reverted
supabase migration repair --status reverted <version>

# 3. Re-deploy previous version
supabase db push --linked
```

---

## Troubleshooting Common Setup Issues

### Issue: `npm install` fails

**Symptoms:**
- Dependency resolution errors
- `ERESOLVE unable to resolve dependency tree`

**Fix:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall with legacy peer deps
npm install --legacy-peer-deps

# Or use exact versions
npm install --force
```

---

### Issue: Supabase CLI not found

**Symptoms:**
- `supabase: command not found`

**Fix:**
```bash
# Install globally
npm install -g supabase

# Or use npx
npx supabase <command>

# Verify installation
supabase --version
```

---

### Issue: Extension not loading in Chrome

**Symptoms:**
- "Invalid manifest" error
- Extension doesn't appear in chrome://extensions

**Fix:**
```bash
# 1. Verify build succeeded
npm run build:local
# Check for errors in output

# 2. Verify manifest.json exists
ls packages/extension/dist/manifest.json

# 3. Check manifest is valid JSON
cat packages/extension/dist/manifest.json | jq .

# 4. If manifest.json missing:
# Ensure BUILD_TARGET=extension in package.json script

# 5. Reload extension
chrome://extensions → Remove and re-add
```

---

### Issue: API requests return CORS errors

**Symptoms:**
- `Access-Control-Allow-Origin` error in console
- Preflight OPTIONS requests fail

**Fix:**
```typescript
// Verify CORS headers in API route
// packages/web/src/app/api/presentations/save/route.ts

import { withCors } from '@/utils/cors';

export async function POST(request: NextRequest) {
  // ... your logic
  return withCors(NextResponse.json(data), request);
}

// Ensure OPTIONS handler exists
export async function OPTIONS(request: NextRequest) {
  return handleOPTIONS(request);
}
```

---

### Issue: Database connection fails

**Symptoms:**
- `Could not connect to database`
- Timeout errors

**Fix:**
```bash
# 1. Verify Supabase project is running
supabase status

# If not running:
supabase start

# 2. Check environment variables
cat .env.local | grep SUPABASE

# Should have:
# NEXT_PUBLIC_SUPABASE_URL=https://...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# 3. Test connection
curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

# Expected: 200 OK
```

---

## Additional Resources

### Documentation
- [Architecture Guide](/docs/ARCHITECTURE.md)
- [Troubleshooting Guide](/docs/TROUBLESHOOTING.md)
- [API Documentation](/docs/API.md)
- [Sprint Plans](/documents/roadmap/)

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Netlify Documentation](https://docs.netlify.com)

### Support Channels
- GitHub Issues: [Report bugs](https://github.com/your-org/gamma-plugin/issues)
- Slack: #gamma-plugin-dev
- Email: dev@yourcompany.com

---

## Quick Reference

### Essential Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build:local           # Build local extension
npm run test                  # Run tests

# Database
supabase start                # Start local database
supabase db reset            # Reset database with migrations
supabase migration new <name> # Create new migration
supabase db push --linked    # Deploy migrations to remote

# Deployment
npm run build                 # Build production
netlify deploy --prod        # Deploy to Netlify
```

### File Locations

```
Extension Entry:     packages/extension/background.js
API Routes:          packages/web/src/app/api/
Database Migrations: supabase/migrations/
Environment Config:  packages/extension/shared-config/
Tests:               tests/
```

---

**Document Maintained By:** Development Team
**Review Cycle:** After each major sprint
**Setup Verified:** October 2025 (Sprint 38)
