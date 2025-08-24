/**
 * Unified Authentication Manager
 * 
 * Single source of truth for authentication state across extension and web.
 * Solves UX issues with confusing auth flows and missing logout buttons.
 */

export type AuthState = 
  | 'LOGGED_OUT'
  | 'DEVICE_REGISTERED' 
  | 'PAIRING_IN_PROGRESS'
  | 'AUTHENTICATED';

export interface AuthData {
  state: AuthState;
  deviceId?: string;
  pairingCode?: string;
  userId?: string;
  userEmail?: string;
  deviceToken?: string;
  clerkToken?: string;
}

export class UnifiedAuthManager {
  private static instance: UnifiedAuthManager;
  private storageKey = 'gamma_auth_state';
  
  private constructor() {}
  
  static getInstance(): UnifiedAuthManager {
    if (!UnifiedAuthManager.instance) {
      UnifiedAuthManager.instance = new UnifiedAuthManager();
    }
    return UnifiedAuthManager.instance;
  }
  
  /**
   * Get current authentication state
   */
  getState(): AuthData {
    if (typeof window === 'undefined') {
      return { state: 'LOGGED_OUT' };
    }
    
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) {
      return { state: 'LOGGED_OUT' };
    }
    
    try {
      const data = JSON.parse(stored) as AuthData;
      
      // Validate state and upgrade if needed
      if (data.deviceToken && data.userId) {
        data.state = 'AUTHENTICATED';
      } else if (data.pairingCode && data.deviceId) {
        data.state = 'PAIRING_IN_PROGRESS';
      } else if (data.deviceId) {
        data.state = 'DEVICE_REGISTERED';
      } else {
        data.state = 'LOGGED_OUT';
      }
      
      return data;
    } catch {
      return { state: 'LOGGED_OUT' };
    }
  }
  
  /**
   * Update authentication state
   */
  setState(updates: Partial<AuthData>): void {
    if (typeof window === 'undefined') return;
    
    const current = this.getState();
    const newData = { ...current, ...updates };
    
    // Auto-calculate state based on data
    if (newData.deviceToken && newData.userId) {
      newData.state = 'AUTHENTICATED';
    } else if (newData.pairingCode && newData.deviceId) {
      newData.state = 'PAIRING_IN_PROGRESS';
    } else if (newData.deviceId) {
      newData.state = 'DEVICE_REGISTERED';
    } else {
      newData.state = 'LOGGED_OUT';
    }
    
    localStorage.setItem(this.storageKey, JSON.stringify(newData));
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('gamma-auth-changed', { 
      detail: newData 
    }));
  }
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const { state } = this.getState();
    return state === 'AUTHENTICATED';
  }
  
  /**
   * Clear all authentication data (logout)
   */
  logout(): void {
    if (typeof window === 'undefined') return;
    
    // Clear all auth-related storage
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem('clerk_session_token');
    localStorage.removeItem('clerk_jwt_token');
    localStorage.removeItem('device_id');
    localStorage.removeItem('device_token');
    localStorage.removeItem('pairing_code');
    
    // Dispatch logout event
    window.dispatchEvent(new CustomEvent('gamma-auth-logout'));
    
    // Reset to clean state
    this.setState({ state: 'LOGGED_OUT' });
  }
  
  /**
   * Complete logout for testing (clears absolutely everything)
   */
  resetForTesting(): void {
    this.logout();
    
    // Additional cleanup for testing
    if (typeof window !== 'undefined') {
      // Clear any session storage
      sessionStorage.clear();
      
      // Clear any cookies (if accessible)
      document.cookie.split(";").forEach(c => {
        document.cookie = c.replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    }
    
    console.log('[Auth] Complete reset for testing completed');
  }
  
  /**
   * Register device (start auth flow)
   */
  registerDevice(deviceId: string, pairingCode?: string): void {
    this.setState({
      deviceId,
      pairingCode,
      state: pairingCode ? 'PAIRING_IN_PROGRESS' : 'DEVICE_REGISTERED'
    });
  }
  
  /**
   * Complete authentication
   */
  authenticate(userId: string, userEmail: string, deviceToken: string, clerkToken?: string): void {
    this.setState({
      userId,
      userEmail,
      deviceToken,
      clerkToken,
      state: 'AUTHENTICATED'
    });
  }
}

// Export singleton instance
export const authManager = UnifiedAuthManager.getInstance();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).gammaAuth = authManager;
}