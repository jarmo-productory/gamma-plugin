/**
 * Register Command
 * Registers a new device with the API
 */

import { DeviceAuth } from '../auth/device-auth-wrapper.js';
import { FileStorageManager } from '../storage/file-storage.js';
import { logger } from '../utils/logger.js';
import { getEnvironmentConfig } from '../config/environment.js';

export async function registerCommand(options: { env: 'local' | 'production' }): Promise<void> {
  try {
    const config = getEnvironmentConfig(options.env);
    const storage = new FileStorageManager();
    const deviceAuth = new DeviceAuth(storage);

    logger.section(`Register Device (${options.env})`);
    logger.info(`API: ${config.apiBaseUrl}`);

    // Register device
    logger.info('Registering device...');
    const deviceInfo = await deviceAuth.registerDevice(config.apiBaseUrl);

    logger.success('Device registered successfully!');
    logger.kv('Device ID', deviceInfo.deviceId);
    logger.kv('Code', deviceInfo.code);
    logger.kv('Expires', new Date(deviceInfo.expiresAt).toLocaleString());

    // Build sign-in URL
    const signInUrl = deviceAuth.buildSignInUrl(config.webBaseUrl, deviceInfo.code);
    logger.kv('Sign-in URL', signInUrl);

    console.log('\n' + logger.info('Next steps:') + '\n');
    console.log('1. Open the sign-in URL in your browser');
    console.log('2. Complete authentication');
    console.log('3. Run: npm run simulator -- pair --env ' + options.env);
  } catch (error) {
    logger.error('Registration failed:', error);
    throw error;
  }
}
