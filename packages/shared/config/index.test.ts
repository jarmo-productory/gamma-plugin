/**
 * Tests for Configuration Management System
 * 
 * Testing Strategy:
 * 1. Pure functions first (highest ROI)
 * 2. Business logic validation
 * 3. Edge cases and error handling
 * 4. Integration with storage layer (mocked)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  ConfigManager, 
  DEFAULT_FEATURE_FLAGS, 
  DEFAULT_ENVIRONMENT_CONFIG, 
  DEFAULT_USER_CONFIG,
  type FeatureFlags,
  type UserConfig,
  type EnvironmentConfig 
} from './index';
import { StorageManager } from '../storage';

// Mock the storage module
vi.mock('../storage', () => ({
  StorageManager: vi.fn().mockImplementation(() => ({
    load: vi.fn(),
    save: vi.fn(),
  })),
}));

describe('Configuration Management System', () => {
  let configManager: ConfigManager;
  let mockStorage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = {
      load: vi.fn(),
      save: vi.fn(),
    };
    configManager = new ConfigManager(mockStorage);
  });

  describe('Default Configuration Values', () => {
    it('should have correct Sprint 1 feature flags', () => {
      // Sprint 1: Authentication enabled, cloud features disabled
      expect(DEFAULT_FEATURE_FLAGS.authentication).toBe(true);
      expect(DEFAULT_FEATURE_FLAGS.cloudSync).toBe(false);
      expect(DEFAULT_FEATURE_FLAGS.autoSync).toBe(false);
      
      // Core functionality always enabled
      expect(DEFAULT_FEATURE_FLAGS.offlineMode).toBe(true);
      expect(DEFAULT_FEATURE_FLAGS.localStorage).toBe(true);
      expect(DEFAULT_FEATURE_FLAGS.exportFeatures).toBe(true);
    });

    it('should have development-appropriate environment defaults', () => {
      expect(DEFAULT_ENVIRONMENT_CONFIG.environment).toBe('production');
      expect(DEFAULT_ENVIRONMENT_CONFIG.apiBaseUrl).toBe('http://localhost:3000');
      expect(DEFAULT_ENVIRONMENT_CONFIG.logLevel).toBe('info');
      expect(DEFAULT_ENVIRONMENT_CONFIG.maxStorageSize).toBe(50);
    });

    it('should have sensible user defaults', () => {
      expect(DEFAULT_USER_CONFIG.theme).toBe('auto');
      expect(DEFAULT_USER_CONFIG.exportFormat).toBe('xlsx');
      expect(DEFAULT_USER_CONFIG.autoSave).toBe(true);
      expect(DEFAULT_USER_CONFIG.syncOnStartup).toBe(false);
    });
  });

  describe('ConfigManager Initialization', () => {
    it('should create default config when no stored config exists', async () => {
      mockStorage.load.mockResolvedValue(null);
      
      await configManager.initialize();
      
      const config = configManager.getConfig();
      expect(config.features).toEqual(DEFAULT_FEATURE_FLAGS);
      expect(config.environment).toEqual(DEFAULT_ENVIRONMENT_CONFIG);
      expect(config.user).toEqual(DEFAULT_USER_CONFIG);
      expect(config.version).toBeDefined();
      expect(config.lastUpdated).toBeDefined();
      
      expect(mockStorage.save).toHaveBeenCalledWith('app_config_v3', expect.objectContaining({
        features: DEFAULT_FEATURE_FLAGS,
        environment: DEFAULT_ENVIRONMENT_CONFIG,
        user: DEFAULT_USER_CONFIG,
      }));
    });

    it('should load and migrate existing valid config', async () => {
      const existingConfig = {
        features: { ...DEFAULT_FEATURE_FLAGS, authentication: false }, // Old Sprint 0 config
        environment: { ...DEFAULT_ENVIRONMENT_CONFIG, logLevel: 'debug' as const },
        user: { ...DEFAULT_USER_CONFIG, theme: 'dark' as const },
        version: '0.0.6',
        lastUpdated: '2024-01-01T00:00:00Z',
      };
      
      mockStorage.load.mockResolvedValue(existingConfig);
      
      await configManager.initialize();
      
      const config = configManager.getConfig();
      
      // Should migrate authentication to true (Sprint 1 migration)
      expect(config.features.authentication).toBe(true);
      
      // Should preserve user preferences
      expect(config.environment.logLevel).toBe('debug');
      expect(config.user.theme).toBe('dark');
      
      // Should merge new default features
      expect(config.features.offlineMode).toBe(true);
      expect(config.features.exportFeatures).toBe(true);
    });

    it('should fallback to defaults when stored config is invalid', async () => {
      mockStorage.load.mockResolvedValue({ invalid: 'config' });
      
      await configManager.initialize();
      
      const config = configManager.getConfig();
      expect(config.features).toEqual(DEFAULT_FEATURE_FLAGS);
    });

    it('should handle storage errors gracefully', async () => {
      mockStorage.load.mockRejectedValue(new Error('Storage error'));
      
      await expect(configManager.initialize()).resolves.not.toThrow();
      
      const config = configManager.getConfig();
      expect(config.features).toEqual(DEFAULT_FEATURE_FLAGS);
    });
  });

  describe('Feature Flag Management', () => {
    beforeEach(async () => {
      mockStorage.load.mockResolvedValue(null);
      await configManager.initialize();
    });

    it('should correctly check if features are enabled', () => {
      expect(configManager.isFeatureEnabled('authentication')).toBe(true);
      expect(configManager.isFeatureEnabled('cloudSync')).toBe(false);
      expect(configManager.isFeatureEnabled('offlineMode')).toBe(true);
    });

    it('should allow updating modifiable dev features only in Sprint 1', async () => {
      await configManager.updateFeatureFlags({
        debugMode: false,
        loggingEnabled: false,
        performanceMetrics: true,
      });
      
      const config = configManager.getConfig();
      expect(config.features.debugMode).toBe(false);
      expect(config.features.loggingEnabled).toBe(false);
      expect(config.features.performanceMetrics).toBe(true);
      
      expect(mockStorage.save).toHaveBeenCalledTimes(2); // Once during init, once during update
    });

    it('should prevent modifying protected features in Sprint 1', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      await configManager.updateFeatureFlags({
        cloudSync: true, // Should be blocked
        authentication: false, // Should be blocked
        debugMode: false, // Should be allowed
      } as Partial<FeatureFlags>);
      
      const config = configManager.getConfig();
      expect(config.features.cloudSync).toBe(false); // Unchanged
      expect(config.features.authentication).toBe(true); // Unchanged
      expect(config.features.debugMode).toBe(false); // Changed
      
      expect(consoleSpy).toHaveBeenCalledWith("[ConfigManager] Feature 'cloudSync' cannot be modified in Sprint 0");
      expect(consoleSpy).toHaveBeenCalledWith("[ConfigManager] Feature 'authentication' cannot be modified in Sprint 0");
      
      consoleSpy.mockRestore();
    });

    it('should validate feature flag types', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      await configManager.updateFeatureFlags({
        debugMode: 'invalid' as any,
      });
      
      const config = configManager.getConfig();
      expect(config.features.debugMode).toBe(true); // Unchanged
      
      expect(consoleSpy).toHaveBeenCalledWith("[ConfigManager] Feature 'debugMode' must be boolean value");
      
      consoleSpy.mockRestore();
    });
  });

  describe('User Configuration Management', () => {
    beforeEach(async () => {
      mockStorage.load.mockResolvedValue(null);
      await configManager.initialize();
    });

    it('should update user preferences', async () => {
      const updates: Partial<UserConfig> = {
        theme: 'dark',
        exportFormat: 'csv',
        notifications: true,
      };
      
      await configManager.updateUserConfig(updates);
      
      const config = configManager.getConfig();
      expect(config.user.theme).toBe('dark');
      expect(config.user.exportFormat).toBe('csv');
      expect(config.user.notifications).toBe(true);
      
      // Should preserve other user settings
      expect(config.user.language).toBe('en');
      expect(config.user.autoSave).toBe(true);
    });

    it('should update lastUpdated timestamp on user config changes', async () => {
      const beforeUpdate = new Date().toISOString();
      
      await configManager.updateUserConfig({ theme: 'dark' });
      
      const config = configManager.getConfig();
      expect(new Date(config.lastUpdated).getTime()).toBeGreaterThanOrEqual(new Date(beforeUpdate).getTime());
    });
  });

  describe('Environment Configuration Management', () => {
    beforeEach(async () => {
      mockStorage.load.mockResolvedValue(null);
      await configManager.initialize();
    });

    it('should allow updating safe environment settings', async () => {
      const updates: Partial<EnvironmentConfig> = {
        logLevel: 'debug',
        maxStorageSize: 100,
        enableAnalytics: true,
        syncIntervalMs: 60000,
      };
      
      await configManager.updateEnvironmentConfig(updates);
      
      const config = configManager.getConfig();
      expect(config.environment.logLevel).toBe('debug');
      expect(config.environment.maxStorageSize).toBe(100);
      expect(config.environment.enableAnalytics).toBe(true);
      expect(config.environment.syncIntervalMs).toBe(60000);
    });

    it('should prevent updating protected environment settings', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      await configManager.updateEnvironmentConfig({
        environment: 'development' as const,
        apiBaseUrl: 'https://malicious.com',
        clerkPublishableKey: 'pk_malicious',
      } as Partial<EnvironmentConfig>);
      
      const config = configManager.getConfig();
      expect(config.environment.environment).toBe('production'); // Unchanged
      expect(config.environment.apiBaseUrl).toBe('http://localhost:3000'); // Unchanged
      
      expect(consoleSpy).toHaveBeenCalledWith("[ConfigManager] Environment setting 'environment' cannot be modified in Sprint 0");
      expect(consoleSpy).toHaveBeenCalledWith("[ConfigManager] Environment setting 'apiBaseUrl' cannot be modified in Sprint 0");
      
      consoleSpy.mockRestore();
    });
  });

  describe('Feature-Specific Configuration', () => {
    beforeEach(async () => {
      mockStorage.load.mockResolvedValue(null);
      await configManager.initialize();
    });

    it('should provide storage-specific configuration', () => {
      const storageConfig = configManager.getFeatureConfig('storage');
      
      expect(storageConfig).toEqual({
        maxSize: 50,
        enableSync: false,
        localOnly: true,
      });
    });

    it('should provide auth-specific configuration', () => {
      const authConfig = configManager.getFeatureConfig('auth');
      
      expect(authConfig).toEqual({
        enabled: true,
        sessionTimeout: 3600000,
        requireAuth: false,
      });
    });

    it('should provide UI-specific configuration', () => {
      const uiConfig = configManager.getFeatureConfig('ui');
      
      expect(uiConfig).toEqual({
        theme: 'auto',
        language: 'en',
        notifications: false,
      });
    });

    it('should return null for unknown feature configs', () => {
      const unknownConfig = configManager.getFeatureConfig('unknown');
      expect(unknownConfig).toBeNull();
    });
  });

  describe('UI Feature Status', () => {
    beforeEach(async () => {
      mockStorage.load.mockResolvedValue(null);
      await configManager.initialize();
    });

    it('should provide Sprint-specific reasons for disabled features', () => {
      const status = configManager.getUIFeatureStatus();
      
      // Sprint 1 features
      expect(status.userProfiles).toEqual({
        enabled: false,
        reason: 'Available in Sprint 1',
      });
      
      // Sprint 2 features
      expect(status.cloudSync).toEqual({
        enabled: false,
        reason: 'Available in Sprint 2',
      });
      
      // Sprint 3 features
      expect(status.realTimeSync).toEqual({
        enabled: false,
        reason: 'Available in Sprint 3',
      });
      
      // Sprint 4 features
      expect(status.advancedSearch).toEqual({
        enabled: false,
        reason: 'Available in Sprint 4',
      });
      
      // Enabled features
      expect(status.authentication).toEqual({
        enabled: true,
        reason: 'Feature enabled',
      });
      
      expect(status.offlineMode).toEqual({
        enabled: true,
        reason: 'Feature enabled',
      });
    });
  });

  describe('Configuration Listeners', () => {
    beforeEach(async () => {
      mockStorage.load.mockResolvedValue(null);
      await configManager.initialize();
    });

    it('should notify listeners when configuration changes', async () => {
      const listener = vi.fn();
      
      configManager.addConfigListener(listener);
      
      await configManager.updateUserConfig({ theme: 'dark' });
      
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        user: expect.objectContaining({ theme: 'dark' }),
      }));
    });

    it('should handle listener errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const faultyListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      
      configManager.addConfigListener(faultyListener);
      
      await configManager.updateUserConfig({ theme: 'dark' });
      
      expect(consoleSpy).toHaveBeenCalledWith('[ConfigManager] Error in config listener:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should remove listeners correctly', async () => {
      const listener = vi.fn();
      
      configManager.addConfigListener(listener);
      configManager.removeConfigListener(listener);
      
      await configManager.updateUserConfig({ theme: 'dark' });
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Configuration Reset', () => {
    beforeEach(async () => {
      mockStorage.load.mockResolvedValue(null);
      await configManager.initialize();
    });

    it('should reset configuration to defaults', async () => {
      // First, modify the config
      await configManager.updateUserConfig({ theme: 'dark' });
      await configManager.updateFeatureFlags({ debugMode: false });
      
      // Then reset
      await configManager.resetToDefaults();
      
      const config = configManager.getConfig();
      expect(config.user.theme).toBe('auto');
      expect(config.features.debugMode).toBe(true);
      
      expect(mockStorage.save).toHaveBeenCalledWith('app_config_v3', expect.objectContaining({
        features: DEFAULT_FEATURE_FLAGS,
        user: DEFAULT_USER_CONFIG,
      }));
    });

    it('should notify listeners on reset', async () => {
      const listener = vi.fn();
      configManager.addConfigListener(listener);
      
      await configManager.resetToDefaults();
      
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        features: DEFAULT_FEATURE_FLAGS,
      }));
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should return default config when not initialized', () => {
      const uninitializedManager = new ConfigManager(mockStorage);
      const config = uninitializedManager.getConfig();
      
      expect(config.features).toEqual(DEFAULT_FEATURE_FLAGS);
      expect(config.environment).toEqual(DEFAULT_ENVIRONMENT_CONFIG);
      expect(config.user).toEqual(DEFAULT_USER_CONFIG);
    });

    it('should handle save failures gracefully', async () => {
      mockStorage.load.mockResolvedValue(null);
      mockStorage.save.mockRejectedValue(new Error('Save failed'));
      
      await configManager.initialize();
      
      await expect(configManager.updateUserConfig({ theme: 'dark' }))
        .rejects.toThrow('Save failed');
    });

    it('should validate configuration structure', async () => {
      const invalidConfigs = [
        null,
        undefined,
        'string',
        123,
        {},
        { features: null },
        { features: {}, environment: null },
      ];
      
      for (const invalidConfig of invalidConfigs) {
        mockStorage.load.mockResolvedValue(invalidConfig);
        await configManager.initialize();
        
        const config = configManager.getConfig();
        expect(config.features).toEqual(DEFAULT_FEATURE_FLAGS);
      }
    });
  });
});