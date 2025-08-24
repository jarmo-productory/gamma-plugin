# Next.js Authentication Architecture Design
**Sprint 6 Day 8-10: Authentication Integration for Next.js**  
**Date:** 2025-08-17  
**Author:** Tech Lead Architect

## Executive Summary

This document defines the authentication architecture for migrating from vanilla JavaScript to Next.js while preserving all existing functionality, particularly the device pairing flow critical to extension-web communication.

## Current State Analysis

### Existing Authentication Flow (Vanilla JS)
1. **Clerk SDK Initialization**: Dynamic import from CDN with publishable key
2. **Session Management**: `getCurrentUser()` checks Clerk session and localStorage
3. **Device Pairing**: URL parameter `?code=XXXXX` triggers pairing flow
4. **Token Storage**: Multiple localStorage keys for session persistence
5. **API Authentication**: Bearer token via Authorization header

### Critical localStorage Keys
```javascript
// Extension relies on these exact keys
'clerk_session_token'  // Primary auth token
'clerk_jwt_token'      // Legacy JWT support
'user_id'              // Database user ID
'user_email'           // User email from DB
'user_name'            // User display name
'user_clerk_id'        // Clerk user ID
'device_token'         // Device-specific token
'device_id'            // Device identifier
'pairing_code'         // Active pairing code
```

### Device Pairing Flow Requirements
1. Extension opens: `https://dashboard.com/sign-in?code=ABC123`
2. Web app detects `?code` parameter
3. If not authenticated → redirect to sign-in preserving code
4. After authentication → auto-link device via `/api/devices/link`
5. Success → clear URL parameter, show success message
6. Extension polls `/api/devices/exchange` for token

## Next.js Architecture Design

### 1. Authentication Provider Architecture

```typescript
// src/lib/auth/clerk-provider.tsx
'use client';

import { ClerkProvider as BaseClerkProvider } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return (
    <BaseClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      afterSignInUrl="/"
      afterSignUpUrl="/"
      signInUrl="/sign-in"
    >
      <AuthStateSync>
        {children}
      </AuthStateSync>
    </BaseClerkProvider>
  );
}

// Sync Clerk state to localStorage for extension compatibility
function AuthStateSync({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  
  useEffect(() => {
    if (!isLoaded) return;
    
    const syncAuthState = async () => {
      if (isSignedIn && userId) {
        // Get session token
        const token = await getToken();
        if (token) {
          localStorage.setItem('clerk_session_token', token);
        }
        
        // Bootstrap user from database
        await bootstrapUser(token);
      } else {
        // Clear auth state
        clearAuthState();
      }
    };
    
    syncAuthState();
  }, [isLoaded, isSignedIn, userId, getToken]);
  
  return <>{children}</>;
}
```

### 2. User Bootstrap Service

```typescript
// src/lib/auth/user-bootstrap.ts
export async function bootstrapUser(token: string | null) {
  if (!token) return null;
  
  try {
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
      localStorage.setItem('user_id', user.id);
      localStorage.setItem('user_email', user.email);
      localStorage.setItem('user_name', user.name || '');
      localStorage.setItem('user_clerk_id', user.clerkId);
      
      return user;
    }
  } catch (error) {
    console.error('[Auth] Bootstrap failed:', error);
  }
  
  return null;
}

export function clearAuthState() {
  const authKeys = [
    'clerk_session_token', 'clerk_jwt_token', 'device_token',
    'device_id', 'pairing_code', 'user_email', 'user_name',
    'user_id', 'user_clerk_id', 'gamma_auth_state'
  ];
  
  authKeys.forEach(key => localStorage.removeItem(key));
}
```

### 3. Device Pairing Hook

```typescript
// src/lib/hooks/use-device-pairing.ts
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useSearchParams, useRouter } from 'next/navigation';

export function useDevicePairing() {
  const { isSignedIn, getToken } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pairingStatus, setPairingStatus] = useState<
    'idle' | 'pending' | 'linking' | 'success' | 'error'
  >('idle');
  
  const pairingCode = searchParams.get('code');
  
  useEffect(() => {
    if (!pairingCode || !isSignedIn) return;
    
    const linkDevice = async () => {
      setPairingStatus('linking');
      
      try {
        const token = await getToken();
        const response = await fetch('/api/devices/link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ code: pairingCode })
        });
        
        if (response.ok) {
          setPairingStatus('success');
          // Clear code from URL
          router.replace(window.location.pathname);
        } else {
          setPairingStatus('error');
        }
      } catch (error) {
        setPairingStatus('error');
      }
    };
    
    linkDevice();
  }, [pairingCode, isSignedIn, getToken, router]);
  
  return {
    pairingCode,
    pairingStatus,
    needsAuth: pairingCode && !isSignedIn
  };
}
```

