/**
 * Pair Command
 * Exchanges device code for access token
 */

import { DeviceAuth } from '../auth/device-auth-wrapper.js';
import { FileStorageManager } from '../storage/file-storage.js';
import { logger } from '../utils/logger.js';
import { getEnvironmentConfig } from '../config/environment.js';

export async function pairCommand(options: { env: 'local' | 'production' }): Promise<void> {
  try {
    const config = getEnvironmentConfig(options.env);
    const storage = new FileStorageManager();
    const deviceAuth = new DeviceAuth(storage);

    logger.section(`Pair Device (${options.env})`);

    // Get stored device info
    const deviceInfo = await deviceAuth.getStoredDeviceInfo();
    if (!deviceInfo) {
      logger.error('No device registration found. Run: npm run simulator -- register --env ' + options.env);
      return;
    }

    logger.info('Device ID: ' + deviceInfo.deviceId);
    logger.info('Polling for user authorization...');

    // Poll for token
    const token = await deviceAuth.pollExchangeUntilLinked(
      config.apiBaseUrl,
      deviceInfo.deviceId,
      deviceInfo.code,
      {
        intervalMs: 2500,
        maxWaitMs: 5 * 60 * 1000, // 5 minutes
      }
    );

    if (!token) {
      logger.error('Pairing timeout. User did not authorize within 5 minutes.');
      return;
    }

    logger.success('Device paired successfully!');
    logger.kv('Token received', token.token.substring(0, 20) + '...');
    logger.kv('Expires', new Date(token.expiresAt).toLocaleString());
  } catch (error) {
    logger.error('Pairing failed:', error);
    throw error;
  }
}
