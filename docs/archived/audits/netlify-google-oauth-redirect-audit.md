# Audit: Netlify Google OAuth Redirects To localhost

Created: 2025-09-02
Type: Auth Config + Env Hygiene
Status: draft

---

## Summary

In production (Netlify), Google OAuth sometimes redirects back to `http://localhost:3000` instead of the Netlify domain. Code paths build redirect URLs from `location.origin` (which should be the live domain), so the behavior indicates an external configuration issue (Supabase Auth URL settings) or stale environment variables carried into the deployed build.

---

## Code Findings (Grounded Evidence)

- OAuth initiation constructs `redirectTo` from the runtime origin:
  - File: `packages/web/src/components/AuthForm.tsx`
    - `handleGoogleSignIn()` → `const redirectTo = `${location.origin}/auth/callback?next=${encodeURIComponent('/dashboard')}`;`
    - `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`
  - This should resolve to the Netlify origin in production.

- Supabase client is PKCE and parses callbacks on the front end and server:
  - `packages/web/src/utils/supabase/client.ts` → `createBrowserClient(..., { auth: { flowType: 'pkce', detectSessionInUrl: true } })`
  - `packages/web/src/utils/supabase/server.ts` → same PKCE config with cookie bridging.

- Internal config endpoint expects an app URL env:
  - `packages/web/src/app/api/_internal/auth-config/route.ts` → reports `NEXT_PUBLIC_APP_URL` and `expectedCallbackUrl`.
  - Used for diagnostics; not for the live OAuth redirect.

- Supabase guidance already documented:
  - `packages/web/SUPABASE-OAUTH-CONFIG.md` explicitly instructs adding the production domain to Supabase “Site URL” and Redirect URLs.

Conclusion from code: The app correctly uses the browser origin for `redirectTo`. A redirect to localhost in production points to Supabase Auth project settings and/or env mismatch, not a code bug.

---

## Likely Root Causes

1) Supabase “Site URL” still set to localhost
   - In Supabase Dashboard → Authentication → URL Configuration, if “Site URL” is `http://localhost:3000`, Supabase may fall back to it or validate redirects against it during PKCE flows.

2) Production callback not present in Supabase “Redirect URLs”
   - If `https://<your-netlify-site>/auth/callback` is missing from the Redirect URLs list, Supabase can reject or rewrite redirects and default to the Site URL.

3) Stale env in Netlify build context
   - If `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` point to a different Supabase project (one whose Site URL is localhost), the OAuth provider will honor that project’s URL config and redirect to localhost.
   - Less likely but possible: `NEXT_PUBLIC_APP_URL` is set to localhost in Netlify; while not used for redirectTo, it can mislead debugging and internal checks.

4) Preview deploys without matching callback registered
   - Netlify deploy previews use per‑deploy domains. If those callback URLs aren’t listed in Supabase, Supabase may fall back to Site URL (localhost) or reject.

---

## Verification Checklist

- Supabase Dashboard → Authentication → URL Configuration:
  - Site URL: `https://productory-powerups.netlify.app` (not localhost)
  - Redirect URLs: includes `https://productory-powerups.netlify.app/auth/callback`
- Supabase Dashboard → Authentication → Providers → Google:
  - Provider enabled; no domain restrictions blocking Netlify.
- Netlify Env Vars (Production context):
  - `NEXT_PUBLIC_SUPABASE_URL=https://dknqqcnnbcqujeffbmmb.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...` (matches the same project)
  - `NEXT_PUBLIC_APP_URL=https://productory-powerups.netlify.app`
- Build provenance:
  - Confirm which commit built the site and whether any `.env` checked into repo overrides production.
- Sanity endpoint:
  - Call `/api/_internal/auth-config` (with internal guard enabled) to see `expectedCallbackUrl` and env as resolved at runtime.

---

## Repro/Diagnostics

1) From Netlify site, open DevTools console and run `location.origin` → should equal your Netlify domain.
2) Initiate Google sign‑in; the request to Supabase should include `redirect_to=<NetlifyOrigin>/auth/callback?next=/dashboard`.
3) If redirect goes to localhost:
   - Check Supabase project → URL Configuration values.
   - Verify Netlify env vars point to the intended Supabase project.
   - Use `/api/_internal/auth-config` to confirm `NEXT_PUBLIC_APP_URL` and expected callback.

---

## Fix Plan

- Supabase settings (authoritative):
  - Set Site URL to the Netlify production domain.
  - Add the exact production callback to Redirect URLs: `/auth/callback`.
  - Optionally add deploy preview pattern if needed (or restrict to prod only).

- Netlify env hygiene:
  - Ensure `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` match the intended Supabase project in all contexts (production/preview).
  - Set `NEXT_PUBLIC_APP_URL` to the production domain for consistency in diagnostics and links.

- Code hardening (optional):
  - Add a runtime assertion that logs a warning if `location.origin` is not equal to `NEXT_PUBLIC_APP_URL` in production builds.
  - Expose an internal debug page that prints `location.origin`, `redirectTo`, and resolved Supabase URL for quick triage (behind internal guard).

---

## Acceptance Criteria

- From the Netlify site, Google OAuth returns to `https://productory-powerups.netlify.app/auth/callback?next=/dashboard`.
- No redirects to `http://localhost:3000` observed in production flows.
- `/api/_internal/auth-config` confirms correct `NEXT_PUBLIC_APP_URL` and expected callback.
- Supabase “Site URL” and Redirect URLs match production; preview behavior is defined (allowed or disabled).

---

## References

- Code: `packages/web/src/components/AuthForm.tsx`, `packages/web/src/utils/supabase/{client,server}.ts`, `packages/web/src/app/api/_internal/auth-config/route.ts`
- Docs: `packages/web/SUPABASE-OAUTH-CONFIG.md`
- Netlify: `netlify.toml` (build/dev port), Netlify UI env configuration

