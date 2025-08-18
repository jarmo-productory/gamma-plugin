'use client';

import React from 'react';
import { useAuth, useUser, ClerkLoading, ClerkLoaded } from '@clerk/nextjs';
import { Button } from './Button';

export interface NavigationProps {
  className?: string;
}

export const Navigation: React.FC<NavigationProps> = ({ className = '' }) => {
  // Safe useAuth and useUser hook calls with fallback for placeholder keys
  let isSignedIn: boolean = false;
  let signOut: (() => Promise<void>) | null = null;
  let clerkUser: any = null;
  
  try {
    const auth = useAuth();
    const { user } = useUser();
    
    isSignedIn = auth.isSignedIn ?? false;
    signOut = auth.signOut;
    clerkUser = user;
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
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center text-white text-lg font-bold">
              GT
            </div>
            <span className="text-xl font-semibold text-gray-900">
              Gamma Timetable
            </span>
          </div>
          
          {/* User menu with loading states */}
          <ClerkLoading>
            {/* Loading skeleton - matches both states to prevent layout shift */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </ClerkLoading>
          
          <ClerkLoaded>
            {isSignedIn ? (
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-gray-900">
                    {userData?.email || 'Loading...'}
                  </span>
                  {userData?.name && userData.name !== userData.email && (
                    <span className="text-xs text-gray-500">
                      {userData.name}
                    </span>
                  )}
                </div>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button 
                variant="primary" 
                size="sm"
                onClick={handleSignIn}
              >
                Sign In
              </Button>
            )}
          </ClerkLoaded>
        </div>
      </div>
    </nav>
  );
};

Navigation.displayName = 'Navigation';