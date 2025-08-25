'use client';

import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import PairingDialog from '@/components/PairingDialog';
import PairingNotification from '@/components/PairingNotification';

interface DevicePairingProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function DevicePairing({ searchParams: searchParamsPromise }: DevicePairingProps) {
  const clientSearchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPairingDialog, setShowPairingDialog] = useState(false);
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();

  // Handle both server-side Promise and client-side searchParams
  const searchParams = searchParamsPromise ? use(searchParamsPromise) : null;
  
  const pairingCode = searchParams?.code as string || clientSearchParams?.get('code');
  const source = searchParams?.source as string || clientSearchParams?.get('source');
  
  // Check if this is a pairing request
  const isPairingRequest = pairingCode && source === 'extension';

  // Only log on client side after mounting
  useEffect(() => {
    console.log('[DevicePairing] Component mounted');
    console.log('[DevicePairing] Props:', { searchParams: searchParamsPromise });
    console.log('[DevicePairing] Values:', { pairingCode, source, isPairingRequest, user: !!user, loading });
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    console.log('[DevicePairing] Starting auth check...');
    
    // Check authentication status
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        console.log('[DevicePairing] Auth check result:', { 
          user: user ? 'authenticated' : 'not authenticated',
          error: error?.message || 'none'
        });
        setUser(user);
        
        // If user is authenticated and we have a pairing request, show dialog
        if (user && isPairingRequest) {
          setShowPairingDialog(true);
        }
      } catch (error) {
        console.error('[DevicePairing] Error getting user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    getUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[DevicePairing] Auth state change:', event, session?.user ? 'user present' : 'no user');
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setLoading(false);
        
        // Check if we had a pending pairing request
        const pendingCode = localStorage.getItem('pendingPairingCode');
        if (pendingCode && pendingCode === pairingCode && isPairingRequest) {
          localStorage.removeItem('pendingPairingCode');
          // Show pairing dialog after successful authentication
          setTimeout(() => setShowPairingDialog(true), 500);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
        setShowPairingDialog(false);
      } else if (event === 'INITIAL_SESSION') {
        setUser(session?.user || null);
        setLoading(false);
      }
    });

    // Store pairing code for post-auth use if user is not authenticated
    if (isPairingRequest && !user && pairingCode) {
      localStorage.setItem('pendingPairingCode', pairingCode);
    }

    return () => subscription.unsubscribe();
  }, [mounted, pairingCode, source, isPairingRequest]);

  const handlePairingLink = async () => {
    if (!pairingCode || !user) {
      throw new Error('Missing pairing code or user authentication');
    }

    const response = await fetch('/api/devices/link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: pairingCode }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 404) {
        throw new Error('Invalid or expired pairing code. Please try again from your extension.');
      } else if (response.status === 401) {
        throw new Error('Authentication error. Please refresh and try again.');
      } else {
        throw new Error(errorData.error || 'Failed to link device. Please try again.');
      }
    }

    // Success - the dialog will handle the success state
  };

  const handleDialogClose = () => {
    setShowPairingDialog(false);
    // Clean up URL by removing pairing parameters
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('source');
    window.history.replaceState({}, '', url.toString());
  };

  // Loading state
  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto mb-6 p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Not a pairing request - render nothing
  if (!isPairingRequest) {
    return null;
  }

  return (
    <>
      {/* For authenticated users: Show pairing dialog */}
      {user && (
        <PairingDialog
          isOpen={showPairingDialog}
          onClose={handleDialogClose}
          pairingCode={pairingCode}
          onLink={handlePairingLink}
        />
      )}

      {/* For unauthenticated users: Show notification banner */}
      {!user && <PairingNotification pairingCode={pairingCode} />}
    </>
  );
}