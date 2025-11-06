# Sidebar Authentication Flow Audit

Scope: Review the “Authentication Flow Specification” (documents/core/technical/Authentication_Flow_Specification.md) against the current implementation across the Chrome extension (sidebar) and web app, identify gaps/bugs, and recommend fixes.

Date: 2025-08-29

Owner: System analysis by assistant (second opinion)

---

## Executive Summary

Overall the implemented device-pairing model broadly follows the intended phases: device registration, user authentication + link, extension polling/exchange, and authenticated API usage. However, there are critical mismatches in token validation and state persistence that cause the freshly issued device tokens to be unusable by the extension in practice. The most severe issue is that the web “profile” validator looks up user information in `deviceRegistrations`, but the “exchange” flow deletes that registration, guaranteeing profile lookups fail post-exchange. There is also a refresh endpoint design that cannot succeed from the extension, inconsistent AuthManager logic between popup and sidebar bundles, and several security/operational gaps (rate limiting, token verification, state loss on server restarts).

Priority fixes: align token validation with a stable token-to-user mapping (or avoid deleting the registration before token expiry), make refresh independent of Supabase cookies, and de-duplicate/align auth manager logic used by the sidebar and popup.

---

## How This Audit Was Performed

- Read the spec file: documents/core/technical/Authentication_Flow_Specification.md
- Reviewed implementation in relevant modules:
  - Extension (sidebar) auth: packages/extension/shared-auth/* and packages/extension/sidebar/sidebar.js
  - Shared auth: packages/shared/auth/*
  - Device pairing APIs: packages/web/src/app/api/devices/*
  - Validation API: packages/web/src/app/api/user/profile/route.ts
  - Web UI pairing: packages/web/src/components/DevicePairing*.tsx, homepage/dashboard
- Verified tests/e2e expectations around pairing flows.

---

## Alignment With Spec

- Device registration: Implemented via POST /api/devices/register; returns `{deviceId, code, expiresAt}`. Uses in-memory `globalThis.deviceRegistrations`. Matches spec intent for Sprint-style prototype.
- User authentication & device linking: Implemented with Supabase auth enforcement in POST /api/devices/link; pairing dialogs appear on homepage/dashboard depending on auth state and URL params. Matches spec’s consent requirement and linking semantics.
- Polling & token exchange: Extension polls /api/devices/exchange every ~2.5s up to 5 minutes; server returns 425 until linked, 200 with `{token, expiresAt}` when linked. Matches spec timing and 425 usage.
- Extension-side state machine: UnifiedAuthManager states present (LOGGED_OUT, DEVICE_REGISTERED, PAIRING_IN_PROGRESS, AUTHENTICATED). Matches spec naming and transitions.

Key divergence: Post-exchange token validation and persistence differ materially from the spec’s “validate against server” rule; see gaps below.

---

## Gaps, Bugs, and Wrong Directions

1) Critical: Profile validation reads the wrong store (will always fail post-exchange)
- Where: packages/web/src/app/api/user/profile/route.ts
- Current behavior: Extracts `deviceId` from the token and tries to find a linked user by scanning `globalThis.deviceRegistrations`.
- Exchange behavior: packages/web/src/app/api/devices/exchange/route.ts deletes the registration (`deviceRegistrations.delete(code)`) immediately after issuing the token.
- Result: Immediately after successful exchange, profile lookups can’t find the linked user and return 404. The extension’s authManager (packages/extension/shared-auth/index.ts) clears the token on 404/401, causing the just-completed pairing to look “logged out.”
- Spec expectation: Validate token on the server; “Find linked user in deviceRegistrations” conflicts with immediate cleanup. Either don’t delete the linked registration until token expiry, or maintain a separate, durable token→user mapping.

2) Refresh endpoint design is incompatible with extension usage
- Where: packages/web/src/app/api/devices/refresh/route.ts
- Current behavior: Requires a Bearer device token AND an authenticated Supabase user (via cookies) to refresh.
- Extension reality: The extension has only the device token, not Supabase cookies; calls to refresh will return 401. DeviceAuth.getValidTokenOrRefresh() can never refresh; tokens simply expire and break cloud calls.
- Spec: Doesn’t mandate refresh, but if refresh exists it should validate/rotate based on the device token itself, not require a web-user session. As-is, refresh is effectively dead code for extension.

3) Inconsistent AuthManager semantics between popup and sidebar
- Where: packages/shared/auth/index.ts vs packages/extension/shared-auth/index.ts
- Popup imports `@shared/auth` where `isAuthenticated()` returns true if any device token is present (no server validation). Sidebar uses `../shared-auth/index.js` which validates against `/api/user/profile` and clears invalid tokens.
- Risk: Two different notions of “authenticated” cause inconsistent UI/behavior. Popup could display “authenticated” while sidebar correctly rejects stale tokens.
- Direction: Consolidate on the server-validated approach and ensure all extension entry points import the same module.

4) Token verification is effectively “opaque string” checks
- Where: profile route checks `token.startsWith('token_')` and then infers deviceId from string split. No cryptographic verification, no signature, no expiry check on the profile path.
- Risk: Anyone can fabricate a `token_deviceId_*` and attempt calls; authorization then depends on the transient presence of an in-memory registration with matching deviceId.
- Spec: Acknowledges simple token format for Sprint, but for correctness within this sprint, validation should at least consult a token→user mapping issuing time and expiry, not the registration map.

5) State persistence fragility (server restarts and horizontal scaling)
- Where: `globalThis.deviceRegistrations` and `globalThis.deviceTokens` are used as in-memory stores.
- Issue: On a dev server restart or across multiple instances, state is lost or inconsistent. Extension tokens derived from prior state become unverifiable by profile, flipping users to unauthenticated unexpectedly.
- Spec: Mentions in-memory for Sprint; the impact here is amplified by #1, since even “fresh” tokens can’t be validated after exchange cleanup.

6) Dashboard pairing URL handling is asymmetric
- Flow: Homepage redirects authenticated users to `/dashboard?code=...&source=extension` (good). DevicePairingDashboard shows the modal and links the device (good), but does not remove the pairing params from the URL on close/success, only clears localStorage. The homepage variant (DevicePairing) does clean URL params on close.
- Impact: Minor UX polish; stale `code` in the address bar can confuse users or retrigger UI after reload.

7) Rate-limiting and abuse controls are missing
- Where: /api/devices/register, /api/devices/link, /api/devices/exchange
- Tests explicitly note rate limiting is absent. Without throttling, pairing codes can be enumerated or registration spammed.

8) Error-handling and state cleanup coupling
- The extension clears tokens on any profile 404/401 and on network errors inside getCurrentUser(). In environments with flaky network or server restarts, this can unnecessarily force re-pairing.
- Consider distinguishing “definitely invalid” from “transient” failures; e.g., only clear on a verified invalidation and add limited retry/backoff for 5xx/network errors.

9) Spec vs. implemented entry path for pairing
- Spec suggests opening dashboard with code; implementation opens `/sign-in?source=extension&code=...`, then either shows banner + auth (unauthenticated) or redirects to dashboard (authenticated). Functionally OK and arguably better UX; just make sure the spec reflects the chosen path.

---

## Impact Assessment

- High impact: Post-exchange profile validation failure (#1) breaks the primary goal: the extension appears unauthenticated immediately after successful pairing, clearing the token and confusing the user.
- Medium impact: Refresh endpoint incompatibility (#2) forces re-pairing at expiry; may be acceptable short-term but should be deliberate.
- Medium impact: Inconsistency between popup/sidebar auth check (#3) can cause contradictory UI states and complicates debugging.
- Security/Robustness: Token verification and in-memory stores (#4, #5, #7) are acceptable for a sprint prototype but should be prioritized for stabilization.

---

## Recommendations (Ordered)

1) Fix token validation lifecycle
- Option A: Maintain a durable token→user mapping (e.g., `globalThis.deviceTokens` for Sprint; DB/Redis later). Profile should look up user by presented token, check expiry, and return user accordingly.
- Option B: Do not delete the registration immediately upon exchange. Instead, mark it “linked” and retain minimal user linkage until the issued token expires; then clean up. Profile can then resolve device→user via registration. This is simpler but bleeds registration state beyond “single-use”.
- Either way, ensure profile validation does not depend on data that was just deleted by exchange.

2) Redesign /api/devices/refresh to work with device tokens
- Accept the device token as the credential, validate it (via token store), and issue a rotated token with a new expiry. Do not require a Supabase web session for refresh.
- If refresh is out of scope, remove from DeviceAuth to avoid silent failures; or clearly document “no refresh; re-pair after expiry.”

3) Unify AuthManager usage
- Ensure both popup and sidebar import the same server-validating auth manager. Avoid the `presence-only` check in `packages/shared/auth/index.ts` or gate it behind feature flags strictly for tests.
- Add an integration test to ensure “after successful link+exchange, authManager.getCurrentUser() returns user” and remains stable across page reload.

4) Harden profile validation
- Validate tokens against a concrete store that tracks: token string, userId, issuedAt, expiresAt, deviceId. Reject on expiry and unknown tokens. Avoid inferring deviceId by string split alone.
- Add explicit 401/403/404 semantics: 401 for missing/invalid auth, 403 for token valid but not permitted, 404 for unknown user association.

5) Improve resilience and UX
- Differentiate transient network errors from invalid token responses; implement minimal retry/backoff before clearing tokens client-side.
- Clean query params on dashboard after successful pairing (mirror homepage behavior) to prevent re-entry loops.

6) Introduce basic abuse controls
- Add minimal rate limiting (IP-based or session-based) to /register and /exchange.
- Consider short, fixed-length codes with constrained alphabets and denial responses that don’t leak validity.

7) Document and align the spec
- Update the spec to reflect the chosen entry path (`/sign-in` vs `/dashboard`) and the decided token validation strategy (registration retention vs token store).
- Clarify cleanup rules and how the extension should behave on token expiry (refresh vs re-register), matching the implemented server capabilities.

---

## Quick Traceability Map (Spec → Impl)

- Phase 1 Register: Spec ✓ → Implemented in register route; extension uses `deviceAuth.registerDevice()`.
- Phase 2 Link with consent: Spec ✓ → Implemented with Supabase `getUser()` guard and pairing dialogs.
- Phase 3 Poll/exchange: Spec ✓ → Implemented with 425/200, interval and timeout match.
- Phase 4 Authenticated calls: Spec ✓ in concept; ✗ in practice due to profile validation mismatch post-exchange (see #1).
- Token validation rule: Spec says “validate via server” and “clear on invalid” ✓ in sidebar, but server validator is incorrect (see #1).
- State machine: Spec ✓ → UnifiedAuthManager present in both web and extension; minor duplication risk.

---

## Suggested Test Additions

- After successful link+exchange, `/api/user/profile` returns the expected user (non-flaky) and remains true after a server restart (once token store is persistent).
- Extension integration: sidebar flow completes pairing and `authManager.getCurrentUser()` resolves user; UI shows email in toolbar; subsequent cloud fetches succeed.
- Refresh path (if kept): with only device token, refresh returns a new token with later expiry.
- Negative: fabricated tokens are rejected (401), invalid/expired tokens trigger 404/401 consistently without leaking registration state.

---

## Closing Notes

The device pairing UX is on the right track and the core building blocks are present. The main blocker is the mismatch between token issuance/cleanup and profile validation. Fixing that single invariant—“server can validate any token it issues until expiry”—will cascade to stable sidebar auth, consistent UI, and reliable cloud calls. Consolidating auth logic and clarifying the specification around token lifecycle and pairing entry points will reduce confusion and test flakiness significantly.

