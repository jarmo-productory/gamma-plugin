# Project State & Mission: Gamma Timetable Extension

**Last Updated:** 2025-09-01 by Codex Auditor  
**Current Sprint:** Sprint-21 Clerk Removal & Supabase Standardization COMPLETE ✅  
**Recent Focus:** Supabase-only authentication; removal of all Clerk traces; CI guardrails

---

## 🎯 High-Level Mission

Transform the Gamma Timetable Extension from a standalone browser tool into a cloud-enabled service with seamless cross-device synchronization, secure data persistence, and collaborative features.

---

## 📊 Current Project Status

### **Latest Updates - Sprint-21 Clerk Removal COMPLETE ✅**
- ✅ **Supabase-only Auth**: Codebase uses Supabase Auth exclusively (no `@clerk/*`)
- ✅ **ESLint/CI Guards**: ESLint forbids Clerk imports; CI scans code paths for Clerk usage
- ✅ **Schema Policies**: Migrations switch RLS to `auth_id` and drop `clerk_id`
- ✅ **Extension Manifests**: No Clerk allowlists; builds validated clean
- ✅ **Docs Updated**: Core guidance updated to reflect Supabase-only auth
- 🔎 **Evidence**: See `documents/SPRINT-21-IMPLEMENTATION-EVIDENCE.md`

---

## 🚀 Quick Start Commands

```bash
# Development Environment (Dual-Environment System)
npm run dev:web          # Web dashboard + Netlify functions (http://localhost:3000)
npm run dev              # Extension development (npm run build:local → dist/ folder)

# Next.js Development (packages/web-next/)
cd packages/web-next && npm run dev  # Next.js app (http://localhost:3001)

# Production System
npm run build:prod       # Production extension build (→ dist-prod/ folder)
npm run package:prod     # Create production distributable ZIP
npm run build:local      # Local development build (→ dist/ folder)
npm run package:local    # Create local development ZIP

# Quality & Testing  
npm run lint             # ESLint check
npm run quality          # Lint + format + type check

# Database Management
supabase start           # Start local Supabase stack
supabase db reset        # Reset with latest migrations
```

### **Current URLs**
- **Next.js Application**: ✅ RUNNING - http://localhost:3000 (connected to remote database)
- **Production Environment**: ✅ https://productory-powerups.netlify.app (AUTO-DEPLOYS on push to main)
- **Remote Database**: ✅ CONNECTED - https://dknqqcnnbcqujeffbmmb.supabase.co (localhost + production)
- **Database Test Endpoint**: ✅ http://localhost:3000/api/test-db (validates connection)
- **Extension Development**: Load unpacked from `dist/` folder in Chrome (localhost APIs)
- **Extension Production**: Load unpacked from `dist-prod/` folder in Edge (production APIs)

### **Authentication Status**
- **Supabase Auth**: ✅ Active for web; device tokens for extension via secure RPCs
- **RLS Compliance**: ✅ Enforced with `auth_id` policies
- **E2E Testing**: ✅ Device pairing and profile flows validated

---

## 📋 Handoff Notes

### **Ready for Next Session**
- ✅ **Database Integration Complete**: Phase 2 of roadmap finished successfully
- ✅ **Remote Connection Established**: Localhost connects to production Supabase database
- ✅ **API Migration Resolved**: Supabase publishable keys working correctly
- ✅ **Development Workflow Simplified**: No local database instance required
- 🔄 **Next Focus**: Phase 3 Authentication (Clerk integration with remote database)

### **Development Continuity**
- **Active Branch**: `main` (Phase 2 database integration completed)
- **Recent Work**: Database connection configured, API key migration resolved
- **Architecture**: Next.js development environment connected to remote Supabase production database
- **Quality**: Database connectivity validated via test endpoint with timestamp confirmation
- **Next Phase**: Phase 3 Authentication implementation with Clerk + remote database integration

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
