/**
 * Saves data to chrome.storage.local.
 * @param {string} key
 * @param {any} value
 * @returns {Promise<void>}
 */
export function saveData(key, value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve();
    });
  });
}

/**
 * Loads data from chrome.storage.local.
 * @param {string} key
 * @returns {Promise<any>}
 */
export function loadData(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, result => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(result[key]);
    });
  });
}

/**
 * Returns a debounced version of a function.
 * @param {Function} func
 * @param {number} delay
 * @returns {Function}
 */
export function debounce(func, delay) {
  let timeout;
  return function (...args) {
    // Note: Simplified to avoid 'this' aliasing
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}
