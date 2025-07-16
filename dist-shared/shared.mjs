const l = (o) => o && typeof o.id == "string" && typeof o.title == "string" && Array.isArray(o.content), h = (o) => o && typeof o.id == "string" && typeof o.duration == "number", i = {
  enableCloudSync: !1,
  // Disabled for Sprint 0
  syncDebounceMs: 500,
  maxRetries: 3,
  dataVersion: 1
};
class c {
  constructor(e = {}) {
    this.syncQueue = [], this.config = { ...i, ...e };
  }
  /**
   * Save data to storage - maintains exact same API as existing saveData()
   * @param key Storage key
   * @param data Data to save
   */
  async save(e, t) {
    try {
      const r = {
        version: this.config.dataVersion,
        data: t,
        timestamp: /* @__PURE__ */ new Date(),
        presentation_url: this.extractPresentationUrl(e)
      };
      await this.chromeStorageSave(e, r), this.config.enableCloudSync && this.addToSyncQueue(e, t, "save");
    } catch (r) {
      throw console.error("[StorageManager] Save failed:", r), r;
    }
  }
  /**
   * Load data from storage - maintains exact same API as existing loadData()
   * @param key Storage key
   * @returns Raw data (unwrapped from metadata for backward compatibility)
   */
  async load(e) {
    try {
      const t = await this.chromeStorageLoad(e);
      if (!t)
        return;
      if (!this.isVersionedData(t))
        return console.log("[StorageManager] Loading legacy data for key:", e), t;
      const r = t;
      return r.version !== this.config.dataVersion && console.log(`[StorageManager] Data version mismatch for key ${e}: ${r.version} vs ${this.config.dataVersion}`), r.data;
    } catch (t) {
      throw console.error("[StorageManager] Load failed:", t), t;
    }
  }
  /**
   * Remove data from storage
   * @param key Storage key
   */
  async remove(e) {
    try {
      await this.chromeStorageRemove(e), this.config.enableCloudSync && this.addToSyncQueue(e, null, "remove");
    } catch (t) {
      throw console.error("[StorageManager] Remove failed:", t), t;
    }
  }
  /**
   * Clear all storage
   */
  async clear() {
    try {
      await this.chromeStorageClear(), this.syncQueue = [];
    } catch (e) {
      throw console.error("[StorageManager] Clear failed:", e), e;
    }
  }
  // Private helper methods
  /**
   * Chrome storage save wrapper - maintains exact same behavior as original saveData()
   */
  chromeStorageSave(e, t) {
    return new Promise((r, n) => {
      chrome.storage.local.set({ [e]: t }, () => {
        if (chrome.runtime.lastError)
          return n(chrome.runtime.lastError);
        r();
      });
    });
  }
  /**
   * Chrome storage load wrapper - maintains exact same behavior as original loadData()
   */
  chromeStorageLoad(e) {
    return new Promise((t, r) => {
      chrome.storage.local.get(e, (n) => {
        if (chrome.runtime.lastError)
          return r(chrome.runtime.lastError);
        t(n[e]);
      });
    });
  }
  /**
   * Chrome storage remove wrapper
   */
  chromeStorageRemove(e) {
    return new Promise((t, r) => {
      chrome.storage.local.remove(e, () => {
        if (chrome.runtime.lastError)
          return r(chrome.runtime.lastError);
        t();
      });
    });
  }
  /**
   * Chrome storage clear wrapper
   */
  chromeStorageClear() {
    return new Promise((e, t) => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError)
          return t(chrome.runtime.lastError);
        e();
      });
    });
  }
  /**
   * Check if data is versioned (has metadata wrapper)
   */
  isVersionedData(e) {
    return e && typeof e == "object" && "version" in e && "data" in e && "timestamp" in e;
  }
  /**
   * Extract presentation URL from storage key
   */
  extractPresentationUrl(e) {
    const t = e.match(/^timetable-(.+)$/);
    return t ? t[1] : void 0;
  }
  /**
   * Add item to sync queue (for future cloud sync)
   */
  addToSyncQueue(e, t, r) {
    const n = {
      key: e,
      data: t,
      operation: r,
      timestamp: /* @__PURE__ */ new Date(),
      attempts: 0
    };
    this.syncQueue.push(n), this.scheduleSyncProcess();
  }
  /**
   * Schedule sync processing (debounced)
   */
  scheduleSyncProcess() {
    this.syncTimer && clearTimeout(this.syncTimer), this.syncTimer = setTimeout(() => {
      this.processSyncQueue();
    }, this.config.syncDebounceMs);
  }
  /**
   * Process sync queue (placeholder for future cloud sync)
   */
  async processSyncQueue() {
    if (!(!this.config.enableCloudSync || this.syncQueue.length === 0)) {
      console.log(`[StorageManager] Processing sync queue: ${this.syncQueue.length} items`);
      for (const e of this.syncQueue)
        console.log("[StorageManager] Sync queue item:", e);
      this.syncQueue = [];
    }
  }
  /**
   * Get sync queue status (for debugging)
   */
  getSyncQueueStatus() {
    return {
      count: this.syncQueue.length,
      items: [...this.syncQueue]
    };
  }
  /**
   * Update configuration
   */
  updateConfig(e) {
    this.config = { ...this.config, ...e };
  }
}
const s = new c();
function m(o, e) {
  return s.save(o, e);
}
function g(o) {
  return s.load(o);
}
function f(o, e) {
  let t;
  return function(...r) {
    const n = this;
    clearTimeout(t), t = setTimeout(() => o.apply(n, r), e);
  };
}
class y {
  constructor() {
  }
  async isAuthenticated() {
    return !1;
  }
  async login(e, t) {
    throw new Error("Authentication not yet implemented");
  }
  async logout() {
    throw new Error("Authentication not yet implemented");
  }
  async refreshToken() {
    throw new Error("Authentication not yet implemented");
  }
  async getCurrentUser() {
    return null;
  }
}
const u = {
  features: {
    cloudSync: !1,
    // Sprint 2
    authentication: !1,
    // Sprint 1  
    webDashboard: !1,
    // Sprint 2
    realTimeSync: !1,
    // Sprint 3
    autoSync: !1,
    // Sprint 3
    offlineMode: !0,
    // Always true (current behavior)
    exportFeatures: !0
    // Current functionality
  },
  version: {
    current: "0.0.5",
    minimumForCloud: "0.1.0"
  }
};
class a {
  constructor(e) {
    this.config = { ...u, ...e };
  }
  getFeatureFlag(e) {
    return this.config.features[e];
  }
  setFeatureFlag(e, t) {
    this.config.features[e] = t;
  }
  getConfig() {
    return { ...this.config };
  }
  updateConfig(e) {
    this.config = { ...this.config, ...e };
  }
  isFeatureEnabled(e) {
    return this.getFeatureFlag(e);
  }
  // Environment-based configuration
  static getEnvironmentConfig() {
    var t;
    return {
      api: {
        baseUrl: typeof process < "u" && ((t = process.env) == null ? void 0 : t.NODE_ENV) === "development" ? "http://localhost:3000" : "https://api.gamma-timetable.app",
        timeout: 5e3
      }
    };
  }
}
const d = new a(a.getEnvironmentConfig()), S = "0.0.5", p = () => {
  console.log("Shared package initialized");
};
export {
  y as AuthManager,
  a as ConfigManager,
  u as DEFAULT_CONFIG,
  i as DEFAULT_STORAGE_CONFIG,
  S as SHARED_VERSION,
  c as StorageManager,
  d as config,
  f as debounce,
  s as defaultStorageManager,
  p as initializeShared,
  l as isSlide,
  h as isTimetableItem,
  g as loadData,
  m as saveData
};
