/**
 * DeviceAuth Wrapper
 * Works around ES module import issues by copying the DeviceAuth logic
 */

import type { FileStorageManager } from '../storage/file-storage.js';

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
  installId: 'install_id_v1',
} as const;

const DEFAULT_POLL_INTERVAL_MS = 2500;
const DEFAULT_MAX_WAIT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Device Authentication - Simulator version
 * Identical logic to shared/auth/device.ts but works with simulator storage
 */
export class DeviceAuth {
  private storage: FileStorageManager;

  constructor(storage: FileStorageManager) {
    this.storage = storage;
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

  async getOrGenerateInstallId(): Promise<string> {
    let installId = await this.storage.load(STORAGE_KEYS.installId) as string;
    if (!installId) {
      installId = 'inst_' + Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      await this.storage.save(STORAGE_KEYS.installId, installId);
    }
    return installId;
  }

  async generateDeviceFingerprint(): Promise<string> {
    const installId = await this.getOrGenerateInstallId();
    const userAgentMajor = this.extractUserAgentMajor();
    const fingerprint = await this.sha256Hash(installId + '|' + userAgentMajor);
    return fingerprint;
  }

  private extractUserAgentMajor(): string {
    if (typeof navigator === 'undefined') {
      return 'Simulator';
    }
    const ua = navigator.userAgent;
    const chromeMatch = ua.match(/Chrome\/(\d+)/);
    if (chromeMatch) return `Chrome${chromeMatch[1]}`;
    return 'Simulator';
  }

  private async sha256Hash(input: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    throw new Error('crypto.subtle not available');
  }

  private isExpired(iso: string): boolean {
    const exp = Date.parse(iso);
    if (Number.isNaN(exp)) return true;
    return Date.now() >= exp - 5_000;
  }

  async getValidTokenOrRefresh(apiBaseUrl: string): Promise<DeviceToken | null> {
    const existing = await this.getStoredToken();
    if (!existing) return null;
    if (!this.isExpired(existing.expiresAt)) return existing;
    try {
      const refreshed = await this.refresh(apiBaseUrl, existing.token);
      if (refreshed) return refreshed;
    } catch (err) {
      // token refresh failed
    }
    return null;
  }

  async registerDevice(apiBaseUrl: string): Promise<DeviceInfo> {
    const deviceFingerprint = await this.generateDeviceFingerprint();

    const res = await fetch(`${apiBaseUrl}/api/devices/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_fingerprint: deviceFingerprint }),
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

  buildSignInUrl(webBaseUrl: string, code: string): string {
    const url = new URL(`${webBaseUrl.replace(/\/$/, '')}/`);
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
      return null;
    }
    if (!res.ok) {
      throw new Error(`exchange failed: ${res.status}`);
    }
    const data = (await res.json()) as DeviceToken;
    await this.saveToken(data);
    return data;
  }

  async refresh(apiBaseUrl: string, bearerToken: string): Promise<DeviceToken | null> {
    const res = await fetch(`${apiBaseUrl}/api/devices/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as DeviceToken;
    await this.saveToken(data);
    return data;
  }

  async authorizedFetch(
    apiBaseUrl: string,
    path: string,
    init?: RequestInit
  ): Promise<Response> {
    const token = await this.getValidTokenOrRefresh(apiBaseUrl);
    if (!token) throw new Error('not_authenticated');
    const url = path.startsWith('http') ? path : `${apiBaseUrl.replace(/\/$/, '')}${path}`;
    const headers = new Headers(init?.headers || {});
    headers.set('Authorization', `Bearer ${token.token}`);
    headers.set('Content-Type', headers.get('Content-Type') || 'application/json');
    return fetch(url, { ...init, headers });
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

    for (;;) {
      if (Date.now() - start > maxWait) return null;
      try {
        const token = await this.exchange(apiBaseUrl, deviceId, code);
        if (token) return token;
      } catch (err) {
        // Log and continue polling
      }
      await new Promise(r => setTimeout(r, interval));
    }
  }
}
