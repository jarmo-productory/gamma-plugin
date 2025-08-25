'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DevicePairing() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLinking, setIsLinking] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const pairingCode = searchParams.get('code');
  const source = searchParams.get('source');

  useEffect(() => {
    if (pairingCode && source === 'extension') {
      handleDevicePairing();
    }
  }, [pairingCode, source]);

  const handleDevicePairing = async () => {
    if (!pairingCode) return;

    setIsLinking(true);
    setMessage('');

    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setMessage('Please sign in first to link your device');
        setIsLinking(false);
        return;
      }

      // Link the device
      const response = await fetch('/api/devices/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: pairingCode }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(true);
        setMessage(`Device linked successfully! You can now close this tab and return to your extension.`);
        
        // Clean URL
        router.replace('/');
        
        // Auto-redirect after success
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        const errorData = await response.json();
        if (response.status === 404) {
          setMessage('Invalid or expired pairing code. Please try again from your extension.');
        } else if (response.status === 401) {
          setMessage('Please sign in first to link your device.');
        } else {
          setMessage(errorData.error || 'Failed to link device. Please try again.');
        }
      }
    } catch (error) {
      console.error('[DevicePairing] Error:', error);
      setMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleManualRetry = () => {
    handleDevicePairing();
  };

  if (!pairingCode || source !== 'extension') {
    return null;
  }

  return (
    <Card className="w-full max-w-md mx-auto mb-6">
      <CardHeader>
        <CardTitle className="text-center">
          {success ? '✅ Device Pairing' : '🔗 Device Pairing'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLinking ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Linking your device...</p>
          </div>
        ) : (
          <>
            {message && (
              <div className={`p-3 rounded-md text-sm text-center ${
                success 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
              }`}>
                {message}
              </div>
            )}
            
            {!success && !isLinking && (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Pairing code: <code className="font-mono bg-muted px-2 py-1 rounded">{pairingCode}</code>
                </p>
                <Button onClick={handleManualRetry} className="w-full">
                  Link Device
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}