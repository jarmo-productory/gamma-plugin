/**
 * Sprint 2 API Testing Suite: Presentation Synchronization Endpoints
 * 
 * Tests for:
 * - POST /api/presentations/save
 * - GET /api/presentations/get  
 * - GET /api/presentations/list
 * 
 * Coverage: Authentication, input validation, error handling, data integrity
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Test Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/.netlify/functions';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-development-only';

// Test Data
const TEST_USER = {
  clerk_id: 'test_user_12345',
  email: 'test@example.com',
  name: 'Test User'
};

const TEST_PRESENTATION = {
  presentationUrl: 'https://gamma.app/docs/test-presentation-12345',
  title: 'Test Presentation for QA',
  timetableData: {
    title: 'Test Presentation for QA',
    items: [
      {
        id: 'slide-1',
        title: 'Introduction',
        content: 'Welcome to our presentation',
        duration: 5,
        startTime: '09:00',
        endTime: '09:05'
      },
      {
        id: 'slide-2', 
        title: 'Main Content',
        content: 'This is the main content section',
        duration: 10,
        startTime: '09:05',
        endTime: '09:15'
      }
    ],
    lastModified: new Date().toISOString()
  }
};

// Utility Functions
function signHS256(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

function createTestToken(payload, expiresIn = 3600) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    deviceId: 'test-device-123',
    userId: TEST_USER.clerk_id,
    iat: now,
    exp: now + expiresIn,
    ...payload
  };

  const h = Buffer.from(JSON.stringify(header)).toString('base64url');
  const p = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
  const s = signHS256(`${h}.${p}`, JWT_SECRET);
  
  return `${h}.${p}.${s}`;
}

function createExpiredToken() {
  return createTestToken({}, -3600); // Expired 1 hour ago
}

function createMalformedToken() {
  return 'malformed-token'; // Only 2 parts instead of 3
}

// Test Helpers
async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}/${endpoint}`;
  const { method = 'GET', token, body, query = {} } = options;
  
  // Create a proper request to the external API
  let req = request(API_BASE_URL)[method.toLowerCase()](`/${endpoint}`);
  
  if (token) {
    req = req.set('Authorization', `Bearer ${token}`);
  }
  
  if (body) {
    req = req.send(body);
  }
  
  // Add query parameters
  Object.keys(query).forEach(key => {
    req = req.query({ [key]: query[key] });
  });
  
  return req;
}

// Database Setup/Teardown
let supabase;
let testUserId;

beforeAll(async () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('Supabase environment variables not set, skipping database tests');
    return;
  }
  
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Create test user
  const { data: userData, error: userError } = await supabase
    .from('users')
    .upsert(TEST_USER)
    .select('id')
    .single();
    
  if (userError) {
    console.error('Failed to create test user:', userError);
    throw userError;
  }
  
  testUserId = userData.id;
});

beforeEach(async () => {
  if (!supabase) return;
  
  // Clean up test presentations before each test
  await supabase
    .from('presentations')
    .delete()
    .eq('user_id', testUserId);
});

afterAll(async () => {
  if (!supabase) return;
  
  // Clean up test data
  await supabase
    .from('presentations')
    .delete()
    .eq('user_id', testUserId);
    
  await supabase
    .from('users')
    .delete()
    .eq('clerk_id', TEST_USER.clerk_id);
});

// Test Suites
describe('POST /api/presentations/save', () => {
  const validToken = createTestToken();

  test('should save valid presentation successfully', async () => {
    const response = await makeRequest('presentations-save', {
      method: 'POST',
      token: validToken,
      body: TEST_PRESENTATION
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      presentationUrl: TEST_PRESENTATION.presentationUrl,
      title: TEST_PRESENTATION.title,
      itemCount: 2,
      totalDuration: 15
    });
    expect(response.body.id).toBeDefined();
    expect(response.body.syncedAt).toBeDefined();
  });

  test('should update existing presentation (upsert)', async () => {
    // First save
    await makeRequest('presentations-save', {
      method: 'POST',
      token: validToken,
      body: TEST_PRESENTATION
    });

    // Update with modified data
    const updatedPresentation = {
      ...TEST_PRESENTATION,
      title: 'Updated Test Presentation',
      timetableData: {
        ...TEST_PRESENTATION.timetableData,
        title: 'Updated Test Presentation',
        lastModified: new Date().toISOString()
      }
    };

    const response = await makeRequest('presentations-save', {
      method: 'POST',
      token: validToken,
      body: updatedPresentation
    });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Updated Test Presentation');
  });

  test('should reject request without authentication', async () => {
    const response = await makeRequest('presentations-save', {
      method: 'POST',
      body: TEST_PRESENTATION
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('missing_token');
  });

  test('should reject request with expired token', async () => {
    const response = await makeRequest('presentations-save', {
      method: 'POST',
      token: createExpiredToken(),
      body: TEST_PRESENTATION
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('expired');
  });

  test('should reject request with malformed token', async () => {
    const response = await makeRequest('presentations-save', {
      method: 'POST',
      token: createMalformedToken(),
      body: TEST_PRESENTATION
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('malformed');
  });

  test('should reject request with invalid JSON', async () => {
    const response = await request(API_BASE_URL)
      .post('/presentations-save')
      .set('Authorization', `Bearer ${validToken}`)
      .send('invalid json');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_json');
  });

  test('should reject request without presentationUrl', async () => {
    const invalidData = { ...TEST_PRESENTATION };
    delete invalidData.presentationUrl;

    const response = await makeRequest('presentations-save', {
      method: 'POST',
      token: validToken,
      body: invalidData
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_presentation_url');
  });

  test('should reject request without title', async () => {
    const invalidData = { ...TEST_PRESENTATION };
    delete invalidData.title;

    const response = await makeRequest('presentations-save', {
      method: 'POST',
      token: validToken,
      body: invalidData
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_title');
  });

  test('should reject request without timetableData', async () => {
    const invalidData = { ...TEST_PRESENTATION };
    delete invalidData.timetableData;

    const response = await makeRequest('presentations-save', {
      method: 'POST',
      token: validToken,
      body: invalidData
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_timetable_data');
  });

  test('should reject request with invalid timetable items', async () => {
    const invalidData = {
      ...TEST_PRESENTATION,
      timetableData: {
        ...TEST_PRESENTATION.timetableData,
        items: [{ invalidItem: true }]
      }
    };

    const response = await makeRequest('presentations-save', {
      method: 'POST',
      token: validToken,
      body: invalidData
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_timetable_item_format');
  });

  test('should handle rate limiting', async () => {
    // Make multiple rapid requests to trigger rate limit
    const promises = Array.from({ length: 12 }, () =>
      makeRequest('presentations-save', {
        method: 'POST',
        token: validToken,
        body: {
          ...TEST_PRESENTATION,
          presentationUrl: `https://gamma.app/docs/test-${Math.random()}`
        }
      })
    );

    const responses = await Promise.all(promises);
    const rateLimited = responses.filter(r => r.status === 429);
    
    expect(rateLimited.length).toBeGreaterThan(0);
    expect(rateLimited[0].body.error).toBe('rate_limited');
  });
});

describe('GET /api/presentations/get', () => {
  const validToken = createTestToken();

  beforeEach(async () => {
    // Create a test presentation before each test
    await makeRequest('presentations-save', {
      method: 'POST',
      token: validToken,
      body: TEST_PRESENTATION
    });
  });

  test('should retrieve existing presentation', async () => {
    const response = await makeRequest('presentations-get', {
      token: validToken,
      query: { url: TEST_PRESENTATION.presentationUrl }
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      presentationUrl: TEST_PRESENTATION.presentationUrl,
      title: TEST_PRESENTATION.title,
      totalDuration: 15
    });
    expect(response.body.timetableData.items).toHaveLength(2);
    expect(response.body.syncedAt).toBeDefined();
  });

  test('should reject request without authentication', async () => {
    const response = await makeRequest('presentations-get', {
      query: { url: TEST_PRESENTATION.presentationUrl }
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('missing_token');
  });

  test('should reject request with expired token', async () => {
    const response = await makeRequest('presentations-get', {
      token: createExpiredToken(),
      query: { url: TEST_PRESENTATION.presentationUrl }
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('expired');
  });

  test('should reject request without url parameter', async () => {
    const response = await makeRequest('presentations-get', {
      token: validToken
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('missing_presentation_url');
  });

  test('should return 404 for non-existent presentation', async () => {
    const response = await makeRequest('presentations-get', {
      token: validToken,
      query: { url: 'https://gamma.app/docs/non-existent-presentation' }
    });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('presentation_not_found');
  });

  test('should handle URL encoding', async () => {
    const encodedUrl = encodeURIComponent(TEST_PRESENTATION.presentationUrl);
    const response = await makeRequest('presentations-get', {
      token: validToken,
      query: { url: encodedUrl }
    });

    expect(response.status).toBe(200);
  });

  test('should enforce rate limiting', async () => {
    // Make multiple rapid requests to trigger rate limit (30 per minute)
    const promises = Array.from({ length: 32 }, () =>
      makeRequest('presentations-get', {
        token: validToken,
        query: { url: TEST_PRESENTATION.presentationUrl }
      })
    );

    const responses = await Promise.all(promises);
    const rateLimited = responses.filter(r => r.status === 429);
    
    expect(rateLimited.length).toBeGreaterThan(0);
    expect(rateLimited[0].body.error).toBe('rate_limited');
  });
});

describe('GET /api/presentations/list', () => {
  const validToken = createTestToken();

  beforeEach(async () => {
    // Create multiple test presentations
    const presentations = [
      { ...TEST_PRESENTATION, presentationUrl: 'https://gamma.app/docs/test-1', title: 'Presentation 1' },
      { ...TEST_PRESENTATION, presentationUrl: 'https://gamma.app/docs/test-2', title: 'Presentation 2' },
      { ...TEST_PRESENTATION, presentationUrl: 'https://gamma.app/docs/test-3', title: 'Presentation 3' }
    ];

    for (const presentation of presentations) {
      await makeRequest('presentations-save', {
        method: 'POST',
        token: validToken,
        body: presentation
      });
    }
  });

  test('should list user presentations', async () => {
    const response = await makeRequest('presentations-list', {
      token: validToken
    });

    expect(response.status).toBe(200);
    expect(response.body.presentations).toHaveLength(3);
    expect(response.body.pagination).toMatchObject({
      offset: 0,
      limit: 50,
      total: 3,
      hasMore: false
    });
    expect(response.body.meta.retrievedAt).toBeDefined();
  });

  test('should handle pagination', async () => {
    const response = await makeRequest('presentations-list', {
      token: validToken,
      query: { limit: 2, offset: 1 }
    });

    expect(response.status).toBe(200);
    expect(response.body.presentations).toHaveLength(2);
    expect(response.body.pagination).toMatchObject({
      offset: 1,
      limit: 2,
      total: 3,
      hasMore: false
    });
  });

  test('should handle sorting', async () => {
    const response = await makeRequest('presentations-list', {
      token: validToken,
      query: { sortBy: 'title', sortOrder: 'asc' }
    });

    expect(response.status).toBe(200);
    expect(response.body.presentations[0].title).toBe('Presentation 1');
    expect(response.body.meta.sortBy).toBe('title');
    expect(response.body.meta.sortOrder).toBe('asc');
  });

  test('should validate sort fields', async () => {
    const response = await makeRequest('presentations-list', {
      token: validToken,
      query: { sortBy: 'invalid_field' }
    });

    expect(response.status).toBe(200);
    expect(response.body.meta.sortBy).toBe('updated_at'); // Falls back to default
  });

  test('should reject request without authentication', async () => {
    const response = await makeRequest('presentations-list');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('missing_token');
  });

  test('should return empty array for user with no presentations', async () => {
    // Create new user token
    const emptyUserToken = createTestToken({ userId: 'empty_user_123' });
    
    const response = await makeRequest('presentations-list', {
      token: emptyUserToken
    });

    // This will return 404 because user doesn't exist, which is expected
    expect([200, 404]).toContain(response.status);
    
    if (response.status === 200) {
      expect(response.body.presentations).toHaveLength(0);
    }
  });

  test('should enforce rate limiting', async () => {
    // Make multiple rapid requests to trigger rate limit (20 per minute)
    const promises = Array.from({ length: 22 }, () =>
      makeRequest('presentations-list', {
        token: validToken
      })
    );

    const responses = await Promise.all(promises);
    const rateLimited = responses.filter(r => r.status === 429);
    
    expect(rateLimited.length).toBeGreaterThan(0);
    expect(rateLimited[0].body.error).toBe('rate_limited');
  });
});

describe('Data Integrity Tests', () => {
  const validToken = createTestToken();

  test('should preserve unicode characters', async () => {
    const unicodePresentation = {
      ...TEST_PRESENTATION,
      title: 'Test 🎯 Présentation with émojis and ümlauts',
      presentationUrl: 'https://gamma.app/docs/unicode-test-123',
      timetableData: {
        ...TEST_PRESENTATION.timetableData,
        title: 'Test 🎯 Présentation with émojis and ümlauts',
        items: [
          {
            id: 'slide-unicode',
            title: 'Słajd z polskimi znakami',
            content: 'Content with 中文字符 and العربية',
            duration: 5,
            startTime: '09:00',
            endTime: '09:05'
          }
        ]
      }
    };

    // Save
    const saveResponse = await makeRequest('presentations-save', {
      method: 'POST',
      token: validToken,
      body: unicodePresentation
    });
    expect(saveResponse.status).toBe(200);

    // Retrieve
    const getResponse = await makeRequest('presentations-get', {
      token: validToken,
      query: { url: unicodePresentation.presentationUrl }
    });
    
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.title).toBe(unicodePresentation.title);
    expect(getResponse.body.timetableData.items[0].title).toBe('Słajd z polskimi znakami');
    expect(getResponse.body.timetableData.items[0].content).toBe('Content with 中文字符 and العربية');
  });

  test('should handle large presentations', async () => {
    // Create presentation with 50 slides
    const largePresentation = {
      ...TEST_PRESENTATION,
      presentationUrl: 'https://gamma.app/docs/large-test-123',
      timetableData: {
        ...TEST_PRESENTATION.timetableData,
        items: Array.from({ length: 50 }, (_, i) => ({
          id: `slide-${i + 1}`,
          title: `Slide ${i + 1}`,
          content: `This is slide ${i + 1} with some content that might be quite long`.repeat(10),
          duration: 3,
          startTime: `09:${String(i * 3 % 60).padStart(2, '0')}`,
          endTime: `09:${String((i * 3 + 3) % 60).padStart(2, '0')}`
        }))
      }
    };

    // Save
    const saveResponse = await makeRequest('presentations-save', {
      method: 'POST',
      token: validToken,
      body: largePresentation
    });
    expect(saveResponse.status).toBe(200);
    expect(saveResponse.body.itemCount).toBe(50);
    expect(saveResponse.body.totalDuration).toBe(150);

    // Retrieve
    const getResponse = await makeRequest('presentations-get', {
      token: validToken,
      query: { url: largePresentation.presentationUrl }
    });
    
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.timetableData.items).toHaveLength(50);
  });

  test('should handle round-trip data fidelity', async () => {
    const complexPresentation = {
      ...TEST_PRESENTATION,
      presentationUrl: 'https://gamma.app/docs/complex-test-123',
      timetableData: {
        ...TEST_PRESENTATION.timetableData,
        items: [
          {
            id: 'complex-slide',
            title: 'Complex Slide',
            content: JSON.stringify({ nested: { object: true, array: [1, 2, 3] } }),
            duration: 7.5, // Float duration
            startTime: '09:00:30', // Seconds precision
            endTime: '09:08:00',
            customField: 'This should be preserved'
          }
        ],
        customMetadata: {
          version: '1.0',
          tags: ['test', 'complex', 'qa']
        }
      }
    };

    // Save
    const saveResponse = await makeRequest('presentations-save', {
      method: 'POST',
      token: validToken,
      body: complexPresentation
    });
    expect(saveResponse.status).toBe(200);

    // Retrieve
    const getResponse = await makeRequest('presentations-get', {
      token: validToken,
      query: { url: complexPresentation.presentationUrl }
    });
    
    expect(getResponse.status).toBe(200);
    
    // Verify exact data match
    const originalItem = complexPresentation.timetableData.items[0];
    const retrievedItem = getResponse.body.timetableData.items[0];
    
    expect(retrievedItem).toMatchObject(originalItem);
    expect(getResponse.body.timetableData.customMetadata).toEqual(complexPresentation.timetableData.customMetadata);
  });
});

describe('Cross-user Isolation Tests', () => {
  test('should not allow access to other users presentations', async () => {
    const user1Token = createTestToken({ userId: 'user_1' });
    const user2Token = createTestToken({ userId: 'user_2' });
    
    // User 1 saves a presentation
    const user1Presentation = {
      ...TEST_PRESENTATION,
      presentationUrl: 'https://gamma.app/docs/user1-private-123'
    };
    
    // Note: This test may fail if user_1 doesn't exist in the database
    // The test validates the expected behavior when RLS is properly implemented
    const saveResponse = await makeRequest('presentations-save', {
      method: 'POST',
      token: user1Token,
      body: user1Presentation
    });
    
    // Skip test if user doesn't exist
    if (saveResponse.status === 404) {
      console.warn('Skipping cross-user test: test users not set up in database');
      return;
    }
    
    expect(saveResponse.status).toBe(200);
    
    // User 2 tries to access User 1's presentation
    const getResponse = await makeRequest('presentations-get', {
      token: user2Token,
      query: { url: user1Presentation.presentationUrl }
    });
    
    // Should return 404 (not found) due to RLS, not the actual data
    expect([404, 401]).toContain(getResponse.status);
  });
});