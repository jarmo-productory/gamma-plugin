/**
 * Configuration Management System
 *
 * Provides feature flags and configuration management for the Gamma Timetable Extension
 * Sprint 0: All cloud/auth features disabled by default
 * Future Sprints: Enable features gradually with flags
 */

import { StorageManager } from '../storage';

// Feature flag definitions
export interface FeatureFlags {
  // Authentication features (Sprint 1+)
  authentication: boolean;
  userProfiles: boolean;
  sessionManagement: boolean;

  // Cloud sync features (Sprint 2+)
  cloudSync: boolean;
  autoSync: boolean;
  syncQueue: boolean;
  conflictResolution: boolean;

  // Real-time features (Sprint 3+)
  realTimeSync: boolean;
  collaborativeEditing: boolean;
  liveUpdates: boolean;

  // Advanced features (Sprint 4+)
  advancedSearch: boolean;
  dataVersioning: boolean;
  exportHistory: boolean;
  bulkOperations: boolean;

  // Current functionality (always enabled)
  offlineMode: boolean;
  localStorage: boolean;
  exportFeatures: boolean;
  basicUI: boolean;

  // Development/debugging features
  debugMode: boolean;
  loggingEnabled: boolean;
  performanceMetrics: boolean;
}

// Environment-based configuration
export interface EnvironmentConfig {
  environment: 'development' | 'staging' | 'production';
  apiBaseUrl?: string;
  webBaseUrl?: string;
  clerkPublishableKey?: string;
  enableAnalytics: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxStorageSize: number; // in MB
  syncIntervalMs: number;
}

// User preference configuration
export interface UserConfig {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  exportFormat: 'xlsx' | 'csv';
  notifications: boolean;
  autoSave: boolean;
  syncOnStartup: boolean;
}

// Complete configuration object
export interface AppConfig {
  features: FeatureFlags;
  environment: EnvironmentConfig;
  user: UserConfig;
  version: string;
  lastUpdated: string;
}

// Default configuration for Sprint 1
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  // Authentication features - ENABLED in Sprint 1
  authentication: true,
  userProfiles: false,
  sessionManagement: false,

  // Cloud sync features - DISABLED in Sprint 0
  cloudSync: false,
  autoSync: false,
  syncQueue: false,
  conflictResolution: false,

  // Real-time features - DISABLED in Sprint 0
  realTimeSync: false,
  collaborativeEditing: false,
  liveUpdates: false,

  // Advanced features - DISABLED in Sprint 0
  advancedSearch: false,
  dataVersioning: false,
  exportHistory: false,
  bulkOperations: false,

  // Current functionality - ALWAYS ENABLED
  offlineMode: true,
  localStorage: true,
  exportFeatures: true,
  basicUI: true,

  // Development features - Enable in dev mode
  debugMode: true,
  loggingEnabled: true,
  performanceMetrics: false,
};

export const DEFAULT_ENVIRONMENT_CONFIG: EnvironmentConfig = {
  environment: 'production',
  apiBaseUrl: 'http://localhost:3000',
  webBaseUrl: 'http://localhost:3000',
  enableAnalytics: false,
  logLevel: 'info',
  maxStorageSize: 50, // 50MB
  syncIntervalMs: 30000, // 30 seconds
};

export const DEFAULT_USER_CONFIG: UserConfig = {
  theme: 'auto',
  language: 'en',
  exportFormat: 'xlsx',
  notifications: false,
  autoSave: true,
  syncOnStartup: false, // No sync in Sprint 0
};

/**
 * ConfigManager handles feature flags and configuration
 *
 * Sprint 0: Manages local feature flags, all cloud features disabled
 * Sprint 1+: Adds remote config sync and user-specific feature toggles
 */
export class ConfigManager {
  private storage: StorageManager;
  private config: AppConfig | null = null;
  private listeners: Set<(config: AppConfig) => void> = new Set();

  constructor(storage?: StorageManager) {
    this.storage = storage || new StorageManager();
  }

