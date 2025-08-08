import { StorageManager } from '../storage';

export interface DeviceInfo {
  deviceId: string;
  code: string;
  expiresAt: string; // ISO
}

export interface DeviceToken {
  token: string;
  expiresAt: string; // ISO
}

export interface RegisterResponse {
  deviceId: string;
  code: string;
  expiresAt: string;
}

const STORAGE_KEYS = {
  deviceInfo: 'device_info_v1',
  deviceToken: 'device_token_v1',
} as const;

const DEFAULT_POLL_INTERVAL_MS = 2500;
const DEFAULT_MAX_WAIT_MS = 5 * 60 * 1000; // 5 minutes

export class DeviceAuth {
  private storage: StorageManager;

  constructor(storage?: StorageManager) {
    this.storage = storage || new StorageManager();
  }

  async getStoredDeviceInfo(): Promise<DeviceInfo | null> {
    const info = await this.storage.load(STORAGE_KEYS.deviceInfo);
    return (info as DeviceInfo) || null;
  }

  async getStoredToken(): Promise<DeviceToken | null> {
    const t = await this.storage.load(STORAGE_KEYS.deviceToken);
    return (t as DeviceToken) || null;
  }

  async saveDeviceInfo(info: DeviceInfo): Promise<void> {
    await this.storage.save(STORAGE_KEYS.deviceInfo, info);
  }

  async saveToken(token: DeviceToken): Promise<void> {
    await this.storage.save(STORAGE_KEYS.deviceToken, token);
  }

  async clearToken(): Promise<void> {
    await this.storage.save(STORAGE_KEYS.deviceToken, null as unknown as DeviceToken);
  }

  async registerDevice(apiBaseUrl: string): Promise<DeviceInfo> {
    const res = await fetch(`${apiBaseUrl}/api/devices/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error(`registerDevice failed: ${res.status}`);
    }
    const data = (await res.json()) as RegisterResponse;
    const info: DeviceInfo = {
      deviceId: data.deviceId,
      code: data.code,
      expiresAt: data.expiresAt,
    };
    await this.saveDeviceInfo(info);
    return info;
  }

  async getOrRegisterDevice(apiBaseUrl: string): Promise<DeviceInfo> {
    const existing = await this.getStoredDeviceInfo();
    if (existing) return existing;
    return this.registerDevice(apiBaseUrl);
  }

  buildSignInUrl(webBaseUrl: string, code: string): string {
    const url = new URL(`${webBaseUrl.replace(/\/$/, '')}/sign-in`);
    url.searchParams.set('source', 'extension');
    url.searchParams.set('code', code);
    return url.toString();
  }

  async exchange(apiBaseUrl: string, deviceId: string, code: string): Promise<DeviceToken | null> {
    const res = await fetch(`${apiBaseUrl}/api/devices/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, code }),
    });
    if (res.status === 404 || res.status === 425) {
      // not linked yet / too early
      return null;
    }
    if (!res.ok) {
      throw new Error(`exchange failed: ${res.status}`);
    }
    const data = (await res.json()) as DeviceToken;
    await this.saveToken(data);
    return data;
  }

  async pollExchangeUntilLinked(
    apiBaseUrl: string,
    deviceId: string,
    code: string,
    options?: { intervalMs?: number; maxWaitMs?: number }
  ): Promise<DeviceToken | null> {
    const interval = options?.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    const maxWait = options?.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
    const start = Date.now();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (Date.now() - start > maxWait) return null;
      try {
        const token = await this.exchange(apiBaseUrl, deviceId, code);
        if (token) return token;
      } catch (err) {
        // Log and continue polling
        // eslint-disable-next-line no-console
        console.warn('[DeviceAuth] exchange error (will retry):', err);
      }
      await new Promise(r => setTimeout(r, interval));
    }
  }
}

export const deviceAuth = new DeviceAuth();


