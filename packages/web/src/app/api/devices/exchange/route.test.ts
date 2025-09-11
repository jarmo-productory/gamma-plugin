import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock global storage
const mockGlobal = global as any;

describe('/api/devices/exchange', () => {
  beforeEach(() => {
    // Clear global storage before each test
    mockGlobal.deviceRegistrations = new Map();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up
    delete mockGlobal.deviceRegistrations;
  });

  it('should exchange tokens for valid linked device', async () => {
    // Setup: Create a linked device registration
    const deviceInfo = {
      deviceId: 'device_123_abc',
      code: 'TESTCODE123',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      linked: true,
      userId: 'user123'
    };
    mockGlobal.deviceRegistrations = new Map();
    mockGlobal.deviceRegistrations.set(deviceInfo.code, deviceInfo);

    const request = new NextRequest('http://localhost:3000/api/devices/exchange', {
      method: 'POST',
      body: JSON.stringify({ 
        deviceId: deviceInfo.deviceId, 
        code: deviceInfo.code 
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('token');
    expect(data).toHaveProperty('expiresAt');
    expect(data.token).toMatch(/^token_/);
    expect(new Date(data.expiresAt)).toBeInstanceOf(Date);
  });

  it('should return 400 for missing deviceId', async () => {
    const request = new NextRequest('http://localhost:3000/api/devices/exchange', {
      method: 'POST',
      body: JSON.stringify({ code: 'TESTCODE123' }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error', 'deviceId and code are required');
  });

  it('should return 400 for missing code', async () => {
    const request = new NextRequest('http://localhost:3000/api/devices/exchange', {
      method: 'POST',
      body: JSON.stringify({ deviceId: 'device_123_abc' }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error', 'deviceId and code are required');
  });

  it('should return 404 for invalid code', async () => {
    const request = new NextRequest('http://localhost:3000/api/devices/exchange', {
      method: 'POST',
      body: JSON.stringify({ 
        deviceId: 'device_123_abc', 
        code: 'INVALID_CODE' 
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toHaveProperty('error', 'Invalid or expired code');
  });

  it('should return 404 and cleanup for expired code', async () => {
    // Setup: Create an expired device registration
    const deviceInfo = {
      deviceId: 'device_123_abc',
      code: 'EXPIRED_CODE',
      expiresAt: new Date(Date.now() - 60 * 1000).toISOString(), // 1 minute ago
      linked: true
    };
    mockGlobal.deviceRegistrations = new Map();
    mockGlobal.deviceRegistrations.set(deviceInfo.code, deviceInfo);

    const request = new NextRequest('http://localhost:3000/api/devices/exchange', {
      method: 'POST',
      body: JSON.stringify({ 
        deviceId: deviceInfo.deviceId, 
        code: deviceInfo.code 
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toHaveProperty('error', 'Code expired');
    expect(mockGlobal.deviceRegistrations.has(deviceInfo.code)).toBe(false);
  });

  it('should return 400 for device ID mismatch', async () => {
    // Setup: Create a device registration
    const deviceInfo = {
      deviceId: 'device_123_abc',
      code: 'TESTCODE123',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      linked: true
    };
    mockGlobal.deviceRegistrations = new Map();
    mockGlobal.deviceRegistrations.set(deviceInfo.code, deviceInfo);

    const request = new NextRequest('http://localhost:3000/api/devices/exchange', {
      method: 'POST',
      body: JSON.stringify({ 
        deviceId: 'different_device_id', 
        code: deviceInfo.code 
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error', 'Invalid device ID');
  });

  it('should return 425 for unlinked device', async () => {
    // Setup: Create an unlinked device registration
    const deviceInfo = {
      deviceId: 'device_123_abc',
      code: 'TESTCODE123',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      linked: false
    };
    mockGlobal.deviceRegistrations = new Map();
    mockGlobal.deviceRegistrations.set(deviceInfo.code, deviceInfo);

    const request = new NextRequest('http://localhost:3000/api/devices/exchange', {
      method: 'POST',
      body: JSON.stringify({ 
        deviceId: deviceInfo.deviceId, 
        code: deviceInfo.code 
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(425);
    expect(data).toHaveProperty('error', 'Device not linked yet');
  });

  it('should cleanup registration after successful exchange', async () => {
    // Setup: Create a linked device registration
    const deviceInfo = {
      deviceId: 'device_123_abc',
      code: 'TESTCODE123',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      linked: true
    };
    mockGlobal.deviceRegistrations = new Map();
    mockGlobal.deviceRegistrations.set(deviceInfo.code, deviceInfo);

    const request = new NextRequest('http://localhost:3000/api/devices/exchange', {
      method: 'POST',
      body: JSON.stringify({ 
        deviceId: deviceInfo.deviceId, 
        code: deviceInfo.code 
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    
    expect(response.status).toBe(200);
    expect(mockGlobal.deviceRegistrations.has(deviceInfo.code)).toBe(false);
  });

  it('should generate tokens with 24 hour expiry', async () => {
    // Setup: Create a linked device registration
    const deviceInfo = {
      deviceId: 'device_123_abc',
      code: 'TESTCODE123',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      linked: true
    };
    mockGlobal.deviceRegistrations = new Map();
    mockGlobal.deviceRegistrations.set(deviceInfo.code, deviceInfo);

    const beforeTime = new Date();
    const request = new NextRequest('http://localhost:3000/api/devices/exchange', {
      method: 'POST',
      body: JSON.stringify({ 
        deviceId: deviceInfo.deviceId, 
        code: deviceInfo.code 
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();
    const afterTime = new Date();

    const tokenExpiry = new Date(data.expiresAt);
    const expectedMinExpiry = new Date(beforeTime.getTime() + 23 * 60 * 60 * 1000); // 23 hours
    const expectedMaxExpiry = new Date(afterTime.getTime() + 25 * 60 * 60 * 1000); // 25 hours

    expect(tokenExpiry.getTime()).toBeGreaterThan(expectedMinExpiry.getTime());
    expect(tokenExpiry.getTime()).toBeLessThan(expectedMaxExpiry.getTime());
  });

  it('should handle JSON parsing errors', async () => {
    const request = {
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
    } as any;

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toHaveProperty('error', 'Failed to exchange token');
  });
});