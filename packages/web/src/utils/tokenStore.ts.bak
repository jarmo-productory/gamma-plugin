// ⚠️  DEPRECATED - USE secureTokenStore.ts INSTEAD
// This file contains legacy token validation that bypasses Sprint 19 security fixes
// All functions here use direct database queries that will fail after security migration
// Use secureTokenStore.ts for secure RPC-based token operations

import { createClient } from '@/utils/supabase/server';
import { createServiceRoleClient } from '@/utils/supabase/service';

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
 * ⚠️ DEPRECATED - Use validateSecureToken() from secureTokenStore.ts instead
 * This function uses direct database queries that bypass security measures
 * @deprecated Use secureTokenStore.validateSecureToken() for secure validation
 */
export async function validateToken(token: string): Promise<TokenData | null> {
  console.warn('[DEPRECATED] tokenStore.validateToken() - Use secureTokenStore.validateSecureToken() instead');
  return null; // Disabled to prevent accidental use
}

/**
 * ⚠️ DEPRECATED - Use storeSecureToken() from secureTokenStore.ts instead
 * @deprecated Use secureTokenStore.storeSecureToken() for secure storage
 */
export async function storeToken(tokenData: TokenData): Promise<void> {
  console.warn('[DEPRECATED] tokenStore.storeToken() - Use secureTokenStore.storeSecureToken() instead');
  throw new Error('DEPRECATED: Use secureTokenStore.storeSecureToken() instead');
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('device_tokens')
      .insert({
        token: tokenData.token,
        device_id: tokenData.deviceId,
        user_id: tokenData.userId,
        user_email: tokenData.userEmail,
        device_name: tokenData.deviceName || inferDeviceName(tokenData.deviceId),
        issued_at: tokenData.issuedAt,
        expires_at: tokenData.expiresAt,
        last_used: tokenData.lastUsed,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to store token: ${error.message}`);
    }

    console.log(`[Token Storage] Stored token in database for device: ${tokenData.deviceId}, user: ${tokenData.userEmail}`);
  } catch (error) {
    console.error('[Token Storage] Database error:', error);
    throw error;
  }
}

/**
 * ⚠️ DEPRECATED - Use secure RPC cleanup instead
 * @deprecated Use secureTokenStore RPC functions for cleanup
 */
export async function cleanupExpiredTokens(): Promise<number> {
  console.warn('[DEPRECATED] tokenStore.cleanupExpiredTokens() - Use secure RPC cleanup instead');
  return 0; // Disabled to prevent accidental use
  try {
    const supabase = await createClient();
    
    // Delete expired tokens
    const { data: deletedTokens, error } = await supabase
      .from('device_tokens')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('token');

    if (error) {
      console.error('[Token Cleanup] Database error:', error);
      return 0;
    }

    const removedCount = deletedTokens?.length || 0;
    
    if (removedCount > 0) {
      console.log(`[Token Cleanup] Removed ${removedCount} expired tokens from database`);
    }
    
    return removedCount;
  } catch (error) {
    console.error('[Token Cleanup] Database error:', error);
    return 0;
  }
}

/**
 * ⚠️ DEPRECATED - Use secure service role client instead
 * @deprecated Use service role client for debugging
 */
export async function getTokenStoreStatus(): Promise<{ 
  totalTokens: number; 
  activeTokens: number; 
  expiredTokens: number; 
}> {
  console.warn('[DEPRECATED] tokenStore.getTokenStoreStatus() - Use service role client instead');
  return { totalTokens: 0, activeTokens: 0, expiredTokens: 0 }; // Disabled to prevent accidental use
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();
    
    // Count total tokens
    const { count: totalTokens } = await supabase
      .from('device_tokens')
      .select('*', { count: 'exact', head: true });

    // Count active (non-expired) tokens
    const { count: activeTokens } = await supabase
      .from('device_tokens')
      .select('*', { count: 'exact', head: true })
      .gte('expires_at', now);

    // Count expired tokens  
    const { count: expiredTokens } = await supabase
      .from('device_tokens')
      .select('*', { count: 'exact', head: true })
      .lt('expires_at', now);
    
    return {
      totalTokens: totalTokens || 0,
      activeTokens: activeTokens || 0,
      expiredTokens: expiredTokens || 0
    };
  } catch (error) {
    console.error('[Token Status] Database error:', error);
    return { totalTokens: 0, activeTokens: 0, expiredTokens: 0 };
  }
}

/**
 * Infer device name from device ID
 */
function inferDeviceName(deviceId: string): string {
  // Extract readable part from device ID format: device_timestamp_randomstring
  const parts = deviceId.split('_');
  if (parts.length >= 3) {
    const timestamp = parseInt(parts[1]);
    const date = new Date(timestamp);
    return `Device ${date.toLocaleDateString()}`;
  }
  return `Device ${deviceId.slice(-8)}`;
}

/**
 * LEGACY COMPATIBILITY: Sync function wrappers for existing code
 * These maintain backward compatibility while using database internally
 */

// Legacy sync validateToken - wraps async version
export function validateTokenSync(token: string): TokenData | null {
  console.warn('[Token Store] Using legacy sync validateToken - consider upgrading to async version');
  // For immediate backward compatibility, return null and log warning
  // Existing code should be migrated to use async validateToken
  return null;
}

// Legacy sync storeToken - wraps async version  
export function storeTokenSync(tokenData: TokenData): void {
  console.warn('[Token Store] Using legacy sync storeToken - consider upgrading to async version');
  // Fire-and-forget async call for backward compatibility
  storeToken(tokenData).catch(error => {
    console.error('[Token Store] Legacy sync store failed:', error);
  });
}