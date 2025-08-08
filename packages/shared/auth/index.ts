/**
 * Authentication Manager
 *
 * Integrates with Clerk for authentication.
 */
import { Clerk } from '@clerk/clerk-js';
import { StorageManager } from '../storage';
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
  private clerk: Clerk | null = null;
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
    console.log('[AuthManager] initialize() called');
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.error('[AuthManager] Clerk publishable key not found.');
      return;
    }

    try {
      // Use full ClerkJS (with UI components) so we can open modal in the extension
      this.clerk = new Clerk(publishableKey);
      console.log('[AuthManager] Clerk instance created');
      await this.clerk.load();
      console.log('[AuthManager] Clerk loaded');

      this.clerk.addListener(event => {
        this.handleClerkStateChange(event);
      });

      // Set initial state
      this.updateAuthState();
      console.log('[AuthManager] Initialization complete');
    } catch (error) {
      console.error('[AuthManager] Failed to load Clerk:', error);
      this.clerk = null;
    }
  }

  private updateAuthState() {
    if (!this.clerk) return;

    const user = this.clerk.user;
    const session = this.clerk.session;

    this.authState = {
      isAuthenticated: !!user && !!session,
      user: user
        ? {
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress || '',
            name: user.fullName || '',
            createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
          }
        : null,
      session: session
        ? {
            userId: session.user.id,
            token: session.lastActiveToken?.getRawString() || '',
            expiresAt: session.expireAt.toISOString(),
            isActive: session.status === 'active',
          }
        : null,
      lastChecked: new Date().toISOString(),
    };

    this.emitAuthEvent({
      type: this.authState.isAuthenticated ? 'login' : 'logout',
      user: this.authState.user,
      timestamp: new Date().toISOString(),
    });
  }

  private handleClerkStateChange(event: any) {
    console.log('[AuthManager] Clerk state changed:', event);
    this.updateAuthState();
  }

  async isAuthenticated(): Promise<boolean> {
    return this.authState.isAuthenticated;
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    return this.authState.user;
  }

  async getAuthState(): Promise<AuthState> {
    return { ...this.authState };
  }

  async login(): Promise<void> {
    if (!this.clerk) {
      console.error(
        '[AuthManager] Clerk not initialized. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and ensure authManager.initialize() ran successfully.'
      );
      return;
    }
    try {
      const anyClerk: any = this.clerk as any;
      if (typeof anyClerk.openSignIn === 'function') {
        await anyClerk.openSignIn({});
        return;
      }
      // Fallback to redirect/open tab if modal API is unavailable
      const redirectUrl = typeof window !== 'undefined' ? window.location.href : undefined;
      if (typeof anyClerk.buildSignInUrl === 'function') {
        const url = await anyClerk.buildSignInUrl({ redirectUrl });
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
          chrome.tabs.create({ url });
        } else if (typeof window !== 'undefined') {
          window.open(url, '_blank');
        } else {
          await anyClerk.redirectToSignIn({ redirectUrl });
        }
      } else if (typeof anyClerk.redirectToSignIn === 'function') {
        await anyClerk.redirectToSignIn({ redirectUrl });
      }
    } catch (error) {
      console.error('[AuthManager] Error opening sign in:', error);
    }
  }

  async logout(): Promise<void> {
    if (!this.clerk) {
      console.error('[AuthManager] Clerk not initialized.');
      return;
    }
    try {
      const anyClerk: any = this.clerk as any;
      // In extensions, avoid navigating to an invalid page after sign out
      // Redirect back to the side panel HTML if possible
      const fallbackUrl =
        typeof chrome !== 'undefined' && chrome.runtime?.getURL
          ? chrome.runtime.getURL('sidebar.html')
          : typeof window !== 'undefined'
            ? window.location.href
            : undefined;
      if (typeof anyClerk.signOut === 'function') {
        await anyClerk.signOut({ redirectUrl: fallbackUrl });
      } else {
        console.warn('[AuthManager] signOut function not available on Clerk instance');
      }
    } catch (error) {
      console.error('[AuthManager] Error signing out:', error);
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
