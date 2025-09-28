// Sprint 19 Phase 1: Secure Token Management System
// Replaces raw token storage with cryptographically secure hashed tokens

import { createClient } from '@/utils/supabase/server';
import { createServiceRoleClient } from '@/utils/supabase/service';
import { randomBytes } from 'crypto';

export interface SecureTokenData {
  userId: string;
  userEmail: string;
  deviceId: string;
  deviceName?: string;
  issuedAt: string;
  expiresAt: string;
  lastUsed: string;
}

/**
 * Generate cryptographically secure opaque token
 * - 256 bits (32 bytes) of entropy
 * - Base64URL encoding for URL safety
 * - No embedded information (completely opaque)
 */
export function generateSecureToken(): string {
  // Generate 32 bytes (256 bits) of cryptographically secure random data
  const randomBuffer = randomBytes(32);
  
  // Convert to base64url encoding (URL-safe, no padding)
  const token = randomBuffer
    .toString('base64')
    .replace(/\+/g, '-')    // Replace + with -
    .replace(/\//g, '_')    // Replace / with _
    .replace(/=/g, '');     // Remove padding
  
  return token;
}

/**
 * Store device token securely using SHA-256 hashing
 * Uses secure RPC to prevent direct table manipulation
 */
export async function storeSecureToken(tokenData: {
  token: string;
  deviceId: string;
  userId: string;
  userEmail: string;
  deviceName?: string;
  expiresAt?: Date;
}): Promise<void> {
  try {
    // Use service role client for administrative token storage
    const supabase = createServiceRoleClient();
    
    // Call secure RPC that handles hashing internally
    const { data, error } = await supabase.rpc('store_hashed_token', {
      input_token: tokenData.token,
      p_device_id: tokenData.deviceId,
      p_user_id: tokenData.userId,
      p_user_email: tokenData.userEmail,
      p_device_name: tokenData.deviceName || null,
      p_expires_at: tokenData.expiresAt?.toISOString() || null
    });

    if (error) {
      console.error('[Secure Token Storage] RPC error:', error);
      throw new Error(`Failed to store secure token: ${error.message}`);
    }

    if (!data) {
      throw new Error('Token storage failed: RPC returned false');
    }

    console.log(`[Secure Token Storage] Successfully stored hashed token for device: ${tokenData.deviceId}, user: ${tokenData.userEmail}`);
  } catch (error) {
    console.error('[Secure Token Storage] Error:', error);
    throw error;
  }
}

/**
 * Validate device token securely using RPC
 * - Token is hashed before database query
 * - Constant-time comparison in database
 * - Minimal data returned on success
 * - Last_used timestamp updated atomically
 */
export async function validateSecureToken(token: string): Promise<SecureTokenData | null> {
  if (!token || token.length < 32) {
    return null; // Invalid token format
  }

  try {
    // Use regular server client - RPC handles security
    const supabase = await createClient();
    
    // Call secure validation RPC
    const { data, error } = await supabase.rpc('validate_and_touch_token', {
      input_token: token
    });

    if (error) {
      console.error('[Secure Token Validation] RPC error:', error);
      return null;
    }

    // RPC returns array with single row or empty array
    if (!data || data.length === 0) {
      return null; // Token not found or expired
    }

    const tokenRecord = data[0];
    
    // Map RPC result to SecureTokenData interface
    return {
      userId: tokenRecord.user_id,
      userEmail: tokenRecord.user_email,
      deviceId: tokenRecord.device_id,
      deviceName: tokenRecord.device_name,
      issuedAt: new Date().toISOString(), // RPC doesn't return this for security
      expiresAt: new Date().toISOString(), // RPC doesn't return this for security
      lastUsed: new Date().toISOString()   // Just updated by RPC
    };
  } catch (error) {
    console.error('[Secure Token Validation] Error:', error);
    return null;
  }
}

/**
 * Get user's device tokens securely via RPC
 * Replaces direct database queries with secure function calls
 */
export async function getUserDeviceTokens(userId: string): Promise<Array<{
  deviceId: string;
  deviceName: string;
  issuedAt: string;
  expiresAt: string;
  lastUsed: string;
  isActive: boolean;
}>> {
  try {
    const supabase = await createClient();
    
    // Use secure RPC instead of direct table access
    const { data, error } = await supabase.rpc('get_user_devices', {
      p_user_id: userId
    });

    if (error) {
      console.error('[Get User Devices] RPC error:', error);
      throw new Error(`Failed to get user devices: ${error.message}`);
    }

    // Map RPC results to expected interface
    return (data || []).map((device: any) => ({
      deviceId: device.device_id,
      deviceName: device.device_name || `Device ${device.device_id.slice(0, 8)}`,
      issuedAt: device.issued_at,
      expiresAt: device.expires_at,
      lastUsed: device.last_used,
      isActive: device.is_active
    }));
  } catch (error) {
    console.error('[Get User Devices] Error:', error);
    return []; // Return empty array on error
  }
}

/**
 * Revoke device token securely via RPC
 */
export async function revokeDeviceToken(userId: string, deviceId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // Use secure RPC for token revocation
    const { data, error } = await supabase.rpc('revoke_device_token', {
      p_user_id: userId,
      p_device_id: deviceId
    });

    if (error) {
      console.error('[Revoke Device Token] RPC error:', error);
      return false;
    }

    const success = data === true;
    
    if (success) {
      console.log(`[Revoke Device Token] Successfully revoked device: ${deviceId} for user: ${userId}`);
    }
    
    return success;
  } catch (error) {
    console.error('[Revoke Device Token] Error:', error);
    return false;
  }
}

