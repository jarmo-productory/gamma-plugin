/**
 * Storage abstraction layer for the Gamma Timetable Extension
 * This will eventually wrap chrome.storage and add cloud sync capabilities
 */

// Storage interface for future implementation
export interface IStorageManager {
  save(key: string, data: any): Promise<void>;
  load(key: string): Promise<any>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

// Placeholder for future StorageManager class
export class StorageManager implements IStorageManager {
  constructor() {
    // Will be implemented in Sprint 0 Deliverable 2
  }

  async save(key: string, data: any): Promise<void> {
    // For now, placeholder - will wrap chrome.storage.local in implementation
    throw new Error('StorageManager not yet implemented');
  }

  async load(key: string): Promise<any> {
    // For now, placeholder - will wrap chrome.storage.local in implementation
    throw new Error('StorageManager not yet implemented');
  }

  async remove(key: string): Promise<void> {
    throw new Error('StorageManager not yet implemented');
  }

  async clear(): Promise<void> {
    throw new Error('StorageManager not yet implemented');
  }
} 