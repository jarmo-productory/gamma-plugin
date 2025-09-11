# Sprint 29 — OAuth Redirect & Env Hygiene

Status: ✅ completed
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

### 1) Supabase Auth Configuration (MANUAL - Web UI Required)
**Manual Configuration Required:** Supabase CLI lacks auth configuration capabilities.

- **Manual:** Set Authentication → URL Configuration → Site URL to `https://productory-powerups.netlify.app`
- **Manual:** Add exact production callback to Redirect URLs: `https://productory-powerups.netlify.app/auth/callback`
- **Manual:** Decide preview policy and apply accordingly:
  - Either add preview callback domains, or restrict OAuth to production only
- **Manual:** Verify Google provider is enabled and unrestricted for the Netlify domain
- **CLI Verification:** `supabase projects api-keys` to verify project connection

### 2) Netlify Environment Alignment (CLI-Automatable)
**CLI-Automatable:** Full environment variable management via Netlify CLI.

- **CLI:** Set environment variables via Netlify CLI:
  ```bash
  netlify env:set NEXT_PUBLIC_SUPABASE_URL https://dknqqcnnbcqujeffbmmb.supabase.co
  netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY sb_publishable_COSbqOFu6uAcYjI1Osmg4A_vzzNAmPM
  netlify env:set NEXT_PUBLIC_APP_URL https://productory-powerups.netlify.app
  ```
- **CLI:** Remove localhost values: `netlify env:unset` for any localhost vars
- **CLI Verification:** `netlify env:list` to confirm all values are correct

### 3) Diagnostics (CLI-Implementable)
**CLI-Implementable:** Code changes can be automated via file edits.

- **CLI:** Create/verify `/api/_internal/auth-config` endpoint exists with proper reporting
- **CLI:** Ensure internal guard protection (`X-Internal-Auth` + enable flag) per existing policy
- **CLI:** Implement endpoint to report: `NEXT_PUBLIC_APP_URL`, `locationOrigin`, `expectedCallbackUrl`

### 4) Build/CI Guardrails (CLI-Implementable) 
**CLI-Implementable:** Build-time validation can be added to codebase.

- **CLI:** Add production-context check in build process that fails if:
  - `NEXT_PUBLIC_APP_URL` contains `localhost` OR
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` does not start with `sb_publishable_`
- **CLI:** Scope check to CI/Netlify contexts (preserve local dev flexibility)
- **CLI:** Implement in Next.js build process or separate validation script

### 5) Runtime Hardening (CLI-Implementable)
**CLI-Implementable:** Client-side validation and logging code.

- **CLI:** Add one-time production warning if `location.origin !== NEXT_PUBLIC_APP_URL`
- **CLI:** Implement debug logging for `redirectTo` computation when debug flag enabled
- **CLI:** Add to existing auth flow components

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

### Phase 1: Manual Configuration (User Required)
1. **Manual:** Update Supabase Dashboard → Authentication → URL Configuration
   - Site URL: `https://productory-powerups.netlify.app`
   - Redirect URLs: `https://productory-powerups.netlify.app/auth/callback`

### Phase 2: Automated Environment Setup (CLI)
2. **CLI:** Update Netlify environment variables:
   ```bash
   netlify env:set NEXT_PUBLIC_APP_URL https://productory-powerups.netlify.app
   netlify env:set NEXT_PUBLIC_SUPABASE_URL https://dknqqcnnbcqujeffbmmb.supabase.co
   netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY sb_publishable_COSbqOFu6uAcYjI1Osmg4A_vzzNAmPM
   ```

### Phase 3: Code Implementation (CLI)
3. **CLI:** Implement diagnostics endpoint, CI guardrails, runtime hardening
4. **CLI:** Deploy changes and validate using internal diagnostics

### Phase 4: Validation
5. **Manual:** Test production OAuth flow end-to-end
6. **CLI:** Verify CI guardrails catch misconfigured environments

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

---

## ✅ Sprint 29 Completion Summary

**Completed:** 2025-09-05
**Duration:** 1 day (2025-09-05 → 2025-09-05)

### Final Status: SUCCESS ✅

**Primary Goal Achieved:** Production Google OAuth now correctly redirects to `https://productory-powerups.netlify.app/auth/callback` instead of `http://localhost:3000`.

### Implementation Results:

**✅ Phase 1: Manual Configuration**
- Updated Supabase Site URL to `https://productory-powerups.netlify.app`
- Added both redirect URLs (production and localhost) 
- **Critical Fix:** Removed trailing spaces from Site URL that caused 500 errors

**✅ Phase 2: Environment Variables** 
- Netlify environment variables already correctly configured
- All production URLs and publishable Supabase keys verified

**✅ Phase 3: Code Implementation**
- Diagnostics endpoint: `/api/_internal/auth-config` already implemented
- CI guardrails: Added to `next.config.js` for production environment validation
- Runtime hardening: Added environment drift detection and debug logging to AuthForm

**✅ Phase 4: Validation**
- Production OAuth flow: Working end-to-end ✅
- Local development OAuth: Working end-to-end ✅ 
- Internal guard protection: Verified ✅
- Build process: CI guardrails functional ✅

### Key Lessons Learned:

1. **Whitespace matters in configuration:** Trailing spaces in Supabase Site URL caused OAuth 500 errors
2. **OAuth redirect fix successful:** Changed Site URL from localhost to production resolved the core issue
3. **Dual environment support:** Both production and development OAuth flows working correctly
4. **CI guardrails effective:** Production build validation prevents localhost URL deployment

### Technical Debt Resolved:

- ✅ Production users no longer redirected to localhost during OAuth
- ✅ Environment configuration properly aligned across all contexts  
- ✅ CI/CD pipeline includes configuration validation
- ✅ Runtime diagnostics available for future troubleshooting

**Sprint 29 objectives fully achieved with robust end-to-end OAuth functionality.**