# Sprint 28 — UX Improvements (Sofia Sans + Account Page)

Status: Completed
Start: 2025-09-03
End: 2025-09-05
Owner: UX/UI + Full-Stack

## Mission
Elevate the visual polish and information architecture by:
- Adopting Sofia Sans as the application font (web dashboard) via `next/font` with optimal loading.
- Redesigning the Account page to a clean, card-based layout inspired by the provided HTML, using our existing UI primitives and design tokens.

## Scope
In Scope
- Web app typography: add Sofia Sans and apply globally via next/font.
- Account page UI: standard content shell header, Profile Information, Account Overview, Notifications, Delete section.
- Timetables list cards: standardized borders, spacing, action row and compact metadata layout.
- Global conventions added to UI spec: content screen shell, spacing system, border system, action row rules (right-aligned, constant height, max actions).
- Copy/labels alignment with the design spec tone.

Out of Scope
- Extension (MV3) typography changes.
- Any functional auth changes or RLS policy changes.
- Navigation IA beyond the Account page header/back link.

## Deliverables
- Sofia Sans configured via `next/font/google` with `display: 'swap'` and applied to `<body>`.
- Account page refactor using our UI primitives; header restored to standard shell; inner content full‑width.
- Removed in‑page back link per navigation rules.
- Timetable cards: compact meta row (Updated • Duration • Start), slides count badge, 1px token border, consistent p-4 padding, footer pinned and right‑aligned, only primary View action shown.
- Spec updates in `documents/core/design/UI_UX_Design_Spec.md` for content shell, spacing system, action row rules, and border system.

## Acceptance Criteria
- Font
  - App renders with Sofia Sans in all pages (verify on `/`, `/dashboard`, `/settings/*`).
  - No FOUT/CLS regressions beyond acceptable `display: swap` behavior.
  - Lighthouse font-display audit remains green.
-- Account UI
  - Header shows icon + “Account” title using the standard content shell.
  - Profile Information card: editable Name with Save; Email read-only.
  - Account Overview: created date in human format; Account ID shown with copy control.
  - Notifications: two toggles (email, marketing) with persisted state and disabled while updating.
  - Delete account section present and visually consistent with danger styling.
  - Mobile: no horizontal scrolling; grids collapse correctly.
- Timetables list UI
  - Card borders are 1px token color; hover uses elevation not thickness.
  - Internal padding p-4; footer attached to bottom with constant height.
  - Buttons right‑aligned; only primary View action visible in list.
  - Compact metadata fits on one row at 4‑up layout.
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
   - Header: lucide `User` icon, `h1` title, standard content shell.
   - Cards:
     - Profile Information: Name (editable + Save), Email (read-only).
     - Account Overview: Created date, Account ID with Copy button.
     - Notifications: Email + Marketing toggles with `Switch`.
     - Existing DeleteAccountClient preserved.
   - Feedback: success/error alerts near top; button spinner while saving.

3) Timetable Cards
   - Replace big icon block with compact title row.
   - Add compact meta row with icons and short units; add slides badge.
   - Footer: right‑aligned, primary action only; pin to bottom with `mt-auto`.

4) Polish
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

## Evidence
- App runs with Sofia Sans and standard shell on settings/timetables.
- Account page header matches Timetables; content is full‑width.
- Timetable cards show compact meta row and slides badge; footer button is right‑aligned and contained.
- UI spec updated with Content Screens, Border System, Spacing System, and Action Row rules.