  /**
   * Initialize configuration system
   * Loads existing config or creates default
   */
  async initialize(): Promise<void> {
    try {
      const stored = await this.storage.load('app_config_v3');

      if (stored && this.isValidConfig(stored)) {
        // Load existing config and apply migrations/default merging
        this.config = this.applyMigrationsAndMergeDefaults(stored);
        await this.saveConfig();
        console.log(
          '[ConfigManager] Loaded existing configuration (with migrations/defaults applied)'
        );
      } else {
        // Create default configuration
        this.config = this.createDefaultConfig();
        await this.saveConfig();
        console.log('[ConfigManager] Created default configuration');
      }

      // Notify listeners of initial config
      this.notifyListeners();
    } catch (error) {
      console.error('[ConfigManager] Failed to initialize:', error);
      // Fall back to default config
      this.config = this.createDefaultConfig();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AppConfig {
    if (!this.config) {
      return this.createDefaultConfig();
    }
    return { ...this.config };
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    const config = this.getConfig();
    return config.features[feature] || false;
  }

  /**
   * Update feature flags
   * Sprint 0: Only allows enabling/disabling dev features
   * Sprint 1+: Allows user to control preference-based features
   */
  async updateFeatureFlags(updates: Partial<FeatureFlags>): Promise<void> {
    const config = this.getConfig();

    // Sprint 0: Only allow certain features to be modified
    const allowedUpdates: Partial<FeatureFlags> = {};
    const modifiableFeatures: (keyof FeatureFlags)[] = [
      'debugMode',
      'loggingEnabled',
      'performanceMetrics',
    ];

    // Filter updates to only allowed features in Sprint 0
    for (const [key, value] of Object.entries(updates)) {
      if (modifiableFeatures.includes(key as keyof FeatureFlags) && typeof value === 'boolean') {
        allowedUpdates[key as keyof FeatureFlags] = value;
      } else if (modifiableFeatures.includes(key as keyof FeatureFlags)) {
        console.warn(`[ConfigManager] Feature '${key}' must be boolean value`);
      } else {
        console.warn(`[ConfigManager] Feature '${key}' cannot be modified in Sprint 0`);
      }
    }

    config.features = { ...config.features, ...allowedUpdates };
    config.lastUpdated = new Date().toISOString();

    this.config = config;
    await this.saveConfig();
    this.notifyListeners();
  }

  /**
   * Update user configuration
   */
  async updateUserConfig(updates: Partial<UserConfig>): Promise<void> {
    const config = this.getConfig();
    config.user = { ...config.user, ...updates };
    config.lastUpdated = new Date().toISOString();

    this.config = config;
    await this.saveConfig();
    this.notifyListeners();
  }

  /**
   * Update environment configuration
   * Sprint 0: Limited to safe changes
   */
  async updateEnvironmentConfig(updates: Partial<EnvironmentConfig>): Promise<void> {
    const config = this.getConfig();

    // Sprint 0: Only allow safe environment updates
    const safeUpdates: Partial<EnvironmentConfig> = {};
    const safeFields: (keyof EnvironmentConfig)[] = [
      'logLevel',
      'maxStorageSize',
      'enableAnalytics',
      'syncIntervalMs',
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (safeFields.includes(key as keyof EnvironmentConfig)) {
        (safeUpdates as any)[key] = value;
      } else {
        console.warn(`[ConfigManager] Environment setting '${key}' cannot be modified in Sprint 0`);
      }
    }

    config.environment = { ...config.environment, ...safeUpdates };
    config.lastUpdated = new Date().toISOString();

    this.config = config;
    await this.saveConfig();
    this.notifyListeners();
  }

  /**
   * Get feature flags for UI display
   */
  getUIFeatureStatus(): { [key: string]: { enabled: boolean; reason: string } } {
    const config = this.getConfig();
    const status: { [key: string]: { enabled: boolean; reason: string } } = {};

    for (const [feature, enabled] of Object.entries(config.features)) {
      let reason = enabled ? 'Feature enabled' : 'Feature disabled';

      // Sprint 0 specific reasons
      if (!enabled) {
        if (['authentication', 'userProfiles', 'sessionManagement'].includes(feature)) {
          reason = 'Available in Sprint 1';
        } else if (['cloudSync', 'autoSync', 'syncQueue', 'conflictResolution'].includes(feature)) {
          reason = 'Available in Sprint 2';
        } else if (['realTimeSync', 'collaborativeEditing', 'liveUpdates'].includes(feature)) {
          reason = 'Available in Sprint 3';
        } else if (
          ['advancedSearch', 'dataVersioning', 'exportHistory', 'bulkOperations'].includes(feature)
        ) {
          reason = 'Available in Sprint 4';
        }
      }

      status[feature] = { enabled, reason };
    }

    return status;
  }

  /**
   * Add configuration change listener
   */
  addConfigListener(listener: (config: AppConfig) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove configuration change listener
   */
  removeConfigListener(listener: (config: AppConfig) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Reset configuration to defaults
   */
  async resetToDefaults(): Promise<void> {
    this.config = this.createDefaultConfig();
    await this.saveConfig();
    this.notifyListeners();
    console.log('[ConfigManager] Configuration reset to defaults');
  }

  /**
   * Get configuration for specific component/feature
   */
  getFeatureConfig<T = any>(feature: string): T | null {
    const config = this.getConfig();

    // Define feature-specific config mappings
    const featureConfigs: { [key: string]: any } = {
      storage: {
        maxSize: config.environment.maxStorageSize,
        enableSync: config.features.cloudSync,
        localOnly: !config.features.cloudSync,
      },
      auth: {
        enabled: config.features.authentication,
        sessionTimeout: 3600000, // 1 hour
        requireAuth: false, // Always false in Sprint 0
      },
      sync: {
        enabled: config.features.autoSync,
        interval: config.environment.syncIntervalMs,
        queueEnabled: config.features.syncQueue,
      },
      ui: {
        theme: config.user.theme,
        language: config.user.language,
        notifications: config.user.notifications,
      },
      export: {
        enabled: config.features.exportFeatures,
        defaultFormat: config.user.exportFormat,
        historyEnabled: config.features.exportHistory,
      },
    };

    return featureConfigs[feature] || null;
  }

  /**
   * Private helper methods
   */
  private createDefaultConfig(): AppConfig {
    console.log('[ConfigManager] Creating a new default configuration object.'); // Added for debugging
    return {
      features: { ...DEFAULT_FEATURE_FLAGS },
      environment: { ...DEFAULT_ENVIRONMENT_CONFIG },
      user: { ...DEFAULT_USER_CONFIG },
      version: '0.0.7',
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Apply lightweight migrations and ensure new defaults are merged
   * This is used to progressively turn on Sprint-level features (e.g., authentication in Sprint 1)
   */
  private applyMigrationsAndMergeDefaults(existing: AppConfig): AppConfig {
    const merged: AppConfig = {
      ...existing,
      features: {
        // Prefer stored values, but ensure new flags exist
        ...DEFAULT_FEATURE_FLAGS,
        ...existing.features,
      },
      environment: {
        ...DEFAULT_ENVIRONMENT_CONFIG,
        ...existing.environment,
      },
      user: {
        ...DEFAULT_USER_CONFIG,
        ...existing.user,
      },
      version: existing.version || '0.0.7',
      lastUpdated: new Date().toISOString(),
    };

    // Sprint 1 migration: ensure authentication feature is enabled by default
    // If previous configs had it disabled (Sprint 0), enable it now
    if (DEFAULT_FEATURE_FLAGS.authentication && !merged.features.authentication) {
      merged.features.authentication = true;
    }

    return merged;
  }

  private async saveConfig(): Promise<void> {
    if (!this.config) return;

    try {
      await this.storage.save('app_config_v3', this.config); // Changed to v3
    } catch (error) {
      console.error('[ConfigManager] Failed to save configuration:', error);
      throw error;
    }
  }

  private isValidConfig(config: any): config is AppConfig {
    return (
      config &&
      typeof config === 'object' &&
      config.features &&
      config.environment &&
      config.user &&
      config.version &&
      config.lastUpdated
    );
  }

  private notifyListeners(): void {
    if (!this.config) return;

    this.listeners.forEach(listener => {
      try {
        listener(this.config!);
      } catch (error) {
        console.error('[ConfigManager] Error in config listener:', error);
      }
    });
  }
}

// Export a default instance for easy use
export const configManager = new ConfigManager();
