// Global type extensions for device pairing system

interface DeviceRegistration {
  deviceId: string;
  code: string;
  expiresAt: string;
  linked: boolean;
  userId?: string;
  userEmail?: string;
}

declare global {
  var deviceRegistrations: Map<string, DeviceRegistration> | undefined;
}

export {};