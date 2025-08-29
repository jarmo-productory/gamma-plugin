/**
 * Storage abstraction layer for Productory Powerups for Gamma
 * This wraps chrome.storage and adds cloud sync capabilities (enabled in Sprint 2)
 */

// Storage interfaces
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

// Default configuration
export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  enableCloudSync: true, // Enabled for Sprint 2
  syncDebounceMs: 500,
  maxRetries: 3,
  retryDelayMs: 1000, // 1 second base retry delay
  dataVersion: 1,
};

/**
 * StorageManager - Wraps chrome.storage with additional capabilities
 *
 * Features:
 * - Maintains identical API to existing storage.js
 * - Adds data versioning for future migrations
 * - Includes sync queue for future cloud integration
 * - Preserves exact current behavior when cloud sync disabled
 */
export class StorageManager implements IStorageManager {
  private config: StorageConfig;
  private syncQueue: SyncQueueItem[] = [];
  private syncTimer?: ReturnType<typeof setTimeout>;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = { ...DEFAULT_STORAGE_CONFIG, ...config };
  }

  /**
   * Save data to storage - maintains exact same API as existing saveData()
   * @param key Storage key
   * @param data Data to save
   */
  async save(key: string, data: any): Promise<void> {
    try {
      // Wrap data with versioning metadata
      const storageItem: StorageItem = {
        version: this.config.dataVersion,
        data,
        timestamp: new Date(),
        presentation_url: this.extractPresentationUrl(key),
      };

      // Save to chrome.storage (identical to current behavior)
      await this.chromeStorageSave(key, storageItem);

      // Add to sync queue if cloud sync enabled
      if (this.config.enableCloudSync) {
        this.addToSyncQueue(key, data, 'save');
      }
    } catch (error) {
      console.error('[StorageManager] Save failed:', error);
      throw error;
    }
  }

  /**
   * Load data from storage - maintains exact same API as existing loadData()
   * @param key Storage key
   * @returns Raw data (unwrapped from metadata for backward compatibility)
   */
  async load(key: string): Promise<any> {
    try {
      const result = await this.chromeStorageLoad(key);

      if (!result) {
        return undefined; // Maintain exact same behavior as original
      }

      // Handle legacy data (before versioning)
      if (!this.isVersionedData(result)) {
        console.log('[StorageManager] Loading legacy data for key:', key);
        return result; // Return raw legacy data
      }

      // Handle versioned data
      const storageItem = result as StorageItem;

      // Future: Add migration logic here when needed
      if (storageItem.version !== this.config.dataVersion) {
        console.log(
          `[StorageManager] Data version mismatch for key ${key}: ${storageItem.version} vs ${this.config.dataVersion}`
        );
        // For now, just return the data - migration logic will be added in future sprints
      }

      return storageItem.data; // Return unwrapped data
    } catch (error) {
      console.error('[StorageManager] Load failed:', error);
      throw error;
    }
  }

  /**
   * Remove data from storage
   * @param key Storage key
   */
  async remove(key: string): Promise<void> {
    try {
      await this.chromeStorageRemove(key);

      // Add to sync queue if cloud sync enabled
      if (this.config.enableCloudSync) {
        this.addToSyncQueue(key, null, 'remove');
      }
    } catch (error) {
      console.error('[StorageManager] Remove failed:', error);
      throw error;
    }
  }

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    try {
      await this.chromeStorageClear();
      this.syncQueue = []; // Clear sync queue too
    } catch (error) {
      console.error('[StorageManager] Clear failed:', error);
      throw error;
    }
  }

  // Retry utility for network operations
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    context: string,
    isRetriableError: (error: any) => boolean = () => true
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Don't retry on authentication errors or client errors (4xx)
        if (!isRetriableError(error)) {
          throw error;
        }
        
        if (attempt === this.config.maxRetries) {
          console.error(`[StorageManager] ${context} failed after ${attempt} attempts:`, error);
          throw error;
        }
        
        // Exponential backoff with jitter
        const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1) + 
                     Math.random() * 1000;
        
        console.warn(
          `[StorageManager] ${context} attempt ${attempt} failed, retrying in ${Math.round(delay)}ms:`, 
          error
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  // Network error classification
  private isRetriableNetworkError(error: any): boolean {
    // Don't retry on authentication errors (401, 403)
    if (error.status === 401 || error.status === 403) {
      return false;
    }
    
    // Don't retry on client errors (400-499, except rate limiting)
    if (error.status >= 400 && error.status < 500 && error.status !== 429) {
      return false;
    }
    
    // Retry on network errors, server errors (5xx), and rate limiting (429)
    return error.name === 'TypeError' || // Network errors
           error.status >= 500 ||        // Server errors
           error.status === 429 ||       // Rate limiting
           !error.status;                // Unknown network errors
  }

  // Cloud sync methods (Sprint 2)

  /**
   * Sync timetable data to cloud
   * @param presentationUrl - URL of the presentation
   * @param timetableData - Timetable data to sync
   * @param options - Sync options
   */
  async syncToCloud(
    presentationUrl: string, 
    timetableData: any,
    options: { title?: string; apiBaseUrl?: string; deviceAuth?: any } = {}
  ): Promise<CloudSyncResult> {
    if (!this.config.enableCloudSync) {
      return { success: false, error: 'Cloud sync disabled' };
    }

    const { title, apiBaseUrl, deviceAuth } = options;
    
    if (!deviceAuth) {
      return { success: false, error: 'Authentication required' };
    }

    if (!apiBaseUrl) {
      return { success: false, error: 'API base URL required' };
    }

    try {
      return await this.retryWithBackoff(async () => {
        // Check if user is authenticated
        const token = await deviceAuth.getValidTokenOrRefresh(apiBaseUrl);
        if (!token) {
          const authError: any = new Error('Not authenticated');
          authError.status = 401;
          throw authError;
        }

        // Normalize timetable items to satisfy API validation (id, title, duration:number)
        const normalizedItems = Array.isArray(timetableData?.items)
          ? timetableData.items
              .map((item: any) => {
                const id = item?.id !== null && item?.id !== undefined ? String(item.id) : '';
                const title = item?.title !== null && item?.title !== undefined ? String(item.title) : '';
                const duration = Number(item?.duration);
                const startTime = typeof item?.startTime === 'string' ? item.startTime.slice(0,5) : item?.startTime;
                const endTime = typeof item?.endTime === 'string' ? item.endTime.slice(0,5) : item?.endTime;
                return {
                  id,
                  title,
                  duration: Number.isFinite(duration) ? duration : 0,
                  startTime,
                  endTime,
                  // Preserve content if present without enforcing type
                  content: item?.content,
                };
              })
              // keep only items that have required fields in acceptable shape
              .filter((it: any) => it.id && it.title && typeof it.duration === 'number')
          : [];

        // Prepare request data
        const requestData = {
          gamma_url: presentationUrl,
          title: title || timetableData.title || 'Untitled Presentation',
          start_time: timetableData.startTime || '09:00',
          total_duration: timetableData.totalDuration || 0,
          timetable_data: {
            title: timetableData.title,
            items: normalizedItems,
            startTime: timetableData.startTime,
            totalDuration: timetableData.totalDuration,
            lastModified: new Date().toISOString(),
          },
        };

        // Make API call to save presentation
        const response = await deviceAuth.authorizedFetch(
          apiBaseUrl,
          '/api/presentations/save',
          {
            method: 'POST',
            body: JSON.stringify(requestData),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error: any = new Error(errorData.error || `API error: ${response.status}`);
          error.status = response.status;
          throw error;
        }

        const result = await response.json();
        console.log('[StorageManager] Successfully synced to cloud:', presentationUrl);
        
        return { success: true, data: result };
      }, 'Cloud sync to save', this.isRetriableNetworkError.bind(this));
    } catch (error) {
      console.error('[StorageManager] Cloud sync failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Sync timetable data from cloud
   * @param presentationUrl - URL of the presentation
   * @param options - Sync options
   */
  async syncFromCloud(
    presentationUrl: string,
    options: { apiBaseUrl?: string; deviceAuth?: any } = {}
  ): Promise<CloudSyncResult> {
    if (!this.config.enableCloudSync) {
      return { success: false, error: 'Cloud sync disabled' };
    }

    const { apiBaseUrl, deviceAuth } = options;
    
    if (!deviceAuth) {
      return { success: false, error: 'Authentication required' };
    }

    if (!apiBaseUrl) {
      return { success: false, error: 'API base URL required' };
    }

    try {
      return await this.retryWithBackoff(async () => {
        // Check if user is authenticated
        const token = await deviceAuth.getValidTokenOrRefresh(apiBaseUrl);
        if (!token) {
          const authError: any = new Error('Not authenticated');
          authError.status = 401;
          throw authError;
        }

        // Make API call to get presentation
        const response = await deviceAuth.authorizedFetch(
          apiBaseUrl,
          `/api/presentations/get?url=${encodeURIComponent(presentationUrl)}`
        );

        if (response.status === 404) {
          const notFoundError: any = new Error('Presentation not found in cloud');
          notFoundError.status = 404;
          throw notFoundError;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error: any = new Error(errorData.error || `API error: ${response.status}`);
          error.status = response.status;
          throw error;
        }

        const result = await response.json();
        // Ensure returned data conforms to expected structure for sidebar
        if (result?.timetableData?.items && Array.isArray(result.timetableData.items)) {
          result.timetableData.items = result.timetableData.items.map((item: any) => ({
            ...item,
            id: String(item?.id ?? ''),
            title: String(item?.title ?? ''),
            duration: Number(item?.duration ?? 0),
          }));
        }
        console.log('[StorageManager] Successfully synced from cloud:', presentationUrl);
        
        return { success: true, data: result.timetableData };
      }, 'Cloud sync from load', this.isRetriableNetworkError.bind(this));
    } catch (error) {
      console.error('[StorageManager] Cloud sync from failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get list of user's presentations from cloud
   * @param options - List options
   */
  async syncPresentationsList(
    options: { 
      apiBaseUrl?: string; 
      deviceAuth?: any;
      limit?: number;
      offset?: number;
      sortBy?: string;
    } = {}
  ): Promise<CloudSyncResult> {
    if (!this.config.enableCloudSync) {
      return { success: false, error: 'Cloud sync disabled' };
    }

    const { apiBaseUrl, deviceAuth, limit = 50, offset = 0, sortBy = 'updated_at' } = options;
    
    if (!deviceAuth) {
      return { success: false, error: 'Authentication required' };
    }

    if (!apiBaseUrl) {
      return { success: false, error: 'API base URL required' };
    }

    try {
      return await this.retryWithBackoff(async () => {
        // Check if user is authenticated
        const token = await deviceAuth.getValidTokenOrRefresh(apiBaseUrl);
        if (!token) {
          const authError: any = new Error('Not authenticated');
          authError.status = 401;
          throw authError;
        }

        // Build query parameters  
        const params = new URL('http://localhost').searchParams;
        params.set('limit', limit.toString());
        params.set('offset', offset.toString());
        params.set('sortBy', sortBy);

        // Make API call to list presentations
        const response = await deviceAuth.authorizedFetch(
          apiBaseUrl,
          `/api/presentations/list?${params.toString()}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error: any = new Error(errorData.error || `API error: ${response.status}`);
          error.status = response.status;
          throw error;
        }

        const result = await response.json();
        console.log('[StorageManager] Successfully retrieved presentations list from cloud');
        
        return { success: true, data: result };
      }, 'Cloud presentations list', this.isRetriableNetworkError.bind(this));
    } catch (error) {
      console.error('[StorageManager] Presentations list sync failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Auto-sync presentation on save when user is authenticated
   * @param presentationUrl - URL of the presentation
   * @param timetableData - Timetable data
   * @param options - Sync options
   */
  async autoSyncIfAuthenticated(
    presentationUrl: string, 
    timetableData: any,
    options: { title?: string; apiBaseUrl?: string; deviceAuth?: any } = {}
  ): Promise<void> {
    if (!this.config.enableCloudSync) {
      return;
    }

    const { deviceAuth, apiBaseUrl } = options;
    
    if (!deviceAuth || !apiBaseUrl) {
      return; // Silently skip if no auth system available
    }

    try {
      // Check if user is authenticated (non-throwing check)
      const token = await deviceAuth.getValidTokenOrRefresh(apiBaseUrl);
      if (!token) {
        return; // Silently skip if not authenticated
      }

      // Attempt background sync with retries
      const result = await this.syncToCloud(presentationUrl, timetableData, options);
      
      if (result.success) {
        console.log('[StorageManager] Auto-sync successful');
      } else {
        console.warn('[StorageManager] Auto-sync failed:', result.error);
        // Could implement retry logic here in future
      }
    } catch (error) {
      console.warn('[StorageManager] Auto-sync error (non-critical):', error);
      // Auto-sync failures are non-critical - don't throw
    }
  }

  // Private helper methods

  /**
   * Chrome storage save wrapper - maintains exact same behavior as original saveData()
   */
  private chromeStorageSave(key: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve();
      });
    });
  }

  /**
   * Chrome storage load wrapper - maintains exact same behavior as original loadData()
   */
  private chromeStorageLoad(key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(key, result => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve(result[key]);
      });
    });
  }

  /**
   * Chrome storage remove wrapper
   */
  private chromeStorageRemove(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(key, () => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve();
      });
    });
  }

  /**
   * Chrome storage clear wrapper
   */
  private chromeStorageClear(): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve();
      });
    });
  }

  /**
   * Check if data is versioned (has metadata wrapper)
   */
  private isVersionedData(data: any): boolean {
    return (
      data && typeof data === 'object' && 'version' in data && 'data' in data && 'timestamp' in data
    );
  }

  /**
   * Extract presentation URL from storage key
   */
  extractPresentationUrl(key: string): string | undefined {
    const match = key.match(/^timetable-(.+)$/);
    return match ? match[1] : undefined;
  }

  /**
   * Add item to sync queue (for future cloud sync)
   */
  private addToSyncQueue(key: string, data: any, operation: 'save' | 'remove'): void {
    const queueItem: SyncQueueItem = {
      key,
      data,
      operation,
      timestamp: new Date(),
      attempts: 0,
    };

    this.syncQueue.push(queueItem);
    this.scheduleSyncProcess();
  }

  /**
   * Schedule sync processing (debounced)
   */
  private scheduleSyncProcess(): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }

    this.syncTimer = setTimeout(() => {
      this.processSyncQueue();
    }, this.config.syncDebounceMs);
  }

  /**
   * Process sync queue (placeholder for future cloud sync)
   */
  private async processSyncQueue(): Promise<void> {
    if (!this.config.enableCloudSync || this.syncQueue.length === 0) {
      return;
    }

    console.log(`[StorageManager] Processing sync queue: ${this.syncQueue.length} items`);

    // Placeholder: In future sprints, this will sync to cloud API
    // For now, just log the queue items
    for (const item of this.syncQueue) {
      console.log(`[StorageManager] Sync queue item:`, item);
    }

    // Clear processed items (in real implementation, only clear successful syncs)
    this.syncQueue = [];
  }

  /**
   * Get sync queue status (for debugging)
   */
  getSyncQueueStatus(): { count: number; items: SyncQueueItem[] } {
    return {
      count: this.syncQueue.length,
      items: [...this.syncQueue],
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<StorageConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Compatibility layer - maintains exact same API as existing storage.js

/**
 * Default storage manager instance
 */
export const defaultStorageManager = new StorageManager();

/**
 * Create a configured storage manager with authentication support
 * @param options - Configuration options
 */
export function createStorageManagerWithAuth(options: {
  deviceAuth?: any;
  apiBaseUrl?: string;
  enableCloudSync?: boolean;
} = {}): StorageManager {
  const { deviceAuth, apiBaseUrl, enableCloudSync = true } = options;
  
  const manager = new StorageManager({
    enableCloudSync,
  });

  // Attach auth context for convenience
  if (deviceAuth && apiBaseUrl) {
    (manager as any)._authContext = { deviceAuth, apiBaseUrl };
  }

  return manager;
}

/**
 * Enhanced save function with automatic cloud sync
 * @param key - Storage key
 * @param data - Data to save
 * @param options - Sync options
 */
export async function saveDataWithSync(
  key: string, 
  data: any,
  options: { 
    deviceAuth?: any;
    apiBaseUrl?: string;
    title?: string;
    enableAutoSync?: boolean;
  } = {}
): Promise<void> {
  // Save to local storage first (maintains offline-first behavior)
  await defaultStorageManager.save(key, data);

  // Auto-sync if enabled and authenticated
  if (options.enableAutoSync !== false && options.deviceAuth && options.apiBaseUrl) {
    const presentationUrl = defaultStorageManager.extractPresentationUrl(key);
    if (presentationUrl) {
      await defaultStorageManager.autoSyncIfAuthenticated(presentationUrl, data, {
        title: options.title,
        apiBaseUrl: options.apiBaseUrl,
        deviceAuth: options.deviceAuth,
      });
    }
  }
}

/**
 * Saves data to storage - drop-in replacement for existing saveData()
 * @param key Storage key
 * @param value Data to save
 */
export function saveData(key: string, value: any): Promise<void> {
  return defaultStorageManager.save(key, value);
}

/**
 * Loads data from storage - drop-in replacement for existing loadData()
 * @param key Storage key
 */
export function loadData(key: string): Promise<any> {
  return defaultStorageManager.load(key);
}

/**
 * Debounce utility - preserved from original storage.js
 * @param func Function to debounce
 * @param delay Delay in milliseconds
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return function (...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}
