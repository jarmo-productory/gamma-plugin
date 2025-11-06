import { StorageManagerAdapter } from '../storage/file-storage';
import { DeviceInfo, DeviceToken, RegisterResponse, SimulatorConfig } from '../types';

const STORAGE_KEYS = {
  deviceInfo: 'device_info_v1',
  deviceToken: 'device_token_v1',
  installId: 'install_id_v1',
} as const;

const DEFAULT_POLL_INTERVAL_MS = 2000;
const DEFAULT_MAX_WAIT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Device authentication simulator
 * Extracts and adapts logic from packages/shared/auth/device.ts for Node.js
 */
export class DeviceAuthSimulator {
  private storage: StorageManagerAdapter;
  private config: SimulatorConfig;

  constructor(config: SimulatorConfig, storage?: StorageManagerAdapter) {
    this.config = config;
    this.storage = storage || new StorageManagerAdapter(config.storageDir);
  }

  async getStoredDeviceInfo(): Promise<DeviceInfo | null> {
    const info = await this.storage.load(STORAGE_KEYS.deviceInfo);
    return info || null;
  }

  async getStoredToken(): Promise<DeviceToken | null> {
    const token = await this.storage.load(STORAGE_KEYS.deviceToken);
    return token || null;
  }

  async saveDeviceInfo(info: DeviceInfo): Promise<void> {
    await this.storage.save(STORAGE_KEYS.deviceInfo, info);
  }

  async saveToken(token: DeviceToken): Promise<void> {
    await this.storage.save(STORAGE_KEYS.deviceToken, token);
  }

  async clearToken(): Promise<void> {
    await this.storage.remove(STORAGE_KEYS.deviceToken);
  }

  async clearAll(): Promise<void> {
    await this.storage.clear();
  }

  /**
   * Generate stable install ID for device fingerprinting
   */
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

  /**
   * Generate device fingerprint from install ID and user agent
   */
  async generateDeviceFingerprint(): Promise<string> {
    const installId = await this.getOrGenerateInstallId();
    const userAgentMajor = this.extractUserAgentMajor();
    const fingerprint = await this.sha256Hash(installId + '|' + userAgentMajor);
    return fingerprint;
  }

  private extractUserAgentMajor(): string {
    // Node.js environment - use process info
    return `Node${process.version.split('.')[0]}`;
  }

  private async sha256Hash(input: string): Promise<string> {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  private isExpired(iso: string): boolean {
    const exp = Date.parse(iso);
    if (Number.isNaN(exp)) return true;
    return Date.now() >= exp - 5_000;
  }

  async getValidTokenOrRefresh(): Promise<DeviceToken | null> {
    const existing = await this.getStoredToken();
    if (!existing) return null;
    if (!this.isExpired(existing.expiresAt)) return existing;

    try {
      const refreshed = await this.refresh(existing.token);
      if (refreshed) return refreshed;
    } catch (err) {
      console.error('Token refresh failed:', err);
    }
    return null;
  }

  /**
   * Register device with API
   */
  async registerDevice(): Promise<DeviceInfo> {
    const deviceFingerprint = await this.generateDeviceFingerprint();

    console.log('\n🔐 Registering device...');
    console.log('API URL:', `${this.config.apiBaseUrl}/api/devices/register`);
    console.log('Device Fingerprint:', deviceFingerprint);

    const response = await fetch(`${this.config.apiBaseUrl}/api/devices/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ device_fingerprint: deviceFingerprint }),
    });

    console.log('Response Status:', response.status);
    const responseText = await response.text();
    console.log('Response Body:', responseText);

    if (!response.ok) {
      throw new Error(`registerDevice failed: ${response.status} - ${responseText}`);
    }

    const data = JSON.parse(responseText) as RegisterResponse;
    const info: DeviceInfo = {
      deviceId: data.deviceId,
      code: data.code,
      expiresAt: data.expiresAt,
    };

    await this.saveDeviceInfo(info);
    return info;
  }

  /**
   * Build pairing URL for user
   */
  buildSignInUrl(code: string): string {
    const webBaseUrl = this.config.apiBaseUrl.replace('/api', '').replace(/\/$/, '');
    const url = new URL(`${webBaseUrl}/`);
    url.searchParams.set('source', 'extension');
    url.searchParams.set('code', code);
    return url.toString();
  }

  /**
   * Exchange device code for token
   */
  async exchange(deviceId: string, code: string): Promise<DeviceToken | null> {
    console.log('\n🔄 Attempting token exchange...');
    console.log('Device ID:', deviceId);
    console.log('Code:', code);
    console.log('API URL:', `${this.config.apiBaseUrl}/api/devices/exchange`);

    const response = await fetch(`${this.config.apiBaseUrl}/api/devices/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, code }),
    });

    console.log('Response Status:', response.status);
    const responseText = await response.text();
    console.log('Response Body:', responseText);

    if (response.status === 404 || response.status === 425) {
      console.log('⏳ Device not linked yet...');
      return null;
    }

    if (!response.ok) {
      throw new Error(`exchange failed: ${response.status} - ${responseText}`);
    }

    const data = JSON.parse(responseText) as DeviceToken;
    await this.saveToken(data);
    console.log('✅ Token received and saved!');
    return data;
  }

  /**
   * Refresh existing token
   */
  async refresh(bearerToken: string): Promise<DeviceToken | null> {
    console.log('\n🔄 Refreshing token...');
    console.log('API URL:', `${this.config.apiBaseUrl}/api/devices/refresh`);

    const response = await fetch(`${this.config.apiBaseUrl}/api/devices/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({}),
    });

    console.log('Response Status:', response.status);
    const responseText = await response.text();
    console.log('Response Body:', responseText);

    if (!response.ok) {
      console.error('❌ Token refresh failed');
      return null;
    }

    const data = JSON.parse(responseText) as DeviceToken;
    await this.saveToken(data);
    console.log('✅ Token refreshed!');
    return data;
  }

  /**
   * Poll exchange endpoint until device is linked
   */
  async pollExchangeUntilLinked(
    deviceId: string,
    code: string,
    options?: { intervalMs?: number; maxWaitMs?: number }
  ): Promise<DeviceToken | null> {
    const interval = options?.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    const maxWait = options?.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
    const start = Date.now();

    console.log('\n⏳ Polling for device pairing...');
    console.log(`Will check every ${interval}ms for up to ${maxWait / 1000}s`);

    let attempts = 0;
    for (;;) {
      attempts++;
      if (Date.now() - start > maxWait) {
        console.log('\n❌ Polling timeout - device not paired');
        return null;
      }

      try {
        const token = await this.exchange(deviceId, code);
        if (token) {
          console.log(`\n✅ Successfully paired after ${attempts} attempts!`);
          return token;
        }
      } catch (err) {
        console.error('Exchange error:', err);
      }

      await new Promise(r => setTimeout(r, interval));
    }
  }

  /**
   * Authorized fetch with automatic token refresh
   */
  async authorizedFetch(path: string, init?: RequestInit): Promise<Response> {
    const token = await this.getValidTokenOrRefresh();
    if (!token) {
      throw new Error('not_authenticated');
    }

    const url = path.startsWith('http')
      ? path
      : `${this.config.apiBaseUrl.replace(/\/$/, '')}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.token}`,
      ...(init?.headers as Record<string, string> || {}),
    };

    return fetch(url, {
      ...init,
      headers
    });
  }
}
