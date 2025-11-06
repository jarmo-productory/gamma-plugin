import { StorageManager } from '../storage';
const STORAGE_KEYS = {
    deviceInfo: 'device_info_v1',
    deviceToken: 'device_token_v1',
    installId: 'install_id_v1', // Sprint 27: Stable device identity
};
const DEFAULT_POLL_INTERVAL_MS = 2500;
const DEFAULT_MAX_WAIT_MS = 5 * 60 * 1000; // 5 minutes
export class DeviceAuth {
    storage;
    constructor(storage) {
        this.storage = storage || new StorageManager();
    }
    async getStoredDeviceInfo() {
        const info = await this.storage.load(STORAGE_KEYS.deviceInfo);
        return info || null;
    }
    async getStoredToken() {
        const t = await this.storage.load(STORAGE_KEYS.deviceToken);
        return t || null;
    }
    async saveDeviceInfo(info) {
        await this.storage.save(STORAGE_KEYS.deviceInfo, info);
    }
    async saveToken(token) {
        await this.storage.save(STORAGE_KEYS.deviceToken, token);
    }
    async clearToken() {
        await this.storage.save(STORAGE_KEYS.deviceToken, null);
    }
    /**
     * Sprint 27: Get or generate stable install ID for device fingerprinting
     */
    async getOrGenerateInstallId() {
        let installId = await this.storage.load(STORAGE_KEYS.installId);
        if (!installId) {
            // Generate a new UUID-like install ID
            installId = 'inst_' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
            await this.storage.save(STORAGE_KEYS.installId, installId);
        }
        return installId;
    }
    /**
     * Sprint 27: Generate device fingerprint from install ID and user agent
     */
    async generateDeviceFingerprint() {
        const installId = await this.getOrGenerateInstallId();
        const userAgentMajor = this.extractUserAgentMajor();
        const fingerprint = await this.sha256Hash(installId + '|' + userAgentMajor);
        return fingerprint;
    }
    extractUserAgentMajor() {
        if (typeof navigator === 'undefined') {
            return 'unknown';
        }
        // Extract major browser version for fingerprinting
        const ua = navigator.userAgent;
        const chromeMatch = ua.match(/Chrome\/(\d+)/);
        const firefoxMatch = ua.match(/Firefox\/(\d+)/);
        if (chromeMatch)
            return `Chrome${chromeMatch[1]}`;
        if (firefoxMatch)
            return `Firefox${firefoxMatch[1]}`;
        return 'Browser';
    }
    async sha256Hash(input) {
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            // Modern browser crypto API
            const encoder = new TextEncoder();
            const data = encoder.encode(input);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            return Array.from(new Uint8Array(hashBuffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        }
        else {
            // Fallback for environments without crypto.subtle
            // crypto.subtle not available, using fallback hash
            let hash = 0;
            for (let i = 0; i < input.length; i++) {
                const char = input.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return Math.abs(hash).toString(16).padStart(8, '0').repeat(8); // Simulate 64-char hex
        }
    }
    isExpired(iso) {
        const exp = Date.parse(iso);
        if (Number.isNaN(exp))
            return true;
        return Date.now() >= exp - 5_000; // treat as expired if within 5s
    }
    async getValidTokenOrRefresh(apiBaseUrl) {
        const existing = await this.getStoredToken();
        if (!existing)
            return null;
        if (!this.isExpired(existing.expiresAt))
            return existing;
        try {
            const refreshed = await this.refresh(apiBaseUrl, existing.token);
            if (refreshed)
                return refreshed;
        }
        catch (err) {
            // token refresh failed
        }
        return null;
    }
    async registerDevice(apiBaseUrl) {
        // Sprint 27: Include device fingerprint in registration
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
        const data = (await res.json());
        const info = {
            deviceId: data.deviceId,
            code: data.code,
            expiresAt: data.expiresAt,
        };
        await this.saveDeviceInfo(info);
        return info;
    }
    async getOrRegisterDevice(apiBaseUrl) {
        const existing = await this.getStoredDeviceInfo();
        if (existing && !this.isExpired(existing.expiresAt)) {
            return existing;
        }
        return this.registerDevice(apiBaseUrl);
    }
    buildSignInUrl(webBaseUrl, code) {
        // Open the root path and pass pairing params; web app handles redirect/UI
        const url = new URL(`${webBaseUrl.replace(/\/$/, '')}/`);
        url.searchParams.set('source', 'extension');
        url.searchParams.set('code', code);
        return url.toString();
    }
    async exchange(apiBaseUrl, deviceId, code) {
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
        const data = (await res.json());
        await this.saveToken(data);
        return data;
    }
    async refresh(apiBaseUrl, bearerToken) {
        const res = await fetch(`${apiBaseUrl}/api/devices/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${bearerToken}`,
            },
            body: JSON.stringify({}),
        });
        if (!res.ok)
            return null;
        const data = (await res.json());
        await this.saveToken(data);
        return data;
    }
    async authorizedFetch(apiBaseUrl, path, init) {
        const token = await this.getValidTokenOrRefresh(apiBaseUrl);
        if (!token)
            throw new Error('not_authenticated');
        const url = path.startsWith('http') ? path : `${apiBaseUrl.replace(/\/$/, '')}${path}`;
        const headers = new Headers(init?.headers || {});
        headers.set('Authorization', `Bearer ${token.token}`);
        headers.set('Content-Type', headers.get('Content-Type') || 'application/json');
        return fetch(url, { ...init, headers });
    }
    async pollExchangeUntilLinked(apiBaseUrl, deviceId, code, options) {
        const interval = options?.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
        const maxWait = options?.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
        const start = Date.now();
        // polling loop with timeout
        for (;;) {
            if (Date.now() - start > maxWait)
                return null;
            try {
                const token = await this.exchange(apiBaseUrl, deviceId, code);
                if (token)
                    return token;
            }
            catch (err) {
                // Log and continue polling
                // exchange error (will retry)
            }
            await new Promise(r => setTimeout(r, interval));
        }
    }
}
export const deviceAuth = new DeviceAuth();
//# sourceMappingURL=device.js.map