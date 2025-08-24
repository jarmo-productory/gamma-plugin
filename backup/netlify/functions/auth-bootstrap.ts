import type { Handler } from '@netlify/functions';
import { json } from './_utils';
import { ensureUserExists } from './_user-utils';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, 'Method Not Allowed');

    const authHeader = (event.headers.authorization || event.headers.Authorization || '').toString();
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    
    if (!bearer) {
      return json(401, { error: 'missing_clerk_token' });
    }

    // Verify Clerk session and extract user ID
    const clerkSecret = (process.env.CLERK_SECRET_KEY as string) || '';
    const isLocal = process.env.NETLIFY_LOCAL === 'true';
    let clerkSession: any = null;
    let userId: string | null = null;

    if (isLocal && bearer === 'dev-session-token') {
      // Local dev: only use dev-user for explicit dev session token
      userId = 'dev-user';
    }

    if (!userId && clerkSecret) {
      try {
        console.log('[DEBUG] Processing Clerk session token, length:', bearer.length);
        
        // Step 1: Decode JWT to get user ID (networkless verification)
        // Note: For production, you should verify the JWT signature with Clerk's public key
        try {
          const tokenParts = bearer.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
            const now = Math.floor(Date.now() / 1000);
            
            // Basic validation - check expiry
            if (payload.exp && payload.exp >= now) {
              userId = payload.sub || payload.user_id || null;
              console.log('[DEBUG] JWT decoded, userId:', userId);
              
              // Step 2: Fetch the actual user profile from Clerk API
              if (userId && userId.startsWith('user_')) {
                console.log('[DEBUG] Fetching Clerk user profile for:', userId);
                
                try {
                  const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
                    method: 'GET',
                    headers: {
                      Authorization: `Bearer ${clerkSecret}`,
                      'Content-Type': 'application/json',
                    },
                  });
                  
                  if (userRes.ok) {
                    const userProfile = await userRes.json();
                    console.log('[DEBUG] User profile fetched successfully:', {
                      id: userProfile.id,
                      email: userProfile.email_addresses?.[0]?.email_address,
                      firstName: userProfile.first_name,
                      lastName: userProfile.last_name,
                    });
                    
                    // Build clerkSession with actual user data
                    clerkSession = {
                      user_id: userId,
                      email: userProfile.email_addresses?.[0]?.email_address,
                      first_name: userProfile.first_name,
                      last_name: userProfile.last_name,
                      username: userProfile.username,
                    };
                  } else {
                    const errorText = await userRes.text();
                    console.log('[DEBUG] Failed to fetch user profile:', userRes.status, errorText);
                    // Use minimal session data if profile fetch fails
                    clerkSession = { user_id: userId };
                  }
                } catch (fetchErr) {
                  console.log('[DEBUG] Error fetching user profile:', fetchErr);
                  // Use minimal session data if fetch fails
                  clerkSession = { user_id: userId };
                }
              } else {
                // Not a Clerk user ID format, use minimal session
                clerkSession = { user_id: userId };
              }
            } else {
              console.log('[DEBUG] JWT expired or invalid');
              return json(401, { error: 'token_expired' });
            }
          } else {
            console.log('[DEBUG] Invalid JWT format');
            return json(401, { error: 'invalid_token_format' });
          }
        } catch (jwtErr) {
          console.log('[DEBUG] JWT decode error:', jwtErr);
          return json(401, { error: 'jwt_decode_failed' });
        }
        
        if (!userId) {
          return json(401, { error: 'clerk_user_missing' });
        }
      } catch (e: unknown) {
        console.error('[DEBUG] Clerk processing error:', e);
        return json(401, { error: 'clerk_error', details: e instanceof Error ? e.message : 'Unknown error' });
      }
    }

    if (!userId) {
      // Final fallback - only use dev-user if no Clerk secret configured
      if (!clerkSecret) {
        userId = 'dev-user';
      } else {
        return json(401, { error: 'authentication_failed' });
      }
    }

    // Ensure user exists in database using existing utility
    const userResult = await ensureUserExists(userId, event, clerkSession);
    
    if (!userResult.success) {
      return json(500, { 
        error: 'user_bootstrap_failed', 
        details: userResult.error 
      });
    }

    // Fetch full user info from database
    const supabaseUrl = process.env.SUPABASE_URL as string;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('id, email, name, clerk_id, created_at')
      .eq('clerk_id', userId)
      .single();

    if (fetchError || !userData) {
      return json(500, { error: 'user_fetch_failed' });
    }

    return json(200, {
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        clerkId: userData.clerk_id,
        createdAt: userData.created_at,
        wasCreated: userResult.created || false
      }
    });

  } catch (err: unknown) {
    return json(500, { 
      error: 'server_error', 
      details: err instanceof Error ? err.message : 'Unknown error' 
    });
  }
};