/**
 * Authentication management for the Gamma Timetable Extension
 * This will eventually integrate with Clerk for user authentication
 */

export interface AuthToken {
  access_token: string;
  refresh_token: string;
  expires_at: Date;
}

export interface IAuthManager {
  isAuthenticated(): Promise<boolean>;
  login(email: string, password: string): Promise<AuthToken>;
  logout(): Promise<void>;
  refreshToken(): Promise<AuthToken>;
  getCurrentUser(): Promise<any>;
}

// Placeholder for future AuthManager class  
export class AuthManager implements IAuthManager {
  constructor() {
    // Will be implemented in Sprint 0 Deliverable 3
  }

  async isAuthenticated(): Promise<boolean> {
    // For Sprint 0: Always return false (guest mode)
    return false;
  }

  async login(email: string, password: string): Promise<AuthToken> {
    // Will be implemented in Sprint 1 with Clerk integration
    throw new Error('Authentication not yet implemented');
  }

  async logout(): Promise<void> {
    // Will be implemented in Sprint 1
    throw new Error('Authentication not yet implemented');
  }

  async refreshToken(): Promise<AuthToken> {
    // Will be implemented in Sprint 1
    throw new Error('Authentication not yet implemented');
  }

  async getCurrentUser(): Promise<any> {
    // Will be implemented in Sprint 1
    return null;
  }
} 