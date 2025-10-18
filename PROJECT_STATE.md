# Project State & Mission: Gamma Timetable Extension

**Last Updated:** 2025-10-18 by Claude Code
**Current Sprint:** Sprint-39 Extension Simulator & Presentation Save Remediation ✅
**Recent Focus:** Complete device pairing flow; API key migration; presentation save stability; ContentItem[] format support

---

## 🎯 High-Level Mission

Transform the Gamma Timetable Extension from a standalone browser tool into a cloud-enabled service with seamless cross-device synchronization, secure data persistence, and collaborative features.

---

## 📊 Current Project Status

### **Latest Updates - Sprint-39 Device Pairing & Save System Complete ✅ (Oct 18, 2025)**

#### **Authentication & Infrastructure**
- ✅ **API Key Migration**: Updated Supabase keys from legacy JWT format to new publishable key format (`sb_publishable_...`)
- ✅ **Environment Configuration**: Fixed `.env.local` with mixed format (publishable for anon, JWT for service role)
- ✅ **Extension v0.0.62**: Version bumped and built for localhost testing with updated API endpoints

#### **Device Pairing Flow - Complete Fix**
- ✅ **Credentials Authentication**: Added `credentials: 'same-origin'` to device link fetch requests
- ✅ **pgcrypto Extension**: Enabled in production database for token hashing via `digest()` function
- ✅ **Database Schema Updates**:
  - Added `device_fingerprint` column to `device_registrations` table
  - Added `device_fingerprint` column to `device_tokens` table with unique indexes
  - Migrated `device_tokens` from natural key (token as PK) to surrogate key (id SERIAL PRIMARY KEY)
  - Made `token` column nullable (system only stores hashed tokens)
- ✅ **End-to-End Validation**: Complete device pairing flow tested and working

#### **Presentation Save System**
- ✅ **Constraint Fix**: Dropped `slide_fingerprints_content_text_check` to allow empty strings for image-only slides
- ✅ **Trigger Hardening**: Migration `20251018000000` handles both `string[]` (legacy) and `ContentItem[]` formats
- ✅ **Helper Function**: `extract_content_text()` supports rich content objects with type/text/subItems structure
- ✅ **Backward Compatibility**: Existing presentations with string[] content continue to work
- ✅ **Production RPC**: Migration `20251004101500` confirmed live and functional

#### **Extension UX Improvements**
- ✅ **Save Button Behavior**: Changed sync button to save-only (no downloading from cloud first)
- ✅ **Icon Update**: Replaced circular sync arrows with save/document icon
- ✅ **Simplified Logic**: Direct save to cloud without complex sync-down-first workflow

---

## 🚀 Quick Start Commands

```bash
# Development Environment
PORT=3000 npm run dev:web  # Web dashboard on http://localhost:3000
npm run dev                # Extension development (Vite)
npm run dev:full-stack    # Run web (3000) + extension together

# Extension Build & Package
npm run build:extension   # Build extension → packages/extension/dist/
npm run package           # Zip extension from packages/extension/dist/
npm run build:prod        # Build with BUILD_ENV=production (same output path)

# Quality & Testing
npm run lint              # ESLint
npm run quality           # Full quality suite (includes security guards)

# Database
# Development uses remote Supabase for production parity
```

### **Current URLs**
- Web (Next.js): http://localhost:3000 (connected to remote database)
- Production: https://productory-powerups.netlify.app (auto-deploys on main)
- Remote Database: https://dknqqcnnbcqujeffbmmb.supabase.co
- DB Test Endpoint: http://localhost:3000/api/test-db
- Extension Dev: Load unpacked from `packages/extension/dist/` in Chrome

### **Authentication Status**
- Supabase Auth: Active for web; device tokens for extension via secure RPCs
- RLS Compliance: Enforced with `auth_id` policies
- E2E Testing: Device pairing and profile flows validated

---

## 📋 Handoff Notes

### **Ready for Next Session**

#### **Completed Today ✅**
- ✅ **API Authentication**: Migrated to new Supabase publishable key format
- ✅ **Device Pairing**: Complete flow working (registration → exchange → token storage)
- ✅ **Database Schema**: All missing columns and indexes added to production
- ✅ **Presentation Saves**: ContentItem[] format fully supported, constraint issues resolved
- ✅ **Extension Build**: v0.0.62 built for localhost testing (`extension-local-v0.0.62.zip`)
- ✅ **UX Fix**: Save button simplified to save-only (no sync-down-first)

#### **Testing & Validation Needed 🧪**
- 🧪 **End-to-End Flow**: Load extension in Chrome, test complete flow (pair device → edit presentation → save)
- 🧪 **ContentItem[] Save**: Verify presentation saves with current extension format work in production
- 🧪 **Cross-Device Sync**: Test that saved presentations appear in web dashboard

#### **Future Improvements 🔧**
- 🔧 **Type Definitions**: Update `packages/shared/types/index.ts` to reflect ContentItem[] as primary format
- 🔧 **Runtime Validation**: Add StorageManager validation to catch future format mismatches early
- 🔧 **Production Build**: Create production extension build with Netlify endpoints before shipping

### **Development Continuity**
- Active Branch: `main`
- Recent Work: Complete device pairing flow restoration; API key migration; presentation save system stabilization
- Architecture: Extension expects API at `http://localhost:3000` (dev) or `https://productory-powerups.netlify.app` (prod); Supabase schema in production now matches migrations
- Quality: Device-token authentication working; presentation saves support both string[] and ContentItem[] formats
- Key Files Modified:
  - `packages/web/.env.local` - Updated with new Supabase publishable keys
  - `packages/web/src/components/DevicePairingDashboard.tsx` - Added credentials to fetch
  - `packages/extension/manifest.json` - Version bump to 0.0.62
  - `packages/extension/sidebar/sidebar.js` - Save button behavior simplified
  - Production database - Multiple schema fixes via SQL Editor

---

## 📚 Documentation Structure

- **`documents/roadmap/`** - Sprint planning, roadmap, and retrospectives
- **`documents/audits/`** - Technical audits (latest: `root-cause-scalar-content-bug.md`, `presentation-save-system-audit-2025-10-05.md`)
- **`agents/`** - Team coordination memory files
- **`TEAM_PROCESS.md`** - Discovery-first methodology and evidence requirements
- **`PROJECT_STATE.md`** - This file (executive dashboard and current status)

For detailed sprint specifications and technical architecture, see `documents/roadmap/roadmap.md`.

---

## ✅ Green Build Checklist (Next.js web-next)
- Single lockfile: remove `packages/web-next/package-lock.json` (root lockfile remains).
- Clean caches before builds: `prebuild` runs automatically; locally `rm -rf packages/web-next/.next` if needed.
- Offline-safe build: `cd packages/web-next && DISABLE_GOOGLE_FONTS=1 npm run build` (skips Google Fonts download).
- Deterministic Netlify builds: `command = "npm ci && npm run build"` in `netlify.toml`.
- Environment setup: set Clerk/Supabase vars in Netlify UI (production and deploy-preview contexts).
- Smoke test locally: `npm run test:e2e -- --trace on` to catch runtime errors early.
