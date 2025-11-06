# Audit: Codebase Hygiene & De-duplication

Status: Draft

Goal: Identify duplicate modules, checked-in build artifacts, backup/legacy code, and debug leftovers to reduce maintenance cost and risk. Provide concrete cleanup steps and safeguards.

—

## High-Impact Findings

- Checked-in build artifacts
  - `packages/extension/dist/` contains built JS/HTML/CSS. These should be ignored and not committed.
  - Action: Add `packages/extension/dist` (and other build outputs per repo guide) to `.gitignore`. Remove from VCS in a dedicated cleanup PR.

- Duplicated authentication modules
  - `packages/shared/auth/*` and `packages/extension/shared-auth/*` both implement AuthManager and UnifiedAuthManager, diverging in behavior (presence-only vs server-validated).
  - Risk: Inconsistent auth across popup/sidebar; double maintenance.
  - Action: Consolidate to a single shared implementation with platform guards. Keep minimal wrappers only for platform-specific config loading.

- Duplicated storage manager
  - `packages/shared/storage/index.ts` vs `packages/extension/shared-storage/index.ts` have near-identical functionality.
  - Action: Use a single shared storage module. If extension needs path/alias differences, re-export from `packages/extension/*` rather than copying.

- Backup/legacy directories in repo
  - `backup/` (root): old dists, netlify functions, scripts-old, tests backup.
  - `packages/extension/backup/old-extension-dist-20250825` and `backup/old-root-dist-20250825-*`: historical build outputs.
  - Risk: Confusion during grep/code search; accidental imports; bloated repo.
  - Action: Move to `documents/archive/` or remove entirely. If needed for reference, compress or keep in a separate archival branch/tag.

- E2E tests duplication
  - Multiple auth flow specs with overlapping coverage; repo includes consolidation notes (`tests/e2e/ANALYSIS.md`, `CONSOLIDATION_SUMMARY.md`).
  - Action: Merge into a single `auth-flow.spec.ts` as planned. Remove superseded specs and analysis drafts post-merge.

- Debug utilities & ad-hoc scripts in root
  - `debug-extension-auth.js`, `debug-pairing-test.js`, `manual-test.html`.
  - Action: Move into `scripts/debug/` or `documents/devtools/`. Ensure excluded from builds and CI.

- Device pairing UI duplication
  - `DevicePairing.tsx` (homepage) and `DevicePairingDashboard.tsx` (dashboard) share pairing-dialog logic with minor differences (URL cleanup vs localStorage).
  - Action: Extract a single `DevicePairingController` hook or component used by both pages; keep minimal wrappers for page-specific behavior.

- Extension permissions breadth
  - `cookies` permission appears unused by extension code (no `chrome.cookies` usage found). Host permissions are broad for dev.
  - Action: Remove `cookies` permission if unused; document dev vs prod host permissions and consider a minimized production manifest.

- Type drift with Supabase models
  - `packages/web/src/lib/supabase.ts` types don’t match API usage (`gamma_url`, `timetable_data`, etc.).
  - Action: Generate types from Supabase schema and import consistently in routes and utils. Avoid hand-maintaining mismatched types.

—

## Additional Targets (Moderate Impact)

- Old Clerk references in shared auth
  - Verify if Clerk remains authoritative. If Supabase-only, remove Clerk wiring and envs from shared modules.

- Content/Background message contracts
  - Ensure message types are centralized (enum/type) to avoid drift across `background.js`, `content.ts`, `sidebar.js`.

- Presentational assets
  - Validate `packages/extension/assets/*` usage; remove unused icons or legacy assets.

—

## Cleanup Plan (Phased)

1) Build artifacts and backups (safe, mechanical)
- Add ignore rules; remove `packages/extension/dist/` from VCS.
- Move or delete `backup/` directories after confirming no production imports. Tag an archival branch if necessary.

2) Test consolidation
- Merge e2e auth tests per existing analysis docs. Remove duplicates.

3) Permissions tightening
- Remove `cookies` permission; validate extension behavior. Restrict host patterns for production manifest.

4) De-duplication
- Unify auth modules: use one shared `auth` and `unified-auth` package; update extension imports.
- Unify storage modules: re-export shared storage for extension; delete the duplicate implementation once updated.
- Extract DevicePairing logic into reusable component/hook and update both pages.

5) Types and API surface
- Generate Supabase types; replace manual types.
- Align API shapes with agreed Cloud Sync adjustments (see separate audit).

—

## Safeguards & Verification

- CI: Add a step to fail if files in `dist/` or `backup/` paths are modified.
- Lint: Enable unused file/module detection (e.g., ts-prune) to catch dead exports.
- E2E: Run consolidated auth flow and a basic sync flow after cleanup.

—

## Open Questions

- Keep any historical dist artifacts for docs? If yes, move to `documents/archive/` and link from docs.
- Do any third-party docs or blog posts reference files in `backup/`? If so, add redirects or notes.

—

## Next Steps

- Approve the cleanup scope.
- I can prepare an automated cleanup PR (git mv/removals, .gitignore changes) and a follow-up PR for module consolidation.

