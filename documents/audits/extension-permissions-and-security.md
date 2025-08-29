# Audit: Extension Permissions & Security

Status: Draft (placeholder)

- Objective: Reduce extension attack surface and tighten data handling.
- Primary areas:
  - Manifest: `packages/extension/manifest.json`
  - Messaging & ports: `packages/extension/background.js`, `packages/extension/content.ts`, `packages/extension/sidebar/sidebar.js`
  - Token storage & leakage: `packages/extension/shared-auth/*`, `packages/shared/auth/*`

Sections to complete:
- Scope & context
- Permissions review (least privilege, host patterns, all_frames/run_at)
- Messaging hardening (origin checks, spoofing, error paths)
- Token handling (storage locations, logs, propagation)
- Recommendations & phased fixes
- Verification plan (manual + automated checks)

