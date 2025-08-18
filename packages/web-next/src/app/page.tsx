'use client';

import { Suspense, useState, useEffect } from 'react';
import { useAuth, ClerkLoading, ClerkLoaded } from '@clerk/nextjs';
import { useDevicePairing } from '@/hooks/useDevicePairing';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Navigation } from '@/components/Navigation';
import { LandingPage } from '@/components/LandingPage';
import { Dashboard } from '@/components/Dashboard';

interface LocalStorageState {
  clerkSessionToken: boolean;
  userId: string;
  userEmail: string;
  deviceId: string;
  deviceToken: boolean;
}

function DashboardContent() {
  // Safe useAuth hook call with fallback for placeholder keys
  let isSignedIn = false;
  let userId: string | null = null;
  
  try {
    const auth = useAuth();
    isSignedIn = auth.isSignedIn ?? false;
    userId = auth.userId ?? null;
  } catch {
    // useAuth called outside ClerkProvider (placeholder keys) - use fallbacks
    console.log('[Auth] Using fallback auth state (placeholder keys)');
    isSignedIn = false;
    userId = null;
  }
  
  const { pairingCode, pairingStatus, errorMessage } = useDevicePairing();
  
  // Initialize localStorage state with server-safe defaults
  const [localStorageState, setLocalStorageState] = useState<LocalStorageState>({
    clerkSessionToken: false,
    userId: 'Not set',
    userEmail: 'Not set',
    deviceId: 'Not set',
    deviceToken: false
  });
  
  // Update localStorage state after hydration (client-only)
  useEffect(() => {
    setLocalStorageState({
      clerkSessionToken: !!localStorage.getItem('clerk_session_token'),
      userId: localStorage.getItem('user_id') || 'Not set',
      userEmail: localStorage.getItem('user_email') || 'Not set',
      deviceId: localStorage.getItem('device_id') || 'Not set',
      deviceToken: !!localStorage.getItem('device_token')
    });
  }, []);

  const handleGetStarted = () => {
    // Navigate to sign-in (for now, will integrate with Clerk later)
    window.location.href = '/sign-in';
  };

  return (
    <div className="min-h-screen font-sans">
      <Navigation />
      <main className="max-w-4xl mx-auto p-8">
        {/* Device Pairing Status */}
        {pairingStatus !== 'idle' && (
          <Card className="mb-6 p-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Device Pairing</h2>
              
              {pairingStatus === 'pending' && (
                <div className="text-yellow-600">
                  <p>Please sign in to link your extension.</p>
                  <p className="text-sm text-gray-600 mt-2">Pairing code: {pairingCode}</p>
                </div>
              )}
              
              {pairingStatus === 'linking' && (
                <div className="text-blue-600">
                  <p>Linking your device...</p>
                </div>
              )}
              
              {pairingStatus === 'success' && (
                <div className="text-green-600">
                  <p>✓ Device linked successfully!</p>
                </div>
              )}
              
              {pairingStatus === 'error' && (
                <div className="text-red-600">
                  <p>✗ {errorMessage || 'Failed to link device'}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Main content with loading states */}
        <ClerkLoading>
          {/* Loading skeleton for main content */}
          <div className="text-center max-w-[600px] mx-auto">
            <div className="h-12 w-96 bg-gray-200 rounded animate-pulse mb-4 mx-auto"></div>
            <div className="h-6 w-64 bg-gray-200 rounded animate-pulse mb-8 mx-auto"></div>
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse mx-auto"></div>
          </div>
        </ClerkLoading>

        <ClerkLoaded>
          {/* Conditional rendering: Dashboard vs Landing Page */}
          {isSignedIn ? (
            <Dashboard />
          ) : (
            <LandingPage onGetStarted={handleGetStarted} />
          )}

          {/* Development Debug Section - only show when in dev mode */}
          {process.env.NODE_ENV === 'development' && (
            <>
              {/* Authentication Status */}
              <Card className="mt-6 p-6">
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Authentication Status (Debug)</h2>
                  
                  {!isSignedIn && (
                    <div>
                      <p className="text-gray-600 mb-4">You are not signed in.</p>
                      <Button variant="primary" size="md">
                        <a href="/sign-in">Sign In</a>
                      </Button>
                    </div>
                  )}
                  
                  {isSignedIn && (
                    <div className="space-y-2">
                      <p className="text-green-600">✓ Signed in</p>
                      <p className="text-sm text-gray-600">User ID: {userId}</p>
                      
                      {/* Display localStorage values for debugging */}
                      <div className="mt-4 p-4 bg-gray-50 rounded">
                        <h3 className="text-sm font-semibold mb-2">localStorage State:</h3>
                        <ul className="text-xs space-y-1 font-mono">
                          <li>clerk_session_token: {localStorageState.clerkSessionToken ? '✓ Present' : '✗ Missing'}</li>
                          <li>user_id: {localStorageState.userId}</li>
                          <li>user_email: {localStorageState.userEmail}</li>
                          <li>device_id: {localStorageState.deviceId}</li>
                          <li>device_token: {localStorageState.deviceToken ? '✓ Present' : '✗ Missing'}</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
              
              {/* Quick Actions */}
              <Card className="mt-6 p-6">
                <h2 className="text-xl font-semibold mb-4">Quick Actions (Debug)</h2>
                <div className="flex gap-4">
                  <Button 
                    variant="secondary" 
                    size="md"
                    onClick={() => {
                      // Simulate device pairing by adding code to URL
                      const testCode = 'TEST' + Math.random().toString(36).substring(2, 8).toUpperCase();
                      window.location.href = `/?code=${testCode}`;
                    }}
                  >
                    Test Device Pairing
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="md"
                    onClick={() => {
                      // Clear all localStorage
                      const authKeys = [
                        'clerk_session_token', 'clerk_jwt_token', 'device_token',
                        'device_id', 'pairing_code', 'user_email', 'user_name',
                        'user_id', 'user_clerk_id', 'gamma_auth_state'
                      ];
                      authKeys.forEach(key => localStorage.removeItem(key));
                      window.location.reload();
                    }}
                  >
                    Clear Auth State
                  </Button>
                </div>
              </Card>
            </>
          )}
        </ClerkLoaded>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen font-sans">
        <Navigation />
        <div className="max-w-4xl mx-auto p-8">
          <h1 className="text-4xl font-bold mb-8">Gamma Timetable Dashboard</h1>
          <Card className="p-6">
            <p className="text-gray-600">Loading...</p>
          </Card>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}