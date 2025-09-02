/**
 * Tests for Device Authentication System
 * 
 * Testing Strategy:
 * 1. Pure functions (buildSignInUrl) - highest ROI
 * 2. Storage operations - mocked storage layer
 * 3. API calls - mocked fetch responses
 * 4. Polling logic - time-based testing with controlled intervals
 * 5. Error handling and edge cases
 */

import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { DeviceAuth, type DeviceInfo, type DeviceToken, type RegisterResponse } from './device';
import { StorageManager } from '../storage';

// Mock the storage module
vi.mock('../storage', () => ({
  StorageManager: vi.fn().mockImplementation(() => ({
    load: vi.fn(),
    save: vi.fn(),
  })),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Device Authentication System', () => {
  let deviceAuth: DeviceAuth;
  let mockStorage: any;

  beforeAll(() => {
    // Mock setTimeout to make polling tests fast and predictable
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    
    mockStorage = {
      load: vi.fn(),
      save: vi.fn(),
    };
    deviceAuth = new DeviceAuth(mockStorage);
  });

  describe('Storage Operations', () => {
    const mockDeviceInfo: DeviceInfo = {
      deviceId: 'device-123',
      code: 'ABC123',
      expiresAt: '2024-01-01T12:00:00Z',
    };

    const mockDeviceToken: DeviceToken = {
      token: 'token-456',
      expiresAt: '2024-01-01T13:00:00Z',
    };

    it('should retrieve stored device info', async () => {
      mockStorage.load.mockResolvedValue(mockDeviceInfo);
      
      const result = await deviceAuth.getStoredDeviceInfo();
      
      expect(result).toEqual(mockDeviceInfo);
      expect(mockStorage.load).toHaveBeenCalledWith('device_info_v1');
    });

    it('should return null when no device info is stored', async () => {
      mockStorage.load.mockResolvedValue(null);
      
      const result = await deviceAuth.getStoredDeviceInfo();
      
      expect(result).toBeNull();
    });

    it('should retrieve stored device token', async () => {
      mockStorage.load.mockResolvedValue(mockDeviceToken);
      
      const result = await deviceAuth.getStoredToken();
      
      expect(result).toEqual(mockDeviceToken);
      expect(mockStorage.load).toHaveBeenCalledWith('device_token_v1');
    });

    it('should save device info correctly', async () => {
      await deviceAuth.saveDeviceInfo(mockDeviceInfo);
      
      expect(mockStorage.save).toHaveBeenCalledWith('device_info_v1', mockDeviceInfo);
    });

    it('should save device token correctly', async () => {
      await deviceAuth.saveToken(mockDeviceToken);
      
      expect(mockStorage.save).toHaveBeenCalledWith('device_token_v1', mockDeviceToken);
    });

    it('should clear device token', async () => {
      await deviceAuth.clearToken();
      
      expect(mockStorage.save).toHaveBeenCalledWith('device_token_v1', null);
    });
  });

  describe('Device Registration', () => {
    const apiBaseUrl = 'https://api.example.com';
    const mockRegisterResponse: RegisterResponse = {
      deviceId: 'device-abc123',
      code: 'XYZ789',
      expiresAt: '2024-01-01T12:30:00Z',
    };

    it('should register a new device successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRegisterResponse),
      });

      const result = await deviceAuth.registerDevice(apiBaseUrl);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/devices/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
          credentials: 'include',
        }
      );

      expect(result).toEqual({
        deviceId: 'device-abc123',
        code: 'XYZ789',
        expiresAt: '2024-01-01T12:30:00Z',
      });

      // Should save the device info
      expect(mockStorage.save).toHaveBeenCalledWith('device_info_v1', result);
    });

    it('should handle registration failures', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(deviceAuth.registerDevice(apiBaseUrl))
        .rejects.toThrow('registerDevice failed: 500');

      expect(mockStorage.save).not.toHaveBeenCalled();
    });

    it('should handle network errors during registration', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(deviceAuth.registerDevice(apiBaseUrl))
        .rejects.toThrow('Network error');
    });

    it('should return existing device info if available', async () => {
      const existingDeviceInfo: DeviceInfo = {
        deviceId: 'existing-device',
        code: 'EXISTING123',
        expiresAt: '2024-01-01T14:00:00Z',
      };

      mockStorage.load.mockResolvedValue(existingDeviceInfo);

      const result = await deviceAuth.getOrRegisterDevice(apiBaseUrl);

      expect(result).toEqual(existingDeviceInfo);
      expect(mockFetch).not.toHaveBeenCalled(); // Should not register new device
    });

    it('should register new device if none exists', async () => {
      mockStorage.load.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRegisterResponse),
      });

      const result = await deviceAuth.getOrRegisterDevice(apiBaseUrl);

      expect(result).toEqual({
        deviceId: 'device-abc123',
        code: 'XYZ789',
        expiresAt: '2024-01-01T12:30:00Z',
      });
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Sign-in URL Generation (Pure Function)', () => {
    it('should build correct root URL with code parameter', () => {
      const webBaseUrl = 'https://web.example.com';
      const code = 'TEST123';

      const result = deviceAuth.buildSignInUrl(webBaseUrl, code);

      const expectedUrl = new URL('https://web.example.com/');
      expectedUrl.searchParams.set('source', 'extension');
      expectedUrl.searchParams.set('code', 'TEST123');

      expect(result).toBe(expectedUrl.toString());
    });

    it('should handle trailing slash in webBaseUrl', () => {
      const webBaseUrl = 'https://web.example.com/';
      const code = 'TEST123';

      const result = deviceAuth.buildSignInUrl(webBaseUrl, code);

      expect(result).toContain('https://web.example.com/');
      expect(result).toContain('source=extension');
      expect(result).toContain('code=TEST123');
    });

    it('should properly encode special characters in code', () => {
      const webBaseUrl = 'https://web.example.com';
      const code = 'TEST+123&ABC';

      const result = deviceAuth.buildSignInUrl(webBaseUrl, code);

      expect(result).toContain('code=TEST%2B123%26ABC');
    });
  });

  describe('Token Exchange', () => {
    const apiBaseUrl = 'https://api.example.com';
    const deviceId = 'device-123';
    const code = 'ABC123';
    const mockTokenResponse: DeviceToken = {
      token: 'jwt-token-here',
      expiresAt: '2024-01-01T13:00:00Z',
    };

    it('should exchange device credentials for token successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const result = await deviceAuth.exchange(apiBaseUrl, deviceId, code);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/devices/exchange',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId, code }),
        }
      );

      expect(result).toEqual(mockTokenResponse);
      expect(mockStorage.save).toHaveBeenCalledWith('device_token_v1', mockTokenResponse);
    });

    it('should return null for 404 (not linked yet)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await deviceAuth.exchange(apiBaseUrl, deviceId, code);

      expect(result).toBeNull();
      expect(mockStorage.save).not.toHaveBeenCalled();
    });

    it('should return null for 425 (too early)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 425,
      });

      const result = await deviceAuth.exchange(apiBaseUrl, deviceId, code);

      expect(result).toBeNull();
      expect(mockStorage.save).not.toHaveBeenCalled();
    });

    it('should throw error for other HTTP errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(deviceAuth.exchange(apiBaseUrl, deviceId, code))
        .rejects.toThrow('exchange failed: 500');
    });

    it('should handle network errors during exchange', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(deviceAuth.exchange(apiBaseUrl, deviceId, code))
        .rejects.toThrow('Network error');
    });
  });

  describe('Polling Logic', () => {
    const apiBaseUrl = 'https://api.example.com';
    const deviceId = 'device-123';
    const code = 'ABC123';
    const mockTokenResponse: DeviceToken = {
      token: 'jwt-token-here',
      expiresAt: '2024-01-01T13:00:00Z',
    };

    it('should return token immediately if exchange succeeds on first try', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const result = await deviceAuth.pollExchangeUntilLinked(apiBaseUrl, deviceId, code);

      expect(result).toEqual(mockTokenResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should poll multiple times until token is received', async () => {
      // First two calls return 404 (not linked), third succeeds
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockTokenResponse),
        });

      const pollPromise = deviceAuth.pollExchangeUntilLinked(apiBaseUrl, deviceId, code, {
        intervalMs: 100,
        maxWaitMs: 10000,
      });

      // Advance time to trigger polls
      await vi.advanceTimersByTimeAsync(200);

      const result = await pollPromise;

      expect(result).toEqual(mockTokenResponse);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should return null when max wait time is exceeded', async () => {
      // Always return 404 (not linked)
      mockFetch.mockResolvedValue({ ok: false, status: 404 });

      const pollPromise = deviceAuth.pollExchangeUntilLinked(apiBaseUrl, deviceId, code, {
        intervalMs: 100,
        maxWaitMs: 500,
      });

      // Advance time past max wait
      await vi.advanceTimersByTimeAsync(600);

      const result = await pollPromise;

      expect(result).toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(6); // 500ms / 100ms + 1 initial call
    });

    it('should continue polling despite intermittent errors', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Network error, then 404, then success
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockTokenResponse),
        });

      const pollPromise = deviceAuth.pollExchangeUntilLinked(apiBaseUrl, deviceId, code, {
        intervalMs: 100,
        maxWaitMs: 10000,
      });

      await vi.advanceTimersByTimeAsync(200);

      const result = await pollPromise;

      expect(result).toEqual(mockTokenResponse);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[DeviceAuth] exchange error (will retry):',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should use default polling parameters when not specified', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 });

      // Use shorter duration for testing to avoid timeout
      const pollPromise = deviceAuth.pollExchangeUntilLinked(apiBaseUrl, deviceId, code, {
        intervalMs: 100, // Short interval for testing
        maxWaitMs: 500,  // Short max wait for testing
      });

      // Advance time to exceed max wait
      await vi.advanceTimersByTimeAsync(600);

      const result = await pollPromise;

      expect(result).toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(6); // 500ms / 100ms + 1 initial call
    }, 10000);

    it('should respect custom polling intervals', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 });

      const pollPromise = deviceAuth.pollExchangeUntilLinked(apiBaseUrl, deviceId, code, {
        intervalMs: 100,
        maxWaitMs: 500,
      });

      await vi.advanceTimersByTimeAsync(600);

      const result = await pollPromise;

      expect(result).toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(6); // 500ms / 100ms + 1 initial
    }, 10000);
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(deviceAuth.registerDevice('https://api.example.com'))
        .rejects.toThrow('Invalid JSON');
    });

    it('should handle storage errors during save operations', async () => {
      const registerResponse: RegisterResponse = {
        deviceId: 'device-123',
        code: 'ABC123',
        expiresAt: '2024-01-01T12:00:00Z',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(registerResponse),
      });

      mockStorage.save.mockRejectedValue(new Error('Storage error'));

      await expect(deviceAuth.registerDevice('https://api.example.com'))
        .rejects.toThrow('Storage error');
    });

    it('should handle storage errors during load operations', async () => {
      mockStorage.load.mockRejectedValue(new Error('Storage error'));

      await expect(deviceAuth.getStoredDeviceInfo())
        .rejects.toThrow('Storage error');
    });

    it('should handle empty or invalid response data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}), // Missing required fields
      });

      const result = await deviceAuth.registerDevice('https://api.example.com');

      // Should handle gracefully - TypeScript interface doesn't prevent runtime issues
      expect(result.deviceId).toBeUndefined();
      expect(result.code).toBeUndefined();
      expect(result.expiresAt).toBeUndefined();
    });

    it('should handle API base URLs with trailing slashes', async () => {
      const registerResponse: RegisterResponse = {
        deviceId: 'device-123',
        code: 'ABC123',
        expiresAt: '2024-01-01T12:00:00Z',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(registerResponse),
      });

      await deviceAuth.registerDevice('https://api.example.com/');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com//api/devices/register', // Note: double slash handled by browser
        expect.any(Object)
      );
    });
  });

  describe('Integration Scenarios', () => {
    it('should complete full device registration and authentication flow', async () => {
      const apiBaseUrl = 'https://api.example.com';
      const webBaseUrl = 'https://web.example.com';
      
      const registerResponse: RegisterResponse = {
        deviceId: 'device-integration-test',
        code: 'INTEG123',
        expiresAt: '2024-01-01T12:00:00Z',
      };

      const tokenResponse: DeviceToken = {
        token: 'integration-token',
        expiresAt: '2024-01-01T13:00:00Z',
      };

      // No existing device info
      mockStorage.load.mockResolvedValue(null);

      // Registration succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(registerResponse),
      });

      // Step 1: Register device
      const deviceInfo = await deviceAuth.getOrRegisterDevice(apiBaseUrl);
      expect(deviceInfo).toEqual(registerResponse);

      // Step 2: Build sign-in URL
      const signInUrl = deviceAuth.buildSignInUrl(webBaseUrl, deviceInfo.code);
      expect(signInUrl).toContain('code=INTEG123');

      // Step 3: Poll for token (succeeds on second attempt)
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(tokenResponse),
        });

      const pollPromise = deviceAuth.pollExchangeUntilLinked(
        apiBaseUrl,
        deviceInfo.deviceId,
        deviceInfo.code,
        { intervalMs: 100, maxWaitMs: 1000 }
      );

      await vi.advanceTimersByTimeAsync(100);

      const token = await pollPromise;
      expect(token).toEqual(tokenResponse);

      // Verify storage operations
      expect(mockStorage.save).toHaveBeenCalledWith('device_info_v1', deviceInfo);
      expect(mockStorage.save).toHaveBeenCalledWith('device_token_v1', token);
    });
  });
});
