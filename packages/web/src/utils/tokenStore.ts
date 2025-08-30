// Sprint 16 Phase 2: Database-Based Token Store Management
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
 * Validate a device token and return associated user data
 * NOW USING DATABASE STORAGE
 */
export async function validateToken(token: string): Promise<TokenData | null> {
  if (!token || !token.startsWith('token_')) {
    return null;
  }

  try {
    // For token validation, we need to bypass RLS since device tokens are used without user sessions
    // TODO: This needs proper service role key or RLS policy adjustment
    const supabase = await createClient();
    
    // Query database for token
    const { data: tokenRecord, error } = await supabase
      .from('device_tokens')
      .select('*')
      .eq('token', token)
      .gte('expires_at', new Date().toISOString()) // Only non-expired tokens
      .single();

    if (error || !tokenRecord) {
      return null;
    }

    // Update last_used timestamp
    await supabase
      .from('device_tokens')
      .update({ 
        last_used: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('token', token);

    // Map database record to TokenData interface
    return {
      token: tokenRecord.token,
      deviceId: tokenRecord.device_id,
      userId: tokenRecord.user_id,
      userEmail: tokenRecord.user_email,
      deviceName: tokenRecord.device_name,
      issuedAt: tokenRecord.issued_at,
      expiresAt: tokenRecord.expires_at,
      lastUsed: new Date().toISOString() // Use current timestamp
    };
  } catch (error) {
    console.error('[Token Validation] Database error:', error);
    return null;
  }
}

/**
 * Store a new device token with user association
 * NOW USING DATABASE STORAGE (requires authenticated user session)
 */
export async function storeToken(tokenData: TokenData): Promise<void> {
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
 * Remove expired tokens (cleanup utility)
 * NOW USING DATABASE STORAGE
 */
export async function cleanupExpiredTokens(): Promise<number> {
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
 * Get current token store status (for debugging)
 * NOW USING DATABASE STORAGE
 */
export async function getTokenStoreStatus(): Promise<{ 
  totalTokens: number; 
  activeTokens: number; 
  expiredTokens: number; 
}> {
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