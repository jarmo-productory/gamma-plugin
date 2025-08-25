import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as registerDevice } from '../app/api/devices/register/route';
import { POST as exchangeToken } from '../app/api/devices/exchange/route';
import { POST as linkDevice } from '../app/api/devices/link/route';

// Mock global state
declare global {
  var deviceRegistrations: Map<string, any>;
}

describe('Authentication API Endpoints', () => {
  beforeEach(() => {
    // Clear global state
    global.deviceRegistrations = new Map();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/devices/register', () => {
    it('should register a new device and return pairing code', async () => {
      const request = new NextRequest('http://localhost:3000/api/devices/register', {
        method: 'POST',
      });

      const response = await registerDevice(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('deviceId');
      expect(data).toHaveProperty('code');
      expect(data).toHaveProperty('expiresAt');
      expect(data.code).toMatch(/^[A-Z0-9]+$/);
      expect(global.deviceRegistrations.size).toBe(1);
    });

    it('should handle registration errors gracefully', async () => {
      // Mock Date to throw error
      vi.spyOn(Date, 'now').mockImplementation(() => {
        throw new Error('Time error');
      });

      const request = new NextRequest('http://localhost:3000/api/devices/register', {
        method: 'POST',
      });

      const response = await registerDevice(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to register device');
    });
  });

  describe('POST /api/devices/exchange', () => {
    let deviceInfo: any;

    beforeEach(async () => {
      // Set up a registered device
      const registerReq = new NextRequest('http://localhost:3000/api/devices/register', {
        method: 'POST',
      });
      const registerResp = await registerDevice(registerReq);
      deviceInfo = await registerResp.json();
    });

    it('should return 425 when device not linked', async () => {
      const request = new NextRequest('http://localhost:3000/api/devices/exchange', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: deviceInfo.deviceId,
          code: deviceInfo.code,
        }),
      });

      const response = await exchangeToken(request);
      const data = await response.json();

      expect(response.status).toBe(425);
      expect(data.error).toBe('Device not linked yet');
    });

    it('should exchange token when device is linked', async () => {
      // Link the device first
      const storedDevice = global.deviceRegistrations.get(deviceInfo.code);
      storedDevice.linked = true;
      storedDevice.userId = 'test-user-id';
      global.deviceRegistrations.set(deviceInfo.code, storedDevice);

      const request = new NextRequest('http://localhost:3000/api/devices/exchange', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: deviceInfo.deviceId,
          code: deviceInfo.code,
        }),
      });

      const response = await exchangeToken(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('expiresAt');
      expect(global.deviceRegistrations.has(deviceInfo.code)).toBe(false); // Should be cleaned up
    });

    it('should handle expired codes', async () => {
      // Make the code expired
      const storedDevice = global.deviceRegistrations.get(deviceInfo.code);
      storedDevice.expiresAt = new Date(Date.now() - 1000).toISOString();
      global.deviceRegistrations.set(deviceInfo.code, storedDevice);

      const request = new NextRequest('http://localhost:3000/api/devices/exchange', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: deviceInfo.deviceId,
          code: deviceInfo.code,
        }),
      });

      const response = await exchangeToken(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Code expired');
      expect(global.deviceRegistrations.has(deviceInfo.code)).toBe(false); // Should be cleaned up
    });

    it('should validate required parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/devices/exchange', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await exchangeToken(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('deviceId and code are required');
    });

    it('should validate device ID matches', async () => {
      const request = new NextRequest('http://localhost:3000/api/devices/exchange', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: 'wrong-device-id',
          code: deviceInfo.code,
        }),
      });

      const response = await exchangeToken(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid device ID');
    });
  });

  describe('POST /api/devices/link', () => {
    let deviceInfo: any;

    beforeEach(async () => {
      // Set up a registered device
      const registerReq = new NextRequest('http://localhost:3000/api/devices/register', {
        method: 'POST',
      });
      const registerResp = await registerDevice(registerReq);
      deviceInfo = await registerResp.json();
    });

    it('should require authentication', async () => {
      // Mock Supabase to return no user
      vi.mock('@/utils/supabase/server', () => ({
        createClient: vi.fn().mockResolvedValue({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: null },
              error: null,
            }),
          },
        }),
      }));

      const request = new NextRequest('http://localhost:3000/api/devices/link', {
        method: 'POST',
        body: JSON.stringify({ code: deviceInfo.code }),
      });

      const response = await linkDevice(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should validate required parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/devices/link', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await linkDevice(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Code is required');
    });
  });
});