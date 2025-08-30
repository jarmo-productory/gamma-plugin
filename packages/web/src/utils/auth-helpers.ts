import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateToken } from '@/utils/tokenStore';

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
    
    const tokenData = await validateToken(token);
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
  if (authUser.source === 'device-token') {
    // Device token userId is actually a Supabase auth user ID
    // It can be used directly for RLS policies since presentations table uses auth.uid()
    return authUser.userId;
  } else {
    // Supabase session - userId is already the correct database user_id
    return authUser.userId;
  }
}

/**
 * Create Supabase client with appropriate access level based on auth type
 */
export async function createAuthenticatedSupabaseClient(authUser: AuthenticatedUser) {
  if (authUser.source === 'device-token') {
    // For device token auth, use service role client to bypass RLS
    // We'll manually ensure user_id matches the authenticated device token user
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    return createServiceClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  } else {
    // For Supabase session, use normal client (RLS will work automatically)
    return await createClient();
  }
}