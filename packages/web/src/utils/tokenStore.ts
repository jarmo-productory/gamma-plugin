// Sprint 16: Simple Token Store Management

export interface TokenData {
  token: string;
  deviceId: string;
  userId: string;
  userEmail: string;
  deviceName?: string;
  issuedAt: string;
  expiresAt: string;
  lastUsed: string;
}

/**
 * Validate a device token and return associated user data
 */
export function validateToken(token: string): TokenData | null {
  if (!token || !token.startsWith('token_')) {
    return null;
  }

  // Use in-memory storage for now
  globalThis.deviceTokens = globalThis.deviceTokens || new Map();
  
  const tokenData = globalThis.deviceTokens.get(token);
  if (!tokenData) {
    return null;
  }

  // Check expiry
  if (new Date() > new Date(tokenData.expiresAt)) {
    globalThis.deviceTokens.delete(token);
    return null;
  }

  // Update last used
  tokenData.lastUsed = new Date().toISOString();
  globalThis.deviceTokens.set(token, tokenData);
  
  return tokenData;
}

/**
 * Store a new device token with user association
 */
export function storeToken(tokenData: TokenData): void {
  globalThis.deviceTokens = globalThis.deviceTokens || new Map();
  globalThis.deviceTokens.set(tokenData.token, tokenData);
  console.log(`[Token Storage] Stored token for device: ${tokenData.deviceId}, user: ${tokenData.userEmail}`);
}

/**
 * Remove expired tokens (cleanup utility)
 */
export function cleanupExpiredTokens(): number {
  globalThis.deviceTokens = globalThis.deviceTokens || new Map();
  
  let removedCount = 0;
  const now = new Date();
  
  for (const [token, tokenData] of globalThis.deviceTokens.entries()) {
    if (now > new Date(tokenData.expiresAt)) {
      globalThis.deviceTokens.delete(token);
      removedCount++;
    }
  }
  
  if (removedCount > 0) {
    console.log(`[Token Cleanup] Removed ${removedCount} expired tokens`);
  }
  
  return removedCount;
}

/**
 * Get current token store status (for debugging)
 */
export function getTokenStoreStatus(): { 
  totalTokens: number; 
  activeTokens: number; 
  expiredTokens: number; 
} {
  globalThis.deviceTokens = globalThis.deviceTokens || new Map();
  
  const now = new Date();
  let activeTokens = 0;
  let expiredTokens = 0;
  
  for (const tokenData of globalThis.deviceTokens.values()) {
    if (now > new Date(tokenData.expiresAt)) {
      expiredTokens++;
    } else {
      activeTokens++;
    }
  }
  
  return {
    totalTokens: globalThis.deviceTokens.size,
    activeTokens,
    expiredTokens
  };
}