### 4. Sign-In Page Implementation

```typescript
// src/app/sign-in/page.tsx
'use client';

import { SignIn } from '@clerk/nextjs';
import { useDevicePairing } from '@/lib/hooks/use-device-pairing';

export default function SignInPage() {
  const { pairingCode, needsAuth } = useDevicePairing();
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full">
        {pairingCode && (
          <div className="mb-8 p-4 bg-blue-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Device Pairing</h2>
            <p className="text-gray-600">
              Sign in to connect your extension to your account.
            </p>
          </div>
        )}
        
        <SignIn
          afterSignInUrl={pairingCode ? `/?code=${pairingCode}` : '/dashboard'}
          redirectUrl={pairingCode ? `/?code=${pairingCode}` : '/dashboard'}
        />
      </div>
    </div>
  );
}
```

### 5. Dashboard with Pairing Handler

```typescript
// src/app/dashboard/page.tsx
'use client';

import { useAuth } from '@clerk/nextjs';
import { useDevicePairing } from '@/lib/hooks/use-device-pairing';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const { isSignedIn, userId } = useAuth();
  const { pairingStatus } = useDevicePairing();
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    // Load user data from localStorage (for compatibility)
    if (isSignedIn) {
      setUser({
        id: localStorage.getItem('user_id'),
        email: localStorage.getItem('user_email'),
        name: localStorage.getItem('user_name')
      });
    }
  }, [isSignedIn]);
  
  if (pairingStatus === 'linking') {
    return <PairingProgress />;
  }
  
  if (pairingStatus === 'success') {
    return <PairingSuccess />;
  }
  
  return <DashboardContent user={user} />;
}
```

## Static Export Configuration

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  // Preserve trailing slashes for Netlify
  trailingSlash: true,
  // Environment variables
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  }
};

export default nextConfig;
```

## Implementation Strategy

### Phase 1: Core Authentication (2 hours)
1. Set up ClerkProvider with App Router
2. Implement AuthStateSync for localStorage compatibility
3. Create user bootstrap service
4. Test session persistence

### Phase 2: Device Pairing (2 hours)
1. Implement useDevicePairing hook
2. Create sign-in page with pairing awareness
3. Handle post-auth redirect with code preservation
4. Test end-to-end pairing flow

### Phase 3: Dashboard Migration (3 hours)
1. Port dashboard components to React/JSX
2. Integrate authentication state
3. Implement pairing success UI
4. Test with extension

### Phase 4: Production Build (1 hour)
1. Configure static export
2. Test build output
3. Verify Netlify deployment
4. End-to-end validation

## Risk Assessment & Mitigation

### Risk 1: Session State Loss
**Issue**: Clerk session not persisting across page reloads  
**Mitigation**: Use Clerk's built-in session management with cookies, sync to localStorage as backup

### Risk 2: Device Pairing URL Parameter Loss
**Issue**: Code parameter lost during authentication redirects  
**Mitigation**: Explicitly preserve in afterSignInUrl, use URL state management

### Risk 3: API Authentication Mismatch
**Issue**: Token format incompatibility with Netlify functions  
**Mitigation**: Use getToken() for consistent JWT format, maintain Authorization header pattern

### Risk 4: localStorage Race Conditions
**Issue**: Extension reads localStorage before values set  
**Mitigation**: Implement retry logic in extension, use storage events for real-time sync

### Risk 5: Static Export Limitations
**Issue**: No server-side features available  
**Mitigation**: All API calls to Netlify functions, client-side only authentication

## Success Criteria

1. ✅ User can authenticate via Clerk in Next.js app
2. ✅ Session persists across page reloads
3. ✅ Device pairing flow works identically to vanilla JS
4. ✅ All localStorage keys populated correctly
5. ✅ Extension can read auth state from localStorage
6. ✅ API calls authenticate with Bearer tokens
7. ✅ Static export builds successfully
8. ✅ Zero TypeScript errors maintained

## Migration Checklist

- [ ] Install and configure @clerk/nextjs
- [ ] Create ClerkProvider with localStorage sync
- [ ] Implement user bootstrap service
- [ ] Create device pairing hook
- [ ] Build sign-in page with pairing support
- [ ] Migrate dashboard to React components
- [ ] Configure static export in next.config.ts
- [ ] Test end-to-end authentication flow
- [ ] Verify extension compatibility
- [ ] Production build validation

## Conclusion

This architecture preserves all existing authentication functionality while leveraging Next.js and React patterns. The key innovation is the AuthStateSync component that bridges Clerk's React-based state management with the localStorage-based approach required for extension compatibility.

The implementation maintains backward compatibility while providing a modern development experience with hot reload, TypeScript support, and component-based architecture.