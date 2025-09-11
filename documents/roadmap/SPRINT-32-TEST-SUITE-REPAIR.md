# SPRINT 32: Test Suite Repair and Configuration

**Status:** 📋 Planning
**Sprint Window:** Immediate
**Owner:** Gemini AI
**Related Audit:** This sprint is a response to the widespread test failures discovered during the initial investigation for Sprint 31.

## Mission

To restore the integrity and reliability of the project's test suite by resolving critical configuration errors, fixing broken tests, and ensuring a stable testing environment. A healthy test suite is a prerequisite for safely implementing and validating any future application code changes, including the fixes planned for Sprint 31.

## Goals

- **Isolate Test Runners:** Configure Vitest and Playwright to run independently, so unit/integration tests do not conflict with E2E tests.
- **Fix Environment Configuration:** Resolve all path alias (`@/`, `@shared/`) import errors so the test environment can correctly locate modules.
- **Modernize Test Syntax:** Remove dependencies on legacy `jest` globals and align all tests with the `vitest` framework.
- **Synchronize Test Assertions:** Update tests with outdated assertions to reflect the current state of the application's configuration and logic.
- **Achieve a Green Build:** Ensure `npm run test:run` completes with 100% of unit and integration tests passing.

## Success Criteria

- ✅ `npm run test:run` executes successfully with zero failing unit/integration tests.
- ✅ E2E tests (`*.spec.ts`) are successfully excluded from the Vitest test run.
- ✅ All path alias import errors are resolved.
- ✅ All `jest is not defined` errors are eliminated.
- ✅ The test suite provides a reliable signal for regressions and validates code changes correctly.

## Scope

### In Scope
- Modifying `vitest.config.ts` to correctly configure test file inclusion/exclusion and path aliases.
- Updating `tsconfig.json` if necessary to support test path resolution.
- Refactoring test files to use `vitest` APIs (e.g., `vi` instead of `jest`).
- Correcting assertion values in configuration tests to match current application defaults.
- Investigating and fixing the potential bug in the `StorageManager` sync queue logic.

### Out of Scope
- Implementing the timeline sync fixes from Sprint 31 (this sprint is a prerequisite).
- Writing new tests for uncovered code.
- Running or fixing the Playwright E2E tests (this sprint only ensures they are excluded from the unit test run).

## Work Items

### 1) Test Runner & Environment Configuration
- **Task:** Modify `vitest.config.ts` to explicitly exclude all Playwright E2E test files (e.g., `**/*.spec.ts`).
- **Task:** Add a Vite/Vitest compatible path alias resolver (like `vite-tsconfig-paths`) to `vitest.config.ts` to fix all `@/` and `@shared/` import errors.

### 2) Syntax and Assertion Fixes
- **Task:** In `packages/web/src/app/api/devices/register/route.test.ts`, replace all `jest.*` calls with their `vi.*` equivalents (e.g., `jest.clearAllMocks()` becomes `vi.clearAllMocks()`).
- **Task:** Review and update the failing tests in `packages/extension/shared-config/index.test.ts` and `packages/shared/config/index.test.ts`. Correct the `expected` values in the assertions to match the current, valid default configurations.

### 3) Application Logic Investigation
- **Task:** Analyze the failing test `should not add to sync queue when cloud sync disabled (default)` in `packages/shared/storage/index.test.ts`.
- **Task:** Determine if the failure is due to a genuine bug in the `StorageManager` or a faulty test setup. If it is a bug, implement a fix.

### 4) Final Validation
- **Task:** Run `npm run test:run` and confirm that all tests now pass.
- **Task:** Ensure no new errors have been introduced and the test suite is stable.

## Technical Implementation Plan

1.  **Modify `vitest.config.ts`:**
    - Add an `exclude` property to the `test` configuration to ignore `**/*.spec.ts` files.
    - Install `vite-tsconfig-paths` and add it to the `plugins` array to handle path aliases.

2.  **Refactor `.../register/route.test.ts`:**
    - Search and replace `jest.` with `vi.`.

3.  **Update Config Tests:**
    - For each failing assertion like `expect(config.features.cloudSync).toBe(false)`, check the actual value in the source code.
    - If the feature is now enabled by default, change the test to `expect(config.features.cloudSync).toBe(true)`. The goal is to make the test reflect reality.

4.  **Debug Storage Test:**
    - Set breakpoints or add logging to the `StorageManager` `saveData` and `addToSyncQueue` methods.
    - Trace the execution path for the failing test to understand why an item is being added to the queue even when `enableCloudSync` is false.

## Conclusion

This sprint is a necessary maintenance effort to pay down technical debt in our testing infrastructure. Completing these repairs will unblock future development and allow us to proceed with Sprint 31 and other tasks with confidence that our changes are not causing unintended regressions.
