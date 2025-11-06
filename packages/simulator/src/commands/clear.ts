/**
 * Clear Command
 * Clears all storage data
 */

import { FileStorageManager } from '../storage/file-storage.js';
import { logger } from '../utils/logger.js';

export async function clearCommand(): Promise<void> {
  try {
    const storage = new FileStorageManager();

    logger.section('Clear Storage');
    logger.warn('This will delete all stored data including device registration and tokens.');

    const allData = await storage.getAll();
    const count = Object.keys(allData).length;

    if (count === 0) {
      logger.info('Storage is already empty');
      return;
    }

    await storage.clear();
    logger.success(`Cleared ${count} item(s) from storage`);
  } catch (error) {
    logger.error('Clear failed:', error);
    throw error;
  }
}
