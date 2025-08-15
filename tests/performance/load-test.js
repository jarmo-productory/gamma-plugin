/**
 * Sprint 2 Performance Testing: API Load Testing with k6
 * 
 * Tests API performance under load for:
 * - POST /api/presentations/save
 * - GET /api/presentations/get
 * - GET /api/presentations/list
 * 
 * Usage:
 * k6 run tests/performance/load-test.js
 * 
 * Performance Requirements:
 * - API responses < 500ms under normal load
 * - Sync operations < 2 seconds end-to-end
 * - Rate limiting properly enforced
 * - No errors under concurrent load
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import crypto from 'k6/crypto';

// Custom metrics
const apiErrors = new Rate('api_errors');
const saveResponseTime = new Trend('save_response_time');
const getResponseTime = new Trend('get_response_time');
const listResponseTime = new Trend('list_response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 5 },   // Ramp up to 5 users
    { duration: '5m', target: 10 },  // Stay at 10 users
    { duration: '2m', target: 20 },  // Ramp up to 20 users
    { duration: '3m', target: 20 },  // Stay at 20 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete within 500ms
    api_errors: ['rate<0.05'],        // Error rate must be less than 5%
    save_response_time: ['p(95)<500'], // Save operations under 500ms
    get_response_time: ['p(95)<500'],  // Get operations under 500ms
    list_response_time: ['p(95)<500'], // List operations under 500ms
  },
};

// Configuration
const API_BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8888/.netlify/functions';
const JWT_SECRET = __ENV.JWT_SECRET || 'test-secret-key-for-development-only';

// Test data generators
function generateTestUser() {
  const userId = `load_test_user_${__VU}_${__ITER}`;
  return {
    userId,
    deviceId: `device_${__VU}_${__ITER}`,
  };
}

function generateTestPresentation(userId, presentationId) {
  return {
    presentationUrl: `https://gamma.app/docs/load-test-${userId}-${presentationId}`,
    title: `Load Test Presentation ${presentationId} for User ${userId}`,
    timetableData: {
      title: `Load Test Presentation ${presentationId}`,
      items: generateSlides(Math.floor(Math.random() * 20) + 5), // 5-25 slides
      lastModified: new Date().toISOString()
    }
  };
}

function generateSlides(count) {
  const slides = [];
  for (let i = 0; i < count; i++) {
    slides.push({
      id: `slide-${i + 1}`,
      title: `Slide ${i + 1}`,
      content: `This is slide ${i + 1} content. `.repeat(Math.floor(Math.random() * 50) + 10),
      duration: Math.floor(Math.random() * 15) + 3, // 3-18 minutes
      startTime: `09:${String(i * 5 % 60).padStart(2, '0')}`,
      endTime: `09:${String((i * 5 + 5) % 60).padStart(2, '0')}`
    });
  }
  return slides;
}

// JWT token generation
function signHS256(data, secret) {
  const encoder = new TextEncoder();
  const key = crypto.hmac('sha256', secret, encoder.encode(data), 'base64url');
  return key;
}

function createTestToken(userId, deviceId, expiresIn = 3600) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    deviceId,
    userId,
    iat: now,
    exp: now + expiresIn
  };

  const h = encoding.b64encode(JSON.stringify(header), 'rawurl');
  const p = encoding.b64encode(JSON.stringify(payload), 'rawurl');
  const s = signHS256(`${h}.${p}`, JWT_SECRET);
  
  return `${h}.${p}.${s}`;
}

// API helper functions
function makeAuthenticatedRequest(method, endpoint, token, body = null, params = null) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  let url = `${API_BASE_URL}/${endpoint}`;
  if (params) {
    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    url += `?${queryString}`;
  }
  
  const options = { headers };
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  return http.request(method, url, body ? JSON.stringify(body) : null, { headers });
}

// Test scenarios
export function setup() {
  console.log('Starting API load testing...');
  console.log(`API Base URL: ${API_BASE_URL}`);
  
  // Verify API is accessible
  const healthCheck = http.get(`${API_BASE_URL}/protected-ping`);
  if (healthCheck.status === 0) {
    throw new Error('API is not accessible. Please ensure the backend is running.');
  }
  
  return {};
}

export default function() {
  const user = generateTestUser();
  const token = createTestToken(user.userId, user.deviceId);
  
  // Test scenario weights (percentage of total requests)
  const scenario = Math.random();
  
  if (scenario < 0.4) {
    // 40% Save operations
    testSavePresentation(user, token);
  } else if (scenario < 0.7) {
    // 30% Get operations  
    testGetPresentation(user, token);
  } else {
    // 30% List operations
    testListPresentations(user, token);
  }
  
  sleep(Math.random() * 2 + 1); // Random sleep 1-3 seconds
}

function testSavePresentation(user, token) {
  const presentationId = Math.floor(Math.random() * 1000);
  const presentation = generateTestPresentation(user.userId, presentationId);
  
  const startTime = Date.now();
  const response = makeAuthenticatedRequest('POST', 'presentations-save', token, presentation);
  const duration = Date.now() - startTime;
  
  saveResponseTime.add(duration);
  
  const success = check(response, {
    'save: status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    'save: response time < 1000ms': (r) => duration < 1000,
    'save: response has success field': (r) => {
      if (r.status === 200) {
        const body = JSON.parse(r.body);
        return body.success === true;
      }
      return true; // Skip check for rate limited requests
    },
  });
  
  if (!success || (response.status !== 200 && response.status !== 429)) {
    apiErrors.add(1);
    console.error(`Save failed: ${response.status} ${response.body}`);
  } else {
    apiErrors.add(0);
  }
  
  // Store successful saves for get tests
  if (response.status === 200) {
    globalThis.savedPresentations = globalThis.savedPresentations || [];
    globalThis.savedPresentations.push({
      url: presentation.presentationUrl,
      token: token
    });
  }
}

function testGetPresentation(user, token) {
  // Try to get a previously saved presentation, or create one
  let presentationUrl;
  
  if (globalThis.savedPresentations && globalThis.savedPresentations.length > 0) {
    const randomIndex = Math.floor(Math.random() * globalThis.savedPresentations.length);
    presentationUrl = globalThis.savedPresentations[randomIndex].url;
  } else {
    // Create and save a presentation first
    const presentation = generateTestPresentation(user.userId, Math.floor(Math.random() * 1000));
    const saveResponse = makeAuthenticatedRequest('POST', 'presentations-save', token, presentation);
    
    if (saveResponse.status === 200) {
      presentationUrl = presentation.presentationUrl;
    } else {
      // Skip get test if save failed
      return;
    }
  }
  
  const startTime = Date.now();
  const response = makeAuthenticatedRequest('GET', 'presentations-get', token, null, { 
    url: presentationUrl 
  });
  const duration = Date.now() - startTime;
  
  getResponseTime.add(duration);
  
  const success = check(response, {
    'get: status is 200, 404, or 429': (r) => [200, 404, 429].includes(r.status),
    'get: response time < 1000ms': (r) => duration < 1000,
    'get: valid response format': (r) => {
      if (r.status === 200) {
        const body = JSON.parse(r.body);
        return body.presentationUrl && body.timetableData;
      }
      return true; // Skip check for error responses
    },
  });
  
  if (!success || ![200, 404, 429].includes(response.status)) {
    apiErrors.add(1);
    console.error(`Get failed: ${response.status} ${response.body}`);
  } else {
    apiErrors.add(0);
  }
}

function testListPresentations(user, token) {
  const params = {
    limit: Math.floor(Math.random() * 20) + 10, // 10-30 items
    offset: Math.floor(Math.random() * 5) * 10,  // 0, 10, 20, 30, 40
    sortBy: ['title', 'created_at', 'updated_at'][Math.floor(Math.random() * 3)],
    sortOrder: Math.random() > 0.5 ? 'asc' : 'desc'
  };
  
  const startTime = Date.now();
  const response = makeAuthenticatedRequest('GET', 'presentations-list', token, null, params);
  const duration = Date.now() - startTime;
  
  listResponseTime.add(duration);
  
  const success = check(response, {
    'list: status is 200, 404, or 429': (r) => [200, 404, 429].includes(r.status),
    'list: response time < 1000ms': (r) => duration < 1000,
    'list: valid response format': (r) => {
      if (r.status === 200) {
        const body = JSON.parse(r.body);
        return Array.isArray(body.presentations) && body.pagination;
      }
      return true; // Skip check for error responses
    },
  });
  
  if (!success || ![200, 404, 429].includes(response.status)) {
    apiErrors.add(1);
    console.error(`List failed: ${response.status} ${response.body}`);
  } else {
    apiErrors.add(0);
  }
}

// Rate limiting stress test
export function rateLimitTest() {
  const user = generateTestUser();
  const token = createTestToken(user.userId, user.deviceId);
  
  console.log('Testing rate limiting...');
  
  // Rapid fire requests to trigger rate limiting
  for (let i = 0; i < 15; i++) {
    const presentation = generateTestPresentation(user.userId, i);
    const response = makeAuthenticatedRequest('POST', 'presentations-save', token, presentation);
    
    console.log(`Request ${i + 1}: ${response.status}`);
    
    if (response.status === 429) {
      console.log('Rate limiting triggered successfully');
      const body = JSON.parse(response.body);
      console.log(`Rate limit response: ${JSON.stringify(body)}`);
      break;
    }
    
    sleep(1); // 1 second between requests
  }
}

// Large data stress test  
export function largeDataTest() {
  const user = generateTestUser();
  const token = createTestToken(user.userId, user.deviceId);
  
  console.log('Testing large presentation data...');
  
  // Create presentation with 100 slides
  const largePresentation = {
    presentationUrl: `https://gamma.app/docs/large-test-${user.userId}`,
    title: 'Large Presentation Stress Test',
    timetableData: {
      title: 'Large Presentation Stress Test',
      items: generateSlides(100),
      lastModified: new Date().toISOString(),
      metadata: {
        testType: 'large_data',
        slideCount: 100,
        generatedAt: new Date().toISOString()
      }
    }
  };
  
  const startTime = Date.now();
  const saveResponse = makeAuthenticatedRequest('POST', 'presentations-save', token, largePresentation);
  const saveDuration = Date.now() - startTime;
  
  console.log(`Large save: ${saveResponse.status} in ${saveDuration}ms`);
  
  if (saveResponse.status === 200) {
    const getStartTime = Date.now();
    const getResponse = makeAuthenticatedRequest('GET', 'presentations-get', token, null, {
      url: largePresentation.presentationUrl
    });
    const getDuration = Date.now() - getStartTime;
    
    console.log(`Large get: ${getResponse.status} in ${getDuration}ms`);
    
    if (getResponse.status === 200) {
      const body = JSON.parse(getResponse.body);
      console.log(`Retrieved ${body.timetableData.items.length} slides`);
    }
  }
}

export function teardown(data) {
  console.log('Load testing completed');
  console.log('Check the summary report for performance metrics');
}