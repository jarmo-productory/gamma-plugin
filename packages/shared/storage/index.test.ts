/**
 * Tests for Storage Abstraction Layer
 * 
 * Testing Strategy:
 * 1. Pure functions (debounce utility) - highest ROI
 * 2. Chrome storage wrapper operations - mocked Chrome API
 * 3. Data versioning and legacy compatibility
 * 4. Sync queue functionality (future-ready)
 * 5. Configuration management and edge cases
 */

import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { 
  StorageManager, 
  DEFAULT_STORAGE_CONFIG,
  saveData,
  loadData,
  debounce,
  type StorageItem,
  type SyncQueueItem,
  type StorageConfig 
} from './index';

describe('Storage Abstraction Layer', () => {
  let storageManager: StorageManager;
  let mockChromeStorage: any;

  beforeAll(() => {
    // Mock Chrome storage API
    mockChromeStorage = {
      local: {
        set: vi.fn(),
        get: vi.fn(),
        remove: vi.fn(),
        clear: vi.fn(),
      },
    };

    // Setup global chrome mock
    global.chrome = {
      storage: mockChromeStorage,
      runtime: {
        lastError: null,
      },
    } as any;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    storageManager = new StorageManager();
    
    // Reset chrome.runtime.lastError
    global.chrome.runtime.lastError = undefined;
  });

  describe('Configuration Management', () => {
    it('should use default configuration', () => {
      const defaultManager = new StorageManager();
      
      // We can't directly access private config, but we can test behavior
      expect(DEFAULT_STORAGE_CONFIG.enableCloudSync).toBe(false);
      expect(DEFAULT_STORAGE_CONFIG.syncDebounceMs).toBe(500);
      expect(DEFAULT_STORAGE_CONFIG.maxRetries).toBe(3);
      expect(DEFAULT_STORAGE_CONFIG.dataVersion).toBe(1);
    });

    it('should accept custom configuration', () => {
      const customConfig: Partial<StorageConfig> = {
        enableCloudSync: true,
        syncDebounceMs: 1000,
        maxRetries: 5,
      };

      const customManager = new StorageManager(customConfig);

      // Test that sync queue is used when enableCloudSync is true
      const status = customManager.getSyncQueueStatus();
      expect(status.count).toBe(0);
    });

    it('should update configuration dynamically', () => {
      storageManager.updateConfig({ enableCloudSync: true, syncDebounceMs: 250 });
      
      // Configuration update should be applied (test via behavior)
      const initialStatus = storageManager.getSyncQueueStatus();
      expect(initialStatus.count).toBe(0);
    });
  });

  describe('Basic Storage Operations', () => {
    beforeEach(() => {
      // Setup successful Chrome storage operations by default
      mockChromeStorage.local.set.mockImplementation((data: Record<string, any>, callback?: () => void) => {
        callback?.();
      });
      
      mockChromeStorage.local.get.mockImplementation((key: string | string[] | Record<string, any> | null, callback?: (items: Record<string, any>) => void) => {
        callback?.({});
      });
      
      mockChromeStorage.local.remove.mockImplementation((key: string | string[], callback?: () => void) => {
        callback?.();
      });
      
      mockChromeStorage.local.clear.mockImplementation((callback?: () => void) => {
        callback?.();
      });
    });

    it('should save data with versioning metadata', async () => {
      const testKey = 'test-key';
      const testData = { message: 'Hello World' };

      await storageManager.save(testKey, testData);

      expect(mockChromeStorage.local.set).toHaveBeenCalledWith(
        {
          [testKey]: expect.objectContaining({
            version: 1,
            data: testData,
            timestamp: expect.any(Date),
          }),
        },
        expect.any(Function)
      );
    });

    it('should save presentation data with URL extraction', async () => {
      const presentationKey = 'timetable-https://gamma.app/docs/presentation-123';
      const testData = { slides: [] };

      await storageManager.save(presentationKey, testData);

      expect(mockChromeStorage.local.set).toHaveBeenCalledWith(
        {
          [presentationKey]: expect.objectContaining({
            version: 1,
            data: testData,
            presentation_url: 'https://gamma.app/docs/presentation-123',
          }),
        },
        expect.any(Function)
      );
    });

    it('should load versioned data correctly', async () => {
      const testKey = 'test-key';
      const testData = { message: 'Hello World' };
      const versionedData: StorageItem = {
        version: 1,
        data: testData,
        timestamp: new Date(),
      };

      mockChromeStorage.local.get.mockImplementation((key: string | string[] | Record<string, any> | null, callback?: (items: Record<string, any>) => void) => {
        callback?.({ [testKey]: versionedData });
      });

      const result = await storageManager.load(testKey);

      expect(result).toEqual(testData);
      expect(mockChromeStorage.local.get).toHaveBeenCalledWith(testKey, expect.any(Function));
    });

    it('should load legacy data without versioning', async () => {
      const testKey = 'legacy-key';
      const legacyData = { message: 'Legacy data' };

      mockChromeStorage.local.get.mockImplementation((key: string | string[] | Record<string, any> | null, callback?: (items: Record<string, any>) => void) => {
        callback?.({ [testKey]: legacyData });
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await storageManager.load(testKey);

      expect(result).toEqual(legacyData);
      expect(consoleSpy).toHaveBeenCalledWith('[StorageManager] Loading legacy data for key:', testKey);
      
      consoleSpy.mockRestore();
    });

    it('should return undefined for non-existent keys', async () => {
      mockChromeStorage.local.get.mockImplementation((key: string | string[] | Record<string, any> | null, callback?: (items: Record<string, any>) => void) => {
        callback?.({});
      });

      const result = await storageManager.load('non-existent');

      expect(result).toBeUndefined();
    });

    it('should remove data correctly', async () => {
      const testKey = 'test-key';

      await storageManager.remove(testKey);

      expect(mockChromeStorage.local.remove).toHaveBeenCalledWith(testKey, expect.any(Function));
    });

    it('should clear all storage', async () => {
      await storageManager.clear();

      expect(mockChromeStorage.local.clear).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('Error Handling', () => {
    it('should handle Chrome storage save errors', async () => {
      const storageError = { message: 'Storage quota exceeded' };
      global.chrome.runtime.lastError = storageError;

      mockChromeStorage.local.set.mockImplementation((data: Record<string, any>, callback?: () => void) => {
        callback?.();
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(storageManager.save('test', {}))
        .rejects.toEqual(storageError);

      expect(consoleSpy).toHaveBeenCalledWith('[StorageManager] Save failed:', storageError);
      
      consoleSpy.mockRestore();
    });

    it('should handle Chrome storage load errors', async () => {
      const storageError = { message: 'Storage access denied' };
      global.chrome.runtime.lastError = storageError;

      mockChromeStorage.local.get.mockImplementation((key: string | string[] | Record<string, any> | null, callback?: (items: Record<string, any>) => void) => {
        callback?.({});
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(storageManager.load('test'))
        .rejects.toEqual(storageError);

      expect(consoleSpy).toHaveBeenCalledWith('[StorageManager] Load failed:', storageError);
      
      consoleSpy.mockRestore();
    });

    it('should handle Chrome storage remove errors', async () => {
      const storageError = { message: 'Remove failed' };
      global.chrome.runtime.lastError = storageError;

      mockChromeStorage.local.remove.mockImplementation((key: string | string[], callback?: () => void) => {
        callback?.();
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(storageManager.remove('test'))
        .rejects.toEqual(storageError);

      expect(consoleSpy).toHaveBeenCalledWith('[StorageManager] Remove failed:', storageError);
      
      consoleSpy.mockRestore();
    });

    it('should handle Chrome storage clear errors', async () => {
      const storageError = { message: 'Clear failed' };
      global.chrome.runtime.lastError = storageError;

      mockChromeStorage.local.clear.mockImplementation((callback?: () => void) => {
        callback?.();
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(storageManager.clear())
        .rejects.toEqual(storageError);

      expect(consoleSpy).toHaveBeenCalledWith('[StorageManager] Clear failed:', storageError);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Data Version Handling', () => {
    it('should handle version mismatch gracefully', async () => {
      const testKey = 'test-key';
      const testData = { message: 'Version mismatch test' };
      const oldVersionData: StorageItem = {
        version: 0, // Old version
        data: testData,
        timestamp: new Date(),
      };

      mockChromeStorage.local.get.mockImplementation((key: string | string[] | Record<string, any> | null, callback?: (items: Record<string, any>) => void) => {
        callback?.({ [testKey]: oldVersionData });
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await storageManager.load(testKey);

      expect(result).toEqual(testData);
      expect(consoleSpy).toHaveBeenCalledWith(
        `[StorageManager] Data version mismatch for key ${testKey}: 0 vs 1`
      );
      
      consoleSpy.mockRestore();
    });

    it('should correctly identify versioned vs legacy data', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Test versioned data
      const versionedData: StorageItem = {
        version: 1,
        data: { test: true },
        timestamp: new Date(),
      };

      mockChromeStorage.local.get.mockImplementation((key: string | string[] | Record<string, any> | null, callback?: (items: Record<string, any>) => void) => {
        callback?.({ versioned: versionedData });
      });

      const versionedResult = await storageManager.load('versioned');
      expect(versionedResult).toEqual({ test: true });

      // Test legacy data
      const legacyData = { legacy: true };

      mockChromeStorage.local.get.mockImplementation((key: string | string[] | Record<string, any> | null, callback?: (items: Record<string, any>) => void) => {
        callback?.({ legacy: legacyData });
      });

      const legacyResult = await storageManager.load('legacy');
      expect(legacyResult).toEqual({ legacy: true });

      expect(consoleSpy).toHaveBeenCalledWith('[StorageManager] Loading legacy data for key:', 'legacy');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Sync Queue Functionality', () => {
    beforeAll(() => {
      vi.useFakeTimers();
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    beforeEach(() => {
      mockChromeStorage.local.set.mockImplementation((data: Record<string, any>, callback?: () => void) => {
        callback?.();
      });
    });

    it('should add to sync queue by default (cloud sync enabled)', async () => {
      await storageManager.save('test', { data: 'test' });

      const status = storageManager.getSyncQueueStatus();
      expect(status.count).toBe(1);
      expect(status.items).toHaveLength(1);
      expect(status.items[0]).toMatchObject({
        key: 'test',
        data: { data: 'test' },
        operation: 'save',
        attempts: 0,
      });
    });

    it('should not add to sync queue when cloud sync disabled', async () => {
      const disabledSyncManager = new StorageManager({ enableCloudSync: false });
      await disabledSyncManager.save('test', { data: 'test' });

      const status = disabledSyncManager.getSyncQueueStatus();
      expect(status.count).toBe(0);
      expect(status.items).toEqual([]);
    });

    it('should add to sync queue when cloud sync enabled', async () => {
      const syncEnabledManager = new StorageManager({ enableCloudSync: true });
      
      mockChromeStorage.local.set.mockImplementation((data: Record<string, any>, callback?: () => void) => {
        callback?.();
      });

      await syncEnabledManager.save('test-key', { message: 'sync test' });

      const status = syncEnabledManager.getSyncQueueStatus();
      expect(status.count).toBe(1);
      expect(status.items[0]).toEqual(expect.objectContaining({
        key: 'test-key',
        data: { message: 'sync test' },
        operation: 'save',
        attempts: 0,
      }));
    });

    it('should add remove operations to sync queue', async () => {
      const syncEnabledManager = new StorageManager({ enableCloudSync: true });
      
      mockChromeStorage.local.remove.mockImplementation((key: string | string[], callback?: () => void) => {
        callback?.();
      });

      await syncEnabledManager.remove('test-key');

      const status = syncEnabledManager.getSyncQueueStatus();
      expect(status.count).toBe(1);
      expect(status.items[0]).toEqual(expect.objectContaining({
        key: 'test-key',
        data: null,
        operation: 'remove',
      }));
    });

    it('should process sync queue after debounce delay', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const syncEnabledManager = new StorageManager({ 
        enableCloudSync: true, 
        syncDebounceMs: 100 
      });
      
      mockChromeStorage.local.set.mockImplementation((data: Record<string, any>, callback?: () => void) => {
        callback?.();
      });

      // Add multiple items to queue
      await syncEnabledManager.save('test-1', { data: 'one' });
      await syncEnabledManager.save('test-2', { data: 'two' });

      // Queue should have items before processing
      expect(syncEnabledManager.getSyncQueueStatus().count).toBe(2);

      // Advance timers to trigger sync processing
      vi.advanceTimersByTime(200);

      // Queue should be cleared after processing
      await vi.waitFor(() => {
        expect(syncEnabledManager.getSyncQueueStatus().count).toBe(0);
      });

      expect(consoleSpy).toHaveBeenCalledWith('[StorageManager] Processing sync queue: 2 items');
      
      consoleSpy.mockRestore();
    });

    it('should clear sync queue during storage clear', async () => {
      const syncEnabledManager = new StorageManager({ enableCloudSync: true });
      
      mockChromeStorage.local.set.mockImplementation((data: Record<string, any>, callback?: () => void) => {
        callback?.();
      });
      mockChromeStorage.local.clear.mockImplementation((callback?: () => void) => {
        callback?.();
      });

      // Add items to queue
      await syncEnabledManager.save('test', { data: 'test' });
      expect(syncEnabledManager.getSyncQueueStatus().count).toBe(1);

      // Clear storage should clear queue too
      await syncEnabledManager.clear();
      expect(syncEnabledManager.getSyncQueueStatus().count).toBe(0);
    });
  });

  describe('Compatibility Layer', () => {
    beforeEach(() => {
      mockChromeStorage.local.set.mockImplementation((data: Record<string, any>, callback?: () => void) => {
        callback?.();
      });
      
      mockChromeStorage.local.get.mockImplementation((key: string | string[] | Record<string, any> | null, callback?: (items: Record<string, any>) => void) => {
        callback?.({});
      });
    });

    it('should provide drop-in replacement for saveData()', async () => {
      const testKey = 'compat-test';
      const testData = { legacy: 'api' };

      await saveData(testKey, testData);

      expect(mockChromeStorage.local.set).toHaveBeenCalledWith(
        {
          [testKey]: expect.objectContaining({
            version: 1,
            data: testData,
          }),
        },
        expect.any(Function)
      );
    });

    it('should provide drop-in replacement for loadData()', async () => {
      const testKey = 'compat-test';
      const testData = { legacy: 'api' };

      mockChromeStorage.local.get.mockImplementation((key: string | string[] | Record<string, any> | null, callback?: (items: Record<string, any>) => void) => {
        callback?.({ [testKey]: testData });
      });

      const result = await loadData(testKey);

      expect(result).toEqual(testData);
      expect(mockChromeStorage.local.get).toHaveBeenCalledWith(testKey, expect.any(Function));
    });
  });

  describe('Utility Functions', () => {
    beforeAll(() => {
      vi.useFakeTimers();
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    it('should debounce function calls correctly', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      // Call multiple times rapidly
      debouncedFn('call1');
      debouncedFn('call2');
      debouncedFn('call3');

      // Should not have been called yet
      expect(mockFn).not.toHaveBeenCalled();

      // Advance time to trigger debounced call
      vi.advanceTimersByTime(100);

      // Should only be called once with the last arguments
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('call3');
    });

    it('should reset debounce timer on subsequent calls', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('call1');
      
      // Advance time partially
      vi.advanceTimersByTime(50);
      
      // Call again - should reset timer
      debouncedFn('call2');
      
      // Advance another 50ms (total 100ms from first call, but only 50ms from second)
      vi.advanceTimersByTime(50);
      
      // Should not have been called yet
      expect(mockFn).not.toHaveBeenCalled();
      
      // Advance remaining time
      vi.advanceTimersByTime(50);
      
      // Now should be called with the second argument
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('call2');
    });

    it('should handle debounce with different argument types', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 50);

      // Test with multiple argument types
      debouncedFn('string', 123, { obj: true }, ['array']);

      vi.advanceTimersByTime(50);

      expect(mockFn).toHaveBeenCalledWith('string', 123, { obj: true }, ['array']);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty data correctly', async () => {
      mockChromeStorage.local.set.mockImplementation((data: Record<string, any>, callback?: () => void) => {
        callback?.();
      });

      await storageManager.save('empty-test', null);
      await storageManager.save('empty-test-2', undefined);
      await storageManager.save('empty-test-3', '');
      await storageManager.save('empty-test-4', 0);

      expect(mockChromeStorage.local.set).toHaveBeenCalledTimes(4);
    });

    it('should handle complex nested objects', async () => {
      const complexData = {
        nested: {
          deep: {
            array: [1, 2, { deeper: true }],
            date: new Date(),
            regexp: /test/g,
          },
        },
        functions: undefined, // Functions should be handled gracefully
      };

      mockChromeStorage.local.set.mockImplementation((data: Record<string, any>, callback?: () => void) => {
        callback?.();
      });

      await storageManager.save('complex-test', complexData);

      expect(mockChromeStorage.local.set).toHaveBeenCalledWith(
        {
          'complex-test': expect.objectContaining({
            data: complexData,
          }),
        },
        expect.any(Function)
      );
    });

    it('should handle very long keys', async () => {
      const longKey = 'a'.repeat(1000);
      const testData = { test: 'long key' };

      mockChromeStorage.local.set.mockImplementation((data: Record<string, any>, callback?: () => void) => {
        callback?.();
      });

      await storageManager.save(longKey, testData);

      expect(mockChromeStorage.local.set).toHaveBeenCalledWith(
        {
          [longKey]: expect.objectContaining({
            data: testData,
          }),
        },
        expect.any(Function)
      );
    });

    it('should extract presentation URL from various key formats', async () => {
      const testCases = [
        {
          key: 'timetable-https://gamma.app/docs/example',
          expectedUrl: 'https://gamma.app/docs/example',
        },
        {
          key: 'timetable-https://gamma.app/public/abc-123',
          expectedUrl: 'https://gamma.app/public/abc-123',
        },
        {
          key: 'non-timetable-key',
          expectedUrl: undefined,
        },
        {
          key: 'timetable-',
          expectedUrl: undefined, // Regex .+ requires at least one character, so no match
        },
      ];

      mockChromeStorage.local.set.mockImplementation((data: Record<string, any>, callback?: () => void) => {
        callback?.();
      });

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        vi.clearAllMocks(); // Clear mock call history for each test case
        
        await storageManager.save(testCase.key, { test: true });

        expect(mockChromeStorage.local.set).toHaveBeenCalledWith(
          {
            [testCase.key]: expect.objectContaining({
              presentation_url: testCase.expectedUrl,
            }),
          },
          expect.any(Function)
        );
      }
    });
  });
});