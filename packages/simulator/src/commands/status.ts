/**
 * Status Command
 * Shows current authentication and storage status
 */

import { DeviceAuth } from '../auth/device-auth-wrapper.js';
import { FileStorageManager } from '../storage/file-storage.js';
import { logger } from '../utils/logger.js';
import { getEnvironmentConfig } from '../config/environment.js';

export async function statusCommand(options: { env: 'local' | 'production' }): Promise<void> {
  try {
    const config = getEnvironmentConfig(options.env);
    const storage = new FileStorageManager();
    const deviceAuth = new DeviceAuth(storage);

    logger.section(`Status (${options.env})`);

    // Device info
    const deviceInfo = await deviceAuth.getStoredDeviceInfo();
    if (deviceInfo) {
      logger.info('Device Registration:');
      logger.kv('  Device ID', deviceInfo.deviceId);
      logger.kv('  Code', deviceInfo.code);
      logger.kv('  Expires', new Date(deviceInfo.expiresAt).toLocaleString());

      const isExpired = Date.parse(deviceInfo.expiresAt) < Date.now();
      logger.kv('  Status', isExpired ? 'EXPIRED' : 'ACTIVE');
    } else {
      logger.warn('No device registration found');
    }

    console.log('');

    // Token info
    const token = await deviceAuth.getStoredToken();
    if (token) {
      logger.info('Authentication Token:');
      logger.kv('  Token', token.token.substring(0, 30) + '...');
      logger.kv('  Expires', new Date(token.expiresAt).toLocaleString());

      const isExpired = Date.parse(token.expiresAt) < Date.now();
      logger.kv('  Status', isExpired ? 'EXPIRED' : 'VALID');

      if (!isExpired) {
        logger.success('Authenticated and ready to use!');
      }
    } else {
      logger.warn('Not authenticated - no token found');
    }

    console.log('');

    // Storage data
    const allData = await storage.getAll();
    const keys = Object.keys(allData);
    logger.info(`Storage: ${keys.length} item(s)`);
    if (keys.length > 0) {
      keys.forEach(key => {
        logger.kv('  ' + key, typeof allData[key] === 'object' ? '{...}' : allData[key]);
      });
    }
  } catch (error) {
    logger.error('Status check failed:', error);
    throw error;
  }
}
