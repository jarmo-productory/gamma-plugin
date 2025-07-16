/**
 * Configuration management system for the Gamma Timetable Extension
 * Implements feature flag system to control rollout of new features
 */

export interface FeatureFlags {
  cloudSync: boolean;
  authentication: boolean;
  webDashboard: boolean;
  autoSync: boolean;
  realTimeSync: boolean;
  offlineMode: boolean;
  exportFeatures: boolean;
}

export interface AppConfig {
  features: FeatureFlags;
  version: {
    current: string;
    minimumForCloud: string;
  };
  api?: {
    baseUrl: string;
    timeout: number;
  };
}

// Default configuration for Sprint 0
export const DEFAULT_CONFIG: AppConfig = {
  features: {
    cloudSync: false,           // Sprint 2
    authentication: false,      // Sprint 1  
    webDashboard: false,        // Sprint 2
    realTimeSync: false,        // Sprint 3
    autoSync: false,            // Sprint 3
    offlineMode: true,          // Always true (current behavior)
    exportFeatures: true        // Current functionality
  },
  version: {
    current: '0.0.5',
    minimumForCloud: '0.1.0'
  }
};

export class ConfigManager {
  private config: AppConfig;

  constructor(initialConfig?: Partial<AppConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...initialConfig };
  }

  getFeatureFlag(flag: keyof FeatureFlags): boolean {
    return this.config.features[flag];
  }

  setFeatureFlag(flag: keyof FeatureFlags, enabled: boolean): void {
    this.config.features[flag] = enabled;
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<AppConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return this.getFeatureFlag(feature);
  }

  // Environment-based configuration
  static getEnvironmentConfig(): Partial<AppConfig> {
    // For browser environment, assume production unless explicitly set
    const isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
    
    return {
      api: {
        baseUrl: isDevelopment ? 'http://localhost:3000' : 'https://api.gamma-timetable.app',
        timeout: 5000
      }
    };
  }
}

// Global config instance
export const config = new ConfigManager(ConfigManager.getEnvironmentConfig()); 