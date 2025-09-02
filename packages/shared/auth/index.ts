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

  constructor(storage?: StorageManager) {
    this.storage = storage || new StorageManager();
  }

  async initialize(): Promise<void> {
    console.log('[AuthManager] initialize() called - Supabase Auth mode');
    
    try {
      // Initialize with device-based authentication state
      await this.updateAuthState();
      console.log('[AuthManager] Initialization complete');
    } catch (error) {
      console.error('[AuthManager] Failed to initialize:', error);
    }
  }

  private async updateAuthState() {
    try {
      // Check device token authentication
      const token = await deviceAuth.getStoredToken();
      const isAuthenticated = !!(token && token.token);
      
      let user: UserProfile | null = null;
      if (isAuthenticated) {
        try {
          user = await this.getCurrentUser();
        } catch (error) {
          console.warn('[AuthManager] Failed to get current user:', error);
        }
      }

      this.authState = {
        isAuthenticated: !!user,
        user,
        session: token ? {
          userId: user?.id || '',
          token: token.token,
          expiresAt: token.expiresAt,
          isActive: new Date(token.expiresAt) > new Date(),
        } : null,
        lastChecked: new Date().toISOString(),
      };

      this.emitAuthEvent({
        type: this.authState.isAuthenticated ? 'login' : 'logout',
        user: this.authState.user,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[AuthManager] Error updating auth state:', error);
    }
  }


  async isAuthenticated(): Promise<boolean> {
    // For device-based auth, validate token with server instead of just checking presence
    const token = await deviceAuth.getStoredToken();
    if (token && token.token) {
      try {
        // Try to get user profile to validate token
        const user = await this.getCurrentUser();
        return !!user; // Returns true only if we can successfully get user data
      } catch (error) {
        console.warn('[AuthManager] Token validation failed:', error);
        return false;
      }
    }
    return this.authState.isAuthenticated;
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    // For device-based auth, get user info from profile API
    const token = await deviceAuth.getStoredToken();
    if (token && token.token) {
      try {
        const config = await import('../config/index.js').then(m => m.configManager.getConfig());
        const apiBaseUrl = config.environment.apiBaseUrl || 'http://localhost:3000';
        
        console.log('[AuthManager] Attempting to fetch user profile from:', apiBaseUrl + '/api/user/profile');
        console.log('[AuthManager] Using device token:', token.token.substring(0, 10) + '...');
        
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
          
          // Cache the user data in authState
          this.authState.user = user;
          return user;
        } else {
          console.warn('[AuthManager] Failed to get user profile:', response.status);
          // If token is invalid (404/401), clear it so user can get a fresh one
          if (response.status === 404 || response.status === 401) {
            console.log('[AuthManager] Clearing invalid device token');
            await deviceAuth.clearToken();
          }
        }
      } catch (error) {
        console.error('[AuthManager] Error getting user profile:', error);
        // Clear token on network errors too - might be stale
        await deviceAuth.clearToken();
      }
    }
    
    // Return cached user data or null
    return this.authState.user;
  }

  async getAuthState(): Promise<AuthState> {
    return { ...this.authState };
  }

  async login(): Promise<void> {
    // No-op in Sprint 1; sidebar handles web-first flow via DeviceAuth
    console.log('[AuthManager] login() delegated to sidebar pairing flow.');
  }

  async logout(): Promise<void> {
    await deviceAuth.clearToken();
    this.updateAuthState();
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
