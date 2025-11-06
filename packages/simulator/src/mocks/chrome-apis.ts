/**
 * Chrome API Mocks for Node.js Environment
 * Simulates browser extension APIs without external dependencies
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Storage file path
const STORAGE_FILE = join(__dirname, '../../data/storage.json');

/**
 * Mock chrome.storage.local API using file-based persistence
 */
class ChromeStorageLocal {
  private data: Record<string, any> = {};
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ensure data directory exists
      const dataDir = dirname(STORAGE_FILE);
      await fs.mkdir(dataDir, { recursive: true });

      // Load existing data if available
      try {
        const content = await fs.readFile(STORAGE_FILE, 'utf-8');
        this.data = JSON.parse(content);
      } catch (err) {
        // File doesn't exist, start with empty data
        this.data = {};
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      throw error;
    }
  }

  async get(keys: string | string[]): Promise<Record<string, any>> {
    await this.init();

    const keyArray = Array.isArray(keys) ? keys : [keys];
    const result: Record<string, any> = {};

    for (const key of keyArray) {
      if (key in this.data) {
        result[key] = this.data[key];
      }
    }

    return result;
  }

  async set(items: Record<string, any>): Promise<void> {
    await this.init();

    // Update in-memory data
    Object.assign(this.data, items);

    // Persist to file (atomic write)
    const tempFile = `${STORAGE_FILE}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
    await fs.rename(tempFile, STORAGE_FILE);
  }

  async remove(keys: string | string[]): Promise<void> {
    await this.init();

    const keyArray = Array.isArray(keys) ? keys : [keys];

    for (const key of keyArray) {
      delete this.data[key];
    }

    // Persist changes
    await fs.writeFile(STORAGE_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  async clear(): Promise<void> {
    await this.init();

    this.data = {};
    await fs.writeFile(STORAGE_FILE, '{}', 'utf-8');
  }

  // Get all data (for debugging)
  async getAll(): Promise<Record<string, any>> {
    await this.init();
    return { ...this.data };
  }
}

/**
 * Mock chrome.runtime API
 */
const chromeRuntime = {
  id: 'simulator-extension-id',
  lastError: undefined as { message: string } | undefined,

  onMessage: {
    addListener: (callback: Function) => {
      // Stub for message listener
    },
    removeListener: (callback: Function) => {
      // Stub for removing listener
    }
  }
};

/**
 * Mock crypto.subtle API using Node.js crypto
 */
class CryptoSubtle {
  async digest(algorithm: string, data: Uint8Array): Promise<ArrayBuffer> {
    if (algorithm !== 'SHA-256') {
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    }

    const buffer = Buffer.from(data);
    const hash = crypto.createHash('sha256').update(buffer).digest();

    // Convert Buffer to ArrayBuffer
    return hash.buffer.slice(hash.byteOffset, hash.byteOffset + hash.byteLength) as ArrayBuffer;
  }
}

/**
 * Mock global crypto object
 */
const globalCrypto = {
  subtle: new CryptoSubtle(),

  // Mock getRandomValues for UUID generation
  getRandomValues: (array: Uint8Array): Uint8Array => {
    return crypto.randomFillSync(array);
  }
};

/**
 * Mock global Headers class
 */
class MockHeaders {
  private headers: Map<string, string> = new Map();

  constructor(init?: HeadersInit) {
    if (init) {
      if (init instanceof MockHeaders) {
        this.headers = new Map(init.headers);
      } else if (Array.isArray(init)) {
        init.forEach(([key, value]) => this.headers.set(key.toLowerCase(), value));
      } else {
        Object.entries(init).forEach(([key, value]) => {
          this.headers.set(key.toLowerCase(), value);
        });
      }
    }
  }

  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null;
  }

  set(name: string, value: string): void {
    this.headers.set(name.toLowerCase(), value);
  }

  has(name: string): boolean {
    return this.headers.has(name.toLowerCase());
  }

  delete(name: string): void {
    this.headers.delete(name.toLowerCase());
  }

  forEach(callback: (value: string, key: string) => void): void {
    this.headers.forEach((value, key) => callback(value, key));
  }
}

/**
 * Initialize all Chrome API mocks
 */
export function initializeChromeMocks(): void {
  const storageLocal = new ChromeStorageLocal();

  // Set up global chrome object
  (global as any).chrome = {
    storage: {
      local: {
        get: (keys: string | string[]): Promise<Record<string, any>> => {
          return new Promise((resolve, reject) => {
            storageLocal.get(keys)
              .then(result => {
                chromeRuntime.lastError = undefined;
                resolve(result);
              })
              .catch(err => {
                chromeRuntime.lastError = { message: err.message };
                reject(err);
              });
          });
        },
        set: (items: Record<string, any>): Promise<void> => {
          return new Promise((resolve, reject) => {
            storageLocal.set(items)
              .then(() => {
                chromeRuntime.lastError = undefined;
                resolve();
              })
              .catch(err => {
                chromeRuntime.lastError = { message: err.message };
                reject(err);
              });
          });
        },
        remove: (keys: string | string[]): Promise<void> => {
          return new Promise((resolve, reject) => {
            storageLocal.remove(keys)
              .then(() => {
                chromeRuntime.lastError = undefined;
                resolve();
              })
              .catch(err => {
                chromeRuntime.lastError = { message: err.message };
                reject(err);
              });
          });
        },
        clear: (): Promise<void> => {
          return new Promise((resolve, reject) => {
            storageLocal.clear()
              .then(() => {
                chromeRuntime.lastError = undefined;
                resolve();
              })
              .catch(err => {
                chromeRuntime.lastError = { message: err.message };
                reject(err);
              });
          });
        }
      }
    },
    runtime: chromeRuntime
  };

  // Set up global crypto (if not already present or read-only)
  if (!global.crypto || typeof global.crypto.subtle === 'undefined') {
    try {
      Object.defineProperty(global, 'crypto', {
        value: globalCrypto,
        writable: false,
        configurable: true
      });
    } catch {
      // crypto is read-only, try to extend it
      (global.crypto as any).subtle = new CryptoSubtle();
    }
  }

  // Set up global Headers
  (global as any).Headers = MockHeaders;

  // Set up global navigator (for user agent) if not already present
  if (!global.navigator) {
    try {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Simulator) Chrome/120.0.0.0'
        },
        writable: false,
        configurable: true
      });
    } catch {
      // navigator is read-only, that's fine - Node.js has one
    }
  }
}

/**
 * Get direct access to storage (for debugging)
 */
export async function getStorageData(): Promise<Record<string, any>> {
  const storageLocal = new ChromeStorageLocal();
  return storageLocal.getAll();
}

/**
 * Clear all storage data
 */
export async function clearStorageData(): Promise<void> {
  const storageLocal = new ChromeStorageLocal();
  await storageLocal.clear();
}
