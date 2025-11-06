# Audit: Sub‑Agent Instruction Docs (Tech Lead, UX/UI, QA, DevOps)

**Date:** 2025-09-05  
**Scope:** `.claude/agents/{tech-lead-architect,ux-ui-engineer,qa-engineer,devops-engineer}.md`  
**Auditor:** Codex CLI (grounded in repo state)

---

## Objective
Validate each sub‑agent instruction against the current project reality (Aug–Sep 2025), security rules, and codebase conventions. Identify stale guidance, missing references, and propose precise updates.

## Ground Truth Sources (checked)
- Security & policies:
  - `documents/core/technical/security-implementation-summary.md` (Sprint 19, Sprint 23)
  - `packages/web/src/utils/internal-guard.ts`, `packages/web/src/middleware.ts`
  - `packages/web/.env.example` (internal/admin envs)
- Runtime/build:
  - `netlify.toml` (Node 22, `@netlify/plugin-nextjs`, dev port=3000)
  - `vite.config.js` (extension dist → `packages/extension/dist`)
  - Root `package.json` scripts; `playwright.config.ts` (web server on port 3000)
- App structure:
  - Web app: `packages/web` (Next.js, Tailwind v4, components in `src/components/ui/*`)
  - Extension: `packages/extension` (built with Vite)
- Memory system:
  - `agents/*-memory.toml`
- Status docs (cross‑checked):
  - `AGENTS.md`, `PROJECT_STATE.md` (note: contains contradictions; see below)

## High‑Level Summary
- Replace all residual Clerk references with the current auth model: Supabase Auth (web) + secure device‑token RPCs (extension).  
- Codify Internal/Admin APIs guardrails (ENABLE_INTERNAL_APIS gate, `X-Internal-Auth` token, optional admin email allowlist, default 404, service‑role only in `/api/admin/*`, Node runtime).
- Enforce Port 3000 mandate in guidance and validation steps.
- Align build/runtime paths: Web uses Next.js `.next/`; Extension uses `packages/extension/dist/`.
- Add direct references to security docs, guard utilities, and env template.

---

## Findings by Document

### 1) tech-lead-architect.md
- Stale/Incorrect
  - Mentions Clerk and JWT patterns as core context. Current stack is Supabase‑only for web; device tokens validated via secure RPCs.  
  - Sprint context (“Current Sprint 1”) is outdated (security overhauls in Sprint 19 and internal/admin hardening in Sprint 23 completed).
- Missing
  - Explicit RLS boundaries and service‑role isolation: service‑role allowed only in `/api/admin/*` with guards; never in user flows.  
  - Internal/Admin Guard policy and default 404 failure mode.  
  - Port 3000 mandate for local design/testing flows.  
  - Pointers to env template for internal/admin variables.
- Evidence
  - Guards: `packages/web/src/utils/internal-guard.ts`, `packages/web/src/middleware.ts`  
  - Security: `documents/core/technical/security-implementation-summary.md`  
  - Env: `packages/web/.env.example`
- Required Updates
  - Replace Clerk with “Supabase Auth (web) + secure device‑token RPCs (extension)”.  
  - Add “NEVER bypass RLS” and “service‑role only under `/api/admin/*` (runtime=nodejs, guarded)”.  
  - Add “Always verify on port 3000”.  
  - Add references to AGENTS.md rules, security summary, guard utilities, and env template.  
  - Encourage reuse of existing folders (Project Structure Respect Rule) when proposing new docs.

### 2) ux-ui-engineer.md
- Stale/Incorrect
  - References Clerk in UX flows. Replace with Supabase (web) + device‑token (extension) context.
- Missing
  - Concrete anchor to existing design system primitives in `packages/web/src/components/ui/*` and Tailwind v4 usage.  
  - Port 3000 emphasis for local UX reviews and Playwright E2E.  
  - Note that internal/admin surfaces are gated; by default respond 404 unless explicitly enabled with token.
- Evidence
  - Component library: `packages/web/src/components/ui/*`  
  - Guards: `packages/web/src/utils/internal-guard.ts`, `packages/web/src/middleware.ts`
- Required Updates
  - Point designers/engineers to reuse `components/ui/*` primitives and patterns.  
  - Add port 3000 requirement and Playwright usage touchpoints.  
  - Add internal/admin access note (`ENABLE_INTERNAL_APIS`, `X-Internal-Auth`).

### 3) qa-engineer.md
- Stale/Incorrect
  - Suggests `dist-web/` verification; web app uses Next.js `.next/` folder (Netlify/Next plugin), not a Vite `dist-web` build.
- Missing
  - Internal/Admin guard testing steps: enable flag + `X-Internal-Auth` header and optional admin allowlist.  
  - Explicit security/quality gates referencing `scripts/pre-build-gates.sh` and `npm run quality:security`.  
  - Where to find Playwright HTML report (`playwright-report/`).
- Evidence
  - Build outputs: `packages/extension/dist/` (extension), `packages/web/.next/` (web)  
  - Configs: `playwright.config.ts`, `package.json` scripts
- Required Updates
  - Replace `dist-web/` checks with `.next/` or runtime checks via Playwright’s dev server on port 3000.  
  - Add internal/admin testing instructions with env and headers.  
  - Reference quality gates and report locations.

