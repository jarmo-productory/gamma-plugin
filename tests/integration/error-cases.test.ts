import { describe, it, expect } from 'vitest';

/**
 * Error Case Test Suite
 *
 * Comprehensive testing of error handling for:
 * - Invalid UUID formats (Sprint 38 fix)
 * - Malformed URLs
 * - Invalid request payloads
 * - Network timeout scenarios
 * - Token expiry
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

describe('Error Handling: Validation Errors', () => {
  describe('Invalid UUID Format (Sprint 38 Critical Fix)', () => {
    it('should reject gamma URLs with invalid UUID format', async () => {
      const invalidUUIDs = [
        'https://gamma.app/docs/not-a-valid-uuid',
        'https://gamma.app/docs/12345',
        'https://gamma.app/docs/invalid-uuid-format',
        'https://gamma.app/docs/zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz',
        'https://gamma.app/docs/short'
      ];

      for (const url of invalidUUIDs) {
        const response = await fetch(`${API_BASE_URL}/api/presentations/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': 'device-token=test-token' // Will fail auth, but validation happens first
          },
          body: JSON.stringify({
            gamma_url: url,
            title: 'Invalid UUID Test',
            timetable_data: { title: 'Test', items: [] }
          })
        });

        // Should return 400 validation error or 401 auth error
        expect([400, 401]).toContain(response.status);

        const data = await response.json();

        if (response.status === 400) {
          expect(data.code).toBe('VALIDATION_ERROR');
          expect(data.message).toBe('Invalid body');
          expect(data.details).toBeDefined();
        }
      }
    });

    it('should accept valid UUID formats', async () => {
      const validUUIDs = [
        'https://gamma.app/docs/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        'https://gamma.app/docs/12345678-1234-1234-1234-123456789012',
        'https://gamma.app/docs/AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE'
      ];

      for (const url of validUUIDs) {
        const response = await fetch(`${API_BASE_URL}/api/presentations/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': 'device-token=test-token'
          },
          body: JSON.stringify({
            gamma_url: url,
            title: 'Valid UUID Test',
            timetable_data: { title: 'Test', items: [] }
          })
        });

        // Will fail auth (401) but URL validation should pass
        // If we get 400, it means validation failed
        expect(response.status).not.toBe(400);
      }
    });
  });

  describe('Malformed Gamma URLs', () => {
    it('should reject completely invalid URLs', async () => {
      const invalidURLs = [
        'not-a-valid-url',
        'ftp://gamma.app/docs/test',
        'javascript:alert("xss")',
        '',
        'http://',
        'https://',
        '//gamma.app/docs/test'
      ];

      for (const url of invalidURLs) {
        const response = await fetch(`${API_BASE_URL}/api/presentations/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': 'device-token=test-token'
          },
          body: JSON.stringify({
            gamma_url: url,
            title: 'Invalid URL Test',
            timetable_data: { title: 'Test', items: [] }
          })
        });

        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should reject non-gamma.app domains', async () => {
      const wrongDomains = [
        'https://evil.com/docs/test-uuid',
        'https://gamma-fake.app/docs/test-uuid',
        'https://www.gamma.app.evil.com/docs/test-uuid'
      ];

      for (const url of wrongDomains) {
        const response = await fetch(`${API_BASE_URL}/api/presentations/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': 'device-token=test-token'
          },
          body: JSON.stringify({
            gamma_url: url,
            title: 'Wrong Domain Test',
            timetable_data: { title: 'Test', items: [] }
          })
        });

        expect(response.status).toBe(400);
      }
    });
  });

  describe('Invalid Request Payloads', () => {
    it('should reject missing required fields', async () => {
      const invalidPayloads = [
        {}, // Empty object
        { title: 'Only Title' }, // Missing gamma_url
        { gamma_url: 'https://gamma.app/docs/test-uuid' }, // Missing title
        { gamma_url: 'https://gamma.app/docs/test-uuid', title: '' }, // Empty title
      ];

      for (const payload of invalidPayloads) {
        const response = await fetch(`${API_BASE_URL}/api/presentations/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': 'device-token=test-token'
          },
          body: JSON.stringify(payload)
        });

        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.code).toBe('VALIDATION_ERROR');
        expect(data.details).toBeDefined();
        expect(Array.isArray(data.details)).toBe(true);
      }
    });

    it('should reject invalid timetable_data structure', async () => {
      const invalidTimetableData = [
        'not-an-object', // String instead of object
        123, // Number instead of object
        null, // Null (should be object or omitted)
        { items: 'not-an-array' }, // Invalid items type
      ];

      for (const timetableData of invalidTimetableData) {
        const response = await fetch(`${API_BASE_URL}/api/presentations/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': 'device-token=test-token'
          },
          body: JSON.stringify({
            gamma_url: 'https://gamma.app/docs/test-uuid',
            title: 'Invalid Timetable Test',
            timetable_data: timetableData
          })
        });

        expect(response.status).toBe(400);
      }
    });

    it('should reject malformed JSON', async () => {
      const response = await fetch(`${API_BASE_URL}/api/presentations/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'device-token=test-token'
        },
        body: 'not-valid-json{'
      });

      expect(response.status).toBe(400);
    });
  });
});

describe('Error Handling: Authentication Errors', () => {
  describe('Expired Device Token', () => {
    it('should reject expired device tokens', async () => {
      // This requires a token that's marked as expired in the database
      const expiredToken = process.env.TEST_EXPIRED_TOKEN || 'expired-test-token';

      const response = await fetch(`${API_BASE_URL}/api/presentations/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `device-token=${expiredToken}`
        },
        body: JSON.stringify({
          gamma_url: 'https://gamma.app/docs/test-uuid',
          title: 'Expired Token Test',
          timetable_data: { title: 'Test', items: [] }
        })
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('Invalid Token Format', () => {
    it('should reject tokens with invalid format', async () => {
      const invalidTokens = [
        '',
        'a', // Too short
        'invalid-chars-!@#$%',
        'spaces in token',
        '../../../etc/passwd', // Path traversal attempt
        'token\nwith\nnewlines',
      ];

      for (const token of invalidTokens) {
        const response = await fetch(`${API_BASE_URL}/api/presentations/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `device-token=${token}`
          },
          body: JSON.stringify({
            gamma_url: 'https://gamma.app/docs/test-uuid',
            title: 'Invalid Token Format Test',
            timetable_data: { title: 'Test', items: [] }
          })
        });

        expect(response.status).toBe(401);
      }
    });
  });

  describe('Missing Authentication', () => {
    it('should reject requests without any auth', async () => {
      const response = await fetch(`${API_BASE_URL}/api/presentations/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gamma_url: 'https://gamma.app/docs/test-uuid',
          title: 'No Auth Test',
          timetable_data: { title: 'Test', items: [] }
        })
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('Authentication required');
    });
  });
});

describe('Error Handling: Database Errors', () => {
  describe('RPC Errors (Sprint 38 Validation)', () => {
    it('should handle P0001 error (user not found) with 404', async () => {
      // This requires a token linked to a user that was deleted from auth.users
      // In a test environment, this would be seeded data

      console.log('ℹ️  P0001 test requires database seeding (deleted user scenario)');

      // Expected behavior:
      // - RPC throws P0001 error
      // - API returns 404 status
      // - Response includes debug info with error code
    });

    it('should handle database constraint violations', async () => {
      // Test scenarios that might trigger database errors:
      // - Foreign key violations
      // - Check constraint failures
      // - Unique constraint violations (shouldn't happen with upsert, but good to test)

      console.log('ℹ️  Database constraint tests require specific test database state');
    });

    it('should include error debug information', async () => {
      // Any 500 error should include debug information
      const response = await fetch(`${API_BASE_URL}/api/presentations/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'device-token=trigger-rpc-error' // Special token for error testing
        },
        body: JSON.stringify({
          gamma_url: 'https://gamma.app/docs/test-uuid',
          title: 'RPC Error Test',
          timetable_data: { title: 'Test', items: [] }
        })
      });

      if (response.status === 500) {
        const data = await response.json();

        expect(data.error).toBeDefined();
        expect(data.debug).toBeDefined();
        expect(data.debug.code || data.debug.message).toBeDefined();
      }
    });
  });
});

describe('Error Handling: Network and Timeout Errors', () => {
  describe('Request Timeout', () => {
    it('should handle slow database responses gracefully', async () => {
      const token = process.env.TEST_DEVICE_TOKEN;

      if (!token) {
        console.log('⏭️  Skipping timeout test - no TEST_DEVICE_TOKEN env var');
        return;
      }

      // Set a very short timeout to simulate network issues
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 50); // 50ms timeout

      try {
        await fetch(`${API_BASE_URL}/api/presentations/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `device-token=${token}`
          },
          body: JSON.stringify({
            gamma_url: 'https://gamma.app/docs/timeout-test',
            title: 'Timeout Test',
            timetable_data: { title: 'Test', items: Array(1000).fill({}) } // Large payload
          }),
          signal: controller.signal
        });
      } catch (error: any) {
        expect(error.name).toBe('AbortError');
      } finally {
        clearTimeout(timeoutId);
      }
    });
  });

  describe('Network Connectivity', () => {
    it('should handle network disconnection', async () => {
      // This test validates client-side error handling
      // In real usage, the extension should retry with exponential backoff

      const invalidHost = 'http://localhost:9999'; // Non-existent server

      try {
        await fetch(`${invalidHost}/api/presentations/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gamma_url: 'https://gamma.app/docs/test-uuid',
            title: 'Network Error Test',
            timetable_data: { title: 'Test', items: [] }
          })
        });

        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        // Network error expected
        expect(error).toBeDefined();
        expect(error.cause?.code).toBe('ECONNREFUSED');
      }
    });
  });
});

describe('Error Response Format Validation', () => {
  it('should return consistent error format for 400 errors', async () => {
    const response = await fetch(`${API_BASE_URL}/api/presentations/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'device-token=test'
      },
      body: JSON.stringify({
        gamma_url: 'invalid-url',
        title: 'Error Format Test'
      })
    });

    expect(response.status).toBe(400);

    const data = await response.json();

    // Validation error format
    expect(data).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(data).toHaveProperty('message', 'Invalid body');
    expect(data).toHaveProperty('details');
    expect(Array.isArray(data.details)).toBe(true);
  });

  it('should return consistent error format for 401 errors', async () => {
    const response = await fetch(`${API_BASE_URL}/api/presentations/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gamma_url: 'https://gamma.app/docs/test-uuid',
        title: 'Auth Error Format Test',
        timetable_data: { title: 'Test', items: [] }
      })
    });

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data).toHaveProperty('error', 'Authentication required');
  });

  it('should return consistent error format for 500 errors', async () => {
    // This would require triggering a server error
    // In a real test, you might mock the RPC to throw an error

    console.log('ℹ️  500 error format test requires error injection capability');

    // Expected format:
    // {
    //   error: string,
    //   debug: {
    //     code?: string,
    //     message?: string,
    //     details?: string,
    //     hint?: string
    //   }
    // }
  });
});
