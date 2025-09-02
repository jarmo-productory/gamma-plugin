# Audit: Agent Instructions & Orchestration (Claude + Sub‑agents)

Status: In Progress

Goal: Assess CLAUDE.md and .claude/agents for conflicting directives and failure modes (build ports, duplication, DB drift). Recommend guardrails and process fixes so agents produce consistent, correct changes.

—

## AS‑IS Summary

- Top‑level brain (CLAUDE.md)
  - Strong rules (port 3000 mandate, reality‑first, memory syncing, no new folders outside structure).
  - Emphasizes 2025 context, quality gates, and evidence‑based validation.

- Sub‑agents (.claude/agents)
  - devops‑engineer.md: Broad infra guidance; references “Local Netlify dev + Supabase local stack” and “Sprint 2 Complete”. Stale relative to CLAUDE.md (Sprint 16/17, remote DB mandate).
  - qa‑engineer.md: CLI protocol with placeholders (/path/to/package); runtime validation cURLs localhost:3000 but doesn’t enforce PORT=3000 or kill conflicts. No step to prevent Next auto‑switching to 3001.
  - tech‑lead‑architect.md and ux‑ui‑engineer.md: High‑level process; rely on TOML “memory files” under absolute paths that don’t exist in repo (points to /Users/.../agents/*.toml vs .claude/agents). Risk of agents not finding memory or writing elsewhere.

- Evidence of drift from audits/code
  - Duplicate auth/storage modules and “backup” dirs left in the tree.
  - Port switching to 3001 observed; extension depends on 3000.
  - DB structure assumptions vary; device_tokens table usage added recently; older guidance still references different patterns (devices table, Netlify functions).

—

## Conflicts & Failure Modes

1) Port governance is inconsistent
- CLAUDE.md mandates port 3000 with explicit kill + env PORT=3000.
- QA agent starts dev server without enforcing port or killing conflicts; Next may auto‑switch to 3001 → extension breaks, tests become flaky.

2) Stale environment guidance in DevOps agent
- Mentions local Supabase stack + Sprint 2 status; reality today is remote Supabase in dev, Sprint 16/17 flows and Netlify Next plugin.
- Risk: Agents propose out‑of‑date infra steps (e.g., local Supabase) and misconfigure prod/dev parity.

3) Memory file path mismatch
- Agents reference absolute paths (…/agents/*.toml) not present; actual instruction files live in .claude/agents and project memory is in PROJECT_STATE.md.
- Result: Agents don’t read/write the intended memory, causing repeated rediscovery and duplication.

4) QA protocol too generic
- Uses “/path/to/package” placeholders; not wired to monorepo scripts (npm run dev/build/test at repo root) and port rules.
- Lacks steps for extension build, Next plugin nuances, or monorepo context.

5) No shared “auth guardrails” or DB truth source
- Sub‑agents do not import a single source of truth for current DB schema and auth flows; they may re‑invent endpoints or forget tables.
- Result: duplicate endpoints, token/profile mismatches, reliance on in‑memory stores persisting in code.

6) Folder creation policy not enforced by sub‑agents
- CLAUDE.md warns about structure; agents don’t restate it. We saw new top‑level folders created (e.g., technical/) and debug scripts left at root.

—

## Recommendations (Guardrails & Fixes)

A) Unify “Golden Path” run instructions
- Create a shared snippet and reference from all agents:
  - Always kill port 3000: `lsof -ti:3000 | xargs kill -9 || true`
  - Always start with explicit port: `PORT=3000 npm run dev`
  - Never accept Next auto‑port. Fail fast if 3000 unavailable.
- Add to qa‑engineer.md runtime step and devops‑engineer.md ops notes.

B) Add a preflight checklist all agents must run
- Single page referenced by CLAUDE.md and agents: `documents/core/technical/AGENT_PREFLIGHT.md`.
- Items:
  - ls documents/ and read PROJECT_STATE.md
  - Confirm NEXT_PUBLIC_* and SUPABASE_* present (without printing values)
  - Confirm device_tokens table exists (optional API ping)
  - Confirm port 3000 free, then start server on 3000
  - Read CLAUDE.md “AS OF” section (date, sprint)

C) Make memory paths real and local
- Replace absolute /Users/... paths with repo‑relative `.claude/memory/*.toml` and ensure the files exist.
- Update all agents to read/write those files; add a tiny “memory router” util if needed.

D) Consolidate “Truth Sources”
- Add a lightweight “Tech Facts” doc referenced by all:
  - Current sprint, port 3000 mandate, remote Supabase usage, device_tokens table schema, API bases, monorepo commands.
- Agents must cite that doc and avoid inventing endpoints.

E) Update DevOps agent for 2025 reality
- Replace “local Supabase” and Sprint 2 references with: Netlify Next plugin, remote Supabase in dev, service‑role only in server routes, Node runtime (not Edge) for admin ops, and production parity testing.

F) Strengthen QA protocol for this repo
- Replace placeholders with project scripts:
  - Build: `npm run build` (root) and `npm run build:web`/`build:extension` as needed.
  - Typecheck/lint: `npm run quality`.
  - Runtime: enforce port 3000 procedure (kill → PORT=3000 npm run dev → curl 3000).
  - E2E: `npm run test:e2e`.
- Add explicit checks for extension build and dist artifacts not being committed.

G) Introduce “Change Budget” & Ownership map
- Require agents to check ownership and avoid touching modules outside scope without Tech Lead sign‑off.
- Ownership map example: web/api, extension/sidebar, shared/auth/storage.

H) Anti‑duplication policy
- Agent rule: Before creating code, grep for similar filenames/exports and reuse; if new file needed, explain why previous cannot be extended.
- Add a short clause to all agent files pointing to this policy.

I) DB & Auth guard module
- Add a repo doc (and optionally a small TS module) that encodes:
  - Device pairing flow, tables (device_tokens), and route contracts.
  - Node‑only admin client rule and the routes using it.
- Agents must consume this instead of ad‑hoc assumptions.

J) CI quality gates
- Add a CI job that fails when:
  - dev server logs show a port other than 3000 was used during preview run,
  - dist/ or backup/ paths change,
  - duplicated filenames added where an existing module exists.

—

## Best Practices For Writing CLAUDE.md (Repository‑Specific)

This section encodes opinionated, field‑tested guidance for structuring CLAUDE.md in this repo (Next.js + Supabase + Chrome Extension), so sub‑agents operate consistently.

- Purpose & Scope: One source of truth for agent behavior, boundaries, and guardrails. State what agents may change (code/docs) and what is prohibited (secrets, prod data).
- Truth Sources: Define truth precedence: repository state > CLAUDE.md > sub‑agent docs > roadmap. Link to TECH_FACTS (ports, API contracts, DB schema), AGENT_PREFLIGHT (runbook), PROJECT_STATE.md (sprint/intent). Never invent endpoints/ports/schemas.
- Environment & Ports: Non‑negotiable port 3000 policy. Kill first (`lsof -ti:3000 | xargs kill -9 || true`), then run `PORT=3000 npm run dev`. Do not accept 3001/3002. Note extension coupling to 3000.
- Safety & Permissions: Secrets presence‑only checks; never print values. Service‑role key server‑only, Node runtime only, never Edge/client. Migrations must be explicit; don’t assume tables exist.
- Execution Protocol: Preflight (read PROJECT_STATE.md + TECH_FACTS; env presence; free port 3000; grep‑before‑create). Plan change budget and ownership. Execute minimal diffs. Validate with `npm run quality`, web/extension builds, runtime curl 3000, and E2E when applicable. Provide evidence without secrets/tokens.
- Memory & Context: Use repo‑relative `.claude/memory/*.toml`. Always read/write at start/end and sync major decisions to PROJECT_STATE.md. Record recent failures (auto‑port, token drift).
- API/DB Guardrails: Encode device pairing routes, polling cadence, 425 statuses, device_tokens as truth, Node runtime for admin DB ops, and migration filepaths.
- Monorepo Awareness: Canonical scripts are `npm run dev`, `build:web`, `build:extension`, `test:e2e`, `quality`. Prefer re‑exports to avoid forking shared/auth or storage.
- Duplication & Hygiene: Mandatory grep‑before‑create; justify any new module. Never commit dist/ or backup/. Write docs only under /documents/*.
- Logging & Redaction: Redact identifiable data; never print full tokens or env values. Keep logs concise.
- Style & Tone: Short, actionable checklists and commands; cite concrete paths.
- Skeleton: What You Are; Truth Sources; Environment Rules; Preflight; Execution Protocol; DB/Auth Rules; Monorepo Commands; Anti‑Duplication & Hygiene; Memory Rules; Safety; Appendices (common commands, typical errors/resolutions).
- Common Pitfalls To Call Out: Next auto‑port → extension breaks; in‑memory token maps post‑restart; re‑implementing shared modules; printing secrets; ad‑hoc folder creation.

—

## Concrete Edits Suggested (for follow‑up PR)

- qa‑engineer.md: add port kill + PORT=3000; replace generic commands with repo scripts; add extension build checks.
- devops‑engineer.md: update to Netlify Next plugin, remote Supabase dev, Sprint 16/17 context; remove “local Supabase” default.
- All agent files: point to `.claude/memory/*.toml` (create files) and to a new `documents/core/technical/AGENT_PREFLIGHT.md` and `documents/core/technical/TECH_FACTS.md`.
- CLAUDE.md: Add links to those two docs; add a one‑liner “Do not create new folders outside documents/*” reinforcement.

—

## Fast Wins (Low Effort, High Impact)

- Add PORT 3000 enforcement to QA instructions.
- Create memory files in `.claude/memory/` and update agent paths.
- Add a “DB health” debug route flag and surface in logs whether DB or in‑memory token store is used.
- Add a grep pre‑step to QA/Tech Lead agents: search for similar files to prevent duplication.

—

## Risks if Unchanged

- Continued port flips to 3001 → extension auth/sync breakage.
- Agents produce duplicate modules and conflicting endpoints.
- DB state keeps drifting (in‑memory vs DB), tokens not persisted.
- Confusion due to stale agent context (Sprint 2 vs Sprint 16/17).

—

## Verification

- Run an agent task with the updated QA protocol; observe the server on port 3000 and passing runtime checks.
- Ask DevOps agent to propose deployment; ensure it references Netlify Next plugin and remote Supabase, not local stacks.
- Have Tech Lead agent recommend auth flow changes; verify it cites TECH_FACTS and doesn’t invent endpoints.

—

## Implementation Plan (Phased)

Phase 1: Documentation and Guardrails
- Add `documents/core/technical/TECH_FACTS.md` with: port 3000 mandate; remote Supabase usage; device_tokens schema and migration path; API route contracts; monorepo scripts; Node runtime note for service‑role.
- Add `documents/core/technical/AGENT_PREFLIGHT.md` with the exact preflight commands and checks (env presence only, free 3000, grep‑before‑create, read PROJECT_STATE.md + TECH_FACTS).
- Update CLAUDE.md to link both docs and restate anti‑duplication and folder hygiene rules.

Phase 2: Sub‑agent Updates
- qa‑engineer.md: Replace placeholders with repo scripts; enforce port 3000; include extension build/run checks; add env redaction note; add grep‑before‑create.
- devops‑engineer.md: Replace “local Supabase dev” narrative with Netlify Next plugin + remote Supabase parity + Node runtime for service‑role. Add migration checklist for device_tokens and deploy checklist.
- tech‑lead‑architect.md / ux‑ui‑engineer.md: Point memory to `.claude/memory/*.toml`; require references to TECH_FACTS & AGENT_PREFLIGHT; add change‑budget & ownership note.

Phase 3: CI Guardrails (optional, later)
- Add CI checks that fail on: port ≠ 3000 during preview, committed `dist/` or `backup/` changes, duplicate module patterns (name collisions) and basic lint for .claude files (e.g., port rule present).

Phase 4: Adoption
- Run a dry‑run with updated agents on a small change; confirm they follow preflight and don’t duplicate modules/folders; verify extension tests pass with port 3000.

—

## Acceptance Criteria

- Agents consistently start the web server on port 3000 (never auto‑switch). Evidence: preflight logs and runtime curl.
- No new duplicate modules are introduced; agents grep and reuse existing implementations.
- Sub‑agents read/write `.claude/memory/*.toml` and reference TECH_FACTS and AGENT_PREFLIGHT.
- QA validations use repo scripts (`quality`, `build:web`, `build:extension`, `test:e2e`) and enforce env redaction rules.
- DevOps proposals reference Netlify Next plugin and remote Supabase; routes requiring service‑role explicitly run in Node runtime.
