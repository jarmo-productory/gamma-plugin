const m = (r) => r && typeof r.id == "string" && typeof r.title == "string" && Array.isArray(r.content), y = (r) => r && typeof r.id == "string" && typeof r.duration == "number", l = {
  enableCloudSync: !1,
  // Disabled for Sprint 0
  syncDebounceMs: 500,
  maxRetries: 3,
  dataVersion: 1
};
class i {
  constructor(e = {}) {
    this.syncQueue = [], this.config = { ...l, ...e };
  }
  /**
   * Save data to storage - maintains exact same API as existing saveData()
   * @param key Storage key
   * @param data Data to save
   */
  async save(e, t) {
    try {
      const n = {
        version: this.config.dataVersion,
        data: t,
        timestamp: /* @__PURE__ */ new Date(),
        presentation_url: this.extractPresentationUrl(e)
      };
      await this.chromeStorageSave(e, n), this.config.enableCloudSync && this.addToSyncQueue(e, t, "save");
    } catch (n) {
      throw console.error("[StorageManager] Save failed:", n), n;
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
      const n = t;
      return n.version !== this.config.dataVersion && console.log(`[StorageManager] Data version mismatch for key ${e}: ${n.version} vs ${this.config.dataVersion}`), n.data;
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
    return new Promise((n, s) => {
      chrome.storage.local.set({ [e]: t }, () => {
        if (chrome.runtime.lastError)
          return s(chrome.runtime.lastError);
        n();
      });
    });
  }
  /**
   * Chrome storage load wrapper - maintains exact same behavior as original loadData()
   */
  chromeStorageLoad(e) {
    return new Promise((t, n) => {
      chrome.storage.local.get(e, (s) => {
        if (chrome.runtime.lastError)
          return n(chrome.runtime.lastError);
        t(s[e]);
      });
    });
  }
  /**
   * Chrome storage remove wrapper
   */
  chromeStorageRemove(e) {
    return new Promise((t, n) => {
      chrome.storage.local.remove(e, () => {
        if (chrome.runtime.lastError)
          return n(chrome.runtime.lastError);
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
  addToSyncQueue(e, t, n) {
    const s = {
      key: e,
      data: t,
      operation: n,
      timestamp: /* @__PURE__ */ new Date(),
      attempts: 0
    };
    this.syncQueue.push(s), this.scheduleSyncProcess();
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
const c = new i();
function S(r, e) {
  return c.save(r, e);
}
function p(r) {
  return c.load(r);
}
function v(r, e) {
  let t;
  return function(...n) {
    const s = this;
    clearTimeout(t), t = setTimeout(() => r.apply(s, n), e);
  };
}
class u {
  constructor(e) {
    this.listeners = /* @__PURE__ */ new Set(), this.storage = e || new i();
  }
  /**
   * Check if user is currently authenticated
   * Sprint 0: Always returns false
   * Sprint 1+: Checks with Clerk and validates session
   */
  async isAuthenticated() {
    return !1;
  }
  /**
   * Get current user profile
   * Sprint 0: Always returns null
   * Sprint 1+: Returns user data from Clerk
   */
  async getCurrentUser() {
    return null;
  }
  /**
   * Get current authentication state
   * Sprint 0: Always returns unauthenticated state
   */
  async getAuthState() {
    return {
      isAuthenticated: !1,
      user: null,
      session: null,
      lastChecked: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
   * Initiate login process
   * Sprint 0: Does nothing (no-op)
   * Sprint 1+: Redirects to Clerk sign-in
   */
  async login() {
    console.log("[AuthManager] Login called - Sprint 0 stub (no-op)");
  }
  /**
   * Initiate logout process
   * Sprint 0: Does nothing (no-op)
   * Sprint 1+: Clears session with Clerk
   */
  async logout() {
    console.log("[AuthManager] Logout called - Sprint 0 stub (no-op)");
  }
  /**
   * Check for session changes (e.g., user logged in via web dashboard)
   * Sprint 0: Always returns false
   * Sprint 1+: Checks for cross-tab authentication via Clerk
   */
  async checkSessionStatus() {
    return !1;
  }
  /**
   * Get user preferences (with defaults)
   * Sprint 0: Returns default preferences for offline use
   */
  async getUserPreferences() {
    const e = {
      theme: "auto",
      autoSync: !1,
      // Cloud sync disabled in Sprint 0
      syncInterval: 30,
      exportFormat: "xlsx",
      // Default to current Excel export
      notifications: !1
    };
    try {
      const t = await this.storage.load("user_preferences");
      if (t && typeof t == "object")
        return { ...e, ...t };
    } catch (t) {
      console.warn("[AuthManager] Could not load user preferences:", t);
    }
    return e;
  }
  /**
   * Update user preferences
   * Sprint 0: Stores locally only
   * Sprint 1+: Syncs with backend
   */
  async updateUserPreferences(e) {
    try {
      const n = { ...await this.getUserPreferences(), ...e };
      await this.storage.save("user_preferences", n), this.emitAuthEvent({
        type: "auth_check",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (t) {
      throw console.error("[AuthManager] Could not update user preferences:", t), t;
    }
  }
  /**
   * Add event listener for authentication state changes
   */
  addEventListener(e) {
    this.listeners.add(e);
  }
  /**
   * Remove event listener
   */
  removeEventListener(e) {
    this.listeners.delete(e);
  }
  /**
   * Emit authentication event to all listeners
   */
  emitAuthEvent(e) {
    this.listeners.forEach((t) => {
      try {
        t(e);
      } catch (n) {
        console.error("[AuthManager] Error in auth event listener:", n);
      }
    });
  }
  /**
   * Initialize auth manager
   * Sprint 0: Just sets up event listeners
   * Sprint 1+: Initializes Clerk and checks existing session
   */
  async initialize() {
    console.log("[AuthManager] Initializing - Sprint 0 stub (offline mode)"), this.emitAuthEvent({
      type: "auth_check",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  /**
   * Check if feature requires authentication
   * Sprint 0: Returns false for all features (everything works offline)
   * Sprint 1+: Returns true for cloud features
   */
  requiresAuth(e) {
    return !1;
  }
  /**
   * Get authentication status for UI display
   * Sprint 0: Always returns offline status
   */
  getUIAuthStatus() {
    return {
      status: "offline",
      message: "Working offline",
      showAuthUI: !1
      // Never show auth UI in Sprint 0
    };
  }
}
const C = new u(), f = {
  // Authentication features - DISABLED in Sprint 0
  authentication: !1,
  userProfiles: !1,
  sessionManagement: !1,
  // Cloud sync features - DISABLED in Sprint 0
  cloudSync: !1,
  autoSync: !1,
  syncQueue: !1,
  conflictResolution: !1,
  // Real-time features - DISABLED in Sprint 0
  realTimeSync: !1,
  collaborativeEditing: !1,
  liveUpdates: !1,
  // Advanced features - DISABLED in Sprint 0
  advancedSearch: !1,
  dataVersioning: !1,
  exportHistory: !1,
  bulkOperations: !1,
  // Current functionality - ALWAYS ENABLED
  offlineMode: !0,
  localStorage: !0,
  exportFeatures: !0,
  basicUI: !0,
  // Development features - Enable in dev mode
  debugMode: !1,
  loggingEnabled: !0,
  performanceMetrics: !1
}, g = {
  environment: "production",
  enableAnalytics: !1,
  logLevel: "info",
  maxStorageSize: 50,
  // 50MB
  syncIntervalMs: 3e4
  // 30 seconds
}, h = {
  theme: "auto",
  language: "en",
  exportFormat: "xlsx",
  notifications: !1,
  autoSave: !0,
  syncOnStartup: !1
  // No sync in Sprint 0
};
class d {
  constructor(e) {
    this.config = null, this.listeners = /* @__PURE__ */ new Set(), this.storage = e || new i();
  }
  /**
   * Initialize configuration system
   * Loads existing config or creates default
   */
  async initialize() {
    try {
      const e = await this.storage.load("app_config");
      e && this.isValidConfig(e) ? (this.config = e, console.log("[ConfigManager] Loaded existing configuration")) : (this.config = this.createDefaultConfig(), await this.saveConfig(), console.log("[ConfigManager] Created default configuration")), this.notifyListeners();
    } catch (e) {
      console.error("[ConfigManager] Failed to initialize:", e), this.config = this.createDefaultConfig();
    }
  }
  /**
   * Get current configuration
   */
  getConfig() {
    return this.config ? { ...this.config } : this.createDefaultConfig();
  }
  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(e) {
    return this.getConfig().features[e] || !1;
  }
  /**
   * Update feature flags
   * Sprint 0: Only allows enabling/disabling dev features
   * Sprint 1+: Allows user to control preference-based features
   */
  async updateFeatureFlags(e) {
    const t = this.getConfig(), n = {}, s = [
      "debugMode",
      "loggingEnabled",
      "performanceMetrics"
    ];
    for (const [a, o] of Object.entries(e))
      s.includes(a) && typeof o == "boolean" ? n[a] = o : s.includes(a) ? console.warn(`[ConfigManager] Feature '${a}' must be boolean value`) : console.warn(`[ConfigManager] Feature '${a}' cannot be modified in Sprint 0`);
    t.features = { ...t.features, ...n }, t.lastUpdated = (/* @__PURE__ */ new Date()).toISOString(), this.config = t, await this.saveConfig(), this.notifyListeners();
  }
  /**
   * Update user configuration
   */
  async updateUserConfig(e) {
    const t = this.getConfig();
    t.user = { ...t.user, ...e }, t.lastUpdated = (/* @__PURE__ */ new Date()).toISOString(), this.config = t, await this.saveConfig(), this.notifyListeners();
  }
  /**
   * Update environment configuration
   * Sprint 0: Limited to safe changes
   */
  async updateEnvironmentConfig(e) {
    const t = this.getConfig(), n = {}, s = [
      "logLevel",
      "maxStorageSize",
      "enableAnalytics",
      "syncIntervalMs"
    ];
    for (const [a, o] of Object.entries(e))
      s.includes(a) ? n[a] = o : console.warn(`[ConfigManager] Environment setting '${a}' cannot be modified in Sprint 0`);
    t.environment = { ...t.environment, ...n }, t.lastUpdated = (/* @__PURE__ */ new Date()).toISOString(), this.config = t, await this.saveConfig(), this.notifyListeners();
  }
  /**
   * Get feature flags for UI display
   */
  getUIFeatureStatus() {
    const e = this.getConfig(), t = {};
    for (const [n, s] of Object.entries(e.features)) {
      let a = s ? "Feature enabled" : "Feature disabled";
      s || (["authentication", "userProfiles", "sessionManagement"].includes(n) ? a = "Available in Sprint 1" : ["cloudSync", "autoSync", "syncQueue", "conflictResolution"].includes(n) ? a = "Available in Sprint 2" : ["realTimeSync", "collaborativeEditing", "liveUpdates"].includes(n) ? a = "Available in Sprint 3" : ["advancedSearch", "dataVersioning", "exportHistory", "bulkOperations"].includes(n) && (a = "Available in Sprint 4")), t[n] = { enabled: s, reason: a };
    }
    return t;
  }
  /**
   * Add configuration change listener
   */
  addConfigListener(e) {
    this.listeners.add(e);
  }
  /**
   * Remove configuration change listener
   */
  removeConfigListener(e) {
    this.listeners.delete(e);
  }
  /**
   * Reset configuration to defaults
   */
  async resetToDefaults() {
    this.config = this.createDefaultConfig(), await this.saveConfig(), this.notifyListeners(), console.log("[ConfigManager] Configuration reset to defaults");
  }
  /**
   * Get configuration for specific component/feature
   */
  getFeatureConfig(e) {
    const t = this.getConfig();
    return {
      storage: {
        maxSize: t.environment.maxStorageSize,
        enableSync: t.features.cloudSync,
        localOnly: !t.features.cloudSync
      },
      auth: {
        enabled: t.features.authentication,
        sessionTimeout: 36e5,
        // 1 hour
        requireAuth: !1
        // Always false in Sprint 0
      },
      sync: {
        enabled: t.features.autoSync,
        interval: t.environment.syncIntervalMs,
        queueEnabled: t.features.syncQueue
      },
      ui: {
        theme: t.user.theme,
        language: t.user.language,
        notifications: t.user.notifications
      },
      export: {
        enabled: t.features.exportFeatures,
        defaultFormat: t.user.exportFormat,
        historyEnabled: t.features.exportHistory
      }
    }[e] || null;
  }
  /**
   * Private helper methods
   */
  createDefaultConfig() {
    return {
      features: { ...f },
      environment: { ...g },
      user: { ...h },
      version: "0.0.7",
      // Current Sprint 0 version
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  async saveConfig() {
    if (this.config)
      try {
        await this.storage.save("app_config", this.config);
      } catch (e) {
        throw console.error("[ConfigManager] Failed to save configuration:", e), e;
      }
  }
  isValidConfig(e) {
    return e && typeof e == "object" && e.features && e.environment && e.user && e.version && e.lastUpdated;
  }
  notifyListeners() {
    this.config && this.listeners.forEach((e) => {
      try {
        e(this.config);
      } catch (t) {
        console.error("[ConfigManager] Error in config listener:", t);
      }
    });
  }
}
const w = new d(), b = "0.0.5", M = () => {
  console.log("Shared package initialized");
};
export {
  u as AuthManager,
  d as ConfigManager,
  g as DEFAULT_ENVIRONMENT_CONFIG,
  f as DEFAULT_FEATURE_FLAGS,
  l as DEFAULT_STORAGE_CONFIG,
  h as DEFAULT_USER_CONFIG,
  b as SHARED_VERSION,
  i as StorageManager,
  C as authManager,
  w as configManager,
  v as debounce,
  c as defaultStorageManager,
  M as initializeShared,
  m as isSlide,
  y as isTimetableItem,
  p as loadData,
  S as saveData
};
