'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export type PairingStatus = 'idle' | 'pending' | 'linking' | 'success' | 'error';

interface DevicePairingState {
  pairingCode: string | null;
  pairingStatus: PairingStatus;
  errorMessage?: string;
  needsAuth: boolean;
}

export function useDevicePairing(): DevicePairingState {
  // Safe useAuth hook call with fallback for placeholder keys
  let isSignedIn = false;
  let isLoaded = true;
  let authGetToken = async (): Promise<string | null> => null;
  
  try {
    const auth = useAuth();
    isSignedIn = auth.isSignedIn ?? false;
    isLoaded = auth.isLoaded ?? false;
    authGetToken = auth.getToken;
  } catch {
    // useAuth called outside ClerkProvider (placeholder keys) - use fallbacks
    console.log('[DevicePairing] Using fallback auth state (placeholder keys)');
  }

  const getToken = useCallback(async () => {
    return authGetToken();
  }, [authGetToken]);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const [pairingStatus, setPairingStatus] = useState<PairingStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>();
  
  const pairingCode = searchParams.get('code');
  
  useEffect(() => {
    // Only proceed if Clerk is loaded
    if (!isLoaded) return;
    
    // No pairing code in URL, nothing to do
    if (!pairingCode) {
      setPairingStatus('idle');
      return;
    }
    
    // Store pairing code in localStorage for persistence during auth flow
    localStorage.setItem('pairing_code', pairingCode);
    
    // User needs to authenticate first
    if (!isSignedIn) {
      setPairingStatus('pending');
      return;
    }
    
    // User is signed in and we have a pairing code, link the device
    const linkDevice = async () => {
      setPairingStatus('linking');
      
      try {
        const token = await getToken();
        if (!token) {
          throw new Error('Failed to get authentication token');
        }
        
        console.log('[DevicePairing] Linking device with code:', pairingCode);
        
        const response = await fetch('/api/devices/link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ code: pairingCode })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('[DevicePairing] Device linked successfully:', data);
          
          // Store device information
          if (data.deviceId) {
            localStorage.setItem('device_id', data.deviceId);
          }
          if (data.deviceToken) {
            localStorage.setItem('device_token', data.deviceToken);
          }
          
          setPairingStatus('success');
          
          // Clear pairing code from localStorage
          localStorage.removeItem('pairing_code');
          
          // Clean URL by removing the code parameter
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('code');
          router.replace(newUrl.pathname + newUrl.search);
          
          // Show success message for 3 seconds
          setTimeout(() => {
            setPairingStatus('idle');
          }, 3000);
        } else {
          const errorData = await response.text();
          console.error('[DevicePairing] Device linking failed:', response.status, errorData);
          
          if (response.status === 404) {
            setErrorMessage('Invalid or expired pairing code');
          } else if (response.status === 401) {
            setErrorMessage('Authentication required');
          } else {
            setErrorMessage('Failed to link device. Please try again.');
          }
          
          setPairingStatus('error');
          
          // Clear invalid pairing code
          localStorage.removeItem('pairing_code');
          
          // Clear code from URL after error
          setTimeout(() => {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('code');
            router.replace(newUrl.pathname + newUrl.search);
            setPairingStatus('idle');
          }, 5000);
        }
      } catch (error) {
        console.error('[DevicePairing] Error linking device:', error);
        setErrorMessage('An unexpected error occurred. Please try again.');
        setPairingStatus('error');
        
        // Clear on error
        localStorage.removeItem('pairing_code');
        
        // Reset after showing error
        setTimeout(() => {
          setPairingStatus('idle');
        }, 5000);
      }
    };
    
    linkDevice();
  }, [pairingCode, isSignedIn, isLoaded, getToken, router, pathname]);
  
  return {
    pairingCode,
    pairingStatus,
    errorMessage,
    needsAuth: Boolean(pairingCode && !isSignedIn)
  };
}