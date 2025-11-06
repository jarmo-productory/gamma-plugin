/**
 * Environment Configuration
 * Loads environment-specific settings from .env files
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from simulator root
config({ path: join(__dirname, '../../.env') });

export interface EnvironmentConfig {
  environment: 'development' | 'staging' | 'production';
  apiBaseUrl: string;
  webBaseUrl: string;
  enableAnalytics: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxStorageSize: number;
  syncIntervalMs: number;
}

/**
 * Local/Development environment configuration
 */
const LOCAL_CONFIG: EnvironmentConfig = {
  environment: 'development',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  webBaseUrl: process.env.WEB_BASE_URL || 'http://localhost:3000',
  enableAnalytics: false,
  logLevel: 'debug',
  maxStorageSize: 50,
  syncIntervalMs: 30000,
};

/**
 * Production environment configuration
 */
const PRODUCTION_CONFIG: EnvironmentConfig = {
  environment: 'production',
  apiBaseUrl: 'https://productory-powerups.netlify.app',
  webBaseUrl: 'https://productory-powerups.netlify.app',
  enableAnalytics: false,
  logLevel: 'info',
  maxStorageSize: 50,
  syncIntervalMs: 30000,
};

/**
 * Get configuration for specified environment
 */
export function getEnvironmentConfig(env: 'local' | 'production' = 'local'): EnvironmentConfig {
  return env === 'production' ? PRODUCTION_CONFIG : LOCAL_CONFIG;
}

/**
 * Debug mode flag
 */
export const DEBUG_MODE = process.env.DEBUG === 'true';

/**
 * Logging enabled flag
 */
export const LOGGING_ENABLED = true;
