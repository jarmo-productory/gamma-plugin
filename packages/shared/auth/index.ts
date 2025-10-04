/**
 * Authentication Manager
 *
 * Integrates with Supabase Auth for authentication.
 */
import { StorageManager } from '../storage';
import { deviceAuth } from './device';
import { UserProfile, UserPreferences } from '../types/index';

// TypeScript interfaces for user and session data

export interface UserSession {
  userId: string;
  token: string;
  expiresAt: string;
  isActive: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  session: UserSession | null;
  lastChecked: string;
}

export type AuthEventType = 'login' | 'logout' | 'session_expired' | 'auth_check';

export interface AuthEvent {
  type: AuthEventType;
  user?: UserProfile | null;
  timestamp: string;
}

/**
 * AuthManager handles all authentication-related operations
 */
export class AuthManager {
  private storage: StorageManager;
  private listeners: Set<(event: AuthEvent) => void> = new Set();
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    session: null,
    lastChecked: new Date().toISOString(),
  };
  
  // Sprint 27 Fix: Add authentication caching to prevent excessive API calls
  private authCache: {
    result: boolean;
    timestamp: number;
    isValid(): boolean;
  } = {
    result: false,
    timestamp: 0,
    isValid() {
      return Date.now() - this.timestamp < 30000; // 30 second cache
    }
  };
  private tokenWatcherId: NodeJS.Timeout | number | null = null;
  private readonly TOKEN_CHECK_INTERVAL_MS = 300000; // 5 minutes (much less aggressive)
  private readonly AUTH_CACHE_DURATION = 30000; // 30 seconds cache

  constructor(storage?: StorageManager) {
    this.storage = storage || new StorageManager();
  }

  async initialize(): Promise<void> {
    console.log('[AuthManager] initialize() called - Supabase Auth mode');
    
    try {
      // Initialize with device-based authentication state
      await this.updateAuthState();
      
      // Start token expiry monitoring
      this.startTokenWatcher();
      console.log('[AuthManager] Initialization complete with token monitoring');
    } catch (error) {
      console.error('[AuthManager] Failed to initialize:', error);
    }
  }

  private isTokenActive(token: { token: string; expiresAt?: string } | null): boolean {
    if (!token || !token.token) {
      return false;
    }

    if (!token.expiresAt) {
      return true;
    }

    return new Date(token.expiresAt) > new Date();
  }

  private async updateAuthState() {
    try {
      let token = await deviceAuth.getStoredToken();
      let hasActiveToken = this.isTokenActive(token);

      let user: UserProfile | null = null;
      if (hasActiveToken) {
        user = await this.getCurrentUser();
        // getCurrentUser might clear token if invalid
        token = await deviceAuth.getStoredToken();
        hasActiveToken = this.isTokenActive(token);
      }

      this.authState = {
        isAuthenticated: hasActiveToken,
        user,
        session: hasActiveToken && token ? {
          userId: user?.id || '',
          token: token.token,
          expiresAt: token.expiresAt,
          isActive: hasActiveToken,
        } : null,
        lastChecked: new Date().toISOString(),
      };

      this.authCache.result = this.authState.isAuthenticated;
      this.authCache.timestamp = Date.now();

      this.emitAuthEvent({
        type: this.authState.isAuthenticated ? 'login' : 'logout',
        user: this.authState.user,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[AuthManager] Error updating auth state:', error);
      this.authState = {
        isAuthenticated: false,
        user: null,
        session: null,
        lastChecked: new Date().toISOString(),
      };
      this.authCache.result = false;
      this.authCache.timestamp = Date.now();
      this.emitAuthEvent({
        type: 'logout',
        user: null,
        timestamp: new Date().toISOString(),
      });
    }
  }


  async isAuthenticated(): Promise<boolean> {
    if (this.authCache.isValid()) {
      return this.authCache.result;
    }

    let token = await deviceAuth.getStoredToken();
    if (!this.isTokenActive(token)) {
      this.authState.user = null;
      this.authState.session = null;
      this.authState.isAuthenticated = false;
      this.authCache.result = false;
      this.authCache.timestamp = Date.now();
      return false;
    }

    const user = await this.getCurrentUser();
    token = await deviceAuth.getStoredToken();
    const stillActive = this.isTokenActive(token);

    if (!stillActive) {
      this.authState.user = null;
      this.authState.session = null;
      this.authState.isAuthenticated = false;
      this.authCache.result = false;
      this.authCache.timestamp = Date.now();
      return false;
    }

    if (user) {
      this.authState.user = user;
      this.authState.session = token ? {
        userId: user.id,
        token: token.token,
        expiresAt: token.expiresAt,
        isActive: true,
      } : null;
    }

    this.authState.isAuthenticated = true;
    this.authCache.result = true;
    this.authCache.timestamp = Date.now();
    return true;
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    // For device-based auth, get user info from profile API
    const token = await deviceAuth.getStoredToken();
    if (!token || !token.token) {
      this.authState.user = null;
      return null;
    }

    try {
      const config = await import('../config/index.js').then(m => m.configManager.getConfig());
      const apiBaseUrl = config.environment.apiBaseUrl || 'http://localhost:3000';

      const response = await deviceAuth.authorizedFetch(apiBaseUrl, '/api/user/profile');
      console.log('[AuthManager] API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        const user: UserProfile = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name || data.user.email.split('@')[0],
          createdAt: data.user.linkedAt || new Date().toISOString(),
        };

        this.authState.user = user;
        return user;
      }

      console.warn('[AuthManager] Failed to get user profile:', response.status);

      if (response.status === 404 || response.status === 401) {
        console.log('[AuthManager] Clearing invalid device token');
        await deviceAuth.clearToken();
        this.authState.user = null;
        this.authCache.result = false;
      }

      return null;
    } catch (error) {
      const err = error as Error;
      if (err?.message === 'not_authenticated') {
        await deviceAuth.clearToken();
        this.authCache.result = false;
      }

      console.error('[AuthManager] Error getting user profile:', error);
      this.authState.user = null;
      return null;
    }
  }

  async getAuthState(): Promise<AuthState> {
    return { ...this.authState };
  }

  async login(): Promise<void> {
    // No-op in Sprint 1; sidebar handles web-first flow via DeviceAuth
    console.log('[AuthManager] login() delegated to sidebar pairing flow.');
  }

  async logout(): Promise<void> {
    this.stopTokenWatcher();
    await deviceAuth.clearToken();
    this.updateAuthState();
  }

  /**
   * Sprint 27: Start token expiry monitoring
   * Checks token expiry every 10 seconds and handles automatic logout/refresh
   */
  private startTokenWatcher(): void {
    if (this.tokenWatcherId) {
      return; // Already running
    }
    
    console.log('[AuthManager] Starting token expiry watcher');
    this.tokenWatcherId = setInterval(async () => {
      await this.checkTokenExpiry();
    }, this.TOKEN_CHECK_INTERVAL_MS);
  }

  private stopTokenWatcher(): void {
    if (this.tokenWatcherId) {
      clearInterval(this.tokenWatcherId);
      this.tokenWatcherId = null;
      console.log('[AuthManager] Stopped token expiry watcher');
    }
  }

  /**
   * Sprint 27 Fix: Background token expiry check (no immediate UI updates)
   */
  private async checkTokenExpiry(): Promise<void> {
    try {
      const token = await deviceAuth.getStoredToken();
      if (!token) {
        return; // No token to check
      }

      const expiresAt = new Date(token.expiresAt);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      
      // Only act if token expires within 1 minute (less aggressive)
      if (timeUntilExpiry <= 60000) {
        console.log('[AuthManager] Token expiring within 1 minute, attempting refresh...');
        
        try {
          // Attempt to refresh the token
          const config = await import('../config/index.js').then(m => m.configManager.getConfig());
          const apiBaseUrl = config.environment.apiBaseUrl || 'http://localhost:3000';
          const refreshedToken = await deviceAuth.refresh(apiBaseUrl, token.token);
          
          if (refreshedToken) {
            console.log('[AuthManager] Token refreshed successfully');
            // Clear auth cache to force re-check
            this.authCache.timestamp = 0;
            // Emit auth state change event (decoupled from UI)
            this.emitAuthEvent({
              type: 'login',
              user: this.authState.user,
              timestamp: new Date().toISOString(),
            });
          } else {
            throw new Error('Refresh returned null');
          }
        } catch (refreshError) {
          console.warn('[AuthManager] Token refresh failed, marking as logged out:', refreshError);
          
          // Clear token and cache
          await deviceAuth.clearToken();
          this.authCache.timestamp = 0;
          this.authState = {
            isAuthenticated: false,
            user: null,
            session: null,
            lastChecked: new Date().toISOString(),
          };
          
          // Emit session expired event (UI will handle this separately)
          this.emitAuthEvent({
            type: 'session_expired',
            user: null,
            timestamp: new Date().toISOString(),
          });
          
          // Stop monitoring since we're logged out
          this.stopTokenWatcher();
        }
      }
    } catch (error) {
      console.error('[AuthManager] Error checking token expiry:', error);
    }
  }

  async getUserPreferences(): Promise<UserPreferences> {
    const defaults: UserPreferences = {
      theme: 'auto',
      autoSync: false,
      syncInterval: 30,
      exportFormat: 'xlsx',
      notifications: false,
    };

    try {
      const stored = await this.storage.load('user_preferences');
      if (stored && typeof stored === 'object') {
        return { ...defaults, ...(stored as UserPreferences) };
      }
    } catch (error) {
      console.warn('[AuthManager] Could not load user preferences:', error);
    }

    return defaults;
  }

  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    try {
      const current = await this.getUserPreferences();
      const updated = { ...current, ...preferences };
      await this.storage.save('user_preferences', updated);

      this.emitAuthEvent({
        type: 'auth_check',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[AuthManager] Could not update user preferences:', error);
      throw error;
    }
  }

  addEventListener(listener: (event: AuthEvent) => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(listener: (event: AuthEvent) => void): void {
    this.listeners.delete(listener);
  }

  private emitAuthEvent(event: AuthEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[AuthManager] Error in auth event listener:', error);
      }
    });
  }
}

// Export a default instance for easy use
export const authManager = new AuthManager();

// Export unified auth manager for simplified UX
export { UnifiedAuthManager, authManager as unifiedAuth } from './unified-auth';
export type { AuthData, AuthState as UnifiedAuthState } from './unified-auth';
