/**
 * File-based Storage Manager
 * Implements StorageManager interface from extension using file system
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORAGE_FILE = join(__dirname, '../../data/storage.json');

export interface IStorageManager {
  save(key: string, data: any): Promise<void>;
  load(key: string): Promise<any>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * File-based storage manager that's compatible with DeviceAuth
 * Uses chrome.storage mock which writes to files
 */
export class FileStorageManager implements IStorageManager {
  // DeviceAuth uses these methods which delegate to chrome.storage
  async save(key: string, data: any): Promise<void> {
    await chrome.storage.local.set({ [key]: data });
  }

  async load(key: string): Promise<any> {
    const result = await chrome.storage.local.get(key);
    return result[key];
  }

  async remove(key: string): Promise<void> {
    await chrome.storage.local.remove(key);
  }

  async clear(): Promise<void> {
    await chrome.storage.local.clear();
  }

  async getAll(): Promise<Record<string, any>> {
    // Read directly from storage file for debugging
    try {
      const dataDir = dirname(STORAGE_FILE);
      await fs.mkdir(dataDir, { recursive: true });

      try {
        const content = await fs.readFile(STORAGE_FILE, 'utf-8');
        return JSON.parse(content);
      } catch {
        return {};
      }
    } catch {
      return {};
    }
  }
}

// Export singleton instance
export const fileStorage = new FileStorageManager();
