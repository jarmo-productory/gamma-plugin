'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import PairingDialog from '@/components/PairingDialog';

export default function DevicePairingDashboard() {
  const [showPairingDialog, setShowPairingDialog] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  const searchParams = useSearchParams();

  useEffect(() => {
    if (!mounted) return;

    // Check URL parameters first (from redirect), then localStorage
    const urlPairingCode = searchParams.get('code');
    const urlSource = searchParams.get('source');
    const pendingCode = localStorage.getItem('pendingPairingCode');
    
    console.log('[DevicePairingDashboard] Checking pairing sources:', {
      urlPairingCode,
      urlSource,
      pendingCode,
      mounted
    });
    
    // Priority: URL parameters > localStorage
    if (urlPairingCode && urlSource === 'extension') {
      setPairingCode(urlPairingCode);
      setShowPairingDialog(true);
      // Store in localStorage as backup
      localStorage.setItem('pendingPairingCode', urlPairingCode);
      console.log('[DevicePairingDashboard] Showing pairing dialog for URL code:', urlPairingCode);
    } else if (pendingCode) {
      setPairingCode(pendingCode);
      setShowPairingDialog(true);
      console.log('[DevicePairingDashboard] Showing pairing dialog for localStorage code:', pendingCode);
    }
  }, [mounted, searchParams]);

  const handlePairingLink = async () => {
    if (!pairingCode) {
      throw new Error('Missing pairing code');
    }

    const response = await fetch('/api/devices/link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
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
    // Clean up localStorage
    localStorage.removeItem('pendingPairingCode');
    setPairingCode(null);
    console.log('[DevicePairingDashboard] Pairing dialog closed, localStorage cleared');
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      {showPairingDialog && pairingCode && (
        <PairingDialog
          isOpen={showPairingDialog}
          onClose={handleDialogClose}
          pairingCode={pairingCode}
          onLink={handlePairingLink}
        />
      )}
    </>
  );
}