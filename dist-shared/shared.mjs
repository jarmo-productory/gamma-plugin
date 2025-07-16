const a = (t) => t && typeof t.id == "string" && typeof t.title == "string" && Array.isArray(t.content), i = (t) => t && typeof t.id == "string" && typeof t.duration == "number";
class s {
  constructor() {
  }
  async save(e, n) {
    throw new Error("StorageManager not yet implemented");
  }
  async load(e) {
    throw new Error("StorageManager not yet implemented");
  }
  async remove(e) {
    throw new Error("StorageManager not yet implemented");
  }
  async clear() {
    throw new Error("StorageManager not yet implemented");
  }
}
class c {
  constructor() {
  }
  async isAuthenticated() {
    return !1;
  }
  async login(e, n) {
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
const o = {
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
class r {
  constructor(e) {
    this.config = { ...o, ...e };
  }
  getFeatureFlag(e) {
    return this.config.features[e];
  }
  setFeatureFlag(e, n) {
    this.config.features[e] = n;
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
    var n;
    return {
      api: {
        baseUrl: typeof process < "u" && ((n = process.env) == null ? void 0 : n.NODE_ENV) === "development" ? "http://localhost:3000" : "https://api.gamma-timetable.app",
        timeout: 5e3
      }
    };
  }
}
const l = new r(r.getEnvironmentConfig()), g = "0.0.5", u = () => {
  console.log("Shared package initialized");
};
export {
  c as AuthManager,
  r as ConfigManager,
  o as DEFAULT_CONFIG,
  g as SHARED_VERSION,
  s as StorageManager,
  l as config,
  u as initializeShared,
  a as isSlide,
  i as isTimetableItem
};
