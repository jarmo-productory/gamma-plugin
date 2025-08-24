# Repository Guidelines

## Project Structure & Module Organization
- `src/`: Chrome extension source (content/background scripts, UI in `popup/`, utilities in `lib/`, assets in `assets/`).
- `packages/`: Multi-target code
  - `packages/extension/`: extension build scripts and helpers
  - `packages/shared/`: shared modules used across builds
  - `packages/web` and `packages/web-next`: web demo and Next.js site
- `tests/`: API, e2e, performance, and manual test suites.
- Build outputs: `dist/`, `dist-web/`, `dist-prod/`, `dist-shared/`.

## Build, Test, and Development Commands
- `npm run dev`: start Vite dev server for local work.
- `npm run build:extension`: build the Chrome extension to `dist/`.
- `npm run build:web`: build static web demo to `dist-web/`.
- `npm run package`: build and zip the extension release.
- `npm run test`: run unit tests (Vitest). `npm run test:coverage` for coverage.
- `npm run test:e2e`: run Playwright tests. `npm run test:ui` opens Vitest UI.
- `npm run quality`: type-check, lint, and format check.

Example: `npm run build:prod && open dist-prod/`.

## Coding Style & Naming Conventions
- Language: TypeScript preferred for new code; ES modules.
- Formatting: Prettier (2-space indent). Run `npm run format` or `npm run lint:fix`.
- Linting: ESLint configured via `eslint.config.js`.
- Naming: kebab-case for files (`generate-timetable.ts`), PascalCase for React components, camelCase for variables/functions.

## Testing Guidelines
- Frameworks: Vitest (unit), Playwright (e2e), k6 (performance), plus manual checklists in `tests/manual/`.
- Run focused tests: `npm run test tests/api/presentations.test.js -t "GET /api/presentations/get"`.
- Coverage: aim for ≥80% lines on changed code; include tests for new features and bug fixes.

## Commit & Pull Request Guidelines
- Commits: Conventional Commits (`feat: ...`, `fix: ...`, optional scope). Keep changes atomic.
- PRs: include summary, linked issues, before/after screenshots for UI, and a test plan. Ensure `npm run quality` and `npm test` pass.
- For extension changes, note manual steps to load unpacked from `dist/` in Chrome.

## Security & Configuration
- Secrets: never commit keys. Use `.env.local`; see `.env.example` for required vars (Clerk, Supabase, etc.).
- Deployment: Netlify configured via `netlify.toml`. Verify environment variables before `build:prod`.
