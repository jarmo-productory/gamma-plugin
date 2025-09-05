# Sprint 29 — OAuth Redirect & Env Hygiene

Status: planned
Sprint Window: 2025-09-06 → 2025-09-08
Owners: devops-engineer, full-stack-engineer, qa-engineer
Related audit: documents/audits/netlify-google-oauth-redirect-audit.md

## What This Sprint Is About (Non-Technical Summary)

Users signing in with Google from the live Netlify site are sometimes redirected back to `http://localhost:3000` instead of the production domain. The app builds OAuth `redirectTo` from the browser origin, so localhost redirects in production indicate misconfiguration (Supabase Auth URL settings and/or Netlify environment variables). This sprint fixes the configuration once and adds guardrails so it cannot regress.

## Goals

- Production Google OAuth always returns to the Netlify domain callback.
- Netlify environments (prod/preview) consistently point to the intended Supabase project using publishable keys.
- Clear internal diagnostics to verify app URL and expected callback at runtime.
- Build/CI guardrails prevent shipping localhost URLs to production.

## Success Criteria

- From the production Netlify site, Google OAuth returns to `https://<prod-domain>/auth/callback?next=/dashboard`.
- No redirects to `http://localhost:3000` in production (and previews behave per policy below).
- `/api/_internal/auth-config` reports the correct `NEXT_PUBLIC_APP_URL` and `expectedCallbackUrl` at runtime.
- CI fails if a production build attempts to use a localhost app URL or non‑publishable Supabase key.

## Non-Goals

- No changes to RLS or any service‑role usage. We continue to respect RLS fully.
- No UX redesign beyond optional warnings/console traces used for diagnostics.
- No provider‑level changes outside Supabase Auth configuration.

## Work Items

### 1) Supabase Auth Configuration
- Set Authentication → URL Configuration → Site URL to the production Netlify domain.
- Add the exact production callback to Redirect URLs: `https://<prod-domain>/auth/callback`.
- Decide preview policy and apply accordingly:
  - Either add preview callback domains, or restrict OAuth to production only.
- Verify Google provider is enabled and unrestricted for the Netlify domain.

### 2) Netlify Environment Alignment (Prod/Preview)
- Ensure environment variables point to the correct Supabase project:
  - `NEXT_PUBLIC_SUPABASE_URL=https://dknqqcnnbcqujeffbmmb.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_…` (publishable key format)
  - `NEXT_PUBLIC_APP_URL=https://<prod-domain>`
- Remove any lingering localhost values from the production context.

### 3) Diagnostics (Internal)
- Ensure an internal endpoint exists: `/api/_internal/auth-config` that reports:
  - `NEXT_PUBLIC_APP_URL`, `locationOrigin` (server-safe), and `expectedCallbackUrl`.
- Protect it with the existing internal guard (`X-Internal-Auth` + enable flag) per policy.

### 4) Build/CI Guardrails
- Add a production‑context check that fails the build if:
  - `NEXT_PUBLIC_APP_URL` contains `localhost` OR
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` does not start with `sb_publishable_`.
- Scope the check to CI/Netlify contexts so local dev remains unaffected.

### 5) Runtime Hardening (Optional)
- Log a one‑time warning in production if `location.origin !== NEXT_PUBLIC_APP_URL` to surface env drift.
- Emit a debug log of the computed `redirectTo` before calling `signInWithOAuth` when internal debug flag is enabled.

## Acceptance Tests

- Production login: From the live site, initiate Google sign‑in and verify callback URL is the production domain; user lands on `/dashboard`.
- Internal diagnostics: Call `/api/_internal/auth-config` (with guard enabled) and confirm `NEXT_PUBLIC_APP_URL` and `expectedCallbackUrl` match the production domain.
- CI guard: A dry‑run with `NEXT_PUBLIC_APP_URL=http://localhost:3000` fails the build; with valid prod envs, build passes.
- Preview behavior: If previews are allowed, a preview deploy sign‑in returns to the preview domain; if previews are disabled, behavior is documented and consistent.

## Security & RLS

- Do not bypass RLS for any user operations. No service‑role usage in user routes.
- Internal diagnostics remain under `/api/_internal/*` with internal guard and feature flag gating.
- All changes are configuration and guardrails; no privileged data exposure.

## Rollout Plan

1. Update Supabase Auth (Site URL + Redirect URLs) for production domain.
2. Update Netlify production/preview environment variables to match the intended Supabase project and domain.
3. Deploy to preview; validate using internal diagnostics; then promote to production.
4. Add CI guardrails; verify that a misconfigured env fails the build in CI.

## Risks & Mitigations

- Risk: Preview callback domains not registered → fallback/denied.
  - Mitigation: Decide policy (allow or restrict) and configure explicitly.
- Risk: Multiple Netlify contexts using different Supabase projects.
  - Mitigation: Document source‑of‑truth env per context; lock down and audit periodically.
- Risk: Future regressions from env drift.
  - Mitigation: Keep CI guardrails and internal diagnostics in place.

## References

- Audit: documents/audits/netlify-google-oauth-redirect-audit.md
- Code: `packages/web/src/components/AuthForm.tsx`, `packages/web/src/utils/supabase/{client,server}.ts`
- Policies/Guards: `packages/web/src/utils/internal-guard.ts`, `packages/web/src/middleware.ts`
- Platform: `netlify.toml` (dev port 3000 mandate remains in effect)

