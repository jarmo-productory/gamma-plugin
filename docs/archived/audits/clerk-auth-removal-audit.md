# Audit: Removal of Clerk Authentication Traces

Last updated: 2025-08-31
Owner: Platform/Infrastructure
Scope: Codebase, configs/CI, database, documentation, and agent guidance

---

## Summary

We standardize on Supabase Auth. This audit identifies all known traces of Clerk and proposes a precise, staged remediation plan with guardrails to prevent reintroduction.

---

## Findings by Category

### Code (build-impacting)
- `packages/shared/auth/index.ts`: Imports and initializes `@clerk/clerk-js`; relies on Clerk user/session. High priority to remove/refactor to Supabase-only or device token flow.
- `packages/extension/sidebar/sidebar.js`: Logs compile-time flag `__HAS_CLERK_KEY__`. Remove this flag and the related log.
- `packages/shared/types/global.d.ts`: Declares `__HAS_CLERK_KEY__`. Remove declaration once the flag is gone.

### Code (backups/legacy files in repo)
- `packages/shared/auth/index.ts.backup`: Clerk usage (backup). Should be deleted or moved outside repo.
- `packages/extension/shared-auth/index.ts.backup`: Clerk usage (backup). Should be deleted or moved outside repo.

### Dependencies
- Root `package.json`: `@clerk/clerk-js` in `dependencies`.
- `packages/shared/package.json`: `@clerk/clerk-js` in `dependencies`.
  Action: remove dependency and lockfile entries after code removal.

### Env/Configs/CI
- `.env.example`: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.
- `.github/workflows/ci.yml`: Exports Clerk secrets during build.
- `eslint.config.js`:
  - Global `__HAS_CLERK_KEY__` defined.
  - Ignore list references `packages/web/src/main-clerk-sdk.js` (legacy).
