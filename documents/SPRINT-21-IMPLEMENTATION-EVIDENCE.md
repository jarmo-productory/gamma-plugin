# Sprint 21 — Implementation Evidence: Clerk Removal & Supabase Standardization

Date: 2025-09-01
Owner: Codex Auditor

## Summary

Sprint-21 objective was to remove Clerk from the codebase and standardize on Supabase Auth. The repository now:
- Uses Supabase Auth exclusively in shared and web packages
- Contains no `@clerk/*` imports or dependencies
- Provides ESLint rule to forbid Clerk imports
- Ships migrations to drop `clerk_id` and update RLS to `auth_id`
- Cleans extension manifests of Clerk allowlists
- Updates core guidance docs to reflect Supabase-only auth

## Code Evidence

- No `@clerk/*` imports (grep clean across `packages/**`)
- `packages/shared/auth/index.ts`: Supabase/device-token flows only
- ESLint guard: `eslint.config.js` forbids `@clerk/*`
- CI guard: `.github/workflows/ci.yml` scans code paths for Clerk usage

## Configuration Evidence

- `.env.example`: only Supabase-related variables
- `supabase/config.toml`: no Clerk third-party config

## Database/Migrations Evidence

- `supabase/migrations/20250831000004_migrate_auth_system.sql`: switches RLS to `auth_id`
- `supabase/migrations/20250831000005_remove_clerk_references.sql`: drops `clerk_id` and redefines policies

Note: Applying migrations to the active project must be performed via Supabase. See runbook in `documents/core/technical/database-architecture.md`.

## Extension Evidence

- `packages/extension/manifest.json` and `packages/extension/dist/manifest.json`: no Clerk allowlists

## Documentation Updates

- `CLAUDE.md`, `AGENTS.md`: Updated to “Supabase Auth”
- `GEMINI.md`: Replaced Clerk reference with Supabase Auth

## CI Guardrails

- Clerk guard now scans only code paths (`packages`, `src`) to avoid false positives from historical docs/migrations

## Follow-ups (Production Validation)

- Confirm migrations applied on the active Supabase project (staging → prod)
- Capture screenshots or logs of RLS-guarded reads/writes with Supabase sessions
- Optionally add a docs scan job (non-blocking) to prevent Clerk mentions in non-archive docs

