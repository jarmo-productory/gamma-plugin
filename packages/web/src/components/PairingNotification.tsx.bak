'use client';

interface PairingNotificationProps {
  pairingCode: string;
}

export default function PairingNotification({ pairingCode }: PairingNotificationProps) {
  return (
    <div className="w-full max-w-2xl mx-auto mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          🔗
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-blue-900">Device Pairing Request</h3>
          <p className="text-sm text-blue-700 mt-1">
            Your Chrome extension is requesting to pair with your account.
          </p>
          <div className="mt-2">
            <span className="text-xs text-blue-600">Pairing code: </span>
            <code className="font-mono bg-blue-100 px-2 py-1 rounded text-sm text-blue-800">
              {pairingCode}
            </code>
          </div>
        </div>
      </div>
      <div className="mt-3 text-sm text-blue-700">
        👇 Please sign in below to complete the device pairing
      </div>
    </div>
  );
}