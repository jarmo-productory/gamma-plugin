# Project State & Mission: Gamma Timetable Extension

**Last Updated:** 2025-09-05 by Codex CLI  
**Current Sprint:** Sprint-21 Clerk Removal & Supabase Standardization COMPLETE ✅  
**Recent Focus:** Supabase-only authentication; internal/admin guardrails; CI quality gates

---

## 🎯 High-Level Mission

Transform the Gamma Timetable Extension from a standalone browser tool into a cloud-enabled service with seamless cross-device synchronization, secure data persistence, and collaborative features.

---

## 📊 Current Project Status

### **Latest Updates - Sprint-21 Clerk Removal COMPLETE ✅**
- ✅ Supabase-only Auth across web; device-token RPCs on extension
- ✅ ESLint/CI Guards to prevent Clerk reintroduction and secret exposure
- ✅ Schema policies aligned to `auth_id`; Clerk artifacts removed
- ✅ Docs updated to reflect Supabase-only model
- 🔎 Evidence: `documents/SPRINT-21-IMPLEMENTATION-EVIDENCE.md`

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
- ✅ Database Integration Complete: Localhost connects to production Supabase database
- ✅ API Key Migration: Publishable keys in place
- ✅ Workflow: No local Supabase instance required
- 🔄 Next Focus: Internal/Admin API guard validation and QA hardening

### **Development Continuity**
- Active Branch: `main`
- Recent Work: Remote DB connection configured; API key migration resolved
- Architecture: Next.js on port 3000 connected to remote Supabase
- Quality: DB connectivity validated via `/api/test-db`

---

## 📚 Documentation Structure

- **`/roadmap/`** - Sprint planning, roadmap, and team retrospectives
- **`/documents/`** - Feature specifications and technical documentation  
- **`/agents/`** - Team coordination memory and collaboration patterns
- **`TEAM_PROCESS.md`** - Discovery-first methodology and evidence-based planning requirements
- **`PROJECT_STATE.md`** - This file (executive dashboard and current status)

For detailed sprint specifications and technical architecture, see `/roadmap/roadmap.md`.

---

## ✅ Green Build Checklist (Next.js web-next)
- Single lockfile: remove `packages/web-next/package-lock.json` (root lockfile remains).
- Clean caches before builds: `prebuild` runs automatically; locally `rm -rf packages/web-next/.next` if needed.
- Offline-safe build: `cd packages/web-next && DISABLE_GOOGLE_FONTS=1 npm run build` (skips Google Fonts download).
- Deterministic Netlify builds: `command = "npm ci && npm run build"` in `netlify.toml`.
- Environment setup: set Clerk/Supabase vars in Netlify UI (production and deploy-preview contexts).
- Smoke test locally: `npm run test:e2e -- --trace on` to catch runtime errors early.
