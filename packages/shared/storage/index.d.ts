/**
 * Storage abstraction layer for the Gamma Timetable Extension
 * This wraps chrome.storage and adds cloud sync capabilities (enabled in Sprint 2)
 */
export interface IStorageManager {
    save(key: string, data: any): Promise<void>;
    load(key: string): Promise<any>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
}
export interface StorageItem {
    version: number;
    data: any;
    timestamp: Date;
    presentation_url?: string;
}
export interface SyncQueueItem {
    key: string;
    data: any;
    operation: 'save' | 'remove';
    timestamp: Date;
    attempts: number;
}
export interface CloudSyncResult {
    success: boolean;
    error?: string;
    data?: any;
}
export interface PresentationSummary {
    id: string;
    presentationUrl: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}
export interface StorageConfig {
    enableCloudSync: boolean;
    syncDebounceMs: number;
    maxRetries: number;
    retryDelayMs: number;
    dataVersion: number;
}
export declare const DEFAULT_STORAGE_CONFIG: StorageConfig;
/**
 * StorageManager - Wraps chrome.storage with additional capabilities
 *
 * Features:
 * - Maintains identical API to existing storage.js
 * - Adds data versioning for future migrations
 * - Includes sync queue for future cloud integration
 * - Preserves exact current behavior when cloud sync disabled
 */
export declare class StorageManager implements IStorageManager {
    private config;
    private syncQueue;
    private syncTimer?;
    constructor(config?: Partial<StorageConfig>);
    /**
     * Save data to storage - maintains exact same API as existing saveData()
     * @param key Storage key
     * @param data Data to save
     */
    save(key: string, data: any): Promise<void>;
    /**
     * Load data from storage - maintains exact same API as existing loadData()
     * @param key Storage key
     * @returns Raw data (unwrapped from metadata for backward compatibility)
     */
    load(key: string): Promise<any>;
    /**
     * Remove data from storage
     * @param key Storage key
     */
    remove(key: string): Promise<void>;
    /**
     * Clear all storage
     */
    clear(): Promise<void>;
    private retryWithBackoff;
    private isRetriableNetworkError;
    /**
     * Sync timetable data to cloud
     * @param presentationUrl - URL of the presentation
     * @param timetableData - Timetable data to sync
     * @param options - Sync options
     */
    syncToCloud(presentationUrl: string, timetableData: any, options?: {
        title?: string;
        apiBaseUrl?: string;
        deviceAuth?: any;
    }): Promise<CloudSyncResult>;
    /**
     * Sync timetable data from cloud
     * @param presentationUrl - URL of the presentation
     * @param options - Sync options
     */
    syncFromCloud(presentationUrl: string, options?: {
        apiBaseUrl?: string;
        deviceAuth?: any;
    }): Promise<CloudSyncResult>;
    /**
     * Get list of user's presentations from cloud
     * @param options - List options
     */
    syncPresentationsList(options?: {
        apiBaseUrl?: string;
        deviceAuth?: any;
        limit?: number;
        offset?: number;
        sortBy?: string;
    }): Promise<CloudSyncResult>;
    /**
     * Auto-sync presentation on save when user is authenticated
     * @param presentationUrl - URL of the presentation
     * @param timetableData - Timetable data
     * @param options - Sync options
     */
    autoSyncIfAuthenticated(presentationUrl: string, timetableData: any, options?: {
        title?: string;
        apiBaseUrl?: string;
        deviceAuth?: any;
    }): Promise<void>;
    /**
     * Chrome storage save wrapper - maintains exact same behavior as original saveData()
     */
    private chromeStorageSave;
    /**
     * Chrome storage load wrapper - maintains exact same behavior as original loadData()
     */
    private chromeStorageLoad;
    /**
     * Chrome storage remove wrapper
     */
    private chromeStorageRemove;
    /**
     * Chrome storage clear wrapper
     */
    private chromeStorageClear;
    /**
     * Check if data is versioned (has metadata wrapper)
     */
    private isVersionedData;
    /**
     * Extract presentation URL from storage key
     */
    extractPresentationUrl(key: string): string | undefined;
    /**
     * Add item to sync queue (for future cloud sync)
     */
    private addToSyncQueue;
    /**
     * Schedule sync processing (debounced)
     */
    private scheduleSyncProcess;
    /**
     * Process sync queue (placeholder for future cloud sync)
     */
    private processSyncQueue;
    /**
     * Get sync queue status (for debugging)
     */
    getSyncQueueStatus(): {
        count: number;
        items: SyncQueueItem[];
    };
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<StorageConfig>): void;
}
/**
 * Default storage manager instance
 */
export declare const defaultStorageManager: StorageManager;
/**
 * Create a configured storage manager with authentication support
 * @param options - Configuration options
 */
export declare function createStorageManagerWithAuth(options?: {
    deviceAuth?: any;
    apiBaseUrl?: string;
    enableCloudSync?: boolean;
}): StorageManager;
/**
 * Enhanced save function with automatic cloud sync
 * @param key - Storage key
 * @param data - Data to save
 * @param options - Sync options
 */
export declare function saveDataWithSync(key: string, data: any, options?: {
    deviceAuth?: any;
    apiBaseUrl?: string;
    title?: string;
    enableAutoSync?: boolean;
}): Promise<void>;
/**
 * Saves data to storage - drop-in replacement for existing saveData()
 * @param key Storage key
 * @param value Data to save
 */
export declare function saveData(key: string, value: any): Promise<void>;
/**
 * Loads data from storage - drop-in replacement for existing loadData()
 * @param key Storage key
 */
export declare function loadData(key: string): Promise<any>;
/**
 * Debounce utility - preserved from original storage.js
 * @param func Function to debounce
 * @param delay Delay in milliseconds
 */
export declare function debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void;
//# sourceMappingURL=index.d.ts.map