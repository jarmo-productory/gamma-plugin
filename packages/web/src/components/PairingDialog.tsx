'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PairingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pairingCode: string;
  onLink: () => Promise<void>;
}

export default function PairingDialog({ isOpen, onClose, pairingCode, onLink }: PairingDialogProps) {
  const [isLinking, setIsLinking] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleLink = async () => {
    setIsLinking(true);
    setMessage('');

    try {
      await onLink();
      setSuccess(true);
      setMessage('✅ Device successfully linked! You can now sync your timetables between the extension and web dashboard.');
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error: any) {
      setSuccess(false);
      if (error.message.includes('404')) {
        setMessage('Invalid or expired pairing code. Please try again from your extension.');
      } else if (error.message.includes('401')) {
        setMessage('Authentication error. Please refresh and try again.');
      } else {
        setMessage(error.message || 'Failed to link device. Please try again.');
      }
    } finally {
      setIsLinking(false);
    }
  };

  const handleCancel = () => {
    setMessage('');
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🔗 Device Pairing
          </DialogTitle>
          <DialogDescription>
            Your Chrome extension is requesting to pair with this account.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Pairing code:</p>
            <code className="font-mono bg-muted px-3 py-2 rounded text-lg font-semibold">
              {pairingCode}
            </code>
          </div>

          {message && (
            <Alert className={success ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
              <AlertDescription className={success ? 'text-green-700' : 'text-yellow-700'}>
                {message}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {!success && (
          <DialogFooter className="sm:justify-center">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLinking}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLink}
              disabled={isLinking}
              className="min-w-24"
            >
              {isLinking ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Linking...
                </div>
              ) : (
                'Link Device'
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}