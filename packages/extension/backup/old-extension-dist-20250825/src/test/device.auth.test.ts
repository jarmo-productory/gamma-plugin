import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DeviceAuth } from '../shared-auth/device';
import { StorageManager } from '../storage';

// Mock StorageManager
vi.mock('../storage', () => ({
  StorageManager: vi.fn().mockImplementation(() => ({
    load: vi.fn(),
    save: vi.fn(),
  })),
}));

// Mock global fetch
global.fetch = vi.fn();

describe('DeviceAuth Class', () => {
  let deviceAuth: DeviceAuth;
  let mockStorage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = {
      load: vi.fn(),
      save: vi.fn(),
    };
    (StorageManager as any).mockImplementation(() => mockStorage);
    deviceAuth = new DeviceAuth();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Storage Operations', () => {
    it('should save and retrieve device info', async () => {
      const deviceInfo = {
        deviceId: 'device-123',
        code: 'ABC123',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      };

      await deviceAuth.saveDeviceInfo(deviceInfo);
      expect(mockStorage.save).toHaveBeenCalledWith('device_info_v1', deviceInfo);

      mockStorage.load.mockResolvedValue(deviceInfo);
      const retrieved = await deviceAuth.getStoredDeviceInfo();
      expect(retrieved).toEqual(deviceInfo);
      expect(mockStorage.load).toHaveBeenCalledWith('device_info_v1');
    });

    it('should save and retrieve device token', async () => {
      const token = {
        token: 'token-abc123',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };

      await deviceAuth.saveToken(token);
      expect(mockStorage.save).toHaveBeenCalledWith('device_token_v1', token);

      mockStorage.load.mockResolvedValue(token);
      const retrieved = await deviceAuth.getStoredToken();
      expect(retrieved).toEqual(token);
      expect(mockStorage.load).toHaveBeenCalledWith('device_token_v1');
    });

    it('should clear token', async () => {
      await deviceAuth.clearToken();
      expect(mockStorage.save).toHaveBeenCalledWith('device_token_v1', null);
    });
  });

  describe('Device Registration', () => {
    it('should register new device successfully', async () => {
      const mockResponse = {
        deviceId: 'device-456',
        code: 'XYZ789',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await deviceAuth.registerDevice('https://api.example.com');
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/devices/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
          credentials: 'include',
        }
      );

      expect(result).toEqual({
        deviceId: mockResponse.deviceId,
        code: mockResponse.code,
        expiresAt: mockResponse.expiresAt,
      });

      expect(mockStorage.save).toHaveBeenCalledWith('device_info_v1', result);
    });

    it('should handle registration failure', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(
        deviceAuth.registerDevice('https://api.example.com')
      ).rejects.toThrow('registerDevice failed: 500');
    });
  });

  describe('Token Exchange', () => {
    it('should exchange token successfully when device is linked', async () => {
      const mockTokenResponse = {
        token: 'new-token-123',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const result = await deviceAuth.exchange(
        'https://api.example.com',
        'device-123',
        'ABC123'
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/devices/exchange',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId: 'device-123',
            code: 'ABC123',
          }),
        }
      );

      expect(result).toEqual(mockTokenResponse);
      expect(mockStorage.save).toHaveBeenCalledWith('device_token_v1', mockTokenResponse);
    });

    it('should return null when device not linked yet', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 425, // Too Early
      });

      const result = await deviceAuth.exchange(
        'https://api.example.com',
        'device-123',
        'ABC123'
      );

      expect(result).toBeNull();
    });

    it('should return null when code not found', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await deviceAuth.exchange(
        'https://api.example.com',
        'device-123',
        'INVALID'
      );

      expect(result).toBeNull();
    });

    it('should throw error on other failures', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(
        deviceAuth.exchange('https://api.example.com', 'device-123', 'ABC123')
      ).rejects.toThrow('exchange failed: 500');
    });
  });

  describe('URL Building', () => {
    it('should build sign-in URL correctly', () => {
      const url = deviceAuth.buildSignInUrl('https://example.com/', 'ABC123');
      
      expect(url).toBe('https://example.com/?source=extension&code=ABC123');
    });

    it('should handle URLs without trailing slash', () => {
      const url = deviceAuth.buildSignInUrl('https://example.com', 'XYZ789');
      
      expect(url).toBe('https://example.com/?source=extension&code=XYZ789');
    });
  });

  describe('Token Validation', () => {
    it('should detect expired tokens', async () => {
      const expiredToken = {
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 10000).toISOString(), // 10 seconds ago
      };

      mockStorage.load.mockResolvedValue(expiredToken);

      const result = await deviceAuth.getValidTokenOrRefresh('https://api.example.com');
      expect(result).toBeNull();
    });

    it('should return valid token when not expired', async () => {
      const validToken = {
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      };

      mockStorage.load.mockResolvedValue(validToken);

      const result = await deviceAuth.getValidTokenOrRefresh('https://api.example.com');
      expect(result).toEqual(validToken);
    });

    it('should treat tokens expiring within 5 seconds as expired', async () => {
      const soonToExpireToken = {
        token: 'expiring-token',
        expiresAt: new Date(Date.now() + 3000).toISOString(), // 3 seconds from now
      };

      mockStorage.load.mockResolvedValue(soonToExpireToken);

      const result = await deviceAuth.getValidTokenOrRefresh('https://api.example.com');
      expect(result).toBeNull();
    });
  });

  describe('Polling Exchange', () => {
    it('should poll until successful exchange', async () => {
      let callCount = 0;
      (global.fetch as any).mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 425, // Too Early
          });
        } else {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              token: 'success-token',
              expiresAt: new Date(Date.now() + 86400000).toISOString(),
            }),
          });
        }
      });

      const result = await deviceAuth.pollExchangeUntilLinked(
        'https://api.example.com',
        'device-123',
        'ABC123',
        { intervalMs: 10, maxWaitMs: 1000 }
      );

      expect(result).toEqual({
        token: 'success-token',
        expiresAt: expect.any(String),
      });
      expect(callCount).toBe(3);
    });

    it('should timeout after max wait time', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 425,
      });

      const result = await deviceAuth.pollExchangeUntilLinked(
        'https://api.example.com',
        'device-123',
        'ABC123',
        { intervalMs: 50, maxWaitMs: 100 }
      );

      expect(result).toBeNull();
    });

    it('should continue polling on network errors', async () => {
      let callCount = 0;
      (global.fetch as any).mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          return Promise.reject(new Error('Network error'));
        } else {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              token: 'success-token',
              expiresAt: new Date(Date.now() + 86400000).toISOString(),
            }),
          });
        }
      });

      const result = await deviceAuth.pollExchangeUntilLinked(
        'https://api.example.com',
        'device-123',
        'ABC123',
        { intervalMs: 10, maxWaitMs: 1000 }
      );

      expect(result).toEqual({
        token: 'success-token',
        expiresAt: expect.any(String),
      });
      expect(callCount).toBe(2);
    });
  });

  describe('Authorized Fetch', () => {
    it('should make authorized requests with valid token', async () => {
      const validToken = {
        token: 'valid-auth-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };

      mockStorage.load.mockResolvedValue(validToken);

      const mockResponse = { ok: true, json: async () => ({ data: 'success' }) };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const response = await deviceAuth.authorizedFetch(
        'https://api.example.com',
        '/protected-endpoint'
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/protected-endpoint',
        expect.objectContaining({
          headers: expect.any(Headers),
        })
      );

      // Verify Authorization header was set
      const call = (global.fetch as any).mock.calls[1];
      const headers = call[1].headers;
      expect(headers.get('Authorization')).toBe('Bearer valid-auth-token');
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('should throw error when no valid token available', async () => {
      mockStorage.load.mockResolvedValue(null);

      await expect(
        deviceAuth.authorizedFetch('https://api.example.com', '/protected')
      ).rejects.toThrow('not_authenticated');
    });
  });
});