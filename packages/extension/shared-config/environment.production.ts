/**
 * Production Environment Configuration
 */

export interface EnvironmentConfig {
  environment: 'development' | 'staging' | 'production';
  apiBaseUrl?: string;
  webBaseUrl?: string;
  clerkPublishableKey?: string;
  enableAnalytics: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxStorageSize: number;
  syncIntervalMs: number;
}

export const ENVIRONMENT_CONFIG: EnvironmentConfig = {
  environment: 'production',
  apiBaseUrl: 'https://productory-powerups.netlify.app',
  webBaseUrl: 'https://productory-powerups.netlify.app',
  enableAnalytics: false,
  logLevel: 'info',
  maxStorageSize: 50,
  syncIntervalMs: 30000,
};

export const DEBUG_MODE = false;
export const LOGGING_ENABLED = false;
