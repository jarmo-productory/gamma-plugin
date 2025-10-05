# Integration Tests - Setup Guide

## Prerequisites

### 1. Node.js Version

These tests require Node.js 18+ for native `fetch` API support.

```bash
node --version  # Should be v18.0.0 or higher
```

### 2. Local API Server

Integration tests require the Next.js API to be running locally:

```bash
# Terminal 1: Start the API server
PORT=3000 npm run dev
```

### 3. Test Database (Optional)

For complete integration testing:

```bash
# Start local Supabase (if using Supabase CLI)
supabase start

# Or configure to use test Supabase project
cp .env.test.example .env.test
# Edit .env.test with your test Supabase credentials
```

## Running Tests

### Quick Start (No Setup Required)

Most tests will skip gracefully if prerequisites aren't met:

```bash
npm test tests/integration/
```

You'll see output like:
```
⏭️  Skipping save test - no device token (requires manual linking)
ℹ️  P0001 test requires database seeding (deleted user scenario)
```

### Full Integration Testing

To run all tests successfully:

#### Step 1: Start API Server

```bash
# Terminal 1
PORT=3000 npm run dev
```

#### Step 2: Create Test Device Token

```bash
# Terminal 2
# Option A: Manual device pairing
# 1. Open http://localhost:3000
# 2. Create account and login
# 3. Pair a test device
# 4. Copy the device token

# Option B: Direct database insert (Supabase SQL Editor)
INSERT INTO device_tokens (token, user_id, device_name, expires_at)
VALUES (
  digest('test-token-12345', 'sha256'),
  'YOUR_AUTH_USER_ID',
  'Test Device',
  NOW() + INTERVAL '24 hours'
);
```

#### Step 3: Set Environment Variables

```bash
# .env.test
TEST_DEVICE_TOKEN=test-token-12345
API_BASE_URL=http://localhost:3000
```

#### Step 4: Run Tests

```bash
npm test tests/integration/
```

## Test Categories

### 1. Device Pairing Flow

Tests device registration and token exchange:

```bash
npm test -- presentation-save-flow.test.ts -t "Device Pairing"
```

**Requirements:**
- ✅ API server running (localhost:3000)
- ❌ No auth required for registration
- ⚠️  Device linking requires manual web UI interaction

### 2. Presentation Save Flow

Tests authenticated presentation saves:

```bash
npm test -- presentation-save-flow.test.ts -t "save presentation"
```

**Requirements:**
- ✅ API server running
- ✅ Valid device token in .env.test
- ✅ Supabase configured

### 3. Error Handling

Tests validation and error responses:

```bash
npm test -- error-cases.test.ts
```

**Requirements:**
- ✅ API server running
- ❌ No auth required for most error cases
- ⚠️  Some tests require specific database states

### 4. Performance & Reliability

Tests concurrent requests and response times:

```bash
npm test -- presentation-save-flow.test.ts -t "Performance"
```

**Requirements:**
- ✅ API server running
- ✅ Valid device token
- ✅ Stable network connection

## Test Data Management

### Cleanup Between Test Runs

```sql
-- Supabase SQL Editor: Clean up test data
DELETE FROM presentations WHERE title LIKE '%Test%';
DELETE FROM device_tokens WHERE device_name LIKE '%Test%';
DELETE FROM device_registrations WHERE created_at < NOW() - INTERVAL '1 hour';
```

### Seed Test Data (Advanced)

For automated testing, create seed script:

```bash
# scripts/seed-test-data.sh
supabase db reset --db-url "postgresql://postgres:postgres@localhost:54322/postgres"
supabase db push
# Insert test users, tokens, presentations
```

## Troubleshooting

### Issue: `fetch is not defined`

**Solution**: Upgrade to Node.js 18+

```bash
nvm install 18
nvm use 18
```

Or install undici polyfill:

```bash
npm install --save-dev undici
```

### Issue: Tests timing out

**Solution**: Ensure API server is running on correct port

```bash
curl http://localhost:3000/api/health
# Should return 200 OK
```

### Issue: 401 Authentication errors

**Solution**: Check device token configuration

```bash
# Verify token exists in database
SELECT * FROM device_tokens
WHERE token = digest('YOUR_TOKEN', 'sha256');

# Verify .env.test has correct token
cat .env.test | grep TEST_DEVICE_TOKEN
```

### Issue: 500 RPC errors

**Solution**: Check Supabase RPC function exists

```sql
-- Verify RPC function
SELECT proname FROM pg_proc
WHERE proname = 'rpc_upsert_presentation_from_device';

-- Test RPC directly
SELECT * FROM rpc_upsert_presentation_from_device(
  'YOUR_USER_UUID'::uuid,
  'test@example.com',
  'https://gamma.app/docs/test-uuid',
  'Test',
  '09:00',
  3600,
  '{}'::jsonb
);
```

## CI/CD Integration

For automated testing in CI:

```yaml
# .github/workflows/test.yml
- name: Start API Server
  run: |
    npm run dev &
    sleep 10  # Wait for server to start

- name: Run Integration Tests
  run: npm test tests/integration/
  env:
    API_BASE_URL: http://localhost:3000
```

## Coverage Reports

Generate coverage for integration tests:

```bash
npm run test:coverage -- tests/integration/
```

View HTML report:

```bash
open coverage/index.html
```

## Next Steps

After running integration tests:

1. Review test coverage report
2. Add missing test cases
3. Document any skipped tests that need environment setup
4. Update this README with new test scenarios

## Related Documentation

- [Main Testing Guide](/docs/TESTING.md)
- [API Documentation](/docs/API.md)
- [Sprint 38 Roadmap](/documents/roadmap/sprint-38-presentation-save-stabilization.md)
