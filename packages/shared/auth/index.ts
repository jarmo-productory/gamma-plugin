/**
 * Authentication Manager
 * 
 * Sprint 0: Stub implementation that always returns unauthenticated state
 * Sprint 1: Will integrate with Clerk for actual authentication
 * 
 * This provides the infrastructure for future authentication without
 * requiring any user authentication in Sprint 0.
 */

import { StorageManager } from '../storage';

// TypeScript interfaces for user and session data
export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto';
  autoSync?: boolean;
  syncInterval?: number; // in minutes
  exportFormat?: 'xlsx' | 'csv';
  notifications?: boolean;
}

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
  user?: UserProfile;
  timestamp: string;
}

/**
 * AuthManager handles all authentication-related operations
 * 
 * Sprint 0: Always returns unauthenticated state
 * Sprint 1+: Integrates with Clerk for real authentication
 */
export class AuthManager {
  private storage: StorageManager;
  private listeners: Set<(event: AuthEvent) => void> = new Set();

  constructor(storage?: StorageManager) {
    this.storage = storage || new StorageManager();
  }

  /**
   * Check if user is currently authenticated
   * Sprint 0: Always returns false
   * Sprint 1+: Checks with Clerk and validates session
   */
  async isAuthenticated(): Promise<boolean> {
    // Sprint 0: Always return false (offline/unauthenticated mode)
    return false;
  }

  /**
   * Get current user profile
   * Sprint 0: Always returns null
   * Sprint 1+: Returns user data from Clerk
   */
  async getCurrentUser(): Promise<UserProfile | null> {
    // Sprint 0: Always return null (no user)
    return null;
  }

  /**
   * Get current authentication state
   * Sprint 0: Always returns unauthenticated state
   */
  async getAuthState(): Promise<AuthState> {
    return {
      isAuthenticated: false,
      user: null,
      session: null,
      lastChecked: new Date().toISOString()
    };
  }

  /**
   * Initiate login process
   * Sprint 0: Does nothing (no-op)
   * Sprint 1+: Redirects to Clerk sign-in
   */
  async login(): Promise<void> {
    // Sprint 0: No-op - don't show any auth UI
    console.log('[AuthManager] Login called - Sprint 0 stub (no-op)');
  }

  /**
   * Initiate logout process
   * Sprint 0: Does nothing (no-op)
   * Sprint 1+: Clears session with Clerk
   */
  async logout(): Promise<void> {
    // Sprint 0: No-op - nothing to log out from
    console.log('[AuthManager] Logout called - Sprint 0 stub (no-op)');
  }

  /**
   * Check for session changes (e.g., user logged in via web dashboard)
   * Sprint 0: Always returns false
   * Sprint 1+: Checks for cross-tab authentication via Clerk
   */
  async checkSessionStatus(): Promise<boolean> {
    // Sprint 0: Always return false (no session changes)
    return false;
  }

  /**
   * Get user preferences (with defaults)
   * Sprint 0: Returns default preferences for offline use
   */
  async getUserPreferences(): Promise<UserPreferences> {
    // Sprint 0: Return default preferences for current functionality
    const defaults: UserPreferences = {
      theme: 'auto',
      autoSync: false, // Cloud sync disabled in Sprint 0
      syncInterval: 30,
      exportFormat: 'xlsx', // Default to current Excel export
      notifications: false
    };

    try {
      const stored = await this.storage.load('user_preferences');
      if (stored && typeof stored === 'object') {
        return { ...defaults, ...stored as UserPreferences };
      }
    } catch (error) {
      console.warn('[AuthManager] Could not load user preferences:', error);
    }

    return defaults;
  }

  /**
   * Update user preferences
   * Sprint 0: Stores locally only
   * Sprint 1+: Syncs with backend
   */
  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    try {
      const current = await this.getUserPreferences();
      const updated = { ...current, ...preferences };
      await this.storage.save('user_preferences', updated);
      
      // Emit event for any listeners
      this.emitAuthEvent({
        type: 'auth_check',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[AuthManager] Could not update user preferences:', error);
      throw error;
    }
  }

  /**
   * Add event listener for authentication state changes
   */
  addEventListener(listener: (event: AuthEvent) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: AuthEvent) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Emit authentication event to all listeners
   */
  private emitAuthEvent(event: AuthEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[AuthManager] Error in auth event listener:', error);
      }
    });
  }

  /**
   * Initialize auth manager
   * Sprint 0: Just sets up event listeners
   * Sprint 1+: Initializes Clerk and checks existing session
   */
  async initialize(): Promise<void> {
    console.log('[AuthManager] Initializing - Sprint 0 stub (offline mode)');
    
    // Emit initial auth check event
    this.emitAuthEvent({
      type: 'auth_check',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Check if feature requires authentication
   * Sprint 0: Returns false for all features (everything works offline)
   * Sprint 1+: Returns true for cloud features
   */
  requiresAuth(feature: string): boolean {
    // Sprint 0: No features require authentication
    const authRequiredFeatures = [
      'cloud_sync',
      'real_time_sync', 
      'shared_presentations',
      'user_dashboard'
    ];
    
    // Always return false in Sprint 0
    return false;
  }

  /**
   * Get authentication status for UI display
   * Sprint 0: Always returns offline status
   */
  getUIAuthStatus(): {
    status: 'offline' | 'authenticating' | 'authenticated' | 'error';
    message: string;
    showAuthUI: boolean;
  } {
    return {
      status: 'offline',
      message: 'Working offline',
      showAuthUI: false // Never show auth UI in Sprint 0
    };
  }
}

// Export a default instance for easy use
export const authManager = new AuthManager(); 