### 4) devops-engineer.md
- Stale/Incorrect
  - Lists “Clerk JavaScript SDK”; current is Supabase‑only for web; device‑token RPCs for extension.  
  - “Current Status (Sprint 17)” is outdated relative to Sprints 19 and 23 work.
- Missing
  - Internal/Admin API Policy specifics: enable flag, token, admin allowlist, default 404, service‑role usage only in admin routes, runtime=nodejs.  
  - References to env template, health endpoint, and Node 22 + Next plugin in Netlify.  
  - Port 3000 reinforcement for local/dev and CI tooling.
- Evidence
  - `netlify.toml` (Node 22, `@netlify/plugin-nextjs`, dev `port=3000`)  
  - `packages/web/.env.example`  
  - Health: `packages/web/src/app/api/health/route.ts`
- Required Updates
  - Replace Clerk with Supabase‑only + device‑token RPC model.  
  - Add Internal/Admin APIs Policy section with guard references.  
  - Cite env template, health endpoint, and netlify settings.  
  - Reinforce Port 3000 mandate for any local operations.

---

## Cross‑Cutting Corrections
- Authentication Model
  - Web: Supabase Auth (SSR client) → `packages/web/src/utils/supabase/server.ts`  
  - Extension: Secure device tokens via RPCs; never store raw tokens; validation via SECURITY DEFINER functions.
- Security Policy
  - RLS must never be bypassed in user flows.  
  - Service‑role allowed only inside guarded `/api/admin/*` routes or server utilities (runtime=nodejs).  
  - Internal/admin gating: `ENABLE_INTERNAL_APIS==='true'` AND `X-Internal-Auth: Bearer ${INTERNAL_API_TOKEN}`; optional `INTERNAL_ADMIN_EMAILS`. Failure mode: 404.
- Port 3000 Mandate
  - All local web runs, QA/E2E, and dev servers must explicitly bind to port 3000.
- Build/Artifacts
  - Extension: `packages/extension/dist/` (Vite build).  
  - Web: Next.js build into `.next/` and served by Netlify/Next plugin; no `dist-web/`.
- References to include in all docs
  - `AGENTS.md` (RLS rule, Port 3000, internal/admin policy, project structure)  
  - `documents/core/technical/security-implementation-summary.md`  
  - `packages/web/src/utils/internal-guard.ts`, `packages/web/src/middleware.ts`  
  - `packages/web/.env.example` (ENABLE_INTERNAL_APIS, INTERNAL_API_TOKEN, INTERNAL_ADMIN_EMAILS, SUPABASE_SERVICE_ROLE_KEY)

---

## Noted Inconsistencies (for authors to resolve)
- `PROJECT_STATE.md` contains contradictory notes:
  - Claims “Supabase‑only Auth COMPLETE” yet also says “Next Phase: Clerk integration” and references a non‑existent `packages/web-next` (port 3001).  
  - Action: Prefer actual code/config reality over this file where conflicts exist; update `PROJECT_STATE.md` accordingly.

---

## Recommended Edits (concise)
- Replace “Clerk” with “Supabase Auth (web) + secure device‑token RPCs (extension)” across all four docs.
- Add a Security Guardrails section referencing guard utilities, RLS, and service‑role boundaries in tech‑lead and devops docs.
- Update QA doc to validate web via `.next/` or runtime checks; add internal/admin testing instructions (env flag + header).  
- Update UX doc to anchor on `packages/web/src/components/ui/*` primitives and Tailwind v4; add Port 3000 and internal/admin visibility notes.

---

## Verification Checklist (to include in docs)
- Port 3000
  - `lsof -ti:3000 | xargs kill -9 || true`  
  - `cd packages/web && PORT=3000 npm run dev`
- Internal/Admin access
  - Set `.env.local`: `ENABLE_INTERNAL_APIS=true`, `INTERNAL_API_TOKEN=...`  
  - Use header: `X-Internal-Auth: Bearer ${INTERNAL_API_TOKEN}`
- Security gates
  - `npm run quality`  
  - `./scripts/pre-build-gates.sh`  
  - `npm run quality:security`
- Builds/tests
  - `npm run build:extension` → `packages/extension/dist/`  
  - `cd packages/web && npm run build` → `.next/`  
  - `npm run test:e2e` (Playwright; dev server on port 3000)

---

## Risk if Not Updated
- Conflicting auth guidance leads to insecure patterns or misuse of service‑role keys.  
- QA checks miss regressions due to wrong artifact paths (`dist-web/`).  
- DevOps may expose internal surfaces without proper guardrails or run on wrong ports, breaking extension ↔ web flows.  
- UX advice diverges from actual component system, harming consistency and velocity.

---

## Next Actions
1) Apply edits to all four agent docs as per “Recommended Edits”.  
2) Update `PROJECT_STATE.md` to remove Clerk references and non‑existent `packages/web-next` notes.  
3) Add a short “Internal/Admin APIs Policy” excerpt to AGENTS.md linking to guard files and env template.  
4) Re‑run QA checklist (port 3000, internal flags, quality scripts) and record evidence under `documents/audits/`.
