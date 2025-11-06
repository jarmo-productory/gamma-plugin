# Testing Guide - Gamma Plugin

## Overview

This guide covers how to run tests, understand test coverage, and add new tests to the Gamma Plugin codebase.

## Test Framework

We use **Vitest** for unit and integration testing:
- Fast execution with native ESM support
- Compatible with Jest API
- Built-in TypeScript support
- Coverage reporting with c8

## Running Tests

### Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:ui

# Run tests once and exit
npm run test:run

# Generate coverage report
npm run test:coverage
```

### Specific Test Suites

```bash
# Run integration tests only
npm test tests/integration/

# Run specific test file
npm test tests/integration/presentation-save-flow.test.ts

# Run tests matching pattern
npm test --grep "error handling"
```

## Test Structure

### Directory Organization

```
tests/
├── integration/           # Integration tests (API flows)
│   ├── presentation-save-flow.test.ts
│   └── error-cases.test.ts
├── api/                   # API endpoint tests
├── e2e/                   # End-to-end browser tests
├── manual/                # Manual test checklists
├── migration/             # Database migration tests
└── performance/           # Performance benchmarks
```

### Test Types

#### 1. Integration Tests

Test complete user flows from start to finish:

```typescript
// tests/integration/presentation-save-flow.test.ts
describe('Full Flow: Device Pairing → Save → Retrieve', () => {
  it('should complete device registration successfully', async () => {
    const response = await fetch(`${API_BASE_URL}/api/devices/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_fingerprint: 'test' })
    });

    expect(response.status).toBe(200);
    // ... more assertions
  });
});
```

#### 2. Error Case Tests

Validate error handling and edge cases:

```typescript
// tests/integration/error-cases.test.ts
describe('Invalid UUID Format', () => {
  it('should reject gamma URLs with invalid UUID format', async () => {
    const response = await fetch(`${API_BASE_URL}/api/presentations/save`, {
      method: 'POST',
      body: JSON.stringify({
        gamma_url: 'https://gamma.app/docs/not-a-valid-uuid',
        title: 'Invalid UUID Test'
      })
    });

    expect(response.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });
});
```

#### 3. Unit Tests

Test individual functions and modules:

```typescript
// Example: tests/unit/url-canonicalization.test.ts
import { canonicalizeGammaUrl } from '@/utils/url';

describe('URL Canonicalization', () => {
  it('should remove trailing slashes', () => {
    expect(canonicalizeGammaUrl('https://gamma.app/docs/test/'))
      .toBe('https://gamma.app/docs/test');
  });
});
```

## Test Coverage Requirements

### Minimum Coverage Targets

- **Statements**: >80%
- **Branches**: >75%
- **Functions**: >80%
- **Lines**: >80%

### Critical Paths (100% Coverage)

These flows must have complete test coverage:

1. **Device Pairing Flow**
   - Device registration
   - Code exchange
   - Token validation

2. **Presentation Save Flow**
   - Request validation
   - RPC execution
   - Error handling

3. **Authentication**
   - Device token validation
   - Session management
   - Permission checks

### Checking Coverage

```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/index.html
```

## Environment Setup for Testing

### Environment Variables

Create a `.env.test` file:

```bash
# API Configuration
API_BASE_URL=http://localhost:3000

# Test Tokens (optional - for authenticated tests)
TEST_DEVICE_TOKEN=your-test-token-here
TEST_EXPIRED_TOKEN=expired-token-for-testing

# Database (optional - for direct DB tests)
SUPABASE_URL=your-test-supabase-url
SUPABASE_ANON_KEY=your-test-anon-key
```

### Test Database Setup

For integration tests that require database state:

```bash
# 1. Create test database (Supabase CLI)
supabase start

# 2. Run migrations
supabase db reset

# 3. Seed test data
npm run test:seed
```

## Adding New Tests

### 1. Create Test File

Follow naming convention: `{feature}.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Feature Name', () => {
  beforeAll(async () => {
    // Setup before all tests
  });

  afterAll(async () => {
    // Cleanup after all tests
  });

  it('should do something', async () => {
    // Test implementation
    expect(result).toBe(expected);
  });
});
```

### 2. Test Patterns

#### API Testing Pattern

```typescript
const response = await fetch(`${API_BASE_URL}/api/endpoint`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': `device-token=${token}`
  },
  body: JSON.stringify(payload)
});

expect(response.status).toBe(200);
const data = await response.json();
expect(data.success).toBe(true);
```

#### Error Testing Pattern

```typescript
const response = await fetch(/*...*/);

expect(response.status).toBe(400);
const data = await response.json();

expect(data.code).toBe('VALIDATION_ERROR');
expect(data.message).toBeDefined();
expect(data.details).toBeInstanceOf(Array);
```

#### Async Testing Pattern

```typescript
it('should handle async operations', async () => {
  // Use async/await
  const result = await asyncFunction();
  expect(result).toBe(expected);

  // Or use promises
  await expect(asyncFunction()).resolves.toBe(expected);
  await expect(failingFunction()).rejects.toThrow('Error message');
});
```

### 3. Mock Data

Create reusable test fixtures:

```typescript
// tests/fixtures/presentations.ts
export const mockPresentation = {
  gamma_url: 'https://gamma.app/docs/test-uuid-123',
  title: 'Test Presentation',
  start_time: '09:00',
  total_duration: 3600,
  timetable_data: {
    title: 'Test',
    items: [
      { id: 1, title: 'Slide 1', duration: 1800 },
      { id: 2, title: 'Slide 2', duration: 1800 }
    ]
  }
};
```

## Testing Best Practices

### 1. Test Isolation

Each test should be independent:

```typescript
describe('Independent Tests', () => {
  let testData: any;

  beforeEach(() => {
    // Reset state before each test
    testData = createFreshData();
  });

  afterEach(() => {
    // Clean up after each test
    cleanupTestData(testData);
  });
});
```

### 2. Clear Test Names

Use descriptive test names that explain the scenario:

```typescript
// ❌ Bad
it('works', () => { /*...*/ });

// ✅ Good
it('should save presentation with valid device token', () => { /*...*/ });
it('should reject requests with expired tokens', () => { /*...*/ });
it('should canonicalize URLs with trailing slashes', () => { /*...*/ });
```

### 3. Arrange-Act-Assert (AAA) Pattern

Structure tests clearly:

```typescript
it('should update existing presentation', async () => {
  // Arrange - Set up test data
  const existingPresentation = await createTestPresentation();
  const updatePayload = { ...existingPresentation, title: 'Updated' };

  // Act - Perform the action
  const response = await fetch('/api/presentations/save', {
    method: 'POST',
    body: JSON.stringify(updatePayload)
  });

  // Assert - Verify the result
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.presentation.title).toBe('Updated');
});
```

### 4. Test One Thing at a Time

```typescript
// ❌ Bad - Testing multiple things
it('should save and update and delete', () => {
  // Too many concerns in one test
});

// ✅ Good - Separate tests
it('should save new presentation', () => { /*...*/ });
it('should update existing presentation', () => { /*...*/ });
it('should delete presentation', () => { /*...*/ });
```

### 5. Use Test Helpers

Create reusable test utilities:

```typescript
// tests/helpers/api.ts
export async function authenticatedRequest(
  endpoint: string,
  token: string,
  body: any
) {
  return fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `device-token=${token}`
    },
    body: JSON.stringify(body)
  });
}

// Usage in tests
const response = await authenticatedRequest(
  '/api/presentations/save',
  testToken,
  presentationData
);
```

## Continuous Integration

### GitHub Actions

Tests run automatically on:
- Pull requests
- Commits to main branch
- Release tags

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:run
      - run: npm run test:coverage
```

## Debugging Tests

### Run Single Test

```bash
# Run specific test by name
npm test -- -t "should save presentation"

# Run specific file
npm test tests/integration/error-cases.test.ts
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Current Test",
  "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/vitest",
  "args": ["${file}"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Verbose Output

```bash
# Show detailed test output
npm test -- --reporter=verbose

# Show console.log statements
npm test -- --reporter=verbose --silent=false
```

## Common Issues & Solutions

### Issue: Tests Timeout

**Solution**: Increase timeout for slow operations

```typescript
it('should handle slow database query', async () => {
  // Increase timeout to 10 seconds
  const response = await fetch(/*...*/);
  expect(response.status).toBe(200);
}, 10000); // 10 second timeout
```

### Issue: Flaky Tests

**Solution**: Ensure proper cleanup and isolation

```typescript
afterEach(async () => {
  // Clean up database
  await cleanupTestData();

  // Reset mocks
  vi.clearAllMocks();
});
```

### Issue: Authentication Required

**Solution**: Use test tokens or mock authentication

```typescript
// Option 1: Use environment variable
const token = process.env.TEST_DEVICE_TOKEN;

// Option 2: Mock authentication
vi.mock('@/utils/auth-helpers', () => ({
  getAuthenticatedUser: vi.fn(() => ({
    userId: 'test-user-id',
    source: 'device-token'
  }))
}));
```

## Related Documentation

- [Sprint 38 Roadmap](/documents/roadmap/sprint-38-presentation-save-stabilization.md)
- [API Documentation](/docs/API.md)
- [Architecture Guide](/documents/core/technical/presentations-save-architecture.md)
- [Troubleshooting Guide](/documents/debugging/presentation-save-troubleshooting.md)

## Contributing

When adding new features:

1. ✅ Write tests first (TDD approach)
2. ✅ Ensure >80% coverage for new code
3. ✅ Add integration tests for new API endpoints
4. ✅ Document test scenarios in this guide
5. ✅ Update CI/CD if new test dependencies added

---

**Last Updated**: October 2025 (Sprint 38)