- `netlify.toml`: comment referencing Clerk (`SECRETS_SCAN_OMIT_KEYS`).
- `test/setup.ts`: Sets `process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.

### Database & Migrations
- `supabase/config.toml`: `auth.third_party.clerk` section present (commented docs but indicates intended integration).
- `supabase/migrations/20240718000001_initial_schema.sql`:
  - Clerk-centric schema: `users.clerk_id` and RLS policies using `auth.uid()::text = clerk_id`.
  - Queries map `auth.uid()` to `users.id` via `clerk_id` lookups.

### Documentation & Agent Guidance
- Architecture/docs with Clerk references:
  - `documents/core/technical/database-architecture.md` (mentions “linked to Clerk”).
  - `documents/core/product/Development_Brief.md` (Clerk in tech stack, diagrams, backend samples).
  - `documents/core/environment-setup.md`, `documents/core/technical/local-development-guide.md` (Clerk envs).
  - Multiple roadmap/retrospective docs under `documents/roadmap/**` describe Clerk as current auth.
  - Feature specs under `documents/features/**` reference `@clerk/*` packages and flows.
- Agent memory/guidance:
  - `AGENTS.md` (mentions Clerk in required vars list).
  - `CLAUDE.md`, `claude-instruction-dump.md`, `GEMINI.md` include Clerk as the auth provider and example code.

---

## Recommended Remediation Plan

Prioritize changes that affect builds/runtime, then configs/CI, then docs/agent guidance. Each step includes verification.

### Phase 1 — Code and Dependencies (build-blockers)
- Replace Clerk usage with Supabase-based auth:
  - `packages/shared/auth/index.ts`:
    - Remove `@clerk/clerk-js` import/initialization and dependent logic.
    - Use Supabase Auth (browser/server clients) or the existing device-token flow for session state. Centralize validation via server API if needed.
    - Keep `AuthManager` shape stable to minimize ripple; stubs should call Supabase or device APIs, not Clerk.
  - Remove `__HAS_CLERK_KEY__` references:
    - Delete flag usage in `packages/extension/sidebar/sidebar.js` and its declaration in `packages/shared/types/global.d.ts`.
    - Remove global from `eslint.config.js`.
  - Delete Clerk backup files:
    - Remove `packages/shared/auth/index.ts.backup` and `packages/extension/shared-auth/index.ts.backup` from the repo.
- Remove dependencies:
  - Root and `packages/shared` `package.json`: remove `@clerk/clerk-js`.
  - Run `npm install` to update `package-lock.json`.
- Verify:
  - `npm run build:shared`, `npm run build:web`, `npm run build:extension` succeed.
  - Grep shows no `@clerk` imports.

### Phase 2 — Env/Configs/CI
- Env templates:
  - Remove Clerk keys from `.env.example` and any `.env.*` docs.
- CI workflow `.github/workflows/ci.yml`:
  - Remove `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` env exports.
  - Ensure only Supabase-related envs are used.
- ESLint config:
  - Remove `__HAS_CLERK_KEY__` from `globals`.
  - Optionally add a forbid-import rule or custom lint for `@clerk/*`.
- Tests:
  - Remove setting of `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in `test/setup.ts`.
- Netlify config:
  - Remove Clerk references/comments in `netlify.toml`.

### Phase 3 — Database & Migrations
- Remove Clerk coupling in schema and RLS:
  - Migrate `users` to identify by Supabase Auth user id (`uuid`) instead of `clerk_id` text mapping.
    - Add `id uuid primary key default gen_random_uuid()` if not already.
    - Backfill mapping from `clerk_id` to `id` if needed, then drop `clerk_id`.
  - Update RLS policies to use `auth.uid()` directly with `users.id`.
  - Delete `auth.third_party.clerk` block in `supabase/config.toml`.
- Provide forward/backward migration scripts and staging validation checklist.

### Phase 4 — Documentation & Agent Guidance
- Update core docs to explicitly state: “Authentication: Supabase Auth”. Remove Clerk references, code snippets, and envs.
  - Files: `documents/core/technical/database-architecture.md`, `documents/core/product/Development_Brief.md`, `documents/core/environment-setup.md`, `documents/core/technical/local-development-guide.md`.
- Roadmaps/retrospectives/features:
  - Add a short “Superseded by Supabase Auth” note at top, or move to `archive/legacy-clerk/` to avoid confusing agents.
- Agent guidance:
  - Update `AGENTS.md`, `CLAUDE.md`, `claude-instruction-dump.md`, `GEMINI.md` to remove Clerk and include “do not introduce Clerk” guidance.

---

## Guardrails to Prevent Reintroduction

- CI Grep Gate (add/extend existing): fail build if any of these are present:
  - `@clerk/`, `from '@clerk/`, `NEXT_PUBLIC_CLERK`, `CLERK_SECRET_KEY`, `ClerkProvider`, `verifyRequest`.
- ESLint rule: forbid imports matching `/^@clerk\//` with a clear error message (“Use Supabase Auth only”).
- Renovate/Dependabot: block `@clerk/*` packages.
- Pre-build script: assert Clerk env vars are unset; assert Supabase envs are present.
- Docs lint: simple script to scan `documents/**` for “Clerk” and warn in PR unless placed in `documents/**/archive/**`.

---

## Verification Checklist (per Phase)

- Phase 1
  - [ ] No `@clerk` imports or usage in code.
  - [ ] Builds pass: `shared`, `web`, `extension`.
  - [ ] Device auth and Supabase auth flows covered by smoke tests.
- Phase 2
  - [ ] CI runs without Clerk secrets.
  - [ ] Lint/format pass with removed globals and flags.
- Phase 3
  - [ ] Migrations applied in staging; RLS verified with Supabase Auth sessions.
  - [ ] No references to `clerk_id` remain.
- Phase 4
  - [ ] Core docs updated; legacy docs archived or prefaced with “historical”.
  - [ ] Agent docs updated; CI docs scan passing.

---

## Suggested Edits (file-level)

- Remove Clerk usage
  - `packages/shared/auth/index.ts`: Strip `@clerk/clerk-js` and migrate logic to Supabase Auth/client or device token flows. Keep external API unchanged if possible.
  - Delete: `packages/shared/auth/index.ts.backup`, `packages/extension/shared-auth/index.ts.backup`.
  - Remove `__HAS_CLERK_KEY__` usage from `packages/extension/sidebar/sidebar.js` and type from `packages/shared/types/global.d.ts`.
- Dependencies
  - Root `package.json` and `packages/shared/package.json`: remove `@clerk/clerk-js`; run `npm install`.
- Env/CI
  - `.env.example`: delete Clerk keys.
  - `.github/workflows/ci.yml`: remove Clerk envs; verify Supabase-only.
  - `eslint.config.js`: remove `__HAS_CLERK_KEY__`; optionally add forbid import rule for `@clerk/*`.
  - `test/setup.ts`: remove `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
  - `netlify.toml`: remove Clerk comment/hints.
- Database
  - `supabase/config.toml`: remove `auth.third_party.clerk` block.
  - `supabase/migrations/20240718000001_initial_schema.sql`: create follow-up migration to replace `clerk_id` mapping with direct Supabase user id and update RLS.
- Documentation/Agents
  - Update “Authentication” sections to Supabase, remove Clerk snippets and envs.
  - Add a one-liner at the top of legacy docs: “Historical: superseded by Supabase Auth (2025-08).”

---

## Open Questions / Decisions

- Confirm the chosen Supabase Auth flow for the web app (PKCE browser client vs. server endpoints mediating DB access). Document decisively to avoid ambiguity in future contributions.
- Confirm whether device-token-only auth is sufficient for the extension UX, or if extension should also use Supabase Auth directly.

---

## Next Steps (Proposed Execution Order)

1) Remove `@clerk` imports and dependencies; adjust `AuthManager` to Supabase/device auth.  
2) Strip env/CI Clerk references; add CI grep/lint guardrails.  
3) Prepare and apply DB migration to remove `clerk_id` and update RLS.  
4) Update core docs and agent guidance; archive historical Clerk docs.

