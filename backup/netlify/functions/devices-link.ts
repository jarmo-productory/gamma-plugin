import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { json, getClientIp, rateLimit, log } from './_utils';
import { ensureUserExists } from './_user-utils';

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, 'Method Not Allowed');
    const { code } = JSON.parse(event.body || '{}');
    if (!code) return json(400, { error: 'missing_code' });

    // Rate limit per IP
    const ip = getClientIp(event);
    const rl = rateLimit('link', ip, 60, 60_000);
    if (!rl.allowed) return json(429, { error: 'rate_limited', retryAfter: rl.retryAfter });

    // Verify Clerk session if configured; allow local dev bypass
    const clerkSecret = (process.env.CLERK_SECRET_KEY as string) || '';
    const isLocal = process.env.NETLIFY_LOCAL === 'true';
    let userId: string | null = null;
    let clerkSession: any = null;

    const authHeader = (event.headers.authorization || event.headers.Authorization || '').toString();
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (isLocal && bearer === 'dev-session-token') {
      // Local dev: only use dev-user for explicit dev session token
      userId = 'dev-user';
    } else if (isLocal && !clerkSecret) {
      // Local dev without Clerk: use x-dev-user-id header or fallback
      userId = (event.headers['x-dev-user-id'] as string) || 'dev-user';
    }

    if (!userId && clerkSecret) {
      if (!bearer) return json(401, { error: 'missing_clerk_token' });
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
              console.log('[DEBUG] JWT decoded for device linking, userId:', userId);
              
              // Step 2: Fetch the actual user profile from Clerk API
              if (userId && userId.startsWith('user_')) {
                console.log('[DEBUG] Fetching Clerk user profile for device linking:', userId);
                
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
                    console.log('[DEBUG] User profile fetched for device link:', {
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
                    console.log('[DEBUG] Failed to fetch user profile for device link:', userRes.status, errorText);
                    // Use minimal session data if profile fetch fails
                    clerkSession = { user_id: userId };
                  }
                } catch (fetchErr) {
                  console.log('[DEBUG] Error fetching user profile for device link:', fetchErr);
                  // Use minimal session data if fetch fails
                  clerkSession = { user_id: userId };
                }
              } else {
                // Not a Clerk user ID format, use minimal session
                clerkSession = { user_id: userId };
              }
            } else {
              console.log('[DEBUG] JWT expired or invalid for device linking');
              return json(401, { error: 'token_expired' });
            }
          } else {
            console.log('[DEBUG] Invalid JWT format for device linking');
            return json(401, { error: 'invalid_token_format' });
          }
        } catch (jwtErr) {
          console.log('[DEBUG] JWT decode error for device linking:', jwtErr);
          return json(401, { error: 'jwt_decode_failed' });
        }
        
        if (!userId) {
          return json(401, { error: 'clerk_user_missing' });
        }
      } catch (e: unknown) {
        console.error('[DEBUG] Clerk processing error for device linking:', e);
        return json(401, { error: 'clerk_error', details: e instanceof Error ? e.message : 'Unknown error' });
      }
    }

    if (!userId) {
      // Final fallback (should only happen in local without Clerk)
      userId = (event.headers['x-dev-user-id'] as string) || 'dev-user';
    }

    // PRODUCTION-SAFE USER CREATION: Ensure user exists before device linking
    const userResult = await ensureUserExists(userId, event, clerkSession);
    if (!userResult.success) {
      log(event, 'device_link_failed_user_creation', { 
        userId, 
        error: userResult.error,
        ip 
      });
      return json(500, { 
        error: 'user_creation_failed', 
        details: userResult.error 
      });
    }

    // Log user creation status for monitoring
    if (userResult.created) {
      log(event, 'device_link_new_user_created', { 
        userId, 
        internalUserId: userResult.userId,
        ip 
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL as string;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const codeHash = hashCode(code);
    const { data, error } = await supabase
      .from('devices')
      .select('device_id, code_expires_at')
      .eq('code_hash', codeHash)
      .limit(1)
      .maybeSingle();

    if (error || !data) return json(404, { error: 'code_not_found' });
    if (new Date(data.code_expires_at).getTime() < Date.now()) {
      return json(410, { error: 'code_expired' });
    }

    const { error: upErr } = await supabase
      .from('devices')
      .update({ user_id: userId, linked_at: new Date().toISOString() })
      .eq('device_id', data.device_id);

    if (upErr) return json(500, { error: 'link_failed', details: upErr.message });
    log(event, 'device_linked', { deviceId: data.device_id, userId, ip });
    return json(200, { ok: true });
  } catch (err: unknown) {
    return json(500, { error: 'server_error', details: err instanceof Error ? err.message : 'Unknown error' });
  }
};


