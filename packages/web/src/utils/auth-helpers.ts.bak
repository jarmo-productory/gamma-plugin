import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateSecureToken } from '@/utils/secureTokenStore';

export interface AuthenticatedUser {
  userId: string;
  userEmail: string;
  source: 'supabase' | 'device-token';
}

/**
 * Get authenticated user from either device token (extension) or Supabase session (web)
 * This enables dual authentication for API routes
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  // First, try device token authentication (for extension)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    const tokenData = await validateSecureToken(token);
    if (tokenData) {
      return {
        userId: tokenData.userId,
        userEmail: tokenData.userEmail,
        source: 'device-token'
      };
    }
  }

  // Fallback to Supabase session authentication (for web app)
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (!error && user) {
      return {
        userId: user.id,
        userEmail: user.email || '',
        source: 'supabase'
      };
    }
  } catch (error) {
    console.warn('[Auth Helper] Supabase auth check failed:', error);
  }

  return null; // No valid authentication found
}

/**
 * Get database user ID that works with RLS policies
 * Maps both auth types to the correct user_id field in the database
 */
export async function getDatabaseUserId(authUser: AuthenticatedUser): Promise<string | null> {
  try {
    const supabase = await createClient();
    // Map Supabase auth user ID -> first-party users.id via SECURITY DEFINER RPC
    const { data, error } = await supabase.rpc('rpc_get_user_id_by_auth_id', { p_auth_id: authUser.userId });
    if (error) {
      console.warn('[Auth Helper] rpc_get_user_id_by_auth_id error:', error);
      return null;
    }
    return data || null;
  } catch (e) {
    console.warn('[Auth Helper] getDatabaseUserId failed:', e);
    return null;
  }
}

/**
 * Create Supabase client with appropriate access level based on auth type
 */
export async function createAuthenticatedSupabaseClient(authUser: AuthenticatedUser) {
  if (authUser.source === 'device-token') {
    // RLS COMPLIANCE: Service role is forbidden for user operations.
    // Device-token flows must use SECURITY DEFINER RPCs that validate the token internally.
    throw new Error('Device-token operations must use RPCs; service-role client is forbidden for user operations');
  } else {
    // For Supabase session, use normal client (RLS will work automatically)
    return await createClient();
  }
}