/**
 * Sprint 27: Rename device securely via RPC
 */
export async function renameDevice(userId: string, deviceId: string, newName: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // Use secure RPC for device renaming
    const { data, error } = await supabase.rpc('rename_device', {
      p_user_id: userId,
      p_device_id: deviceId,
      p_new_name: newName
    });

    if (error) {
      console.error('[Rename Device] RPC error:', error);
      return false;
    }

    const success = data === true;
    
    if (success) {
      console.log(`[Rename Device] Successfully renamed device: ${deviceId} to "${newName}" for user: ${userId}`);
    }
    
    return success;
  } catch (error) {
    console.error('[Rename Device] Error:', error);
    return false;
  }
}

/**
 * Clean up expired tokens using secure RPC
 * Should be called periodically or via scheduled function
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    // Use service role for administrative cleanup
    const supabase = createServiceRoleClient();
    
    const { data, error } = await supabase.rpc('cleanup_expired_tokens');

    if (error) {
      console.error('[Token Cleanup] RPC error:', error);
      return 0;
    }

    const cleanedCount = data || 0;
    
    if (cleanedCount > 0) {
      console.log(`[Token Cleanup] Removed ${cleanedCount} expired tokens`);
    }
    
    return cleanedCount;
  } catch (error) {
    console.error('[Token Cleanup] Error:', error);
    return 0;
  }
}

/**
 * Generate device-specific information for token metadata
 */
export function generateDeviceInfo(userAgent?: string): {
  deviceId: string;
  deviceName: string;
} {
  // Generate secure random device ID
  const deviceId = `dev_${randomBytes(16).toString('hex')}`;
  
  // Extract basic device info from user agent (if available)
  let deviceName = 'Chrome Extension';
  
  if (userAgent) {
    if (userAgent.includes('Windows')) deviceName += ' (Windows)';
    else if (userAgent.includes('Mac')) deviceName += ' (Mac)';
    else if (userAgent.includes('Linux')) deviceName += ' (Linux)';
  }
  
  // Add timestamp for uniqueness
  deviceName += ` ${new Date().toLocaleDateString()}`;
  
  return { deviceId, deviceName };
}

/**
 * DEPRECATED COMPATIBILITY FUNCTIONS
 * These maintain backward compatibility while migrating to secure system
 */

/**
 * @deprecated Use validateSecureToken instead
 */
export async function validateToken(token: string): Promise<SecureTokenData | null> {
  console.warn('[Token Store] DEPRECATED: validateToken() - use validateSecureToken()');
  return validateSecureToken(token);
}

/**
 * @deprecated Use storeSecureToken instead  
 */
export async function storeToken(tokenData: any): Promise<void> {
  console.warn('[Token Store] DEPRECATED: storeToken() - use storeSecureToken()');
  
  // Convert legacy format to secure format
  const secureData = {
    token: tokenData.token,
    deviceId: tokenData.deviceId,
    userId: tokenData.userId,
    userEmail: tokenData.userEmail,
    deviceName: tokenData.deviceName,
    expiresAt: new Date(tokenData.expiresAt)
  };
  
  return storeSecureToken(secureData);
}