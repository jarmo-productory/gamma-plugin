/**
 * Storage abstraction layer for the Gamma Timetable Extension
 * This wraps chrome.storage and adds cloud sync capabilities (disabled by default)
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

export interface StorageConfig {
  enableCloudSync: boolean;
  syncDebounceMs: number;
  maxRetries: number;
  dataVersion: number;
}

// Default configuration
export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  enableCloudSync: false,    // Disabled for Sprint 0
  syncDebounceMs: 500,
  maxRetries: 3,
  dataVersion: 1
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
        presentation_url: this.extractPresentationUrl(key)
      };

      // Save to chrome.storage (identical to current behavior)
      await this.chromeStorageSave(key, storageItem);

      // Add to sync queue if cloud sync enabled (disabled by default)
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
        console.log(`[StorageManager] Data version mismatch for key ${key}: ${storageItem.version} vs ${this.config.dataVersion}`);
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
      chrome.storage.local.get(key, (result) => {
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
    return data && 
           typeof data === 'object' && 
           'version' in data && 
           'data' in data && 
           'timestamp' in data;
  }

  /**
   * Extract presentation URL from storage key
   */
  private extractPresentationUrl(key: string): string | undefined {
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
      attempts: 0
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
      items: [...this.syncQueue]
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
export function debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return function(this: any, ...args: Parameters<T>) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
} 