'use client';

import { ClerkProvider as BaseClerkProvider } from '@clerk/nextjs';
import { ReactNode } from 'react';

interface ClerkProviderProps {
  children: ReactNode;
}

export function ClerkProvider({ children }: ClerkProviderProps) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  // In development/test mode with placeholder keys, skip Clerk initialization
  const isPlaceholderKey = publishableKey?.includes('example') || 
                          publishableKey?.includes('test_Y2xlcms');
  
  if (!publishableKey || isPlaceholderKey) {
    if (!publishableKey) {
      console.warn('[Auth] No Clerk publishable key found');
    } else {
      console.warn('[Auth] Using placeholder Clerk key - authentication disabled');
    }
    // Return children without Clerk in development if key is missing or placeholder
    return <>{children}</>;
  }
  
  return (
    <BaseClerkProvider
      publishableKey={publishableKey}
      afterSignInUrl="/"
      afterSignUpUrl="/"
      signInUrl="/sign-in"
    >
      {children}
    </BaseClerkProvider>
  );
}