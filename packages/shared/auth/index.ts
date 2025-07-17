/**
 * Authentication management for the Gamma Timetable Extension
 * This will eventually integrate with Clerk for user authentication
 * Sprint 0: Stub implementation that always returns unauthenticated state
 */

import { StorageManager } from '../storage/index.js';
import { config } from '../config/index.js';

// Enhanced TypeScript interfaces for user/session data
export interface AuthToken {
  access_token: string;
  refresh_token: string;
  expires_at: Date;
  token_type: string;
  scope?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: Date;
  last_login?: Date;
  subscription_tier: 'free' | 'premium' | 'enterprise';
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  default_duration: number;
  auto_sync: boolean;
  export_format: 'csv' | 'xlsx' | 'pdf';
  timezone: string;
}

export interface AuthSession {
  user: UserProfile;
  token: AuthToken;
  created_at: Date;
  expires_at: Date;
  is_valid: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  session: AuthSession | null;
  lastError: string | null;
}

export interface IAuthManager {
  isAuthenticated(): Promise<boolean>;
  login(email: string, password: string): Promise<AuthToken>;
  logout(): Promise<void>;
  refreshToken(): Promise<AuthToken>;
  getCurrentUser(): Promise<UserProfile | null>;
  getAuthState(): Promise<AuthState>;
  onAuthStateChange(callback: (state: AuthState) => void): () => void;
}

/**
 * AuthManager - Authentication state management for Sprint 0
 * 
 * Sprint 0 Implementation:
 * - Always returns unauthenticated state
 * - Provides infrastructure for future Clerk integration
 * - Integrates with feature flags and storage systems
 * - No authentication prompts or requirements for users
 */
export class AuthManager implements IAuthManager {
  private storageManager: StorageManager;
  private authStateCallbacks: ((state: AuthState) => void)[] = [];
  private currentState: AuthState;

  constructor(storageManager?: StorageManager) {
    this.storageManager = storageManager || new StorageManager();
    
    // Initialize with unauthenticated state for Sprint 0
    this.currentState = {
      isAuthenticated: false,
      isLoading: false,
      user: null,
      session: null,
      lastError: null
    };
  }

  /**
   * Check if user is authenticated
   * Sprint 0: Always returns false (guest mode)
   */
  async isAuthenticated(): Promise<boolean> {
    // Check feature flag first
    if (!config.isFeatureEnabled('authentication')) {
      return false;
    }

    // Sprint 0: Always return false, no authentication required
    return false;
  }

  /**
   * Login user with email/password
   * Sprint 0: Throws error, will be implemented in Sprint 1 with Clerk
   */
  async login(email: string, password: string): Promise<AuthToken> {
    if (!config.isFeatureEnabled('authentication')) {
      throw new Error('Authentication is not enabled');
    }

    // Sprint 0: Authentication not implemented yet
    throw new Error('Authentication will be available in Sprint 1');
  }

  /**
   * Logout current user
   * Sprint 0: No-op since no authentication exists
   */
  async logout(): Promise<void> {
    if (!config.isFeatureEnabled('authentication')) {
      return;
    }

    // Sprint 0: Nothing to logout from
    this.updateAuthState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      session: null,
      lastError: null
    });
  }

  /**
   * Refresh authentication token
   * Sprint 0: Throws error, will be implemented in Sprint 1
   */
  async refreshToken(): Promise<AuthToken> {
    if (!config.isFeatureEnabled('authentication')) {
      throw new Error('Authentication is not enabled');
    }

    throw new Error('Token refresh will be available in Sprint 1');
  }

  /**
   * Get current authenticated user
   * Sprint 0: Always returns null (guest mode)
   */
  async getCurrentUser(): Promise<UserProfile | null> {
    if (!config.isFeatureEnabled('authentication')) {
      return null;
    }

    // Sprint 0: No authenticated user
    return null;
  }

  /**
   * Get current authentication state
   * Sprint 0: Always returns unauthenticated state
   */
  async getAuthState(): Promise<AuthState> {
    return { ...this.currentState };
  }

  /**
   * Register callback for authentication state changes
   * Returns unsubscribe function
   */
  onAuthStateChange(callback: (state: AuthState) => void): () => void {
    this.authStateCallbacks.push(callback);
    
    // Immediately call with current state
    callback({ ...this.currentState });
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateCallbacks.indexOf(callback);
      if (index > -1) {
        this.authStateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Initialize authentication system
   * Sprint 0: Sets up guest mode, prepares for future auth
   */
  async initialize(): Promise<void> {
    try {
      this.updateAuthState({
        ...this.currentState,
        isLoading: true
      });

      // Sprint 0: Just verify we're in guest mode
      const isAuth = await this.isAuthenticated();
      
      this.updateAuthState({
        isAuthenticated: isAuth,
        isLoading: false,
        user: null,
        session: null,
        lastError: null
      });

      console.log('[AuthManager] Initialized in guest mode (Sprint 0)');

    } catch (error) {
      console.error('[AuthManager] Initialization failed:', error);
      this.updateAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        session: null,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check if authentication features should be shown
   * Sprint 0: Always returns false (UI elements hidden)
   */
  shouldShowAuthUI(): boolean {
    return config.isFeatureEnabled('authentication');
  }

  /**
   * Get guest user preferences (for unauthenticated users)
   * Sprint 0: Returns default preferences from local storage
   */
  async getGuestPreferences(): Promise<UserPreferences> {
    try {
      const stored = await this.storageManager.load('guest_preferences');
      return {
        theme: 'auto',
        default_duration: 5,
        auto_sync: false,
        export_format: 'xlsx',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...stored
      };
    } catch (error) {
      console.error('[AuthManager] Failed to load guest preferences:', error);
      return {
        theme: 'auto',
        default_duration: 5,
        auto_sync: false,
        export_format: 'xlsx',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }
  }

  /**
   * Save guest user preferences
   * Sprint 0: Saves to local storage for unauthenticated users
   */
  async saveGuestPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    try {
      const current = await this.getGuestPreferences();
      const updated = { ...current, ...preferences };
      await this.storageManager.save('guest_preferences', updated);
    } catch (error) {
      console.error('[AuthManager] Failed to save guest preferences:', error);
    }
  }

  // Private methods

  /**
   * Update authentication state and notify callbacks
   */
  private updateAuthState(newState: Partial<AuthState>): void {
    this.currentState = { ...this.currentState, ...newState };
    
    // Notify all registered callbacks
    this.authStateCallbacks.forEach(callback => {
      try {
        callback({ ...this.currentState });
      } catch (error) {
        console.error('[AuthManager] Error in auth state callback:', error);
      }
    });
  }
}

// Global auth manager instance
export const authManager = new AuthManager();

// Initialize auth manager when module loads
authManager.initialize().catch(error => {
  console.error('[AuthManager] Failed to initialize:', error);
}); 