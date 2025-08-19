'use client';

import React from 'react';
import { useAuth, useUser, ClerkLoading, ClerkLoaded } from '@clerk/nextjs';
import type { UserResource } from '@clerk/types';
import { Button } from './Button';

export interface NavigationProps {
  className?: string;
}

export const Navigation: React.FC<NavigationProps> = ({ className = '' }) => {
  // Safe useAuth and useUser hook calls with fallback for placeholder keys
  const auth = useAuth();
  const { user } = useUser();
  
  let isSignedIn: boolean = false;
  let signOut: (() => Promise<void>) | null = null;
  let clerkUser: UserResource | null = null;
  
  try {
    isSignedIn = auth.isSignedIn ?? false;
    signOut = auth.signOut;
    clerkUser = user ?? null;
  } catch {
    // Hooks called outside ClerkProvider (placeholder keys) - use fallbacks
    console.log('[Nav] Using fallback auth state (placeholder keys)');
  }
  
  // Extract user data directly from Clerk
  const userData = clerkUser ? {
    email: clerkUser.emailAddresses[0]?.emailAddress || 'No email found',
    name: clerkUser.firstName && clerkUser.lastName 
      ? `${clerkUser.firstName} ${clerkUser.lastName}` 
      : clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress || 'User'
  } : null;

  console.log('[Nav] User data from Clerk:', userData);

  const handleSignIn = () => {
    // For now, redirect to sign-in page or implement Clerk modal
    window.location.href = '/sign-in';
  };

  const handleSignOut = async () => {
    try {
      // Use Clerk's signOut method if available
      if (signOut) {
        await signOut();
      }
      
      // Clear our localStorage as well
      const authKeys = [
        'clerk_session_token', 'clerk_jwt_token', 'device_token',
        'device_id', 'pairing_code', 'user_email', 'user_name',
        'user_id', 'user_clerk_id', 'gamma_auth_state'
      ];
      authKeys.forEach(key => localStorage.removeItem(key));
      
      // Redirect to home page after sign out
      window.location.href = '/';
      
    } catch (error) {
      console.error('[Nav] Sign out failed:', error);
      // Fallback: clear localStorage and reload
      const authKeys = [
        'clerk_session_token', 'clerk_jwt_token', 'device_token',
        'device_id', 'pairing_code', 'user_email', 'user_name',
        'user_id', 'user_clerk_id', 'gamma_auth_state'
      ];
      authKeys.forEach(key => localStorage.removeItem(key));
      window.location.reload();
    }
  };

  return (
    <nav className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-productory-purple-1 rounded-lg flex items-center justify-center text-white text-sm sm:text-lg font-bold">
              GT
            </div>
            <span className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
              <span className="hidden sm:inline">Gamma Timetable</span>
              <span className="sm:hidden">Gamma</span>
            </span>
          </div>
          
          {/* User menu with loading states */}
          <ClerkLoading>
            {/* Loading skeleton - matches both states to prevent layout shift */}
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex flex-col items-end">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-8 w-12 sm:w-16 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </ClerkLoading>
          
          <ClerkLoaded>
            {isSignedIn ? (
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Desktop user info */}
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                    {userData?.email || 'Loading...'}
                  </span>
                  {userData?.name && userData.name !== userData.email && (
                    <span className="text-xs text-gray-500 truncate max-w-[200px]">
                      {userData.name}
                    </span>
                  )}
                </div>
                
                {/* Mobile user avatar */}
                <div className="md:hidden w-8 h-8 bg-productory-surface-tinted rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-productory-purple-1">
                    {userData?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={handleSignOut}
                  className="hidden sm:inline-flex"
                >
                  Sign Out
                </Button>
                
                {/* Mobile sign out - icon only */}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleSignOut}
                  className="sm:hidden px-2"
                  title="Sign Out"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </Button>
              </div>
            ) : (
              <Button 
                variant="primary" 
                size="sm"
                onClick={handleSignIn}
                className="text-sm px-3 sm:px-4"
              >
                <span className="hidden sm:inline">Sign In</span>
                <span className="sm:hidden">Sign</span>
              </Button>
            )}
          </ClerkLoaded>
        </div>
      </div>
    </nav>
  );
};

Navigation.displayName = 'Navigation';