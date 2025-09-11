# UI/UX Design Specification: Gamma Timetable (Web + Extension)

This document codifies our current UI system and the design patterns that both the web dashboard and the Chrome extension follow. It is implementation-aligned with the codebase as of August 2025.

## 1. Design Overview

### Design Philosophy

- Minimalist: clean, low‑friction interfaces
- Intuitive: obvious affordances, progressive disclosure
- Efficient: frequent actions are one click or a single shortcut away
- Consistent: shared components and tokens across surfaces
- Accessible: keyboard and screen reader friendly by default

### Visual Style

- Modern, utilitarian aesthetic; strong information hierarchy
- Matches Gamma where appropriate; avoids brand clash
- Light and dark themes using CSS variables
- WCAG AA color contrast or better

## 2. UI Stack (Web Dashboard)

- Framework: Next.js App Router (React 19, Next 15)
- Styling: Tailwind CSS with CSS variable tokens and dark mode
- Components: shadcn-style primitives backed by Radix UI and class-variance-authority
- Icons: lucide-react
- Feedback: sonner Toaster for non-blocking notifications

Code refs:
- Root layout and Toaster: `packages/web/src/app/layout.tsx`
- Global tokens and theme: `packages/web/src/app/globals.css`
- Tailwind setup: `packages/web/tailwind.config.js`
- shadcn config: `packages/web/components.json`
- cn helper: `packages/web/src/lib/utils.ts`

## 3. Design Tokens & Theming

- Semantic tokens (HSL) define background/foreground, primary/secondary, accent, border, input, ring, destructive, card, popover, and dedicated sidebar palette.
- Tokens live in CSS variables and are applied via Tailwind in components.
- Radius scale: `--radius` drives `lg`, `md`, `sm` radii.
- Dark mode uses the `.dark` class and alternate token values.

Code refs:
- Tokens: `packages/web/src/app/globals.css`
- Tailwind token mapping: `packages/web/tailwind.config.js`

## 4. Component System

- Build with our local shadcn-style components under `packages/web/src/components/ui/*`.
- Compose behavior via Radix primitives (dialog, sheet, tooltip, etc.).
- Styling variants defined with `cva` and consumed via the `cn` helper.
- Keep props minimal; prefer variants (`variant`, `size`) for visual changes.

Key components:
- Buttons: `button.tsx` (default, outline, secondary, ghost, link)
- Inputs/Labels: `input.tsx`, `label.tsx`
- Dialogs and Alert Dialogs: `dialog.tsx`, `alert-dialog.tsx`
- Navigation Sidebar: `sidebar.tsx` with provider, mobile sheet, collapse states
- Sticky Header: `sticky-header.tsx` - unified header pattern with sticky positioning
- Cards/Badges/Separators/Skeleton/Tabs/Tooltip/Dropdown

Shared library:
- Cross-surface UI lives in `packages/shared/ui/*` for extension parity.
- Gamma-specific button variants exist in shared UI for the extension context.

## 5. Layout Patterns

- Dashboard layout wraps pages with `AppLayout` and `SidebarProvider`.
- Sidebar behaviors:
  - Desktop: fixed with expandable/collapsible states; keyboard shortcut `Cmd/Ctrl + b` to toggle
  - Mobile: off-canvas sheet
  - State persisted to cookie (`sidebar_state`)
- Content area uses `SidebarInset` to maintain correct spacing.

Code refs:
- Layout wrapper: `packages/web/src/components/layouts/AppLayout.tsx`
- Sidebar system: `packages/web/src/components/ui/sidebar.tsx`
- Mobile detection: `packages/web/src/hooks/use-mobile.tsx`

## 6. Content Screens (Standard Shell)

All "content screens" (Timetables, Analytics, Settings pages, etc.) must follow the same outer frame. This keeps paddings, header height, and spacing identical across pages.

- Header bar: unified sticky header component (Updated 2025-09-10)
  - Component: `StickyHeader` from `@/components/ui/sticky-header`
  - Behavior: sticky positioning with proper z-index, automatic SidebarTrigger integration
  - Structure: `sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background`
  - Contents: Built-in `SidebarTrigger`, page icon, `h1.text-lg.font-semibold` title
  - Rationale: ensures consistent sticky behavior across all screens; single source of truth

- Outer content wrapper: page body container
  - Element: `div`
  - Classes: `flex flex-1 flex-col gap-4 p-4`
  - Gap: `gap-4` vertical rhythm between sections
  - Padding: `p-4` consistent with header’s `px-4`

- Inner content container: full-width content column
  - Element: child `div`
  - Classes: `w-full`
  - Behavior: consumes 100% of available space within the page content area
  - Optional constraint: add `max-w-*` only if the PRD explicitly requires a narrow reading column (default is full width)

Navigation pattern
- Do not place in-page “Back to …” links at the top of content screens.
- Primary navigation is via the sidebar and contextual actions within the screen.

- Alerts and toasts
  - Inline alerts live directly under the back link (or at container top)
  - Toasts use `sonner` and are already global via `RootLayout`

- Section spacing
  - Use `space-y-8` inside the inner container to separate cards/sections
  - Do not add custom margins between individual cards beyond this standard

- Cards and content blocks
  - Use `Card`, `CardHeader`, `CardContent`
  - Card class: `bg-card border border-border/60 shadow-sm`
  - Keep headings concise; use `CardDescription` for supporting text

- Responsive rules
  - Mobile breakpoint: 768px
  - Grids collapse from `md:grid-cols-2` to one column on mobile
  - No horizontal scrolling; form actions wrap or move below inputs

- Spacing invariants
  - Header height: `h-16`
  - Page padding: `p-4`
  - Inter-section gap: `gap-4` (outer wrapper), `space-y-8` (inner)
  - Icon size in header: `h-5 w-5`

