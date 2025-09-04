# Sprint 28 — UX Improvements (Sofia Sans + Account Page)

Status: Planned
Start: TBD
Owner: UX/UI + Full-Stack

## Mission
Elevate the visual polish and information architecture by:
- Adopting Sofia Sans as the application font (web dashboard) via `next/font` with optimal loading.
- Redesigning the Account page to a clean, card-based layout inspired by the provided HTML, using our existing UI primitives and design tokens.

## Scope
In Scope
- Web app typography: add Sofia Sans, apply as the default sans font across the app.
- Account page UI: header with icon + back link, Profile Information card, Account Overview card, Notifications card, and the existing Delete Account section styled consistently.
- Copy/labels alignment with the design spec tone.

Out of Scope
- Extension (MV3) typography changes.
- Any functional auth changes or RLS policy changes.
- Navigation IA beyond the Account page header/back link.

## Deliverables
- Sofia Sans configured via `next/font/google`, `display: 'swap'`, applied to `<body>`.
- Account page refactor using `Card`, `Label`, `Input`, `Switch`, `Separator`, `Button` components.
- Responsive layout: `max-w-4xl` container, stacked on mobile.
- “Copy Account ID” control using accessible button and tooltip/title.
- Updated design spec references if minor UI tokens are used.

## Acceptance Criteria
- Font
  - App renders with Sofia Sans in all pages (verify on `/`, `/dashboard`, `/settings/*`).
  - No FOUT/CLS regressions beyond acceptable `display: swap` behavior.
  - Lighthouse font-display audit remains green.
- Account UI
  - Header shows icon + “Account” title + “Back to Dashboard” link.
  - Profile Information card: editable Name with Save; Email read-only.
  - Account Overview: created date in human format; Account ID shown with copy control.
  - Notifications: two toggles (email, marketing) with persisted state and disabled while updating.
  - Delete account section present and visually consistent with danger styling.
  - Mobile: no horizontal scrolling; grids collapse correctly.
- Accessibility
  - All interactive elements focusable with visible focus ring.
  - Labels correctly associated with inputs; buttons have descriptive text.
  - Copy button announces success via toast/alert region.

## Non‑Functional Requirements
- Performance: no measurable degradation on Web Vitals (LCP, CLS, INP) in dev parity.
- Theming: uses semantic tokens (`bg-card`, `bg-muted`, `border`, etc.) and dark mode friendly.
- Consistency: only uses components in `packages/web/src/components/ui/*` and design tokens in `globals.css`.

## Constraints & Guardrails
- Security: Never bypass RLS. No service-role client usage in user routes.
- Port 3000 mandate: dev server must run on `http://localhost:3000`.
- Project structure: reuse existing folders; do not create new top-level paths.

## Implementation Plan
1) Typography
   - Add Sofia Sans via `next/font/google` in `app/layout.tsx`.
   - Apply with `className` on `<body>`; keep Tailwind tokens unchanged.
   - Optional: alias Tailwind `font-sans` to use Sofia Sans in `tailwind.config.js` (if desired later).

2) Account Page Refactor
   - Layout container: `max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8`.
   - Header: lucide `User` icon, `h1` title, link back to dashboard.
   - Cards:
     - Profile Information: Name (editable + Save), Email (read-only).
     - Account Overview: Created date, Account ID with Copy button.
     - Notifications: Email + Marketing toggles with `Switch`.
     - Existing DeleteAccountClient preserved.
   - Feedback: success/error alerts near top; button spinner while saving.

3) Polish
   - Copy tone: concise, action‑oriented.
   - Verify dark mode tokens and states (disabled, hover).

## Validation Steps
- Port 3000
  - Kill any processes: `lsof -ti:3000 | xargs kill -9`
  - Start dev: `PORT=3000 npm run dev` from repo root or `packages/web`.
- Smoke tests
  - Visit `/settings/account` signed in.
  - Change name → Save; toast or alert confirms; refresh, value persists.
  - Toggle notifications; state persists and controls disable while updating.
  - Copy Account ID; verify clipboard content and feedback.
  - Resize to mobile width; ensure layout stacks and no overflow.
- Accessibility
  - Tab through controls; focus states visible; labels announce properly.

## Risks
- Font change can subtly affect spacing; verify critical layouts for wrapping.
- Clipboard API may be unavailable in some contexts; provide graceful fallback.

## Rollback Plan
- Font: revert to prior system UI stack by removing Sofia Sans wiring.
- Account page: revert to previous layout component structure.

## Notes
- This sprint intentionally avoids backend or route changes; UX only.
- Keep `UI_UX_Design_Spec.md` aligned if any component usage guidance changes.

