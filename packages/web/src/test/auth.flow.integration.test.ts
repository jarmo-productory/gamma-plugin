import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as registerDevice } from '../app/api/devices/register/route';
import { POST as exchangeToken } from '../app/api/devices/exchange/route';
import { POST as linkDevice } from '../app/api/devices/link/route';

// Mock global state
declare global {
  var deviceRegistrations: Map<string, any>;
}

// Mock Supabase
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'user-test-123',
            email: 'test@example.com',
            name: 'Test User',
          },
        },
        error: null,
      }),
    },
  }),
}));

describe('Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    // Clear global state
    global.deviceRegistrations = new Map();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should complete full device pairing flow successfully', async () => {
    // Step 1: Extension registers device
    const registerRequest = new NextRequest('http://localhost:3000/api/devices/register', {
      method: 'POST',
    });

    const registerResponse = await registerDevice(registerRequest);
    const deviceInfo = await registerResponse.json();

    expect(registerResponse.status).toBe(200);
    expect(deviceInfo).toHaveProperty('deviceId');
    expect(deviceInfo).toHaveProperty('code');
    expect(deviceInfo).toHaveProperty('expiresAt');
    expect(global.deviceRegistrations.size).toBe(1);

    // Verify device is stored and not linked
    const storedDevice = global.deviceRegistrations.get(deviceInfo.code);
    expect(storedDevice.linked).toBe(false);

    // Step 2: Extension attempts exchange before linking (should fail)
    const earlyExchangeRequest = new NextRequest('http://localhost:3000/api/devices/exchange', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: deviceInfo.deviceId,
        code: deviceInfo.code,
      }),
    });

    const earlyExchangeResponse = await exchangeToken(earlyExchangeRequest);
    const earlyExchangeData = await earlyExchangeResponse.json();

    expect(earlyExchangeResponse.status).toBe(425);
    expect(earlyExchangeData.error).toBe('Device not linked yet');

    // Step 3: User authenticates and links device
    const linkRequest = new NextRequest('http://localhost:3000/api/devices/link', {
      method: 'POST',
      body: JSON.stringify({ code: deviceInfo.code }),
    });

    const linkResponse = await linkDevice(linkRequest);
    const linkData = await linkResponse.json();

    expect(linkResponse.status).toBe(200);
    expect(linkData.success).toBe(true);
    expect(linkData.deviceId).toBe(deviceInfo.deviceId);

    // Verify device is now linked
    const linkedDevice = global.deviceRegistrations.get(deviceInfo.code);
    expect(linkedDevice.linked).toBe(true);
    expect(linkedDevice.userId).toBe('user-test-123');
    expect(linkedDevice.userEmail).toBe('test@example.com');

    // Step 4: Extension exchanges for token (should succeed)
    const finalExchangeRequest = new NextRequest('http://localhost:3000/api/devices/exchange', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: deviceInfo.deviceId,
        code: deviceInfo.code,
      }),
    });

    const finalExchangeResponse = await exchangeToken(finalExchangeRequest);
    const tokenData = await finalExchangeResponse.json();

    expect(finalExchangeResponse.status).toBe(200);
    expect(tokenData).toHaveProperty('token');
    expect(tokenData).toHaveProperty('expiresAt');
    expect(tokenData.token).toMatch(/^token_/);

    // Verify device registration is cleaned up
    expect(global.deviceRegistrations.has(deviceInfo.code)).toBe(false);
  });

  it('should handle race condition between multiple exchange attempts', async () => {
    // Register device
    const registerRequest = new NextRequest('http://localhost:3000/api/devices/register', {
      method: 'POST',
    });
    const registerResponse = await registerDevice(registerRequest);
    const deviceInfo = await registerResponse.json();

    // Link device
    const linkRequest = new NextRequest('http://localhost:3000/api/devices/link', {
      method: 'POST',
      body: JSON.stringify({ code: deviceInfo.code }),
    });
    await linkDevice(linkRequest);

    // Attempt multiple simultaneous exchanges
    const exchangeRequest1 = new NextRequest('http://localhost:3000/api/devices/exchange', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: deviceInfo.deviceId,
        code: deviceInfo.code,
      }),
    });

    const exchangeRequest2 = new NextRequest('http://localhost:3000/api/devices/exchange', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: deviceInfo.deviceId,
        code: deviceInfo.code,
      }),
    });

    const [response1, response2] = await Promise.all([
      exchangeToken(exchangeRequest1),
      exchangeToken(exchangeRequest2),
    ]);

    // One should succeed, one should fail
    const responses = [response1, response2];
    const successful = responses.filter(r => r.status === 200);
    const failed = responses.filter(r => r.status !== 200);

    expect(successful).toHaveLength(1);
    expect(failed).toHaveLength(1);

    // Failed response should be 404 (code deleted after first success)
    expect(failed[0].status).toBe(404);
  });

  it('should handle expired codes properly', async () => {
    // Register device
    const registerRequest = new NextRequest('http://localhost:3000/api/devices/register', {
      method: 'POST',
    });
    const registerResponse = await registerDevice(registerRequest);
    const deviceInfo = await registerResponse.json();

    // Manually expire the code
    const storedDevice = global.deviceRegistrations.get(deviceInfo.code);
    storedDevice.expiresAt = new Date(Date.now() - 1000).toISOString();
    global.deviceRegistrations.set(deviceInfo.code, storedDevice);

    // Attempt to link expired code
    const linkRequest = new NextRequest('http://localhost:3000/api/devices/link', {
      method: 'POST',
      body: JSON.stringify({ code: deviceInfo.code }),
    });

    const linkResponse = await linkDevice(linkRequest);
    const linkData = await linkResponse.json();

    expect(linkResponse.status).toBe(404);
    expect(linkData.error).toBe('Code expired');

    // Verify expired code is cleaned up
    expect(global.deviceRegistrations.has(deviceInfo.code)).toBe(false);
  });

  it('should handle authentication failures in linking', async () => {
    // Mock Supabase to return authentication error
    vi.mocked(require('@/utils/supabase/server').createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
    });

    // Register device
    const registerRequest = new NextRequest('http://localhost:3000/api/devices/register', {
      method: 'POST',
    });
    const registerResponse = await registerDevice(registerRequest);
    const deviceInfo = await registerResponse.json();

    // Attempt to link without authentication
    const linkRequest = new NextRequest('http://localhost:3000/api/devices/link', {
      method: 'POST',
      body: JSON.stringify({ code: deviceInfo.code }),
    });

    const linkResponse = await linkDevice(linkRequest);
    const linkData = await linkResponse.json();

    expect(linkResponse.status).toBe(401);
    expect(linkData.error).toBe('Authentication required');

    // Verify device remains unlinked
    const storedDevice = global.deviceRegistrations.get(deviceInfo.code);
    expect(storedDevice.linked).toBe(false);
  });

  it('should validate device ID matches during exchange', async () => {
    // Register device
    const registerRequest = new NextRequest('http://localhost:3000/api/devices/register', {
      method: 'POST',
    });
    const registerResponse = await registerDevice(registerRequest);
    const deviceInfo = await registerResponse.json();

    // Link device
    const linkRequest = new NextRequest('http://localhost:3000/api/devices/link', {
      method: 'POST',
      body: JSON.stringify({ code: deviceInfo.code }),
    });
    await linkDevice(linkRequest);

    // Attempt exchange with wrong device ID
    const exchangeRequest = new NextRequest('http://localhost:3000/api/devices/exchange', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: 'wrong-device-id',
        code: deviceInfo.code,
      }),
    });

    const exchangeResponse = await exchangeToken(exchangeRequest);
    const exchangeData = await exchangeResponse.json();

    expect(exchangeResponse.status).toBe(400);
    expect(exchangeData.error).toBe('Invalid device ID');

    // Verify device registration still exists (not cleaned up)
    expect(global.deviceRegistrations.has(deviceInfo.code)).toBe(true);
  });

  it('should handle multiple devices for same user', async () => {
    // Register two devices
    const device1Request = new NextRequest('http://localhost:3000/api/devices/register', {
      method: 'POST',
    });
    const device1Response = await registerDevice(device1Request);
    const device1Info = await device1Response.json();

    const device2Request = new NextRequest('http://localhost:3000/api/devices/register', {
      method: 'POST',
    });
    const device2Response = await registerDevice(device2Request);
    const device2Info = await device2Response.json();

    // Link both devices
    const link1Request = new NextRequest('http://localhost:3000/api/devices/link', {
      method: 'POST',
      body: JSON.stringify({ code: device1Info.code }),
    });
    await linkDevice(link1Request);

    const link2Request = new NextRequest('http://localhost:3000/api/devices/link', {
      method: 'POST',
      body: JSON.stringify({ code: device2Info.code }),
    });
    await linkDevice(link2Request);

    // Exchange tokens for both devices
    const exchange1Request = new NextRequest('http://localhost:3000/api/devices/exchange', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: device1Info.deviceId,
        code: device1Info.code,
      }),
    });
    const token1Response = await exchangeToken(exchange1Request);
    const token1Data = await token1Response.json();

    const exchange2Request = new NextRequest('http://localhost:3000/api/devices/exchange', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: device2Info.deviceId,
        code: device2Info.code,
      }),
    });
    const token2Response = await exchangeToken(exchange2Request);
    const token2Data = await token2Response.json();

    // Both should succeed with different tokens
    expect(token1Response.status).toBe(200);
    expect(token2Response.status).toBe(200);
    expect(token1Data.token).not.toBe(token2Data.token);
    expect(token1Data.token).toMatch(/^token_/);
    expect(token2Data.token).toMatch(/^token_/);
  });
});