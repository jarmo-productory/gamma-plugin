'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useCallback } from 'react';

// Component that uses Clerk hooks when available
function ClerkAuthStateSync() {
  // Safe useAuth hook call with fallback for placeholder keys
  let isLoaded = true;
  let isSignedIn = false;
  let userId = null;
  let authGetToken = async (): Promise<string | null> => null;
  let hasValidAuth = false;
  
  try {
    const auth = useAuth();
    isLoaded = auth.isLoaded ?? false;
    isSignedIn = auth.isSignedIn ?? false;
    userId = auth.userId;
    authGetToken = auth.getToken;
    hasValidAuth = true;
  } catch {
    // useAuth called outside ClerkProvider (placeholder keys) - use fallbacks
    console.log('[AuthStateSync] Using fallback auth state (placeholder keys)');
    hasValidAuth = false;
  }

  const getToken = useCallback(async () => {
    if (!hasValidAuth) return null;
    return authGetToken();
  }, [hasValidAuth, authGetToken]);
  
  useEffect(() => {
    if (!hasValidAuth) return;
    if (!isLoaded) return;
    
    const syncAuthState = async () => {
      if (isSignedIn && userId) {
        try {
          // Get session token from Clerk
          const token = await getToken();
          
          if (token) {
            // Store the session token for extension compatibility
            localStorage.setItem('clerk_session_token', token);
            
            // Bootstrap user from database
            await bootstrapUser(token);
          }
        } catch (error) {
          console.error('[Auth] Failed to sync auth state:', error);
        }
      } else {
        // User is not signed in, clear auth state
        clearAuthState();
      }
    };
    
    syncAuthState();
  }, [hasValidAuth, isLoaded, isSignedIn, userId, getToken]);
  
  return null;
}

// Fallback component for development/placeholder mode
function MockAuthStateSync() {
  useEffect(() => {
    // In development mode, clear any existing auth state
    clearAuthState();
    console.log('[Auth] Running in development mode - authentication disabled');
  }, []);
  
  return null;
}

export function AuthStateSync() {
  // Check if we have a valid (non-placeholder) Clerk key
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const isPlaceholderKey = publishableKey?.includes('example') || 
                          publishableKey?.includes('test_Y2xlcms');
  
  // Conditionally render the appropriate component
  if (!publishableKey || isPlaceholderKey) {
    return <MockAuthStateSync />;
  }
  
  return <ClerkAuthStateSync />;
}

async function bootstrapUser(token: string) {
  try {
    console.log('[Auth] Bootstrapping user from database...');
    
    const response = await fetch('/api/auth/bootstrap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const { user } = await response.json();
      
      // Store user data in localStorage for extension compatibility
      // Using exact same keys as vanilla JS implementation
      localStorage.setItem('user_id', user.id);
      localStorage.setItem('user_email', user.email);
      localStorage.setItem('user_name', user.name || '');
      localStorage.setItem('user_clerk_id', user.clerkId);
      
      console.log('[Auth] User bootstrapped from database:', user);
      return user;
    } else {
      const errorText = await response.text();
      console.error('[Auth] User bootstrap failed:', response.status, errorText);
    }
  } catch (error) {
    console.error('[Auth] User bootstrap error:', error);
  }
  
  return null;
}

function clearAuthState() {
  // Clear all auth-related localStorage keys
  // Using exact same keys as vanilla JS implementation
  const authKeys = [
    'clerk_session_token',
    'clerk_jwt_token',
    'device_token',
    'device_id',
    'pairing_code',
    'user_email',
    'user_name',
    'user_id',
    'user_clerk_id',
    'gamma_auth_state'
  ];
  
  authKeys.forEach(key => localStorage.removeItem(key));
  console.log('[Auth] Cleared auth state from localStorage');
}