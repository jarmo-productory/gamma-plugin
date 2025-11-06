import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * File-based storage adapter for Node.js environment
 * Mimics chrome.storage.local API for simulator
 */
export class FileStorage {
  private storageDir: string;

  constructor(storageDir: string = './.simulator-storage') {
    this.storageDir = storageDir;
  }

  async ensureStorageDir(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  async save(key: string, value: any): Promise<void> {
    await this.ensureStorageDir();
    const filePath = path.join(this.storageDir, `${key}.json`);
    await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf-8');
  }

  async load(key: string): Promise<any> {
    await this.ensureStorageDir();
    const filePath = path.join(this.storageDir, `${key}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return undefined;
    }
  }

  async remove(key: string): Promise<void> {
    await this.ensureStorageDir();
    const filePath = path.join(this.storageDir, `${key}.json`);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist
    }
  }

  async clear(): Promise<void> {
    await this.ensureStorageDir();
    const files = await fs.readdir(this.storageDir);
    await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(f => fs.unlink(path.join(this.storageDir, f)))
    );
  }

  async listKeys(): Promise<string[]> {
    await this.ensureStorageDir();
    const files = await fs.readdir(this.storageDir);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  }
}

/**
 * Storage manager adapter that uses FileStorage
 */
export class StorageManagerAdapter {
  private storage: FileStorage;

  constructor(storageDir: string = './.simulator-storage') {
    this.storage = new FileStorage(storageDir);
  }

  async save(key: string, data: any): Promise<void> {
    await this.storage.save(key, data);
  }

  async load(key: string): Promise<any> {
    return await this.storage.load(key);
  }

  async remove(key: string): Promise<void> {
    await this.storage.remove(key);
  }

  async clear(): Promise<void> {
    await this.storage.clear();
  }
}
