/**
 * Local/Development Environment Configuration
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
  environment: 'development',
  apiBaseUrl: 'http://localhost:3000',
  webBaseUrl: 'http://localhost:3000',
  enableAnalytics: false,
  logLevel: 'debug',
  maxStorageSize: 50,
  syncIntervalMs: 30000,
};

export const DEBUG_MODE = true;
export const LOGGING_ENABLED = true;