- Do / Don’t
  - Do reuse the header + outer + inner structure on every content screen
  - Do keep the inner container `w-full` (full-width); only add `max-w-*` when mandated by spec
  - Don’t center inner containers (`mx-auto`); avoid per-page custom paddings
  - Don’t place page titles outside the header bar

### StickyHeader Usage Pattern

```tsx
import { StickyHeader } from '@/components/ui/sticky-header'

<StickyHeader>
  <div className="flex items-center gap-2 flex-1">
    <Icon className="h-5 w-5" />
    <h1 className="text-lg font-semibold">Page Title</h1>
  </div>
  {/* Additional header content like action buttons */}
</StickyHeader>
```

Code reference examples:
- `packages/web/src/components/ui/sticky-header.tsx` - unified header component
- `packages/web/src/app/gamma/timetables/TimetablesClient.tsx` - implementation example
- `packages/web/src/app/gamma/timetables/[id]/TimetableDetailClient.tsx` - complex header with actions

## 7. Responsiveness

- Mobile breakpoint at 768px; `useIsMobile()` governs sidebar mode and some UI affordances.
- Avoid horizontal scrolling; stack controls and use grouped actions in overflow (e.g., dropdown) on small screens.

## 8. Feedback & Status

- Use `sonner` Toaster for transient success/info/error messages.
- Use `Alert` for inline, contextual messaging.
- Use Skeletons for loading states in content areas.
- Use `Loader2` icon for inline loading indicators on buttons/actions when needed.

## 9. Forms & Validation

- Inputs paired with `Label`; error text inline below the field or in an `Alert` above the form.
- Submit actions disable buttons and show a spinner when pending.
- Use zod schema validation server-side; reflect first error prominently.

## 10. Accessibility

- All interactive elements must be keyboard accessible (Tab order, focus ring visible).
- Radix primitives provide base a11y; preserve aria attributes and roles.
- Ensure names/labels for screen readers (`aria-label`, `aria-describedby`).
- Animation should respect reduced-motion preferences and be non-blocking.

## 11. Content & Copy

- Tone: helpful, concise, action-oriented.
- Button labels use verbs: “Save”, “Connect”, “Retry”.
- Error messages state the problem and the next step.

## 12. Extension UI (Manifest V3)

- Tech: Vanilla HTML/CSS/JS side panel and popup; no React in MV3 surfaces.
- Follow minimal DOM structure and shared CSS classes for status bars, settings, and sync controls.
- Reuse shared utilities (`@shared/storage`, `@shared/auth`) to align behavior with web.
- Keep interactions snappy; avoid long-running UI work on the main thread.

Code refs:
- Side panel HTML: `packages/extension/sidebar/sidebar.html`
- Side panel logic: `packages/extension/sidebar/sidebar.js`
- Shared UI: `packages/shared/ui/*`

## 13. Consistency Rules

- Prefer web `ui/*` components for dashboard work; do not duplicate styles ad hoc.
- For elements shared with the extension, consider `packages/shared/ui/*` first.
- Use the semantic token palette; do not hardcode colors.
- Use the standard spacing scale and radii defined by tokens.

### Border System
- Thickness: default 1px (`border`) for cards, panels, and separators.
- Color: use token `border` → `hsl(var(--border))`; attenuate with `/60` for softer borders when needed.
- Hover/active: prefer elevation (`shadow-sm` → `hover:shadow-md`) over increasing border thickness.
- Exceptions: status-specific components (e.g., destructive, success) may use colored borders but keep width at 1px.

### Spacing System
- Page shell: StickyHeader provides `px-4`, content `p-4`, outer `gap-4`.
- Card internal padding: `p-4` for both `CardContent` and `CardFooter` (footer also `border-t`).
- Grid gaps: use `gap-6` for Timetable cards; do not override per-item margins.
- Vertical rhythm inside content sections: `space-y-2` for field clusters, `space-y-6` for grouped blocks.

### Action Rows (Button Bars)
- Button row placement: last element in cards with `border-t` and same `p-4` padding as content.
- Attachment: card container uses `flex h-full flex-col`; footer uses `mt-auto` to pin to bottom.
- Button sizing: use default `size` (height 40px/`h-10`) for primary/outline; use `size="icon"` for circular icon-only buttons.
- No custom per-screen button sizes; variants from `components/ui/button.tsx` only.
- Action count limits:
  - List cards: maximum 1 primary action (e.g., View). No overflow menus in list cards.
  - Detail/management cards: maximum 2 actions (primary + one secondary). If more are needed, navigate to a details page.
  - Do not hide required actions responsively.
  - Do not wrap the action row; keep a constant height.
 - Alignment: buttons are right-aligned in the footer (`justify-end`). Use a single action group; avoid left/right split.

## 14. Patterns to Reuse

- Empty states with clear primary action and short guidance.
- Dialogs for destructive or multi-step confirmations; sheets for temporary, contextual panels.
- Sidebar sections with concise labels and predictable grouping.
- Structured list/grid with skeleton placeholders and explicit loading/empty/error states.

## 15. Implementation Checklist

- Uses `AppLayout` and `SidebarProvider` when applicable
- Uses local `ui/*` components and tokens
- Responsive at ≥768px breakpoint; mobile interactions verified
- Accessible names, labels, and focus management present
- Feedback via Toaster/Alert; loading via Skeleton/inline spinners
- No hardcoded colors; tokens and Tailwind utilities only

---

Revision: 2025-09-10. This spec reflects current implementation and should be kept in sync as components evolve.

**Recent Updates:**
- 2025-09-10: Added `StickyHeader` component pattern for unified sticky header behavior across all content screens
