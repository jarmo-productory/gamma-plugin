import { StorageManager } from '../storage';
export interface DeviceInfo {
    deviceId: string;
    code: string;
    expiresAt: string;
}
export interface DeviceToken {
    token: string;
    expiresAt: string;
}
export interface RegisterResponse {
    deviceId: string;
    code: string;
    expiresAt: string;
}
export declare class DeviceAuth {
    private storage;
    constructor(storage?: StorageManager);
    getStoredDeviceInfo(): Promise<DeviceInfo | null>;
    getStoredToken(): Promise<DeviceToken | null>;
    saveDeviceInfo(info: DeviceInfo): Promise<void>;
    saveToken(token: DeviceToken): Promise<void>;
    clearToken(): Promise<void>;
    /**
     * Sprint 27: Get or generate stable install ID for device fingerprinting
     */
    getOrGenerateInstallId(): Promise<string>;
    /**
     * Sprint 27: Generate device fingerprint from install ID and user agent
     */
    generateDeviceFingerprint(): Promise<string>;
    private extractUserAgentMajor;
    private sha256Hash;
    private isExpired;
    getValidTokenOrRefresh(apiBaseUrl: string): Promise<DeviceToken | null>;
    registerDevice(apiBaseUrl: string): Promise<DeviceInfo>;
    getOrRegisterDevice(apiBaseUrl: string): Promise<DeviceInfo>;
    buildSignInUrl(webBaseUrl: string, code: string): string;
    exchange(apiBaseUrl: string, deviceId: string, code: string): Promise<DeviceToken | null>;
    refresh(apiBaseUrl: string, bearerToken: string): Promise<DeviceToken | null>;
    authorizedFetch(apiBaseUrl: string, path: string, init?: RequestInit): Promise<Response>;
    pollExchangeUntilLinked(apiBaseUrl: string, deviceId: string, code: string, options?: {
        intervalMs?: number;
        maxWaitMs?: number;
    }): Promise<DeviceToken | null>;
}
export declare const deviceAuth: DeviceAuth;
//# sourceMappingURL=device.d.ts.map