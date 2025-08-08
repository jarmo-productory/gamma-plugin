/**
 * Storage abstraction layer for the Gamma Timetable Extension
 * Now imports from shared StorageManager for unified behavior
 * Maintains identical API for backward compatibility
 */

// Import from shared StorageManager
import {
  saveData as sharedSaveData,
  loadData as sharedLoadData,
  debounce as sharedDebounce,
} from '@shared/storage';

/**
 * Saves data to chrome.storage.local.
 * @param {string} key
 * @param {any} value
 * @returns {Promise<void>}
 */
export function saveData(key, value) {
  return sharedSaveData(key, value);
}

/**
 * Loads data from chrome.storage.local.
 * @param {string} key
 * @returns {Promise<any>}
 */
export function loadData(key) {
  return sharedLoadData(key);
}

/**
 * Returns a debounced version of a function.
 * @param {Function} func
 * @param {number} delay
 * @returns {Function}
 */
export function debounce(func, delay) {
  return sharedDebounce(func, delay);
}

// Legacy support: Also export the original functions for compatibility
export { saveData as saveDataLegacy, loadData as loadDataLegacy, debounce as debounceLegacy };
