import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock global storage
const mockGlobal = global as any;

describe('/api/devices/register', () => {
  beforeEach(() => {
    // Clear global storage before each test
    mockGlobal.deviceRegistrations = new Map();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up
    delete mockGlobal.deviceRegistrations;
  });

  it('should register a new device successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/devices/register', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('deviceId');
    expect(data).toHaveProperty('code');
    expect(data).toHaveProperty('expiresAt');
    expect(data.deviceId).toMatch(/^device_\d+_[a-z0-9]+$/);
    expect(data.code).toMatch(/^[A-Z0-9]+$/);
    expect(new Date(data.expiresAt)).toBeInstanceOf(Date);
  });

  it('should generate unique device IDs and codes', async () => {
    const request1 = new NextRequest('http://localhost:3000/api/devices/register', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' }
    });
    const request2 = new NextRequest('http://localhost:3000/api/devices/register', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' }
    });

    const response1 = await POST(request1);
    const response2 = await POST(request2);
    const data1 = await response1.json();
    const data2 = await response2.json();

    expect(data1.deviceId).not.toBe(data2.deviceId);
    expect(data1.code).not.toBe(data2.code);
  });

  it('should set expiration time to 5 minutes from now', async () => {
    const beforeTime = new Date();
    const request = new NextRequest('http://localhost:3000/api/devices/register', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();
    const afterTime = new Date();

    const expiresAt = new Date(data.expiresAt);
    const expectedMinExpiry = new Date(beforeTime.getTime() + 4 * 60 * 1000); // 4 min buffer
    const expectedMaxExpiry = new Date(afterTime.getTime() + 6 * 60 * 1000); // 6 min buffer

    expect(expiresAt).toBeAfter(expectedMinExpiry);
    expect(expiresAt).toBefore(expectedMaxExpiry);
  });

  it('should store device registration in global storage', async () => {
    const request = new NextRequest('http://localhost:3000/api/devices/register', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(mockGlobal.deviceRegistrations).toBeInstanceOf(Map);
    expect(mockGlobal.deviceRegistrations.has(data.code)).toBe(true);
    
    const stored = mockGlobal.deviceRegistrations.get(data.code);
    expect(stored.deviceId).toBe(data.deviceId);
    expect(stored.code).toBe(data.code);
    expect(stored.linked).toBe(false);
  });

  it('should handle errors gracefully', async () => {
    // Mock JSON parsing to throw an error
    const request = {
      json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
    } as any;

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toHaveProperty('error', 'Failed to register device');
  });

  it('should handle malformed requests', async () => {
    const request = new NextRequest('http://localhost:3000/api/devices/register', {
      method: 'POST',
      body: 'invalid json',
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toHaveProperty('error', 'Failed to register device');
  });

  // Security test: Rate limiting (manual test - would need middleware implementation)
  it('should be testable for rate limiting', async () => {
    // This test documents the need for rate limiting
    // In a real implementation, we'd test that multiple rapid requests are throttled
    const requests = Array.from({ length: 10 }, () =>
      new NextRequest('http://localhost:3000/api/devices/register', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const responses = await Promise.all(requests.map(req => POST(req)));
    
    // All should succeed without rate limiting (current implementation)
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });

    // TODO: Implement rate limiting and test that it blocks excessive requests
  });
});

// Helper matchers
expect.extend({
  toBeAfter(received: Date, expected: Date) {
    const pass = received > expected;
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be after ${expected}`,
      pass
    };
  },
  toBefore(received: Date, expected: Date) {
    const pass = received < expected;
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be before ${expected}`,
      pass
    };
  }
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAfter(expected: Date): R;
      toBefore(expected: Date): R;
    }
  }
}